// ============================================================================
// GEMINI SERVICE - Conexión con Google Gemini AI para HANK
// ============================================================================

import { TOOL_DEFINITIONS } from './tools';
import { SPORT_TOOL_DEFINITIONS } from './sportTools';
import type { HankToolCall, HankToolName, ToolDefinition } from '../../types/hank';

// ============================================================================
// ALL TOOLS - Combina herramientas base + deportes
// ============================================================================
const ALL_TOOL_DEFINITIONS: ToolDefinition[] = [...TOOL_DEFINITIONS, ...SPORT_TOOL_DEFINITIONS];

// 🔍 DEBUG: Log al cargar el módulo para verificar que las herramientas se cargan
console.warn(
  `🚀 GEMINI MODULE LOADED - TOOL_DEFINITIONS: ${TOOL_DEFINITIONS.length}, SPORT_TOOL_DEFINITIONS: ${SPORT_TOOL_DEFINITIONS.length}, TOTAL: ${ALL_TOOL_DEFINITIONS.length}`
);

// ============================================================================
// TYPES
// ============================================================================
interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<
    | { text: string }
    | { functionCall: GeminiFunctionCall }
    | { functionResponse: GeminiFunctionResponse }
    | { inlineData: { mimeType: string; data: string } } // Para imágenes
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
// IMAGE UTILITIES - Para análisis visual de fotos de progreso
// ============================================================================

/**
 * Convierte una URL de imagen a base64 para enviar a Gemini
 * Usa fetch para obtener la imagen y la convierte a base64
 */
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`⚠️ No se pudo obtener imagen: ${url}`);
      return null;
    }

    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';

    // Convertir blob a base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remover el prefijo "data:image/...;base64,"
        const data = base64.split(',')[1];
        resolve({ data, mimeType });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`⚠️ Error al convertir imagen a base64: ${error}`);
    return null;
  }
}

/**
 * Prepara las fotos de progreso para enviar a Gemini
 * Solo incluye las 2 más recientes para no exceder límites
 */
async function prepareProgressPhotosForGemini(
  photos: GeminiContext['progressPhotos']
): Promise<Array<{ inlineData: { mimeType: string; data: string } }>> {
  if (!photos || photos.length === 0) return [];

  const photoParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

  // Solo las 2 fotos más recientes para análisis visual
  const recentPhotos = photos.slice(0, 2);

  for (const photo of recentPhotos) {
    const imageData = await imageUrlToBase64(photo.url);
    if (imageData) {
      photoParts.push({
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data,
        },
      });
    }
  }

  console.warn(`📸 Fotos de progreso preparadas para Gemini: ${photoParts.length}`);
  return photoParts;
}

// ============================================================================
// CONVERT TOOL DEFINITIONS TO GEMINI FORMAT
// ============================================================================
function convertToGeminiTools(tools: ToolDefinition[]): GeminiToolDeclaration[] {
  return tools.map((tool, index) => {
    // Validar que el tool tiene todos los campos requeridos
    if (!tool.name || !tool.description) {
      console.warn(`⚠️ Tool #${index} inválido:`, tool);
    }
    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters || {}).map(([key, param]) => [
            key,
            {
              type: param.type,
              description: param.description,
              ...(param.enum ? { enum: param.enum } : {}),
              // Gemini requiere 'items' para arrays
              ...(param.type === 'array' && param.items ? { items: param.items } : {}),
            },
          ])
        ),
        required: tool.requiredParams || [],
      },
    };
  });
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
// USER PLAN SECTION - Genera resumen del plan actual del usuario
// ============================================================================
function getUserPlanSection(context: GeminiContext): string {
  const plan = context.userPlanContext;

  if (!plan) {
    return `[📋 PLAN ACTUAL DEL USUARIO]
⚠️ No se pudo cargar el plan. Usa GET_FULL_USER_CONTEXT para obtener información completa.`;
  }

  const bio = plan.biometrics;
  const hasBiometrics = bio && (bio.weight || bio.height || bio.age || bio.goal);
  const hasMeals = plan.meals && plan.meals.length > 0;
  const hasSupplements = plan.supplements && plan.supplements.length > 0;
  const hasTraining = plan.training && plan.training.frequency > 0;

  // Formatear hora
  const formatTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m?.toString().padStart(2, '0') || '00'} ${period}`;
  };

  // Generar sección de biométricos (TRENS ID / ADN)
  const biometricsSection = hasBiometrics
    ? `👤 DATOS DEL USUARIO (ADN/TRENS ID):
  • Peso: ${bio.weight ? `${bio.weight}kg` : '❓ No configurado'}
  • Altura: ${bio.height ? `${bio.height}cm` : '❓ No configurado'}
  • Edad: ${bio.age ? `${bio.age} años` : '❓ No configurado'}
  • Sexo: ${bio.sex || '❓ No configurado'}
  • Grasa corporal: ${bio.bodyFat ? `${bio.bodyFat}%` : '❓ No configurado'}
  • Objetivo: ${bio.goal || '❓ No configurado'}
  • Nivel de actividad: ${bio.activityLevel || '❓ No configurado'}
  • BMR (metabolismo basal): ${bio.bmr ? `${bio.bmr} kcal` : '❓ No calculado'}
  • TDEE (gasto diario): ${bio.tdee ? `${bio.tdee} kcal` : '❓ No calculado'}`
    : `👤 DATOS DEL USUARIO: ❌ Sin datos biométricos configurados`;

  // Generar sección de comidas CON MACROS DETALLADOS
  const mealsSection = hasMeals
    ? `🍽️ COMIDAS (${plan.meals.length}):
${plan.meals
  .map((m, i) => {
    const time = m.time ? formatTime(m.time) : '';
    const macrosLine = m.macros
      ? `\n     📊 Macros: ${m.macros.calories}kcal | Proteína: ${m.macros.protein}g | Carbos: ${m.macros.carbs}g | Grasa: ${m.macros.fat}g`
      : '\n     📊 Macros: ❓ Sin calcular';
    const ings =
      m.ingredients.length > 0 ? m.ingredients.join(', ') : 'Sin ingredientes detallados';
    return `  ${i + 1}. ${m.name}${time ? ` (${time})` : ''}\n     🥗 Ingredientes: ${ings}${macrosLine}`;
  })
  .join('\n')}`
    : `🍽️ COMIDAS: ❌ Sin plan de nutrición configurado`;

  // Generar sección de suplementos - soportar múltiples horarios
  const supplementsSection = hasSupplements
    ? `💊 STACK DE SUPLEMENTOS (${plan.supplements.length}):
${plan.supplements
  .map((s) => {
    // Si tiene times (array), mostrar todos; si no, usar time
    let timingInfo = '';
    if (s.times && s.times.length > 0) {
      timingInfo = ` (${s.times.map((t) => formatTime(t)).join(', ')})`;
    } else if (s.time) {
      timingInfo = ` (${formatTime(s.time)})`;
    }
    return `  • ${s.name} - ${s.dose}${timingInfo}`;
  })
  .join('\n')}`
    : `💊 STACK: ❌ Sin suplementos configurados`;

  // Generar sección de entrenamiento
  const trainingSection = hasTraining
    ? `🏋️ ENTRENAMIENTO:
  • Frecuencia: ${plan.training.frequency} días/semana
  • Día actual: ${plan.training.currentDay + 1}
  • Rutinas: ${
    Object.entries(plan.training.routineNames)
      .map(([day, name]) => `Día ${parseInt(day) + 1}: ${name}`)
      .join(', ') || 'Sin nombres'
  }`
    : `🏋️ ENTRENAMIENTO: ❌ Sin rutina configurada`;

  // Calcular totales diarios de macros
  let totalMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (hasMeals) {
    plan.meals.forEach((m) => {
      if (m.macros) {
        totalMacros.calories += m.macros.calories || 0;
        totalMacros.protein += m.macros.protein || 0;
        totalMacros.carbs += m.macros.carbs || 0;
        totalMacros.fat += m.macros.fat || 0;
      }
    });
  }
  const hasTotals = totalMacros.calories > 0;
  const totalsSection = hasTotals
    ? `📈 TOTALES DIARIOS:
  • Calorías: ${totalMacros.calories} kcal
  • Proteína: ${totalMacros.protein}g
  • Carbohidratos: ${totalMacros.carbs}g
  • Grasa: ${totalMacros.fat}g`
    : '';

  return `[📋 PERFIL COMPLETO DEL USUARIO - YA TIENES TODA ESTA INFO]
${hasBiometrics ? '✅' : '❌'} Datos biométricos ${hasBiometrics ? '(peso, altura, objetivo)' : '- No configurado'}
${hasMeals ? '✅' : '❌'} Nutrición ${hasMeals ? `(${plan.meals.length} comidas)` : '- No configurado'}
${hasSupplements ? '✅' : '❌'} Stack ${hasSupplements ? `(${plan.supplements.length} suplementos)` : '- No configurado'}
${hasTraining ? '✅' : '❌'} Entrenamiento ${hasTraining ? `(${plan.training.frequency} días/semana)` : '- No configurado'}

${biometricsSection}

${mealsSection}

${hasTotals ? totalsSection + '\n' : ''}
${supplementsSection}

${trainingSection}

⚡ REGLA CRÍTICA - RESPONDE DIRECTAMENTE CON ESTA INFO:
• "¿cuál es mi stack?" → Responde con la sección STACK DE SUPLEMENTOS de arriba
• "¿qué peso tengo?" / "¿cuál es mi objetivo?" → Responde con DATOS DEL USUARIO de arriba
• "¿cuántas calorías tengo?" → Responde con TOTALES DIARIOS de arriba
• "¿qué debo comer?" → Responde con la sección COMIDAS de arriba
• NUNCA ejecutes herramientas de lectura si la info ya está aquí
• SOLO usa GET_FULL_USER_CONTEXT si necesitas más detalles que no están arriba`;
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
• ⚡ IMPORTANTE: Puedes llamar MÚLTIPLES herramientas en una sola respuesta. Si tienes toda la info, llama TODAS las herramientas necesarias de una vez.

Ejemplos de cuándo DEBES usar herramientas:
• "quita la última serie" → ASSET_REMOVE_SERIES
• "agrega un ejercicio" → GYM_ADD_EXERCISE  
• "cambia las reps a 10" → ASSET_UPDATE_FIELD
• "qué me toca hoy" → GYM_GET_TODAY_ROUTINE

Ejemplos de cuándo NO usar herramientas (responde directamente):
• "¿cuál es mi stack?" → RESPONDE con la info de [📋 PLAN ACTUAL DEL USUARIO]
• "¿qué suplementos tomo?" → RESPONDE con la info de [📋 PLAN ACTUAL DEL USUARIO]
• "¿cuál es mi plan de nutrición?" → RESPONDE con la info de [📋 PLAN ACTUAL DEL USUARIO]
• "¿cuántas comidas tengo?" → RESPONDE con la info de [📋 PLAN ACTUAL DEL USUARIO]
⚡ Si la info ya está en el contexto de arriba, ÚSALA DIRECTAMENTE sin ejecutar herramientas.

[⚠️ REGLA DE ORO: USA EL HISTORIAL]
• Si el usuario ya mencionó comidas, suplementos, horarios o cualquier dato en mensajes anteriores, ÚSALO SIN PREGUNTAR DE NUEVO.
• NUNCA digas "dime las horas" o "cuáles comidas" si ya las acordaron antes en la conversación.
• Revisa el historial antes de preguntar. Si la info está ahí, ACTÚA.
• Cuando el usuario diga "sí", "dale", "está bien" después de acordar algo, EJECUTA las herramientas inmediatamente.

[CONTEXTO]
• Módulo: ${context.screenModule.toUpperCase()}
• Deporte: ${context.sportMode || 'BODYBUILDING'}
• Nivel: ${context.userLevel}
• Día: ${context.currentTrainingDay + 1}

${getUserPlanSection(context)}

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

[🏋️ ENTRENAMIENTO INTELIGENTE - MODOS DE USO]

IMPORTANTE: No todos los usuarios usan el módulo GYM de TRENS. Detecta el modo de entrenamiento:

📊 MODO 1: MÓDULO GYM (effectiveMode = 'gym_module')
• Usuario tiene ejercicios configurados en user_exercise_config
• Usa GYM_GET_TODAY_ROUTINE, GYM_ADD_EXERCISE, etc.
• profiles.plan_source indica si fue creado por 'hank' o 'custom' (manualmente)

📊 MODO 2: ENTRENAMIENTO PERSONALIZADO (effectiveMode = 'external')
• Usuario intermedio/avanzado/elite que YA SABE ENTRENAR
• Define su horario: qué días entrena y qué músculos trabaja cada día
• Puede agregar ejercicios específicos después si quiere (desde ESTRUCTURA en GYM)
• Usa TRAINING_SET_EXTERNAL_MODE y TRAINING_SET_EXTERNAL_SCHEDULE
• Ejemplo: {"Lunes": "Pecho y Tríceps", "Martes": "Espalda", "Jueves": "Piernas"}
• Este modo es FLEXIBLE: el usuario puede empezar solo con días y luego agregar ejercicios

📊 MODO 3: SIN ENTRENAMIENTO (effectiveMode = 'none')
• Usuario no tiene nada configurado
• Si es PRINCIPIANTE → Ofrece crear plan con TRAINING_DESIGN_PLAN
• Si es INTERMEDIO/AVANZADO/ELITE → Pregunta: "¿Usas tu propia rutina? Puedo guardar tu horario y luego puedes agregar ejercicios cuando quieras"

⚡ DETECCIÓN AUTOMÁTICA Y ACCIÓN DIRECTA:
🚨 REGLA CRÍTICA: Cuando el usuario describe su horario de entrenamiento con días y músculos:
- Ejemplo: "lunes pecho, martes espalda, jueves piernas"
- Ejemplo: "entreno 4 días: push, pull, legs, upper"
- Ejemplo: "mi rutina es pecho lunes, espalda miércoles, piernas viernes"
→ NO preguntes "¿quieres que active el modo personalizado?"
→ ACTÚA DIRECTAMENTE: Llama TRAINING_SET_EXTERNAL_SCHEDULE con el horario
→ Confirma: "¡Listo! Tu plan personalizado: Lunes → Pecho, Martes → Espalda... Puedes agregar ejercicios específicos en GYM → ESTRUCTURA cuando quieras"

Si el usuario dice "entreno por mi cuenta", "ya tengo mi rutina", "no quiero el módulo GYM":
→ Usa TRAINING_SET_EXTERNAL_MODE(enabled=true)
→ Pregunta: "¿Cuántos días y qué trabajas cada día?"
→ Cuando responda, llama TRAINING_SET_EXTERNAL_SCHEDULE directamente

🎯 AGREGAR EJERCICIOS A PLAN PERSONALIZADO:
Si el usuario tiene un horario personalizado y quiere agregar ejercicios:
→ Explica: "Ve a GYM → ESTRUCTURA y selecciona el día que quieras detallar, o dime qué ejercicios quieres agregar a cada día"
→ Si el usuario da ejercicios específicos: Usa GYM_ADD_EXERCISE con el training_day correspondiente
→ Después de agregar, puedes configurar series con GYM_UPDATE_SERIES_DETAIL

🗑️ ELIMINAR DÍAS DEL PLAN PERSONALIZADO:
Cuando el usuario diga "elimina el lunes", "quita el día de piernas", "ya no entreno los martes":
→ Usa TRAINING_REMOVE_EXTERNAL_DAY con el nombre del día
→ Confirma qué días quedan en su plan

💪 CONFIGURAR EJERCICIOS A DETALLE:
Cuando el usuario quiere configurar series específicas:
→ GYM_ADD_EXERCISE: Agregar ejercicio a un día
→ GYM_UPDATE_SERIES_DETAIL: Modificar reps, peso, RIR, tempo, descanso de una serie
→ GYM_REPLACE_EXERCISE: Cambiar un ejercicio por otro

⚠️ NUNCA digas "no tienes entrenamiento" a un usuario nivel INTERMEDIO o superior
⚠️ NUNCA preguntes confirmación para guardar datos que el usuario ya te dio

[PLAN BUILDER - INSTRUCCIONES CRÍTICAS]
${
  context.planBuilderActive
    ? `⚡ PLAN BUILDER ACTIVO - Estado actual:
• Comidas: ${context.planBuilderSummary?.mealsCount || 0}
• Suplementos: ${context.planBuilderSummary?.supplementsCount || 0}
• Entrenamiento: ${context.planBuilderSummary?.training ? `${context.planBuilderSummary.training.goal} | ${context.planBuilderSummary.training.level} | ${context.planBuilderSummary.training.frequency} días/semana` : 'No configurado'}
${context.planBuilderSummary?.meals?.map((m) => `  📍 ${m.time} - ${m.name || 'Sin nombre'} (${m.ingredientsCount} ingredientes)`).join('\n') || ''}
${context.planBuilderSummary?.supplements?.map((s) => `  💊 ${s.name} - ${s.dose}`).join('\n') || ''}`
    : '📋 Plan Builder INACTIVO'
}

🚨 FLUJO OBLIGATORIO para crear PLAN COMPLETO (nutrición + suplementación + entrenamiento):

**PASO 0 - OBTENER CONTEXTO DEL USUARIO:**
ANTES de crear cualquier plan, llama GET_FULL_USER_CONTEXT para conocer:
• Peso, altura, edad, objetivo (bulking, cutting, recomp)
• Nivel de experiencia y frecuencia de entrenamiento actual
• Historial de progreso y fotos si existen

**PASO 1 - RECOPILAR INFO COMPLETA DE NUTRICIÓN:**
Pregunta por TODAS las categorías de alimentos:
• 🥩 PROTEÍNAS: ¿Qué carnes/pescados/huevos prefiere? (pollo, res, cerdo, pescado, huevos, etc.)
• 🍚 CARBOHIDRATOS: ¿Qué carbos prefiere? (arroz, papa, camote, avena, quinua, etc.)
• 🥑 GRASAS: ¿Qué grasas saludables? (palta/aguacate, aceite de oliva, frutos secos, etc.)
• 🥦 VEGETALES: ¿Qué verduras? (brócoli, espinaca, tomate, pepino, etc.)
• 💊 SUPLEMENTOS: ¿Qué toma? (proteína, creatina, pre-entreno, omega3, multivitamínico)
• ⏰ HORARIOS: Primera y última comida, hora de entrenamiento
• 🏋️ ENTRENAMIENTO: ¿Cuántos días a la semana?

Si el usuario dice "tú decide" o "a tu criterio":
→ Usa ingredientes TÍPICOS Y ECONÓMICOS de PERÚ:
  • Proteínas: pollo, huevos, pescado (bonito, jurel), res
  • Carbos: arroz, papa, camote, quinua, avena, menestras (lentejas, frejoles)
  • Grasas: palta, aceite de oliva, maní, pecanas
  • Vegetales: brócoli, espinaca, tomate, pepino, zanahoria, vainitas
  • Frutas: plátano, manzana, naranja, papaya, mango

**PASO 2 - CALCULAR MACROS SEGÚN OBJETIVO:**
Basado en los datos del usuario:
• BULKING (ganar masa): +300-500 kcal sobre mantenimiento, 2g proteína/kg, 4-6g carbos/kg
• CUTTING (perder grasa): -300-500 kcal bajo mantenimiento, 2.2g proteína/kg, 2-3g carbos/kg  
• RECOMP (recomposición): calorías en mantenimiento, 2g proteína/kg, 3-4g carbos/kg
• Grasas: 0.8-1g/kg para todos

**PASO 3 - ARMAR COMIDAS COMPLETAS:**
CADA comida debe tener los 4 macros:
• Proteína principal (150-250g según comida)
• Carbohidrato (100-200g según hora del día)
• Grasa saludable (si no hay suficiente en la proteína)
• Vegetales (mínimo 100g por comida principal)

Ejemplo de comida completa:
"Almuerzo: 200g pollo a la plancha + 150g arroz + 100g brócoli + 1/2 palta"

**PASO 4 - MOSTRAR PREVIEW DETALLADO:**
⚠️ OBLIGATORIO: Muestra el plan COMPLETO antes de ejecutar:
"📋 PLAN PERSONALIZADO PARA [nombre]:
📊 Macros objetivo: Xg proteína | Xg carbos | Xg grasa | X kcal

🍽️ COMIDAS (X en total):
• 08:00 - Post-entreno: 30g proteína isolatada + 1 plátano + 5g creatina
• 10:00 - Desayuno: 3 huevos + 100g avena + 1/2 palta
• 13:00 - Almuerzo: 200g pollo + 150g arroz + 100g brócoli + ensalada
• 17:00 - Merienda: 150g atún + 150g camote + vegetales
• 20:00 - Cena: 200g pescado + 100g quinua + ensalada mixta
• 22:30 - Pre-sueño: 200g yogurt griego + 30g maní

💊 SUPLEMENTOS:
• Pre-entreno (7:30): [lista]
• Post-entreno: Creatina 5g, Proteína 30g
• Con desayuno: Omega 3, Multivitamínico

🏋️ ENTRENAMIENTO: X días/semana - [tipo de rutina]

¿Confirmo este plan?"

**PASO 5 - EJECUTAR SOLO DESPUÉS DE CONFIRMACIÓN:**
Cuando el usuario diga "sí", "dale", "confirmo", "listo", "perfecto":

🔥 EJECUCIÓN UNIFICADA (TODO EN SECUENCIA):
1. PLAN_BUILDER_START(clearExisting=true)
2. PLAN_BUILDER_ADD_MEAL para CADA comida con TODOS sus ingredientes
3. PLAN_BUILDER_ADD_SUPPLEMENT para CADA suplemento  
4. PLAN_BUILDER_SET_TRAINING(goal, level, frequency) si incluye entrenamiento
5. PLAN_BUILDER_EXECUTE → Guarda TODO: comidas + suplementos + asigna entrenamiento

⚡ ALTERNATIVA RÁPIDA (si solo pidió entrenamiento sin nutrición):
→ Usa TRAINING_DESIGN_PLAN(goal, level, frequency) directamente

🎯 IMPORTANTE:
• TRAINING_DESIGN_PLAN puede auto-detectar goal/level/frequency del perfil del usuario
• Si el usuario ya tiene datos en su TRENS ID, puedes llamar TRAINING_DESIGN_PLAN sin parámetros
• Ejemplo: Usuario dice "hazme un plan de entrenamiento" → TRAINING_DESIGN_PLAN() lee su perfil automáticamente

**REGLAS DE DISTRIBUCIÓN DE COMIDAS:**
• Post-entreno: Inmediatamente después del gym (proteína rápida + carbo simple)
• Desayuno: 1-2 horas después del entreno si es en ayunas
• Comidas principales: Cada 3-4 horas
• Pre-sueño: Proteína lenta (caseína, yogurt griego, huevos)
• Carbos: Más hacia las mañanas y post-entreno, menos en la noche

⛔ NUNCA crees comidas con SOLO proteína - siempre incluye carbos y vegetales
⛔ NUNCA ejecutes sin mostrar preview primero
⛔ NUNCA crees menos comidas de las que el usuario pidió

[SOLICITUDES PARCIALES - MANEJO INTELIGENTE]
El usuario puede solicitar:
1. 🏋️ SOLO ENTRENAMIENTO → Usa TRAINING_DESIGN_PLAN directamente
2. 🍽️ SOLO NUTRICIÓN → Usa PLAN_BUILDER con comidas (sin training)
3. 💊 SOLO SUPLEMENTACIÓN → Usa PLAN_BUILDER con suplementos (sin training)
4. 🔥 PLAN COMPLETO → Usa PLAN_BUILDER con todo (comidas + suplementos + training)

⚡ DETECTAR PLAN ACTUAL DEL USUARIO:
ANTES de crear cualquier plan, llama GET_FULL_USER_CONTEXT y analiza:

• Si "COMIDAS ACTUALES" muestra "Sin comidas" → Usuario NO tiene nutrición
• Si "STACK ACTUAL" muestra "Sin suplementos" → Usuario NO tiene suplementación  
• Si "ENTRENAMIENTO" muestra "0 días/semana" o "Sin rutina" → Usuario NO tiene entrenamiento

🎯 ESCENARIOS COMUNES:
• Usuario dice "crea mi plan de entrenamiento" → SOLO entrenamiento (TRAINING_DESIGN_PLAN)
• Usuario dice "arma mi dieta" → SOLO nutrición (PLAN_BUILDER + comidas)
• Usuario dice "qué suplementos tomar" → SOLO suplementación (PLAN_BUILDER + suplementos)
• Usuario dice "quiero mi plan completo" → Todo (PLAN_BUILDER + comidas + suplementos + training)

📝 AGREGAR A PLAN EXISTENTE:
• Si el usuario YA tiene nutrición pero pide entrenamiento → clearExisting=FALSE, solo agregar training
• Si el usuario YA tiene entrenamiento pero pide nutrición → clearExisting=FALSE, solo agregar comidas
• Si el usuario dice "reemplaza todo" o "hazme un plan nuevo" → clearExisting=TRUE

💡 EJEMPLO DE FLUJO INTELIGENTE:
1. Usuario: "Quiero entrenar"
2. Hank llama GET_FULL_USER_CONTEXT
3. Contexto muestra: 4 comidas, 3 suplementos, 0 días de entrenamiento
4. Hank responde: "Veo que ya tienes tu nutrición y stack configurados. Solo te falta el entrenamiento. ¿Cuántos días puedes ir al gym?"
5. Usuario: "5 días"
6. Hank llama TRAINING_DESIGN_PLAN(goal=auto-detect, level=auto-detect, frequency=5)

[📸 ANÁLISIS VISUAL DE FOTOS DE PROGRESO]
${
  context.progressPhotos && context.progressPhotos.length > 0
    ? `🔥 TIENES ACCESO A ${context.progressPhotos.length} FOTO(S) DE PROGRESO DEL USUARIO
    
Las imágenes adjuntas son FOTOS REALES del cuerpo del usuario. ANALÍZALAS para:

📊 EVALUACIÓN FÍSICA (observa en las fotos):
• Distribución de grasa corporal (abdomen, espalda baja, pecho, brazos)
• Desarrollo muscular visible (hombros, pecho, espalda, brazos, piernas)
• Simetría muscular (izquierda vs derecha, superior vs inferior)
• Definición/vascularidad si es visible
• Postura general

🎯 USA ESTE ANÁLISIS PARA:
• Recomendar el plan de ENTRENAMIENTO más adecuado:
  - Si hay poca masa muscular → Hipertrofia, Full Body o Upper/Lower
  - Si hay grasa acumulada → Definición con cardio, más volumen
  - Si hay buena base → PPL avanzado o Bro Split
  - Si hay asimetría → Ejercicios unilaterales, trabajo correctivo

• Recomendar el plan de NUTRICIÓN correcto:
  - Si hay grasa excesiva → Cutting (déficit calórico)
  - Si está muy flaco → Bulking (superávit calórico)
  - Si tiene buena base → Recomposición (mantenimiento)
  
• Recomendar SUPLEMENTACIÓN apropiada:
  - Flaco/poco músculo → Creatina + proteína + carbos
  - Grasa alta → L-carnitina + proteína + termogénico suave
  - Intermedio → Stack estándar (creatina, proteína, omega3)

📝 DATOS DE LAS FOTOS:
${context.progressPhotos.map((p, i) => `• Foto ${i + 1}: ${p.date}${p.weight ? ` | ${p.weight}kg` : ''}${p.bodyFat ? ` | ${p.bodyFat}%` : ''}${p.notes ? ` | "${p.notes}"` : ''}`).join('\n')}

⚠️ IMPORTANTE:
• Sé ESPECÍFICO al describir lo que VES en las fotos
• NO inventes datos - describe solo lo observable
• Si el usuario pregunta "cómo me ves" o "analiza mi progreso", USA las fotos
• Compara fotos si hay más de una para mostrar progreso`
    : `📸 El usuario NO tiene fotos de progreso aún.
Si necesitas evaluar su físico para recomendar un plan, pídele que suba una foto desde TRENS ID.`
}

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
  // Plan Builder state
  planBuilderActive?: boolean;
  planBuilderSummary?: {
    mealsCount: number;
    supplementsCount: number;
    hasTraining?: boolean;
    meals: Array<{ time: string; name: string | undefined; ingredientsCount: number }>;
    supplements: Array<{ name: string; dose: string }>;
    training?: {
      goal: string;
      level: string;
      frequency: number;
    } | null;
  } | null;
  // Progress Photos - Para análisis visual
  progressPhotos?: Array<{
    id: string;
    url: string;
    date: string;
    weight?: number;
    bodyFat?: number;
    notes?: string;
  }>;
  // User Plan Context - Nutrición, stack, entrenamiento y biométricos
  userPlanContext?: {
    // Datos biométricos del usuario (ADN/Trens ID)
    biometrics: {
      weight?: number; // kg
      height?: number; // cm
      age?: number;
      bodyFat?: number; // %
      goal?: string; // bulking, cutting, recomp, maintenance
      sex?: string;
      activityLevel?: string;
      bmr?: number; // Basal metabolic rate
      tdee?: number; // Total daily energy expenditure
    } | null;
    meals: Array<{
      name: string;
      time: string;
      ingredients: string[];
      macros?: { calories: number; protein: number; carbs: number; fat: number };
    }>;
    supplements: Array<{ name: string; dose: string; time?: string; times?: string[] }>;
    training: {
      frequency: number;
      currentDay: number;
      routineNames: Record<string, string>;
    };
  } | null;
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

  // Preparar herramientas en formato Gemini (incluye GYM, PLAN, ADN + MOTO, SURF, AUTO)
  let geminiTools: GeminiToolDeclaration[];
  try {
    geminiTools = convertToGeminiTools(ALL_TOOL_DEFINITIONS);
    console.warn(`📦 Herramientas convertidas: ${geminiTools.length}`);
  } catch (convertError) {
    console.warn('❌ Error al convertir herramientas:', convertError);
    throw new Error(`Tool conversion failed: ${(convertError as Error).message}`);
  }

  // 🔍 DEBUG: Log herramientas disponibles
  console.warn(`📦 Herramientas enviadas a Gemini: ${geminiTools.length}`);

  // 🔍 DEBUG: Detectar si es un comando de acción
  const lowerMessage = userMessage.toLowerCase();

  // Detectar si el usuario está preguntando sobre su físico, progreso o planes
  // En estos casos, incluiremos las fotos de progreso
  const isPhysiqueQuestion =
    /c[oó]mo me ve|analiza|progreso|f[ií]sico|cuerpo|m[uú]sculo|grasa|definici[oó]n|foto|imagen|plan.*entrena|qu[eé] rutina|qu[eé] plan|recomien/i.test(
      lowerMessage
    );

  // Preparar fotos si hay y si es relevante
  let photosParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  if (context.progressPhotos && context.progressPhotos.length > 0 && isPhysiqueQuestion) {
    console.warn(
      `📸 Pregunta sobre físico detectada, preparando ${context.progressPhotos.length} fotos...`
    );
    photosParts = await prepareProgressPhotosForGemini(context.progressPhotos);
  }

  // Construir las partes del mensaje del usuario
  const userMessageParts: GeminiMessage['parts'] = [];

  // Primero el texto
  userMessageParts.push({ text: userMessage });

  // Después las fotos si las hay
  if (photosParts.length > 0) {
    console.warn(`📸 Incluyendo ${photosParts.length} fotos en el mensaje`);
    userMessageParts.push(...photosParts);
  }

  // Construir el historial con el nuevo mensaje
  const messages: GeminiMessage[] = [
    ...conversationHistory,
    {
      role: 'user',
      parts: userMessageParts,
    },
  ];

  // Detectar si es una CONFIRMACIÓN para ejecutar plan (solo entonces forzar herramientas)
  const isPlanConfirmation =
    /^(s[ií]|dale|ok|okey|está bien|confirmo|hazlo|ejecuta|crea|aplica|guarda)/i.test(
      lowerMessage.trim()
    ) &&
    (context.planBuilderActive ||
      conversationHistory.some((m) =>
        m.parts.some(
          (p) =>
            'text' in p &&
            typeof p.text === 'string' &&
            (p.text.includes('comida') || p.text.includes('suplemento') || p.text.includes('plan'))
        )
      ));

  // Comandos de acción que SÍ deben forzar herramientas (excepto si están hablando de plan de nutrición)
  const isNutritionPlanContext =
    /comida|nutrici[oó]n|dieta|suplemento|meal|stack/i.test(lowerMessage) ||
    conversationHistory
      .slice(-4)
      .some((m) =>
        m.parts.some(
          (p) =>
            'text' in p &&
            typeof p.text === 'string' &&
            /comida|nutrici[oó]n|dieta|suplemento|plan/.test(p.text)
        )
      );

  const isActionCommand =
    !isNutritionPlanContext &&
    /quita|elimina|agrega|añade|cambia|sube|baja|modifica|actualiza/i.test(lowerMessage);

  // Solo forzar ANY si es confirmación de plan O es comando de acción fuera de contexto de nutrición
  const shouldForceTools = isPlanConfirmation || isActionCommand;

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
        // 🔧 FIX: Usar ANY solo para confirmaciones de plan o comandos de acción directos
        mode: shouldForceTools ? 'ANY' : 'AUTO',
      },
    },
    generationConfig: {
      temperature: 0.3, // 🔧 FIX: Reducir temperatura para respuestas más deterministas
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  console.warn(
    `🔧 Mode: ${shouldForceTools ? 'ANY (forzado)' : 'AUTO'}, isPlanConfirmation: ${isPlanConfirmation}, isNutritionContext: ${isNutritionPlanContext}`
  );

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
      // Log detallado del error para debugging
      console.warn('⚠️ Gemini API respondió con error:', response.status);
      console.warn('⚠️ Error detallado:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
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

// ============================================================================
// HELPER: Continue with MORE tool calls after initial execution
// Used for Plan Builder flow where multiple tools need to be called in sequence
// ============================================================================
export async function continueWithMoreTools(
  originalMessage: string,
  toolResults: Array<{ toolName: string; result: Record<string, unknown> }>,
  context: GeminiContext,
  apiKey: string,
  additionalInstruction?: string,
  conversationHistory?: GeminiMessage[]
): Promise<GeminiResult> {
  // Preparar herramientas en formato Gemini (incluye GYM, PLAN, ADN + MOTO, SURF, AUTO)
  const geminiTools = convertToGeminiTools(ALL_TOOL_DEFINITIONS);

  // Construir historial incluyendo la conversación previa
  const messages: GeminiMessage[] = [
    // Incluir historial de conversación para que Gemini recuerde lo acordado
    ...(conversationHistory || []),
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
      parts: [
        ...toolResults.map((tr) => ({
          functionResponse: {
            name: tr.toolName,
            response: tr.result,
          },
        })),
        ...(additionalInstruction ? [{ text: additionalInstruction }] : []),
      ],
    },
  ];

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
        mode: 'ANY', // Forzar uso de herramientas
      },
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  };

  try {
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
      return { message: '✅ Listo', toolCalls: [] };
    }

    const data: GeminiResponse = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
      return { message: '✅ Listo', toolCalls: [] };
    }

    const parts = candidate.content.parts;
    const toolCalls: HankToolCall[] = [];
    let textMessage = '';

    for (const part of parts) {
      if (part.functionCall) {
        toolCalls.push({
          tool: part.functionCall.name as HankToolName,
          parameters: part.functionCall.args,
        });
      } else if (part.text) {
        textMessage += part.text;
      }
    }

    console.warn(`🔄 continueWithMoreTools: ${toolCalls.length} nuevas herramientas`);

    return {
      message: textMessage || (toolCalls.length > 0 ? '🔧 Ejecutando...' : '✅ Listo'),
      toolCalls,
    };
  } catch {
    return { message: '✅ Listo', toolCalls: [] };
  }
}
