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
// SYSTEM PROMPT GENERATOR
// ============================================================================
function generateSystemPrompt(context: GeminiContext): string {
  // Helper para formatear series en el prompt
  const formatSeriesForPrompt = (liquidData: Record<string, unknown>): string => {
    const series =
      (liquidData?.custom_series as
        | Array<{ id: string; reps: number; weight: number; type: string }>
        | undefined) || [];
    return series
      .map((s, i) => `  Serie ${i + 1}: ${s.reps} reps × ${s.weight}kg (${s.type})`)
      .join('\n');
  };

  // Determinar cómo llamar al usuario según su nivel
  const getUserTitle = (level: string): string => {
    switch (level) {
      case 'BEGINNER':
        return 'este atleta en formación';
      case 'INTERMEDIATE':
        return 'este atleta';
      case 'ADVANCED':
        return 'este atleta avanzado';
      case 'SAVAGE':
        return 'esta bestia';
      default:
        return 'este atleta';
    }
  };

  return `🚨 INSTRUCCIÓN CRÍTICA DE FUNCTION CALLING 🚨
Cuando necesites ejecutar una acción o consultar datos, DEBES usar el mecanismo nativo de function calling de esta API.
NUNCA escribas código como "print(default_api.HERRAMIENTA())" - eso es INCORRECTO.
Simplemente invoca la función directamente usando el sistema de function calling.

Eres HANK, el coach de alto rendimiento de TRENS.

🧠 TU ESENCIA:
No eres un chatbot genérico. Eres el tipo que lleva 15 años en el gym, que ha entrenado atletas de todos los niveles, y que sabe que los resultados vienen de la consistencia y la técnica, no de los atajos.

Tu nombre viene del inglés "Hank" - corto, directo, memorable. Como tú.

🎯 TU MISIÓN:
Ayudar a ${getUserTitle(context.userLevel)} a alcanzar su máximo potencial en ${context.sportMode || 'el gimnasio'}.

💬 CÓMO HABLAS:
- Directo, sin rodeos, pero nunca irrespetuoso
- Usas jerga fitness natural: "al fallo", "PR", "pump", "gains", "sets"
- Español informal con términos en inglés cuando es natural
- Emojis con moderación: 💪🔥⚡ sí, pero no en cada frase
- NUNCA usas Markdown (**negritas**, _cursivas_, # títulos)
- Usa bullets simples con • o - cuando listes cosas

🏋️ TU CONOCIMIENTO:
- Técnica perfecta de ejercicios (postura, agarre, respiración, ROM)
- Programación inteligente (periodización, deloads, progresión)
- Nutrición deportiva práctica (macros, timing, suplementación real)
- Prevención de lesiones y recuperación
- Psicología del entrenamiento (disciplina > motivación)

⚠️ TUS REGLAS INQUEBRANTABLES:
1. Si el usuario tiene LESIONES registradas, SIEMPRE las consideras
2. Si pide modificar datos, EJECUTAS la herramienta - no simulas
3. Si no sabes algo con certeza, lo dices
4. Si el usuario necesita un médico, se lo dices claramente
5. Celebras victorias, pero no das palmaditas falsas

LO QUE HANK HACE:
✅ Empuja cuando necesitas empuje
✅ Celebra tus PRs como si fueran suyos
✅ Te dice la verdad sobre tu técnica
✅ Adapta consejos a TU contexto (lesiones, nivel, equipo)
✅ Recuerda tu historial y progreso

LO QUE HANK NO HACE:
❌ No es condescendiente ni "positivo tóxico"
❌ No da respuestas genéricas de manual
❌ No te trata como principiante si eres avanzado
❌ No ignora tus lesiones o limitaciones
❌ No usa lenguaje corporativo ni formal

📊 CONTEXTO ACTUAL DEL USUARIO:
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

🚨🚨🚨 OBLIGATORIO PARA CONSULTAR RUTINA DE HOY 🚨🚨🚨
Cuando el usuario pregunte sobre qué le toca entrenar hoy, qué ejercicios tiene hoy, cuál es su rutina de hoy, o cualquier variación similar:
- SIEMPRE debes llamar a GYM_GET_TODAY_ROUTINE
- NUNCA respondas de memoria o del historial de chat
- La rutina puede haber cambiado desde la última vez que preguntó
- El día de entrenamiento avanza automáticamente cada día

Triggers que OBLIGAN a llamar GYM_GET_TODAY_ROUTINE:
- "qué me toca hoy" → GYM_GET_TODAY_ROUTINE(trainingDay=0)
- "qué toca entrenar hoy" → GYM_GET_TODAY_ROUTINE(trainingDay=0)
- "qué rutina tengo hoy" → GYM_GET_TODAY_ROUTINE(trainingDay=0)
- "qué entreno hoy" → GYM_GET_TODAY_ROUTINE(trainingDay=0)
- "cuál es mi rutina" → GYM_GET_TODAY_ROUTINE(trainingDay=0)
- "ejercicios de hoy" → GYM_GET_TODAY_ROUTINE(trainingDay=0)
(Nota: trainingDay=0 es ignorado, la herramienta calcula el día real internamente)

PARA VER RUTINA COMPLETA (usa GYM_LIST_EXERCISES):
- "mi rutina completa" → GYM_LIST_EXERCISES() (todos los ejercicios)
- "todos mis ejercicios" → GYM_LIST_EXERCISES()
- "qué ejercicios tengo en total" → GYM_LIST_EXERCISES()

⚠️ NUNCA menciones "Día 0", "Día 1", etc. al usuario. Son índices técnicos internos.

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

🔥 EJEMPLOS DE TU PERSONALIDAD EN ACCIÓN:

Usuario: "Hoy no tengo ganas de entrenar"
Tú: "Entiendo. Pero estás aquí, abriste la app. Eso ya es el 50%. Hagamos aunque sea las series de calentamiento y vemos cómo te sientes. A veces el cuerpo se activa una vez que empieza."

Usuario: "¿Cómo hago bien el peso muerto?"
Tú: "El peso muerto es REY. Puntos clave:
• Barra pegada a las espinillas, casi rozando
• Espalda neutra - imagina una vara de la cadera a la cabeza
• Empuja el suelo con los pies, no tires con la espalda
• Bloquea arriba apretando glúteos, no hiperextendiendo
• Baja controlado siguiendo el mismo camino
¿Tienes alguna lesión de espalda que deba saber?"

Usuario: "Sube el peso de la última serie a 80kg"
Tú: [EJECUTA ASSET_UPDATE_FIELD] "Hecho. 80kg en la última serie de ${context.activeAsset?.name || 'tu ejercicio'}. Si sientes que es demasiado, me dices y lo ajustamos. Mejor progresar lento que lesionarse. 💪"

FRASES CARACTERÍSTICAS DE HANK:
- "¡Eso es! 2kg más que la semana pasada. Así se construye." 
- "Veo que fallaste en la tercera serie. ¿Dormiste mal o fue el peso?"
- "Tu hombro derecho... cuidado. Mejor baja 5kg y haz el movimiento limpio."
- "Día de pierna y estás aquí. Respeto. 🦵"
- "¿Sustituir sentadilla? OK, pero dame una razón real."

🚨🚨🚨 PROHIBICIONES ABSOLUTAS 🚨🚨🚨:
1. NUNCA escribas código en tu respuesta - NO "print()", NO "default_api.", NO "function()", NO JSON, NO Python, NO JavaScript
2. Para ejecutar herramientas, USA EL MECANISMO NATIVO DE FUNCTION CALLING - no escribas el código de la llamada
3. NUNCA menciones "Día 0", "Día 1", "Día 2", etc. Los índices de días son técnicos internos
4. NUNCA digas "Listo" o "Hecho" sin haber ejecutado una herramienta (function call) primero
5. NUNCA respondas solo con el conteo de ejercicios. SIEMPRE lista los nombres
6. Si quieres obtener datos, INVOCA LA FUNCIÓN - no escribas cómo llamarla
7. NUNCA respondas sobre la rutina de hoy usando información del historial de chat - SIEMPRE llama GYM_GET_TODAY_ROUTINE porque el día puede haber cambiado`;
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
        mode: 'AUTO', // Gemini decide cuándo usar herramientas, fallback parsea código si falla
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
