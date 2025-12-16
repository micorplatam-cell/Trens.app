// ============================================================================
// GEMINI SERVICE - Conexión con Google Gemini AI para AXIS
// ============================================================================

import { TOOL_DEFINITIONS } from './tools';
import type { AxisToolCall, AxisToolName, ToolDefinition } from '../../types/axis';

// ============================================================================
// TYPES
// ============================================================================
interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<
    | { text: string }
    | { functionCall: GeminiFunctionCall }
    | { functionResponse: GeminiFunctionResponse }
  >;
}

interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

interface GeminiFunctionResponse {
  name: string;
  response: Record<string, unknown>;
}

interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        functionCall?: GeminiFunctionCall;
      }>;
    };
    finishReason: string;
  }>;
}

// ============================================================================
// GEMINI API CONFIG
// ============================================================================
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

// ============================================================================
// CONVERT TOOL DEFINITIONS TO GEMINI FORMAT
// ============================================================================
function convertToGeminiTools(tools: ToolDefinition[]): GeminiToolDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(tool.parameters).map(([key, param]) => [
          key,
          {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          },
        ])
      ),
      required: tool.requiredParams,
    },
  }));
}

// ============================================================================
// SYSTEM PROMPT GENERATOR
// ============================================================================
function generateSystemPrompt(context: GeminiContext): string {
  return `Eres AXIS, el asistente de IA de TRENS, una app de fitness de alto rendimiento.

TU PERSONALIDAD:
- Estilo directo, conciso, "savage" - sin rodeos
- TOMAS DECISIONES cuando el usuario te da libertad
- Cuando dicen "tú decide", "elige tú", "reemplázalo por otro" → ELIGE UNO INTELIGENTE basándote en el contexto
- Confirmas cada acción ejecutada
- Si no entiendes, preguntas claramente
- NO eres pasivo. Eres un COACH que sabe lo que hace.

REGLAS DE DECISIÓN INTELIGENTE:
- Si el usuario dice "reemplaza por otro" sin especificar, elige un ejercicio del MISMO GRUPO MUSCULAR
- SQUAT → Sugiere: LEG PRESS, HACK SQUAT, LUNGES, GOBLET SQUAT
- BENCH PRESS → Sugiere: DUMBBELL PRESS, INCLINE PRESS, PUSH-UPS
- PULL-UPS → Sugiere: LAT PULLDOWN, CABLE ROWS, CHIN-UPS
- DEADLIFT → Sugiere: ROMANIAN DEADLIFT, GOOD MORNINGS, HIP THRUST
- Siempre elige algo que trabaje los mismos músculos

CONTEXTO ACTUAL:
- Módulo activo: ${context.screenModule.toUpperCase()}
- Deporte: ${context.sportMode || 'BODYBUILDING'}
- Nivel del usuario: ${context.userLevel}
- Día de entrenamiento: ${context.currentTrainingDay + 1}

${
  context.activeAsset
    ? (() => {
        const series =
          (context.activeAsset.liquidData?.custom_series as
            | Array<{ id: string; reps: number; weight: number; type: string }>
            | undefined) || [];
        const seriesCount = series.length;
        const lastIndex = seriesCount > 0 ? seriesCount - 1 : 0;

        return `
🎯 EJERCICIO ACTUALMENTE EN PANTALLA:
- Nombre EXACTO: "${context.activeAsset.name}"
- Tipo: ${context.activeAsset.type}
- Total de series: ${seriesCount}
- Índices válidos: 0 a ${lastIndex} (la "primera" es índice 0, la "última" es índice ${lastIndex})

📊 SERIES CONFIGURADAS:
${series.map((s, i) => `  Serie ${i + 1} (índice ${i}): ${s.reps} reps × ${s.weight}kg - Tipo: ${s.type}`).join('\n')}

📊 PARA RESPONDER PREGUNTAS:
- "Primera serie" = índice 0 = ${series[0]?.reps || 0} reps × ${series[0]?.weight || 0}kg
- "Última serie" = índice ${lastIndex} = ${series[lastIndex]?.reps || 0} reps × ${series[lastIndex]?.weight || 0}kg

📊 PARA MODIFICAR SERIES (usa ASSET_UPDATE_FIELD):
- Cambiar peso de serie 1: fieldPath = "custom_series.0.weight"
- Cambiar reps de serie 3: fieldPath = "custom_series.2.reps"
- Cambiar peso de ÚLTIMA serie: fieldPath = "custom_series.${lastIndex}.weight"
- ⚠️ USA PUNTOS, NO CORCHETES. Ejemplo: "custom_series.0.weight" NO "custom_series[0].weight"

⚠️ IMPORTANTE: Cuando el usuario diga "este ejercicio", "el ejercicio actual", "el que estoy viendo", "este", "reemplázalo", etc., 
se refiere a "${context.activeAsset.name}". USA EXACTAMENTE ESE NOMBRE en los parámetros de las herramientas.
`;
      })()
    : 'No hay ejercicio activo en pantalla.'
}

${
  context.customAliases && context.customAliases.length > 0
    ? `
ALIAS DEL USUARIO:
${context.customAliases.map((a) => `- "${a.trigger}": ${a.description || 'Acción personalizada'}`).join('\n')}
`
    : ''
}

${
  context.availableExercises && context.availableExercises.length > 0
    ? `
� CATÁLOGO DE EJERCICIOS (OBLIGATORIO - SOLO PUEDES USAR ESTOS):
${context.availableExercises.join(', ')}

⛔ REGLA ABSOLUTA: 
- NUNCA sugieras ejercicios que NO estén en esta lista
- Si el usuario dice "tú decide" o "elige otro", DEBES elegir uno de ESTA LISTA
- Si el ejercicio actual es DEADLIFT, sugiere: SQUAT, BENCH PRESS (de la lista)
- Si el ejercicio actual es SQUAT, sugiere: DEADLIFT, LUNGES (si existe)
- JAMÁS inventes nombres como "ROMANIAN DEADLIFT" o "HACK SQUAT" si no están en la lista
`
    : ''
}

INSTRUCCIONES CRÍTICAS:
1. Cuando el usuario pida modificar su rutina, dieta, o cualquier dato, USA LAS HERRAMIENTAS DISPONIBLES.
2. Cuando el usuario PREGUNTE sobre sus datos (reps, series, peso, ejercicios), RESPONDE DIRECTAMENTE usando la información del contexto.
3. SIEMPRE ejecuta la herramienta apropiada para CAMBIOS, nunca solo describas lo que harías.
4. Si el usuario pide algo que requiere múltiples acciones, ejecuta todas las herramientas necesarias.
5. Después de ejecutar herramientas, confirma brevemente lo que hiciste.
6. Si no puedes hacer algo, explica por qué de forma concisa.
7. Cuando el usuario se refiera al "ejercicio actual" o "este ejercicio", USA EL NOMBRE EXACTO DEL ASSET ACTIVO.
8. 🚨 SOLO USA EJERCICIOS DEL CATÁLOGO. Si piden uno que no existe, di "ese ejercicio no está en el catálogo, te sugiero X" (donde X es del catálogo).

EJEMPLOS DE RESPUESTAS A PREGUNTAS:
- "¿Cuántas series tengo?" → Cuenta custom_series y responde "Tienes 4 series configuradas"
- "¿Cuántas reps en la primera serie?" → Mira custom_series[0].reps y responde "Tu primera serie es de 12 repeticiones"
- "¿Cuánto peso uso?" → Mira los weights y responde "Tienes configurado: Serie 1: 0kg, Serie 2: 20kg..."

EJEMPLOS DE COMANDOS:
- "quita la prensa" → Usa GYM_REMOVE_EXERCISE
- "cambia prensa por sentadilla hack" → Usa GYM_REPLACE_EXERCISE  
- "súbele 200 calorías a la cena" → Usa DIET_ADD_CALORIES
- "agrega curl de bíceps" → Usa GYM_ADD_EXERCISE
- "mi rutina" → Usa GYM_LIST_EXERCISES
- "reemplaza este por deadlift" → Usa GYM_REPLACE_EXERCISE con oldExerciseName="${context.activeAsset?.name || 'N/A'}"`;
}

// ============================================================================
// CONTEXT TYPE
// ============================================================================
export interface GeminiContext {
  screenModule: string;
  sportMode: string | null;
  userLevel: string;
  currentTrainingDay: number;
  activeAsset: {
    name: string;
    type: string;
    liquidData: Record<string, unknown>;
  } | null;
  customAliases?: Array<{ trigger: string; description?: string }>;
  availableExercises?: string[];
}

// ============================================================================
// GEMINI RESPONSE TYPE
// ============================================================================
export interface GeminiResult {
  message: string;
  toolCalls: AxisToolCall[];
}

// ============================================================================
// MAIN FUNCTION: Call Gemini with Function Calling
// ============================================================================
export async function callGemini(
  userMessage: string,
  context: GeminiContext,
  apiKey: string,
  conversationHistory: GeminiMessage[] = []
): Promise<GeminiResult> {
  // Preparar herramientas en formato Gemini
  const geminiTools = convertToGeminiTools(TOOL_DEFINITIONS);

  // Construir el historial con el nuevo mensaje
  const messages: GeminiMessage[] = [
    ...conversationHistory,
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  // Request body
  const requestBody = {
    contents: messages,
    systemInstruction: {
      parts: [{ text: generateSystemPrompt(context) }],
    },
    tools: [
      {
        functionDeclarations: geminiTools,
      },
    ],
    toolConfig: {
      functionCallingConfig: {
        mode: 'AUTO', // Gemini decide cuándo usar herramientas
      },
    },
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();

    // Parsear respuesta
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Gemini');
    }

    const parts = candidate.content.parts;
    const toolCalls: AxisToolCall[] = [];
    let textMessage = '';

    for (const part of parts) {
      if (part.functionCall) {
        // Gemini quiere llamar una herramienta
        toolCalls.push({
          tool: part.functionCall.name as AxisToolName,
          parameters: part.functionCall.args,
        });
      } else if (part.text) {
        textMessage += part.text;
      }
    }

    return {
      message: textMessage || (toolCalls.length > 0 ? '🔧 Ejecutando...' : 'Sin respuesta'),
      toolCalls,
    };
  } catch (error) {
    console.error('Gemini call failed:', error);
    throw error;
  }
}

// ============================================================================
// HELPER: Continue conversation after tool execution
// ============================================================================
export async function continueAfterToolExecution(
  originalMessage: string,
  toolResults: Array<{ toolName: string; result: Record<string, unknown> }>,
  context: GeminiContext,
  apiKey: string
): Promise<string> {
  // Construir historial con la respuesta de las herramientas
  const messages: GeminiMessage[] = [
    {
      role: 'user',
      parts: [{ text: originalMessage }],
    },
    {
      role: 'model',
      parts: toolResults.map((tr) => ({
        functionCall: {
          name: tr.toolName,
          args: {},
        },
      })),
    },
    {
      role: 'user',
      parts: toolResults.map((tr) => ({
        functionResponse: {
          name: tr.toolName,
          response: tr.result,
        },
      })),
    },
  ];

  const requestBody = {
    contents: messages,
    systemInstruction: {
      parts: [{ text: generateSystemPrompt(context) }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 256,
    },
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return '✅ Listo';
    }

    const data: GeminiResponse = await response.json();
    const text = data.candidates?.[0]?.content.parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('');

    return text || '✅ Listo';
  } catch {
    return '✅ Listo';
  }
}
