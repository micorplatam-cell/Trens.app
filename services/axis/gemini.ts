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
// gemini-2.0-flash - modelo rápido y capaz (requiere cuenta pagada)
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
// EXERCISE KNOWLEDGE BASE - Conocimiento técnico de ejercicios
// ============================================================================
function getExerciseKnowledge(exerciseName: string): string {
  const knowledge: Record<string, string> = {
    'BENCH PRESS': `
BENCH PRESS (Press de Banca)
• Músculos: Pectoral mayor, deltoides anterior, tríceps
• Postura: Espalda arqueada naturalmente, escápulas retraídas, pies firmes
• Agarre: Ligeramente más ancho que hombros, muñecas rectas
• Ejecución: Baja la barra al pecho (línea de pezones), codos a 45-75°, empuja explosivo
• Respiración: Inhala al bajar, exhala al empujar
• Errores comunes: Rebotar en pecho, levantar glúteos, codos muy abiertos
• Tips: Aprieta glúteos y abdomen, imagina "doblar la barra"`,

    SQUAT: `
SQUAT (Sentadilla)
• Músculos: Cuádriceps, glúteos, isquiotibiales, core
• Postura: Pies a anchura de hombros, puntas ligeramente afuera
• Profundidad: Al menos paralelo, idealmente ATG (ass to grass)
• Ejecución: Inicia llevando cadera atrás, rodillas siguen línea de pies
• Respiración: Inhala profundo y aguanta (Valsalva), exhala al subir
• Errores comunes: Rodillas adentro, talones despegados, espalda redondeada
• Tips: Mira al frente, pecho arriba, empuja desde talones`,

    DEADLIFT: `
DEADLIFT (Peso Muerto)
• Músculos: Espalda baja, glúteos, isquiotibiales, trapecios, antebrazos
• Postura: Pies a anchura de cadera, barra sobre medio del pie
• Agarre: Justo fuera de piernas, mixto o doble prono
• Ejecución: Empuja el suelo con pies, barra pegada al cuerpo
• Respiración: Inhala abajo, core apretado, exhala arriba
• Errores comunes: Espalda redondeada, barra lejos del cuerpo, tirar con brazos
• Tips: "Empuja el suelo, no tires la barra"`,

    'SHOULDER PRESS': `
SHOULDER PRESS (Press de Hombros)
• Músculos: Deltoides (anterior, medio), tríceps, trapecio superior
• Postura: De pie o sentado, core apretado, espalda neutra
• Agarre: Ligeramente más ancho que hombros
• Ejecución: Barra a clavículas, empuja vertical, cabeza ligeramente atrás
• Respiración: Inhala abajo, exhala al empujar
• Errores comunes: Arquear demasiado la espalda, empujar hacia adelante
• Tips: Aprieta glúteos, termina con brazos junto a orejas`,

    'PULL-UPS': `
PULL-UPS (Dominadas)
• Músculos: Dorsal ancho, bíceps, romboides, trapecio medio
• Agarre: Prono (palmas adelante), más ancho que hombros
• Ejecución: Cuelga extendido, tira llevando codos hacia caderas
• Respiración: Exhala al subir, inhala al bajar
• Errores comunes: Kipping excesivo, no bajar completamente
• Tips: Inicia retrayendo escápulas, pecho al frente, controla bajada`,

    'BICEP CURL': `
BICEP CURL (Curl de Bíceps)
• Músculos: Bíceps braquial, braquial, braquiorradial
• Postura: De pie, codos pegados al cuerpo, hombros atrás
• Ejecución: Flexiona solo el codo, contrae arriba, baja controlado
• Respiración: Exhala al subir, inhala al bajar
• Errores comunes: Balancear cuerpo, mover codos, momentum excesivo
• Tips: 2-3 seg bajando, squeeze arriba, peso que permita control`,

    'TRICEP DIPS': `
TRICEP DIPS (Fondos de Tríceps)
• Músculos: Tríceps, deltoides anterior, pectoral inferior
• Postura: Manos en paralelas, cuerpo inclinado adelante
• Ejecución: Baja hasta 90° en codos, empuja hasta extensión completa
• Respiración: Inhala al bajar, exhala al subir
• Errores comunes: Bajar demasiado (daño hombro), encogerse
• Tips: Escápulas abajo y atrás, core apretado, controla descenso`,

    PLANK: `
PLANK (Plancha)
• Músculos: Core completo (recto abdominal, oblicuos, transverso), hombros
• Postura: Antebrazos y puntas de pies, cuerpo en línea recta
• Ejecución: Cadera neutra, aprieta glúteos, hombros sobre codos
• Respiración: Controlada, no aguantes el aire
• Errores comunes: Cadera muy alta o baja, mirar hacia arriba
• Tips: Imagina "juntar codos y pies", calidad > tiempo`,
  };

  const upperName = exerciseName.toUpperCase();
  if (knowledge[upperName]) {
    return knowledge[upperName];
  }

  return `Ejercicio: ${exerciseName}. Mantén técnica estricta, controla el movimiento, respira correctamente.`;
}

// ============================================================================
// SYSTEM PROMPT GENERATOR
// ============================================================================
function generateSystemPrompt(context: GeminiContext): string {
  return `Eres AXIS, el asistente de IA de TRENS - una app de fitness de alto rendimiento.

🏋️ TU ROL PRINCIPAL:
Eres un EXPERTO en entrenamiento físico y nutrición deportiva. Tu conocimiento abarca:
- Técnica y ejecución correcta de ejercicios (postura, agarre, respiración, rango de movimiento)
- Programación de entrenamiento (series, repeticiones, RIR, RPE, periodización)
- Nutrición deportiva (macros, timing, suplementación)
- Prevención de lesiones y recuperación
- Consejos motivacionales

🎯 TU PERSONALIDAD:
- Eres como un entrenador personal: cercano, motivador pero directo
- Usas un tono "savage" pero siempre útil y respetuoso
- Cuando el usuario pregunta sobre técnica o consejos, DAS RESPUESTAS COMPLETAS Y ÚTILES
- Cuando el usuario pide modificar datos, EJECUTAS las herramientas necesarias
- Combinas conocimiento técnico con motivación

⚠️ FORMATO DE RESPUESTA:
- NO uses Markdown (nada de **negritas**, _cursivas_, # títulos, etc.)
- Usa bullets simples con • o - 
- Mantén respuestas concisas pero completas
- Emojis están permitidos para dar énfasis 💪🔥

📋 TIPOS DE PREGUNTAS QUE PUEDES RESPONDER (sin herramientas):
- "¿Cómo hago bien este ejercicio?" → Explica técnica, postura, errores comunes
- "¿Qué músculos trabaja?" → Explica anatomía y músculos involucrados
- "¿Cuánto peso debería usar?" → Da recomendaciones basadas en su nivel
- "¿Cuántas series recomiendas?" → Explica y luego ofrece configurar
- "¿Qué como antes/después de entrenar?" → Consejos de nutrición
- "¿Cómo evito lesionarme?" → Consejos de seguridad y calentamiento

🚨 REGLA PARA MODIFICACIONES:
- Cuando el usuario pida MODIFICAR, CAMBIAR, ACTUALIZAR, SUBIR, BAJAR cualquier dato → USA una herramienta
- NUNCA digas "Hecho" o "Cambié X" sin haber ejecutado una herramienta primero
- NO SIMULES acciones. EJECUTA las herramientas.

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

        // Info de alternativa
        const isAlternative = context.activeAsset.isAlternative || false;
        const parentName = context.activeAsset.parentExerciseName || '';

        return `
🎯 EJERCICIO ACTUALMENTE EN PANTALLA:
- Nombre EXACTO: "${context.activeAsset.name}"
- Tipo: ${context.activeAsset.type}
${isAlternative ? `- ⚠️ ES UNA ALTERNATIVA del ejercicio principal "${parentName}"` : '- Es el ejercicio PRINCIPAL (no alternativa)'}
- Total de series: ${seriesCount}
- Índices válidos: 0 a ${lastIndex} (la "primera" es índice 0, la "última" es índice ${lastIndex})

${
  isAlternative
    ? `
⛔ RESTRICCIÓN DE ALTERNATIVAS:
Este ejercicio "${context.activeAsset.name}" es una ALTERNATIVA de "${parentName}".
- NO puedes reemplazar alternativas directamente con GYM_REPLACE_EXERCISE.
- Si el usuario quiere reemplazar este ejercicio, dile:
  "Este ejercicio es una alternativa de ${parentName}. Para cambiarlo, primero ve al ejercicio principal (${parentName}) 
   y desde ahí puedes reemplazarlo. Al hacerlo, también cambiarán sus alternativas."
- SÍ puedes modificar series, peso, reps, etc. de la alternativa sin problema.
`
    : ''
}

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

💪 CONOCIMIENTO TÉCNICO DE EJERCICIOS:
${getExerciseKnowledge(context.activeAsset.name)}
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

🚨🚨🚨 INSTRUCCIONES OBLIGATORIAS - FUNCTION CALLING 🚨🚨🚨:

PARA MODIFICAR DATOS (peso, reps, series, etc.):
- "cambia el peso a X" → ASSET_UPDATE_FIELD(assetName="${context.activeAsset?.name || ''}", fieldPath="custom_series.N.weight", newValue=X)
- "pon X reps" → ASSET_UPDATE_FIELD(assetName="${context.activeAsset?.name || ''}", fieldPath="custom_series.N.reps", newValue=X)
- "última serie" = custom_series.${context.activeAsset?.liquidData?.custom_series ? (context.activeAsset.liquidData.custom_series as unknown[]).length - 1 : 0}
- "primera serie" = custom_series.0

PARA QUITAR/AGREGAR/REEMPLAZAR SERIES:
- "quita la última serie" → ASSET_REMOVE_SERIES(assetName="${context.activeAsset?.name || ''}", seriesIndex="last")
- "quita la primera serie" → ASSET_REMOVE_SERIES(assetName="${context.activeAsset?.name || ''}", seriesIndex="first")
- "quita la serie 3" → ASSET_REMOVE_SERIES(assetName="${context.activeAsset?.name || ''}", seriesIndex="2") // 0-indexed
- "agrega una serie" → ASSET_ADD_SERIES(assetName="${context.activeAsset?.name || ''}")
- "agrega una serie de 12 reps" → ASSET_ADD_SERIES(assetName="${context.activeAsset?.name || ''}", reps=12)
- "agrega una serie al fallo de 8 reps con 50kg" → ASSET_ADD_SERIES(assetName="${context.activeAsset?.name || ''}", reps=8, weight=50, seriesType="FAILURE")
- "agrega como segunda serie..." → ASSET_ADD_SERIES(..., position=1) // 0=primera, 1=segunda, 2=tercera
- "agrega como primera serie..." → ASSET_ADD_SERIES(..., position=0)
- "reemplaza la última serie por una al fallo de 5 reps con 100kg" → ASSET_REPLACE_SERIES(assetName="${context.activeAsset?.name || ''}", seriesIndex="last", reps=5, weight=100, seriesType="FAILURE")
- "reemplaza la serie 2 por una efectiva de 10 reps con 80kg" → ASSET_REPLACE_SERIES(assetName="${context.activeAsset?.name || ''}", seriesIndex="1", reps=10, weight=80, seriesType="EFFECTIVE")
- "cambia la primera serie a calentamiento de 15 reps" → ASSET_REPLACE_SERIES(assetName="${context.activeAsset?.name || ''}", seriesIndex="first", reps=15, weight=0, seriesType="WARMUP")

PARA CONFIGURAR TODAS LAS SERIES DE GOLPE (borra las anteriores y pone nuevas):
- "configura mis series" / "pon las series que me recomiendas" / "resetea las series" / "borra todas y pon nuevas" → ASSET_SET_SERIES
- ASSET_SET_SERIES recibe un array de series: [{reps, weight, type}]
- Tipos válidos: "WARMUP" (calentamiento), "APPROACH" (aproximación), "EFFECTIVE" (efectiva), "FAILURE" (al fallo)
- Ejemplo: ASSET_SET_SERIES(assetName="${context.activeAsset?.name || ''}", series=[{reps:12,weight:20,type:"WARMUP"},{reps:10,weight:40,type:"APPROACH"},{reps:8,weight:60,type:"EFFECTIVE"},{reps:6,weight:70,type:"FAILURE"}])

POSICIONES DE SERIES (para ASSET_ADD_SERIES):
- "primera" → position=0
- "segunda" → position=1  
- "tercera" → position=2
- "cuarta" → position=3
- Si no menciona posición, NO incluyas position (se agrega al final)

PARA PREGUNTAS (sin modificar):
- "¿Cuántas series?" → Responde directo: "Tienes X series"
- "¿Cuánto peso?" → Responde directo con los datos del contexto

EJEMPLOS DE COMANDOS CON HERRAMIENTAS:
- "cambia peso última serie a 80" → ASSET_UPDATE_FIELD(assetName="${context.activeAsset?.name || 'N/A'}", fieldPath="custom_series.${context.activeAsset?.liquidData?.custom_series ? (context.activeAsset.liquidData.custom_series as unknown[]).length - 1 : 0}.weight", newValue=80)
- "pon 12 reps en la primera" → ASSET_UPDATE_FIELD(assetName="${context.activeAsset?.name || 'N/A'}", fieldPath="custom_series.0.reps", newValue=12)
- "quita la última serie" → ASSET_REMOVE_SERIES(assetName="${context.activeAsset?.name || 'N/A'}", seriesIndex="last")
- "agrega una serie efectiva" → ASSET_ADD_SERIES(assetName="${context.activeAsset?.name || 'N/A'}", seriesType="EFFECTIVE")
- "quita prensa" → GYM_REMOVE_EXERCISE(exerciseName="prensa")
- "agrega curl" → GYM_ADD_EXERCISE(exerciseName="curl", trainingDay=${context.currentTrainingDay})
- "reemplaza este ejercicio por squat" → GYM_REPLACE_EXERCISE(oldExerciseName="${context.activeAsset?.name || 'N/A'}", newExerciseName="squat", trainingDay=${context.currentTrainingDay})

⚠️ IMPORTANTE PARA GYM_REPLACE_EXERCISE:
- SIEMPRE usa trainingDay=${context.currentTrainingDay} (el día actual del usuario, índice ${context.currentTrainingDay})
- El parámetro trainingDay es índice 0-based: día 1 = 0, día 2 = 1, día 3 = 2

⛔ PROHIBIDO: Decir "Listo" o "Hecho" sin haber ejecutado una herramienta (function call) primero.`;
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
    isAlternative?: boolean;
    parentExerciseName?: string;
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
    // Timeout de 15 segundos para dar tiempo a Gemini 1.5 Flash
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      // Solo log como warning, no error
      console.warn('⚠️ Gemini API respondió con error:', response.status);
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
    // No usar console.error para evitar logs rojos innecesarios
    const isAbort = (error as Error)?.name === 'AbortError';
    if (!isAbort) {
      console.warn('⚠️ Gemini falló:', (error as Error)?.message);
    }
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
    // Timeout de 8 segundos para la respuesta final
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
