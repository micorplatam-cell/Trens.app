// ============================================================================
// AXIS TOOLS - Las 'manos' de la IA (Conexión con Supabase)
// Sistema completo de herramientas para el Agente AXIS
// ============================================================================

import { supabase } from '../../lib/supabase';
import type { AxisToolResult, ToolDefinition } from '../../types/axis';

// ============================================================================
// TIPOS INTERNOS
// ============================================================================
interface UserAsset {
  id: string;
  user_id: string;
  asset_type: string;
  name: string;
  asset_url?: string;
  metadata?: Record<string, unknown>;
  training_days?: number[];
  order?: number;
  deleted_at?: string | null;
}

interface AssetTemplate {
  id: string;
  asset_type: string;
  name: string;
  description?: string;
  image_url?: string;
  default_metadata?: Record<string, unknown>;
  category?: string;
  difficulty?: string;
}

// ============================================================================
// GYM TOOL: Agregar Ejercicio
// ============================================================================
export async function gymAddExercise(
  userId: string,
  exerciseName: string,
  trainingDay: number,
  customSeries?: Array<{ reps: number; weight: number; type: string }>
): Promise<AxisToolResult> {
  try {
    // Buscar template del ejercicio
    const { data: template, error: templateError } = await supabase
      .from('asset_templates')
      .select('*')
      .eq('asset_type', 'gym_exercise')
      .ilike('name', `%${exerciseName}%`)
      .limit(1)
      .single();

    if (templateError || !template) {
      return {
        success: false,
        message: `No encontré el ejercicio "${exerciseName}" en el catálogo.`,
      };
    }

    const typedTemplate = template as AssetTemplate;

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('user_assets')
      .select('id, training_days')
      .eq('user_id', userId)
      .eq('name', typedTemplate.name)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      const existingAsset = existing as UserAsset;
      const currentDays = existingAsset.training_days || [];
      if (currentDays.includes(trainingDay)) {
        return {
          success: false,
          message: `${typedTemplate.name} ya está en el día ${trainingDay + 1}.`,
        };
      }

      const updatedDays = [...new Set([...currentDays, trainingDay])];
      const { error } = await supabase
        .from('user_assets')
        .update({ training_days: updatedDays })
        .eq('id', existingAsset.id);

      if (error) throw error;

      return {
        success: true,
        message: `✅ ${typedTemplate.name} añadido al día ${trainingDay + 1}`,
        affectedRecords: 1,
      };
    }

    // Crear nuevo ejercicio
    const defaultSeries = customSeries || [
      { id: '1', reps: 12, type: 'WARMUP', weight: 0 },
      { id: '2', reps: 10, type: 'EFFECTIVE', weight: 0 },
      { id: '3', reps: 10, type: 'EFFECTIVE', weight: 0 },
      { id: '4', reps: 10, type: 'EFFECTIVE', weight: 0 },
    ];

    const { data, error } = await supabase
      .from('user_assets')
      .insert({
        user_id: userId,
        asset_type: 'gym_exercise',
        name: typedTemplate.name,
        asset_url: typedTemplate.image_url,
        training_days: [trainingDay],
        metadata: {
          ...typedTemplate.default_metadata,
          custom_series: defaultSeries,
          category: typedTemplate.category,
          difficulty: typedTemplate.difficulty,
        },
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `✅ ${typedTemplate.name} agregado al día ${trainingDay + 1}`,
      data: { exerciseId: (data as UserAsset).id },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('gymAddExercise error:', error);
    return { success: false, message: 'Error al agregar ejercicio.' };
  }
}

// ============================================================================
// GYM TOOL: Eliminar Ejercicio
// ============================================================================
export async function gymRemoveExercise(
  userId: string,
  exerciseName: string,
  trainingDay?: number,
  deleteCompletely = false
): Promise<AxisToolResult> {
  try {
    const { data: exercise, error } = await supabase
      .from('user_assets')
      .select('*')
      .eq('user_id', userId)
      .eq('asset_type', 'gym_exercise')
      .ilike('name', `%${exerciseName}%`)
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (error || !exercise) {
      return {
        success: false,
        message: `No encontré "${exerciseName}" en tu rutina.`,
      };
    }

    const typedExercise = exercise as UserAsset;

    if (deleteCompletely || trainingDay === undefined) {
      // Soft delete
      const { error: deleteError } = await supabase
        .from('user_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', typedExercise.id);

      if (deleteError) throw deleteError;

      return {
        success: true,
        message: `🗑️ ${typedExercise.name} eliminado de tu rutina`,
        rollbackId: typedExercise.id,
        affectedRecords: 1,
      };
    }

    // Solo quitar de un día específico
    const currentDays = typedExercise.training_days || [];
    const updatedDays = currentDays.filter(d => d !== trainingDay);

    if (updatedDays.length === 0) {
      // Era el único día, hacer soft delete
      const { error: deleteError } = await supabase
        .from('user_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', typedExercise.id);

      if (deleteError) throw deleteError;

      return {
        success: true,
        message: `🗑️ ${typedExercise.name} eliminado (era el único día)`,
        affectedRecords: 1,
      };
    }

    const { error: updateError } = await supabase
      .from('user_assets')
      .update({ training_days: updatedDays })
      .eq('id', typedExercise.id);

    if (updateError) throw updateError;

    return {
      success: true,
      message: `✅ ${typedExercise.name} quitado del día ${trainingDay + 1}`,
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('gymRemoveExercise error:', error);
    return { success: false, message: 'Error al eliminar ejercicio.' };
  }
}

// ============================================================================
// GYM TOOL: Reemplazar Ejercicio
// ============================================================================
export async function gymReplaceExercise(
  userId: string,
  oldExerciseName: string,
  newExerciseName: string,
  trainingDay?: number
): Promise<AxisToolResult> {
  // Primero eliminar
  const removeResult = await gymRemoveExercise(userId, oldExerciseName, trainingDay, trainingDay === undefined);
  if (!removeResult.success) return removeResult;

  // Luego agregar
  const addResult = await gymAddExercise(userId, newExerciseName, trainingDay ?? 0);
  if (!addResult.success) {
    return {
      success: false,
      message: `Quité ${oldExerciseName} pero no pude agregar ${newExerciseName}: ${addResult.message}`,
    };
  }

  return {
    success: true,
    message: `✅ Cambiado: ${oldExerciseName} → ${newExerciseName}`,
    affectedRecords: 2,
  };
}

// ============================================================================
// GYM TOOL: Listar Ejercicios
// ============================================================================
export async function gymListExercises(
  userId: string,
  trainingDay?: number
): Promise<AxisToolResult> {
  try {
    const { data, error } = await supabase
      .from('user_assets')
      .select('*')
      .eq('user_id', userId)
      .eq('asset_type', 'gym_exercise')
      .is('deleted_at', null)
      .order('order', { ascending: true });

    if (error) throw error;

    let exercises = (data || []) as UserAsset[];

    if (trainingDay !== undefined) {
      exercises = exercises.filter(ex =>
        (ex.training_days || []).includes(trainingDay)
      );
    }

    const summary = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      days: ex.training_days,
      series: (ex.metadata as Record<string, unknown>)?.custom_series
        ? (
          (ex.metadata as Record<string, unknown>).custom_series as unknown[]
        ).length
        : 0,
      category: (ex.metadata as Record<string, unknown>)?.category,
    }));

    return {
      success: true,
      message:
        trainingDay !== undefined
          ? `📋 Día ${trainingDay + 1}: ${exercises.length} ejercicios`
          : `📋 Total: ${exercises.length} ejercicios`,
      data: { exercises: summary },
    };
  } catch (error) {
    console.error('gymListExercises error:', error);
    return { success: false, message: 'Error al listar ejercicios.' };
  }
}

// ============================================================================
// ASSET TOOL: Leer Schema de Templates (LIQUID DATA)
// ============================================================================
export async function assetGetSchema(assetType: string): Promise<AxisToolResult> {
  try {
    const { data: template, error } = await supabase
      .from('asset_templates')
      .select('*')
      .eq('asset_type', assetType)
      .limit(1)
      .single();

    if (error || !template) {
      return {
        success: false,
        message: `No encontré templates para "${assetType}"`,
      };
    }

    const typedTemplate = template as AssetTemplate;
    const liquidFields = typedTemplate.default_metadata
      ? Object.keys(typedTemplate.default_metadata)
      : [];

    return {
      success: true,
      message: `📋 Campos disponibles para ${assetType}`,
      data: {
        assetType,
        staticFields: ['id', 'name', 'asset_url', 'order', 'training_days'],
        liquidFields,
        example: typedTemplate.default_metadata,
      },
    };
  } catch (error) {
    console.error('assetGetSchema error:', error);
    return { success: false, message: 'Error obteniendo schema.' };
  }
}

// ============================================================================
// ASSET TOOL: Actualizar Campo Dinámico (LIQUID DATA)
// ============================================================================
export async function assetUpdateField(
  userId: string,
  assetId: string | undefined,
  assetName: string | undefined,
  fieldPath: string,
  newValue: unknown,
  operation: 'set' | 'increment' | 'decrement' = 'set'
): Promise<AxisToolResult> {
  try {
    // Buscar asset
    let query = supabase
      .from('user_assets')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (assetId) {
      query = query.eq('id', assetId);
    } else if (assetName) {
      query = query.ilike('name', `%${assetName}%`);
    } else {
      return { success: false, message: 'Necesito assetId o assetName.' };
    }

    const { data: asset, error } = await query.limit(1).single();

    if (error || !asset) {
      return { success: false, message: 'Asset no encontrado.' };
    }

    const typedAsset = asset as UserAsset;
    const currentMetadata = (typedAsset.metadata || {}) as Record<string, unknown>;
    const pathParts = fieldPath.split('.');

    // Navegar estructura anidada
    let target = currentMetadata;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) {
        target[pathParts[i]] = {};
      }
      target = target[pathParts[i]] as Record<string, unknown>;
    }

    const finalKey = pathParts[pathParts.length - 1];
    const currentValue = target[finalKey];

    // Aplicar operación
    switch (operation) {
      case 'set':
        target[finalKey] = newValue;
        break;
      case 'increment':
        target[finalKey] = (Number(currentValue) || 0) + Number(newValue);
        break;
      case 'decrement':
        target[finalKey] = (Number(currentValue) || 0) - Number(newValue);
        break;
    }

    const { error: updateError } = await supabase
      .from('user_assets')
      .update({ metadata: currentMetadata })
      .eq('id', typedAsset.id);

    if (updateError) throw updateError;

    return {
      success: true,
      message: `✅ ${typedAsset.name}: ${fieldPath} = ${String(target[finalKey])}`,
      data: {
        assetId: typedAsset.id,
        field: fieldPath,
        oldValue: currentValue,
        newValue: target[finalKey],
      },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('assetUpdateField error:', error);
    return { success: false, message: 'Error actualizando campo.' };
  }
}

// ============================================================================
// ASSET TOOL: Leer Asset Completo
// ============================================================================
export async function assetRead(
  userId: string,
  assetId?: string,
  assetName?: string,
  assetType?: string
): Promise<AxisToolResult> {
  try {
    let query = supabase
      .from('user_assets')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (assetId) query = query.eq('id', assetId);
    if (assetName) query = query.ilike('name', `%${assetName}%`);
    if (assetType) query = query.eq('asset_type', assetType);

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: `📋 Encontrados: ${data?.length || 0} assets`,
      data: { assets: data },
    };
  } catch (error) {
    console.error('assetRead error:', error);
    return { success: false, message: 'Error leyendo assets.' };
  }
}

// ============================================================================
// DIET TOOL: Actualizar Calorías de Comida
// ============================================================================
export async function dietAddCalories(
  userId: string,
  mealName: string,
  caloriesChange: number
): Promise<AxisToolResult> {
  try {
    const { data: meal, error } = await supabase
      .from('user_assets')
      .select('*')
      .eq('user_id', userId)
      .eq('asset_type', 'diet_meal')
      .ilike('name', `%${mealName}%`)
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (error || !meal) {
      return { success: false, message: `No encontré la comida "${mealName}".` };
    }

    const typedMeal = meal as UserAsset;
    const currentMetadata = (typedMeal.metadata || {}) as Record<string, unknown>;
    const currentCalories = Number(currentMetadata.calories) || 0;
    const newCalories = currentCalories + caloriesChange;

    const { error: updateError } = await supabase
      .from('user_assets')
      .update({
        metadata: { ...currentMetadata, calories: newCalories },
      })
      .eq('id', typedMeal.id);

    if (updateError) throw updateError;

    const action = caloriesChange > 0 ? 'subió' : 'bajó';
    return {
      success: true,
      message: `✅ ${typedMeal.name}: ${action} ${Math.abs(caloriesChange)} kcal → ${newCalories} kcal`,
      data: { oldCalories: currentCalories, newCalories },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('dietAddCalories error:', error);
    return { success: false, message: 'Error modificando calorías.' };
  }
}

// ============================================================================
// LOGGING TOOL: Registrar Serie de Gym
// ============================================================================
export async function logWorkoutSet(
  sessionId: string,
  assetId: string,
  setDetails: { weight: number; reps: number; rir?: number }
): Promise<AxisToolResult> {
  try {
    const { error } = await supabase.from('workout_logs').insert({
      session_id: sessionId,
      asset_id: assetId,
      weight_kg: setDetails.weight,
      reps: setDetails.reps,
      rir: setDetails.rir,
      completed: true,
    });

    if (error) return { success: false, message: error.message };
    return { success: true, message: '✅ Serie registrada.' };
  } catch (error) {
    console.error('logWorkoutSet error:', error);
    return { success: false, message: 'Error registrando serie.' };
  }
}

// ============================================================================
// TOOL DEFINITIONS - Exportables para el LLM (Function Calling)
// ============================================================================
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'GYM_ADD_EXERCISE',
    description:
      'Agrega un ejercicio a la rutina del usuario. Usa cuando diga "agrega", "añade", "incluye" un ejercicio.',
    parameters: {
      exerciseName: {
        type: 'string',
        description: 'Nombre del ejercicio (ej: "Sentadilla Hack", "Press de Banca")',
        required: true,
      },
      trainingDay: {
        type: 'number',
        description: 'Día de entrenamiento (0 = día 1, 1 = día 2, etc.)',
        required: true,
      },
    },
    requiredParams: ['exerciseName', 'trainingDay'],
  },
  {
    name: 'GYM_REMOVE_EXERCISE',
    description:
      'Elimina un ejercicio de la rutina. Usa cuando diga "quita", "elimina", "saca" un ejercicio.',
    parameters: {
      exerciseName: {
        type: 'string',
        description: 'Nombre del ejercicio a eliminar',
        required: true,
      },
      trainingDay: {
        type: 'number',
        description: 'Día específico (omitir para eliminar de todos)',
        required: false,
      },
      deleteCompletely: {
        type: 'boolean',
        description: 'Si true, elimina de todos los días',
        default: false,
      },
    },
    requiredParams: ['exerciseName'],
  },
  {
    name: 'GYM_REPLACE_EXERCISE',
    description:
      'Reemplaza un ejercicio por otro. Usa cuando diga "cambia X por Y", "pon X en lugar de Y".',
    parameters: {
      oldExerciseName: {
        type: 'string',
        description: 'Ejercicio actual a reemplazar',
        required: true,
      },
      newExerciseName: {
        type: 'string',
        description: 'Nuevo ejercicio',
        required: true,
      },
      trainingDay: {
        type: 'number',
        description: 'Día específico (omitir para todos)',
        required: false,
      },
    },
    requiredParams: ['oldExerciseName', 'newExerciseName'],
  },
  {
    name: 'GYM_LIST_EXERCISES',
    description: 'Lista los ejercicios de la rutina. Usa cuando pregunte "qué tengo", "mi rutina".',
    parameters: {
      trainingDay: {
        type: 'number',
        description: 'Día específico (omitir para todos)',
        required: false,
      },
    },
    requiredParams: [],
  },
  {
    name: 'ASSET_UPDATE_FIELD',
    description:
      'Actualiza cualquier campo dinámico (JSONB) de un asset. Funciona para ejercicios, motos, comidas, etc.',
    parameters: {
      assetName: {
        type: 'string',
        description: 'Nombre del asset',
        required: true,
      },
      fieldPath: {
        type: 'string',
        description: 'Ruta del campo (ej: "calories", "tire_pressure.front")',
        required: true,
      },
      newValue: {
        type: 'string',
        description: 'Nuevo valor',
        required: true,
      },
      operation: {
        type: 'string',
        description: 'Operación: set, increment, decrement',
        enum: ['set', 'increment', 'decrement'],
        default: 'set',
      },
    },
    requiredParams: ['assetName', 'fieldPath', 'newValue'],
  },
  {
    name: 'ASSET_GET_SCHEMA',
    description:
      'Obtiene la estructura de campos disponibles para un tipo de asset (para saber qué campos editar).',
    parameters: {
      assetType: {
        type: 'string',
        description: 'Tipo de asset (gym_exercise, diet_meal, moto_vehicle, etc.)',
        required: true,
      },
    },
    requiredParams: ['assetType'],
  },
  {
    name: 'DIET_ADD_CALORIES',
    description:
      'Modifica las calorías de una comida. Usa cuando diga "súbele/bájale X calorías a la cena".',
    parameters: {
      mealName: {
        type: 'string',
        description: 'Nombre de la comida (ej: "cena", "desayuno")',
        required: true,
      },
      caloriesChange: {
        type: 'number',
        description: 'Cambio en calorías (positivo = subir, negativo = bajar)',
        required: true,
      },
    },
    requiredParams: ['mealName', 'caloriesChange'],
  },
];
