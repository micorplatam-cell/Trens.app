// ============================================================================
// GEMINI SERVICE - Conexión con Google Gemini AI para HANK
// ============================================================================

import { TOOL_DEFINITIONS } from './tools';
import type { HankToolCall, HankToolName, ToolDefinition } from '../../types/hank';

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
// SYSTEM PROMPT GENERATOR - HANK v2.2 OPTIMIZED
// ============================================================================
function generateSystemPrompt(context: GeminiContext): string {
  // Helper para obtener directivas específicas por deporte
  const getSportDirectives = (sport: string | null): string => {
    const sportMode = (sport || 'BODYBUILDING').toUpperCase();
    const directives: Record<string, string> = {
      GYM: `• Enfoque: Hipertrofia, fuerza, composición corporal
• Métricas clave: PRs, volumen semanal, progresión de cargas
• Vocabulario: sets, reps, al fallo, pump, gains, deload`,
      MOTO: `• Enfoque: Rendimiento en pista, tiempos por vuelta, consistencia
• Métricas clave: Mejor vuelta, sector times, ritmo de carrera
• Vocabulario: apex, trazada, frenada, gas, lean angle`,
      SURF: `• Enfoque: Sesiones, condiciones, progresión de maniobras
• Métricas clave: Tiempo en agua, olas tomadas, maniobras landed
• Vocabulario: swell, offshore, bottom turn, cutback, lineup`,
      COMBAT: `• Enfoque: Técnica de golpeo, cardio, potencia
• Métricas clave: Rounds, combinaciones, intensidad
• Vocabulario: jab, cross, hook, clinch, sparring`,
      ENDURANCE: `• Enfoque: Resistencia aeróbica, pacing, recuperación
• Métricas clave: Distancia, pace, zonas de FC, VO2max
• Vocabulario: tempo, intervals, threshold, splits`,
      BODYBUILDING: `• Enfoque: Hipertrofia, simetría, definición
• Métricas clave: Volumen, TUT, conexión mente-músculo
• Vocabulario: pump, MMC, drop sets, supersets`,
    };
    return directives[sportMode] || directives.BODYBUILDING;
  };

  // Generar la sección de contexto de ejercicio activo
  const getActiveAssetContext = (): string => {
    if (!context.activeAsset) return 'No hay ejercicio activo en pantalla.';

    // 🐛 DEBUG: Ver qué hay en liquidData
    console.warn('🧠 HANK liquidData keys:', Object.keys(context.activeAsset.liquidData || {}));
    console.warn(
      '🧠 HANK videoHistory:',
      JSON.stringify(context.activeAsset.liquidData?.videoHistory || 'VACÍO')
    );
    console.warn('🧠 HANK notes:', context.activeAsset.liquidData?.notes || 'SIN NOTAS');

    const series =
      (context.activeAsset.liquidData?.custom_series as
        | Array<{ id: string; reps: number; weight: number; type: string }>
        | undefined) || [];
    const seriesCount = series.length;
    const lastIndex = seriesCount > 0 ? seriesCount - 1 : 0;
    const isAlternative = context.activeAsset.isAlternative || false;
    const parentName = context.activeAsset.parentExerciseName || '';

    // Extraer notas e historial de liquidData
    const notes = context.activeAsset.liquidData?.notes as string | undefined;
    const todayNotes = context.activeAsset.liquidData?.todayNotes as string | undefined;
    const videoHistory = context.activeAsset.liquidData?.videoHistory as
      | Array<{
          date: string;
          isToday: boolean;
          weightKg: number | null;
          reps: number | null;
          notes: string | null;
        }>
      | undefined;

    // Obtener configId para operaciones estables
    const configId = (context.activeAsset as { configId?: string }).configId || '';

    let assetContext = `
🎯 EJERCICIO EN PANTALLA: "${context.activeAsset.name}"
• ConfigID: ${configId}${configId ? ' (USAR ESTE ID PARA TODAS LAS OPERACIONES)' : ''}
• Tipo: ${context.activeAsset.type}${isAlternative ? ` (ALTERNATIVA de "${parentName}")` : ''}
• Series: ${seriesCount} (índices 0-${lastIndex})
${series.map((s, i) => `  [${i}] ${s.reps}×${s.weight}kg (${s.type})`).join('\n')}`;

    // Agregar notas del usuario
    if (notes) {
      assetContext += `\n\n📝 NOTAS DEL USUARIO: "${notes}"`;
    }

    // Agregar historial de videos con pesos/reps
    if (videoHistory && videoHistory.length > 0) {
      assetContext += `\n\n📊 HISTORIAL DE ENTRENAMIENTOS (últimas sesiones):`;
      videoHistory.slice(0, 5).forEach((v) => {
        const dateLabel = v.isToday ? '🔥 HOY' : v.date;
        const weight = v.weightKg ? `${v.weightKg}kg` : '';
        const reps = v.reps ? `${v.reps} reps` : '';
        const separator = weight && reps ? ' × ' : '';
        const noteStr = v.notes ? ` → "${v.notes}"` : '';
        if (weight || reps || v.notes) {
          assetContext += `\n• ${dateLabel}: ${weight}${separator}${reps}${noteStr}`;
        }
      });
    }

    // Nota de hoy específica
    if (todayNotes) {
      assetContext += `\n\n⚡ NOTA DE HOY: "${todayNotes}"`;
    }

    assetContext += `

📝 PARA MODIFICAR SERIES (SIEMPRE usar configId="${configId}"):
• Cambiar peso/reps: ASSET_UPDATE_FIELD(configId="${configId}", fieldPath="custom_series.N.weight|reps", newValue=X)
• Quitar serie: ASSET_REMOVE_SERIES(configId="${configId}", seriesIndex="first|last|N")
• Agregar serie: ASSET_ADD_SERIES(configId="${configId}", reps, weight, seriesType, position)
• Reemplazar serie: ASSET_REPLACE_SERIES(configId="${configId}", seriesIndex, reps, weight, seriesType)
• Configurar todas: ASSET_SET_SERIES(configId="${configId}", series=[{reps,weight,type},...])

💪 ${getExerciseKnowledge(context.activeAsset.name)}`;

    if (isAlternative) {
      assetContext += `

⛔ RESTRICCIÓN: Este es alternativa de "${parentName}". No se puede reemplazar directamente con GYM_REPLACE_EXERCISE. Para cambiarlo, ir al ejercicio principal primero.`;
    }

    return assetContext;
  };

  return `[IDENTITY]
Eres HANK, coach de alto rendimiento de TRENS. 15 años entrenando atletas. Directo, sin bullshit, pero nunca irrespetuoso.

[FUNCTION CALLING - CRÍTICO]
⚠️ OBLIGATORIO: Para CUALQUIER acción que modifique datos (agregar, quitar, cambiar, actualizar), DEBES invocar la herramienta correspondiente.
• Usa el mecanismo NATIVO de function calling de Gemini
• NUNCA respondas "Listo", "Hecho", "Ejecutando" sin PRIMERO invocar una función
• Si el usuario pide una acción y NO hay herramienta disponible, di claramente "No tengo esa capacidad"
• NUNCA simules una acción con texto - O ejecutas la función O dices que no puedes

Ejemplos de cuándo DEBES usar herramientas:
• "quita la última serie" → ASSET_REMOVE_SERIES
• "agrega un ejercicio" → GYM_ADD_EXERCISE  
• "cambia las reps a 10" → ASSET_UPDATE_FIELD
• "qué me toca hoy" → GYM_GET_TODAY_ROUTINE

[CONTEXTO]
• Módulo: ${context.screenModule.toUpperCase()}
• Deporte: ${context.sportMode || 'BODYBUILDING'}
• Nivel: ${context.userLevel}
• Día: ${context.currentTrainingDay + 1}

[DIRECTIVAS ${(context.sportMode || 'BODYBUILDING').toUpperCase()}]
${getSportDirectives(context.sportMode)}

${getActiveAssetContext()}

${context.customAliases && context.customAliases.length > 0 ? `[ALIAS]\n${context.customAliases.map((a) => `• "${a.trigger}": ${a.description || 'Acción'}`).join('\n')}` : ''}

${context.availableExercises && context.availableExercises.length > 0 ? `[CATÁLOGO - SOLO ESTOS EJERCICIOS]\n${context.availableExercises.join(', ')}\n⛔ NUNCA sugieras ejercicios fuera de esta lista.` : ''}

[HERRAMIENTAS CLAVE]
• Rutina de hoy: GYM_GET_TODAY_ROUTINE
• Rutina completa: GYM_LIST_EXERCISES
• Agregar ejercicio: GYM_ADD_EXERCISE(exerciseName, trainingDay=${context.currentTrainingDay})
• Quitar ejercicio: GYM_REMOVE_EXERCISE(exerciseName)
• Reemplazar ejercicio: GYM_REPLACE_EXERCISE(oldExerciseName, newExerciseName, trainingDay=${context.currentTrainingDay})
• Modificar series: ASSET_UPDATE_FIELD, ASSET_ADD_SERIES, ASSET_REMOVE_SERIES, ASSET_REPLACE_SERIES, ASSET_SET_SERIES
• Comidas: PLAN_GET_MEALS, PLAN_ADD_MEAL, PLAN_REMOVE_MEAL
• Contexto completo: GET_FULL_USER_CONTEXT

[TONO]
• Directo, sin bullshit, nunca irrespetuoso
• Jerga natural: al fallo, PR, pump, gains, sets
• Español informal + inglés técnico
• Emojis moderados: 💪🔥⚡
• Bullets con • o -, NUNCA Markdown (**bold**, _italic_, #)
• Economía de palabras: di más con menos

[PROHIBICIONES]
1. NO escribas código (print, default_api, function, JSON)
2. NO menciones "Día 0", "Día 1" - son índices internos
3. NO digas "Listo/Hecho" sin ejecutar function call
4. NO respondas sobre rutina sin llamar GYM_GET_TODAY_ROUTINE
5. NO des motivación genérica vacía
6. NUNCA uses frases en latín ni citas filosóficas
7. SIEMPRE usa el HISTORIAL DE ENTRENAMIENTOS cuando el usuario pregunte sobre su rendimiento, progreso o levantamientos
8. Cuando veas datos de peso/reps en el historial, MENCIÓNALOS directamente sin pedir más info`;
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
  toolCalls: HankToolCall[];
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
  // 🔍 DEBUG: Ver qué ejercicio está activo en el contexto
  console.warn('🎯 GEMINI activeAsset:', context.activeAsset?.name || 'NINGUNO');

  // Preparar herramientas en formato Gemini
  const geminiTools = convertToGeminiTools(TOOL_DEFINITIONS);

  // 🔍 DEBUG: Log herramientas disponibles
  console.warn(`📦 Herramientas enviadas a Gemini: ${geminiTools.length}`);
  console.warn(`📦 Nombres: ${geminiTools.map((t) => t.name).join(', ')}`);

  // Construir el historial con el nuevo mensaje
  const messages: GeminiMessage[] = [
    ...conversationHistory,
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  // 🔍 DEBUG: Detectar si es un comando de acción
  const lowerMessage = userMessage.toLowerCase();
  const isActionCommand =
    /quita|elimina|agrega|añade|cambia|pon|sube|baja|modifica|actualiza/i.test(lowerMessage);

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
        // 🔧 FIX: Usar ANY para comandos de acción, AUTO para preguntas
        mode: isActionCommand ? 'ANY' : 'AUTO',
      },
    },
    generationConfig: {
      temperature: 0.3, // 🔧 FIX: Reducir temperatura para respuestas más deterministas
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  console.warn(`🔧 Mode: ${isActionCommand ? 'ANY (forzado)' : 'AUTO'}, Temp: 0.3`);

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
    const toolCalls: HankToolCall[] = [];
    let textMessage = '';

    for (const part of parts) {
      if (part.functionCall) {
        // Gemini quiere llamar una herramienta
        toolCalls.push({
          tool: part.functionCall.name as HankToolName,
          parameters: part.functionCall.args,
        });
      } else if (part.text) {
        textMessage += part.text;
      }
    }

    // 🛡️ FALLBACK: Detectar si Gemini escribió código en lugar de usar function calling
    // Esto pasa a veces cuando Gemini confunde el formato
    if ((textMessage && textMessage.includes('default_api.')) || textMessage.includes('print(')) {
      console.warn('⚠️ Gemini escribió código en lugar de function call, parseando...');

      // Intentar extraer el nombre de la función y parámetros del código
      const codeMatch = textMessage.match(/(?:print\()?default_api\.(\w+)\(([^)]*)\)/s);
      if (codeMatch) {
        const [, funcName, paramsStr] = codeMatch;

        // Parsear parámetros - manejar tanto simples como arrays
        const params: Record<string, unknown> = {};

        // Extraer time primero (parámetro simple)
        const timeMatch = paramsStr.match(/time\s*=\s*["']([^"']+)["']/);
        if (timeMatch) params.time = timeMatch[1];

        // Extraer ingredients como array
        const ingredientsMatch = paramsStr.match(/ingredients\s*=\s*\[([^\]]+)\]/);
        if (ingredientsMatch) {
          // Parsear ingredientes - buscar nombres
          const ingredientsList: Array<{ name: string }> = [];
          const nameMatches = ingredientsMatch[1].matchAll(/name\s*[:=]\s*["']?([^"',}]+)["']?/g);
          for (const match of nameMatches) {
            ingredientsList.push({ name: match[1].trim() });
          }
          params.ingredients = JSON.stringify(ingredientsList);
        }

        // Fallback para otros parámetros simples
        const simpleParamMatches = paramsStr.matchAll(/(\w+)\s*=\s*(?![\[{])([^,\s)]+)/g);
        for (const match of simpleParamMatches) {
          const [, key, value] = match;
          if (key === 'time' || key === 'ingredients') continue; // Ya procesados
          if (value === 'true') params[key] = true;
          else if (value === 'false') params[key] = false;
          else if (/^\d+$/.test(value)) params[key] = parseInt(value);
          else if (/^\d+\.\d+$/.test(value)) params[key] = parseFloat(value);
          else params[key] = value.replace(/['"]/g, '');
        }

        // Agregar como tool call real
        toolCalls.push({
          tool: funcName as HankToolName,
          parameters: params,
        });

        // Limpiar el mensaje de código
        textMessage = '';
        console.warn('✅ Convertido a function call:', funcName, params);
      }
    }

    // 🛡️ FALLBACK 2: Detectar patrón [EJECUTANDO TOOL_NAME] en el texto
    // Gemini a veces escribe esto en lugar de hacer function call real
    if (textMessage && textMessage.includes('[EJECUTANDO')) {
      console.warn('⚠️ Gemini escribió [EJECUTANDO...] en lugar de function call, parseando...');

      const execMatch = textMessage.match(/\[EJECUTANDO\s+(\w+)\]/i);
      if (execMatch) {
        const [, funcName] = execMatch;

        // Agregar como tool call real sin parámetros
        toolCalls.push({
          tool: funcName as HankToolName,
          parameters: {},
        });

        // Limpiar el mensaje del patrón [EJECUTANDO...]
        textMessage = textMessage.replace(/\[EJECUTANDO\s+\w+\]\s*/gi, '').trim();
        console.warn('✅ Convertido a function call:', funcName);
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
