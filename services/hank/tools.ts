// ============================================================================
// HANK TOOLS - Las 'manos' de la IA (Conexión con Supabase)
// Sistema completo de herramientas para el Agente HANK
// ============================================================================

import { supabase } from '../../lib/supabase';
import type { HankToolResult, ToolDefinition } from '../../types/hank';
import { calculateMacrosWithAI } from './nutrition';

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

interface SeriesConfig {
  id: string;
  reps: number;
  weight: number;
  type: 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE';
  note?: string;
}

// ============================================================================
// HELPERS: Series por día
// ============================================================================

/**
 * Obtiene las series de un ejercicio para un día específico.
 * Maneja migración automática de custom_series legacy a series_by_day.
 */
function getSeriesForDay(metadata: Record<string, unknown>, trainingDay: number): SeriesConfig[] {
  // Nueva estructura: series_by_day
  const seriesByDay = metadata.series_by_day as Record<string, SeriesConfig[]> | undefined;
  if (seriesByDay && seriesByDay[String(trainingDay)]) {
    return seriesByDay[String(trainingDay)];
  }

  // Fallback: estructura legacy custom_series (mismas series para todos los días)
  const legacySeries = metadata.custom_series as SeriesConfig[] | undefined;
  if (legacySeries && legacySeries.length > 0) {
    return legacySeries;
  }

  // Default vacío
  return [];
}

/**
 * Establece las series de un ejercicio para un día específico.
 * Solo actualiza series_by_day - NO sobrescribir custom_series para evitar contaminación entre días.
 */
function setSeriesForDay(
  metadata: Record<string, unknown>,
  trainingDay: number,
  series: SeriesConfig[]
): Record<string, unknown> {
  // Inicializar series_by_day si no existe
  if (!metadata.series_by_day) {
    metadata.series_by_day = {};
  }

  const seriesByDay = metadata.series_by_day as Record<string, SeriesConfig[]>;
  seriesByDay[String(trainingDay)] = series;

  // NO actualizar custom_series - cada día tiene sus propias series
  // custom_series solo se mantiene como fallback de migración para datos antiguos

  return metadata;
}

/**
 * Series por defecto para un ejercicio nuevo
 */
function getDefaultSeries(): SeriesConfig[] {
  return [
    { id: '1', reps: 12, type: 'WARMUP', weight: 0 },
    { id: '2', reps: 10, type: 'EFFECTIVE', weight: 0 },
    { id: '3', reps: 10, type: 'EFFECTIVE', weight: 0 },
    { id: '4', reps: 10, type: 'EFFECTIVE', weight: 0 },
  ];
}

// ============================================================================
// GYM TOOL: Agregar Ejercicio
// ============================================================================
export async function gymAddExercise(
  userId: string,
  exerciseName: string,
  trainingDay: number,
  customSeries?: Array<{ reps: number; weight: number; type: string }>
): Promise<HankToolResult> {
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
    const defaultSeries = customSeries || getDefaultSeries();

    // Crear estructura series_by_day con las series para este día
    const seriesByDay: Record<string, SeriesConfig[]> = {
      [String(trainingDay)]: defaultSeries as SeriesConfig[],
    };

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
          series_by_day: seriesByDay,
          custom_series: defaultSeries, // Compatibilidad legacy
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
): Promise<HankToolResult> {
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
    const updatedDays = currentDays.filter((d) => d !== trainingDay);

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
): Promise<HankToolResult> {
  try {
    // 1. Buscar el ejercicio original para obtener su día y orden
    const { data: oldExercise, error: findError } = await supabase
      .from('user_assets')
      .select('*')
      .eq('user_id', userId)
      .eq('asset_type', 'gym_exercise')
      .ilike('name', `%${oldExerciseName}%`)
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (findError || !oldExercise) {
      return {
        success: false,
        message: `No encontré "${oldExerciseName}" en tu rutina.`,
      };
    }

    const typedOldExercise = oldExercise as UserAsset;
    const oldTrainingDays = typedOldExercise.training_days || [];
    const oldOrder = typedOldExercise.order ?? 0;

    // Determinar el día correcto
    const targetDay =
      trainingDay !== undefined && oldTrainingDays.includes(trainingDay)
        ? trainingDay
        : (oldTrainingDays[0] ?? 0);

    console.log(
      `🔄 Reemplazando ${typedOldExercise.name} → ${newExerciseName} en día ${targetDay}, orden ${oldOrder}`
    );

    // 2. Buscar template del nuevo ejercicio
    const { data: template, error: templateError } = await supabase
      .from('asset_templates')
      .select('*')
      .eq('asset_type', 'gym_exercise')
      .ilike('name', `%${newExerciseName}%`)
      .limit(1)
      .single();

    if (templateError || !template) {
      return {
        success: false,
        message: `No encontré el ejercicio "${newExerciseName}" en el catálogo.`,
      };
    }

    const typedTemplate = template as AssetTemplate;

    // 3. Verificar si el nuevo ejercicio ya existe en la DB del usuario
    const { data: existingNew } = await supabase
      .from('user_assets')
      .select('id, training_days, order')
      .eq('user_id', userId)
      .eq('name', typedTemplate.name)
      .is('deleted_at', null)
      .maybeSingle();

    // 4. Eliminar el ejercicio viejo
    if (oldTrainingDays.length === 1) {
      // Soft delete completo
      await supabase
        .from('user_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', typedOldExercise.id);
    } else {
      // Solo quitar del día específico
      const updatedDays = oldTrainingDays.filter((d) => d !== targetDay);
      await supabase
        .from('user_assets')
        .update({ training_days: updatedDays })
        .eq('id', typedOldExercise.id);
    }

    // 5. Agregar o actualizar el nuevo ejercicio
    if (existingNew) {
      // El ejercicio ya existe, solo agregamos el día y actualizamos el orden
      const existingAsset = existingNew as UserAsset;
      const currentDays = existingAsset.training_days || [];
      const updatedDays = [...new Set([...currentDays, targetDay])];

      await supabase
        .from('user_assets')
        .update({
          training_days: updatedDays,
          order: oldOrder, // Preservar el orden del ejercicio reemplazado
        })
        .eq('id', existingAsset.id);
    } else {
      // Crear nuevo ejercicio con el orden del viejo
      const defaultSeries = getDefaultSeries();

      // Crear estructura series_by_day
      const seriesByDay: Record<string, SeriesConfig[]> = {
        [String(targetDay)]: defaultSeries,
      };

      await supabase.from('user_assets').insert({
        user_id: userId,
        asset_type: 'gym_exercise',
        name: typedTemplate.name,
        asset_url: typedTemplate.image_url,
        training_days: [targetDay],
        order: oldOrder, // Preservar el orden
        metadata: {
          ...typedTemplate.default_metadata,
          series_by_day: seriesByDay,
          custom_series: defaultSeries, // Compatibilidad legacy
          category: typedTemplate.category,
          difficulty: typedTemplate.difficulty,
        },
      });
    }

    return {
      success: true,
      message: `✅ Cambiado: ${typedOldExercise.name} → ${typedTemplate.name} (día ${targetDay + 1})`,
      affectedRecords: 2,
    };
  } catch (error) {
    console.error('gymReplaceExercise error:', error);
    return { success: false, message: 'Error al reemplazar ejercicio.' };
  }
}

// ============================================================================
// GYM TOOL: Obtener Rutina del Día (nombre y ejercicios)
// ============================================================================
export async function gymGetTodayRoutine(
  userId: string,
  _trainingDayHint: number // Este hint puede estar desactualizado, calculamos el real
): Promise<HankToolResult> {
  try {
    // 1. Obtener datos del perfil con lógica de día actual
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'training_routine_names, training_frequency, training_current_day, training_last_access'
      )
      .eq('id', userId)
      .single();

    if (profileError) {
      console.warn('gymGetTodayRoutine: Error obteniendo perfil:', profileError.message);
    }

    // Calcular el día de entrenamiento correcto (misma lógica que GYM y PLAN)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    let trainingDay = profile?.training_current_day ?? 0;
    const frequency = profile?.training_frequency ?? 3;

    if (profile?.training_last_access) {
      const lastAccess = new Date(profile.training_last_access);
      lastAccess.setHours(0, 0, 0, 0);
      const lastAccessISO = lastAccess.toISOString();

      // Si han pasado uno o más días, avanzar al siguiente día
      if (todayISO > lastAccessISO) {
        trainingDay = (profile.training_current_day || 0) + 1;
        if (trainingDay >= frequency) {
          trainingDay = 0; // Reiniciar ciclo
        }

        // Actualizar en Supabase
        await supabase
          .from('profiles')
          .update({
            training_last_access: todayISO,
            training_current_day: trainingDay,
          })
          .eq('id', userId);

        console.warn(`🏋️ HANK: Día avanzado automáticamente a ${trainingDay}`);
      }
    }

    const routineNames = (profile?.training_routine_names || {}) as Record<string, string>;
    const routineName = routineNames[String(trainingDay)] || null;

    // 2. Obtener ejercicios del día
    const { data: exercises, error: exercisesError } = await supabase
      .from('user_assets')
      .select('name, metadata')
      .eq('user_id', userId)
      .eq('asset_type', 'gym_exercise')
      .is('deleted_at', null)
      .contains('training_days', [trainingDay])
      .order('order', { ascending: true });

    if (exercisesError) throw exercisesError;

    const exerciseCount = exercises?.length || 0;
    const exerciseNames = (exercises || []).map((ex) => ex.name);

    // 3. Construir mensaje
    let message = '';
    if (routineName) {
      message = `💪 Hoy toca: ${routineName}\n`;
    } else {
      message = `💪 Hoy es día de entrenamiento\n`;
    }

    if (exerciseCount > 0) {
      message += `\n🏋️ ${exerciseCount} ejercicios:\n`;
      exerciseNames.forEach((name, i) => {
        message += `${i + 1}. ${name}\n`;
      });
    } else {
      message += '\nNo tienes ejercicios programados. ¿Quieres que te agregue algunos?';
    }

    return {
      success: true,
      message: message.trim(),
      data: {
        routineName,
        trainingDay,
        frequency,
        exercises: exerciseNames,
      },
    };
  } catch (error) {
    console.error('gymGetTodayRoutine error:', error);
    return { success: false, message: 'Error al obtener la rutina del día.' };
  }
}

// ============================================================================
// GYM TOOL: Listar Ejercicios
// ============================================================================
export async function gymListExercises(
  userId: string,
  trainingDay?: number
): Promise<HankToolResult> {
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
      exercises = exercises.filter((ex) => (ex.training_days || []).includes(trainingDay));
    }

    if (exercises.length === 0) {
      return {
        success: true,
        message:
          trainingDay !== undefined
            ? 'No tienes ejercicios programados para hoy. ¿Quieres que te agregue algunos?'
            : 'No tienes ejercicios en tu rutina todavía.',
        data: { exercises: [] },
      };
    }

    // Crear lista legible de ejercicios con sus series
    const exerciseList = exercises.map((ex, index) => {
      const series = (ex.metadata as Record<string, unknown>)?.custom_series as
        | Array<{ reps: number; weight: number; type: string }>
        | undefined;
      const seriesCount = series?.length || 0;
      const seriesInfo =
        series && series.length > 0
          ? series.map((s) => `${s.reps}×${s.weight}kg`).join(', ')
          : 'sin series';
      return `${index + 1}. ${ex.name} (${seriesCount} series: ${seriesInfo})`;
    });

    const message =
      trainingDay !== undefined
        ? `🏋️ Hoy te toca:\n${exerciseList.join('\n')}`
        : `📋 Tu rutina completa:\n${exerciseList.join('\n')}`;

    return {
      success: true,
      message,
      data: {
        exercises: exercises.map((ex) => ({
          name: ex.name,
          series: (ex.metadata as Record<string, unknown>)?.custom_series
            ? ((ex.metadata as Record<string, unknown>).custom_series as unknown[]).length
            : 0,
        })),
      },
    };
  } catch (error) {
    console.error('gymListExercises error:', error);
    return { success: false, message: 'Error al listar ejercicios.' };
  }
}

// ============================================================================
// ASSET TOOL: Leer Schema de Templates (LIQUID DATA)
// ============================================================================
export async function assetGetSchema(assetType: string): Promise<HankToolResult> {
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
): Promise<HankToolResult> {
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
    const currentMetadata = JSON.parse(JSON.stringify(typedAsset.metadata || {})) as Record<
      string,
      unknown
    >;

    // Navegar al campo usando lodash-style path: "custom_series.0.weight"
    const pathParts = fieldPath.split('.');

    // Navegar hasta el penúltimo nivel
    let target: unknown = currentMetadata;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const key = pathParts[i];
      const isIndex = /^\d+$/.test(key);

      if (isIndex) {
        // Es un índice de array
        const idx = parseInt(key, 10);
        if (!Array.isArray(target)) {
          return {
            success: false,
            message: `Se esperaba un array en "${pathParts.slice(0, i).join('.')}"`,
          };
        }
        if (idx >= (target as unknown[]).length) {
          return {
            success: false,
            message: `Índice ${idx} fuera de rango. Hay ${(target as unknown[]).length} elementos (0-${(target as unknown[]).length - 1}).`,
          };
        }
        target = (target as unknown[])[idx];
      } else {
        // Es una key de objeto
        const obj = target as Record<string, unknown>;
        if (obj[key] === undefined) {
          obj[key] = {};
        }
        target = obj[key];
      }
    }

    // Aplicar cambio en el último nivel
    const finalKey = pathParts[pathParts.length - 1];
    const isIndexFinal = /^\d+$/.test(finalKey);

    let finalTarget: Record<string, unknown> | unknown[];
    let actualKey: string | number;

    if (isIndexFinal) {
      if (!Array.isArray(target)) {
        return { success: false, message: `Se esperaba un array para índice ${finalKey}` };
      }
      finalTarget = target as unknown[];
      actualKey = parseInt(finalKey, 10);
      if (actualKey >= finalTarget.length) {
        return {
          success: false,
          message: `Índice ${actualKey} fuera de rango. Hay ${finalTarget.length} elementos.`,
        };
      }
    } else {
      finalTarget = target as Record<string, unknown>;
      actualKey = finalKey;
    }

    const currentValue = (finalTarget as Record<string | number, unknown>)[actualKey];

    // Aplicar operación
    switch (operation) {
      case 'set':
        (finalTarget as Record<string | number, unknown>)[actualKey] = newValue;
        break;
      case 'increment':
        (finalTarget as Record<string | number, unknown>)[actualKey] =
          (Number(currentValue) || 0) + Number(newValue);
        break;
      case 'decrement':
        (finalTarget as Record<string | number, unknown>)[actualKey] =
          (Number(currentValue) || 0) - Number(newValue);
        break;
    }

    const { error: updateError } = await supabase
      .from('user_assets')
      .update({ metadata: currentMetadata })
      .eq('id', typedAsset.id);

    if (updateError) throw updateError;

    const finalValue = (finalTarget as Record<string | number, unknown>)[actualKey];

    return {
      success: true,
      message: `✅ ${typedAsset.name}: ${fieldPath} = ${String(finalValue)}`,
      data: {
        assetId: typedAsset.id,
        field: fieldPath,
        oldValue: currentValue,
        newValue: finalValue,
      },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('assetUpdateField error:', error);
    return { success: false, message: 'Error actualizando campo.' };
  }
}

// ============================================================================
// ASSET TOOL: Quitar Serie de un Ejercicio
// ============================================================================
export async function assetRemoveSeries(
  userId: string,
  assetName: string,
  seriesIndex: number | 'last' | 'first',
  trainingDay: number = 0
): Promise<HankToolResult> {
  try {
    // Buscar el asset
    const { data: asset, error: assetError } = await supabase
      .from('user_assets')
      .select('id, name, metadata, training_days')
      .eq('user_id', userId)
      .ilike('name', `%${assetName}%`)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (assetError || !asset) {
      return { success: false, message: `No encontré el ejercicio "${assetName}".` };
    }

    const typedAsset = asset as UserAsset;
    const currentMetadata = JSON.parse(JSON.stringify(typedAsset.metadata || {})) as Record<
      string,
      unknown
    >;

    // Obtener series del día específico
    const customSeries = getSeriesForDay(currentMetadata, trainingDay);

    if (customSeries.length === 0) {
      return {
        success: false,
        message: `${typedAsset.name} no tiene series para quitar en día ${trainingDay + 1}.`,
      };
    }

    if (customSeries.length === 1) {
      return {
        success: false,
        message: `${typedAsset.name} solo tiene 1 serie en día ${trainingDay + 1}. No puedo dejarla sin series.`,
      };
    }

    // Determinar índice a eliminar
    let indexToRemove: number;
    if (seriesIndex === 'last') {
      indexToRemove = customSeries.length - 1;
    } else if (seriesIndex === 'first') {
      indexToRemove = 0;
    } else {
      indexToRemove = seriesIndex;
    }

    if (indexToRemove < 0 || indexToRemove >= customSeries.length) {
      return {
        success: false,
        message: `Índice ${indexToRemove} fuera de rango. Hay ${customSeries.length} series (0-${customSeries.length - 1}).`,
      };
    }

    // Eliminar la serie
    const removedSeries = customSeries[indexToRemove];
    customSeries.splice(indexToRemove, 1);

    // Guardar en estructura por día
    setSeriesForDay(currentMetadata, trainingDay, customSeries);

    const { error: updateError } = await supabase
      .from('user_assets')
      .update({ metadata: currentMetadata })
      .eq('id', typedAsset.id);

    if (updateError) throw updateError;

    return {
      success: true,
      message: `✅ ${typedAsset.name}: Serie ${indexToRemove + 1} eliminada. Quedan ${customSeries.length} series.`,
      data: {
        assetId: typedAsset.id,
        removedSeries,
        remainingSeries: customSeries.length,
      },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('assetRemoveSeries error:', error);
    return { success: false, message: 'Error quitando serie.' };
  }
}

// ============================================================================
// ASSET TOOL: Agregar Serie a un Ejercicio
// ============================================================================
export async function assetAddSeries(
  userId: string,
  assetName: string,
  reps: number = 10,
  weight: number = 0,
  seriesType: 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE' = 'EFFECTIVE',
  position: 'end' | 'start' | number = 'end',
  trainingDay: number = 0
): Promise<HankToolResult> {
  try {
    // Buscar el asset
    const { data: asset, error: assetError } = await supabase
      .from('user_assets')
      .select('id, name, metadata, training_days')
      .eq('user_id', userId)
      .ilike('name', `%${assetName}%`)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (assetError || !asset) {
      return { success: false, message: `No encontré el ejercicio "${assetName}".` };
    }

    const typedAsset = asset as UserAsset;
    const currentMetadata = JSON.parse(JSON.stringify(typedAsset.metadata || {})) as Record<
      string,
      unknown
    >;

    // Obtener series del día específico
    const customSeries = getSeriesForDay(currentMetadata, trainingDay);

    // Crear nueva serie
    const newSeries: SeriesConfig = {
      id: String(Date.now()),
      reps,
      weight,
      type: seriesType,
      note: '',
    };

    // Agregar según posición
    if (typeof position === 'number') {
      // Insertar en posición específica (0-based index)
      const insertIndex = Math.max(0, Math.min(position, customSeries.length));
      customSeries.splice(insertIndex, 0, newSeries);
    } else if (position === 'start') {
      customSeries.unshift(newSeries);
    } else {
      customSeries.push(newSeries);
    }

    // Guardar en estructura por día
    setSeriesForDay(currentMetadata, trainingDay, customSeries);

    const { error: updateError } = await supabase
      .from('user_assets')
      .update({ metadata: currentMetadata })
      .eq('id', typedAsset.id);

    if (updateError) throw updateError;

    return {
      success: true,
      message: `✅ ${typedAsset.name} (día ${trainingDay + 1}): Nueva serie añadida (${reps} reps × ${weight}kg, tipo: ${seriesType}). Total: ${customSeries.length} series.`,
      data: {
        assetId: typedAsset.id,
        newSeries,
        totalSeries: customSeries.length,
      },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('assetAddSeries error:', error);
    return { success: false, message: 'Error agregando serie.' };
  }
}

// ============================================================================
// ASSET TOOL: Reemplazar Serie de un Ejercicio
// ============================================================================
export async function assetReplaceSeries(
  userId: string,
  assetName: string,
  seriesIndex: 'last' | 'first' | number,
  reps: number = 10,
  weight: number = 0,
  seriesType: 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE' = 'EFFECTIVE',
  trainingDay: number = 0
): Promise<HankToolResult> {
  try {
    // Buscar el asset
    const { data: asset, error: assetError } = await supabase
      .from('user_assets')
      .select('id, name, metadata, training_days')
      .eq('user_id', userId)
      .ilike('name', `%${assetName}%`)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (assetError || !asset) {
      return { success: false, message: `No encontré el ejercicio "${assetName}".` };
    }

    const typedAsset = asset as UserAsset;
    const currentMetadata = JSON.parse(JSON.stringify(typedAsset.metadata || {})) as Record<
      string,
      unknown
    >;

    // Obtener series del día específico
    const customSeries = getSeriesForDay(currentMetadata, trainingDay);

    if (customSeries.length === 0) {
      return {
        success: false,
        message: `${typedAsset.name} no tiene series para reemplazar en día ${trainingDay + 1}.`,
      };
    }

    // Determinar índice a reemplazar
    let indexToReplace: number;
    if (seriesIndex === 'last') {
      indexToReplace = customSeries.length - 1;
    } else if (seriesIndex === 'first') {
      indexToReplace = 0;
    } else {
      indexToReplace = seriesIndex;
    }

    if (indexToReplace < 0 || indexToReplace >= customSeries.length) {
      return {
        success: false,
        message: `Índice ${indexToReplace} fuera de rango. Hay ${customSeries.length} series (0-${customSeries.length - 1}).`,
      };
    }

    // Guardar la serie anterior y crear la nueva
    const oldSeries = { ...customSeries[indexToReplace] };
    const newSeries: SeriesConfig = {
      id: String(Date.now()),
      reps,
      weight,
      type: seriesType,
      note: '',
    };

    // Reemplazar la serie
    customSeries[indexToReplace] = newSeries;

    // Guardar en estructura por día
    setSeriesForDay(currentMetadata, trainingDay, customSeries);

    const { error: updateError } = await supabase
      .from('user_assets')
      .update({ metadata: currentMetadata })
      .eq('id', typedAsset.id);

    if (updateError) throw updateError;

    return {
      success: true,
      message: `✅ ${typedAsset.name} (día ${trainingDay + 1}): Serie ${indexToReplace + 1} reemplazada. Antes: ${oldSeries.reps} reps × ${oldSeries.weight}kg (${oldSeries.type}). Ahora: ${reps} reps × ${weight}kg (${seriesType}).`,
      data: {
        assetId: typedAsset.id,
        oldSeries,
        newSeries,
        seriesIndex: indexToReplace,
      },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('assetReplaceSeries error:', error);
    return { success: false, message: 'Error reemplazando serie.' };
  }
}

// ============================================================================
// ASSET TOOL: Establecer Todas las Series (Reemplaza todas)
// ============================================================================

export async function assetSetSeries(
  userId: string,
  assetName: string,
  series: SeriesConfig[],
  trainingDay: number = 0
): Promise<HankToolResult> {
  try {
    if (!series || series.length === 0) {
      return { success: false, message: 'Debes proporcionar al menos una serie.' };
    }

    // Buscar el asset
    const { data: asset, error: assetError } = await supabase
      .from('user_assets')
      .select('id, name, metadata, training_days')
      .eq('user_id', userId)
      .ilike('name', `%${assetName}%`)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (assetError || !asset) {
      return { success: false, message: `No encontré el ejercicio "${assetName}".` };
    }

    const typedAsset = asset as UserAsset;
    const currentMetadata = JSON.parse(JSON.stringify(typedAsset.metadata || {})) as Record<
      string,
      unknown
    >;

    // Crear nuevas series con IDs únicos
    const newSeries: SeriesConfig[] = series.map((s, index) => ({
      id: String(Date.now() + index),
      reps: s.reps,
      weight: s.weight,
      type: s.type,
      note: s.note || '',
    }));

    // Guardar en estructura por día
    setSeriesForDay(currentMetadata, trainingDay, newSeries);

    const { error: updateError } = await supabase
      .from('user_assets')
      .update({ metadata: currentMetadata })
      .eq('id', typedAsset.id);

    if (updateError) throw updateError;

    // Construir resumen de series
    const seriesSummary = newSeries
      .map((s, i) => `${i + 1}. ${s.reps} reps × ${s.weight}kg (${s.type})`)
      .join('\n');

    return {
      success: true,
      message: `✅ ${typedAsset.name} (día ${trainingDay + 1}): ${newSeries.length} series configuradas:\n${seriesSummary}`,
      data: {
        assetId: typedAsset.id,
        series: newSeries,
        totalSeries: newSeries.length,
      },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('assetSetSeries error:', error);
    return { success: false, message: 'Error configurando series.' };
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
): Promise<HankToolResult> {
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
): Promise<HankToolResult> {
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
): Promise<HankToolResult> {
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
// ADN TOOLS: Acceso al perfil y datos biométricos
// ============================================================================

/**
 * Obtiene el perfil completo del atleta (TRENS ID + medidas corporales)
 */
export async function adnGetProfile(userId: string): Promise<HankToolResult> {
  try {
    // Obtener perfil
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        message: 'No se encontró el perfil del atleta.',
      };
    }

    // Obtener medidas corporales
    const { data: measurements, error: measurementsError } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (measurementsError) {
      return {
        success: false,
        message: 'Error al obtener medidas corporales.',
      };
    }

    const dominantMuscle = measurements?.find((m) => m.is_dominant);

    const profileSummary = `
📋 PERFIL ATLETA:
• Objetivo: ${profile.goal}
• Peso: ${profile.weight}
• Altura: ${profile.height}
• Lesiones: ${profile.injuries}
• Alergias: ${profile.allergies}

💪 MEDIDAS CORPORALES:
${measurements && measurements.length > 0 ? measurements.map((m) => `• ${m.name}: ${m.value} ${m.is_dominant ? '👑' : ''}`).join('\n') : '• Sin medidas registradas'}

${dominantMuscle ? `\n🏆 MÚSCULO DOMINANTE: ${dominantMuscle.name} (${dominantMuscle.value})` : ''}
    `.trim();

    return {
      success: true,
      message: profileSummary,
      data: {
        profile,
        measurements: measurements || [],
        dominantMuscle,
      },
    };
  } catch (error) {
    console.error('adnGetProfile error:', error);
    return {
      success: false,
      message: 'Error al obtener perfil del atleta.',
    };
  }
}

/**
 * Obtiene los récords personales del atleta
 */
export async function adnGetRecords(userId: string): Promise<HankToolResult> {
  try {
    const { data: records, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .order('weight', { ascending: false });

    if (error) {
      return {
        success: false,
        message: 'Error al obtener récords personales.',
      };
    }

    if (!records || records.length === 0) {
      return {
        success: true,
        message: '🏋️ Aún no tienes récords registrados. ¡Es hora de romper algunos!',
        data: { records: [] },
      };
    }

    const recordsSummary = `
🏆 TUS RÉCORDS PERSONALES:
${records.map((r) => `${r.exercise_icon} ${r.exercise_name}: ${r.weight}kg x ${r.reps === 1 ? '1RM' : `${r.reps} reps`}`).join('\n')}
    `.trim();

    return {
      success: true,
      message: recordsSummary,
      data: { records },
    };
  } catch (error) {
    console.error('adnGetRecords error:', error);
    return {
      success: false,
      message: 'Error al obtener récords personales.',
    };
  }
}

/**
 * Actualiza un campo específico del perfil del atleta
 */
export async function adnUpdateProfile(
  userId: string,
  field: 'goal' | 'weight' | 'height' | 'injuries' | 'allergies' | 'display_name',
  value: string
): Promise<HankToolResult> {
  try {
    const fieldLabels: Record<string, string> = {
      goal: 'Objetivo',
      weight: 'Peso',
      height: 'Altura',
      injuries: 'Lesiones',
      allergies: 'Alergias',
      display_name: 'Nombre',
    };

    const { error } = await supabase
      .from('user_profiles')
      .update({ [field]: value })
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      message: `✅ ${fieldLabels[field]} actualizado a: ${value}`,
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('adnUpdateProfile error:', error);
    return {
      success: false,
      message: 'Error al actualizar perfil.',
    };
  }
}

/**
 * Agrega una medida corporal
 */
export async function adnAddMeasurement(
  userId: string,
  name: string,
  value: string,
  isDominant: boolean = false
): Promise<HankToolResult> {
  try {
    const { error } = await supabase.from('body_measurements').insert({
      user_id: userId,
      name: name.toUpperCase(),
      value,
      is_dominant: isDominant,
    });

    if (error) throw error;

    return {
      success: true,
      message: `✅ Medida agregada: ${name.toUpperCase()} = ${value}${isDominant ? ' 👑' : ''}`,
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('adnAddMeasurement error:', error);
    return {
      success: false,
      message: 'Error al agregar medida.',
    };
  }
}

/**
 * Elimina una medida corporal
 */
export async function adnRemoveMeasurement(
  userId: string,
  measurementName: string
): Promise<HankToolResult> {
  try {
    const { data, error } = await supabase
      .from('body_measurements')
      .delete()
      .eq('user_id', userId)
      .ilike('name', `%${measurementName}%`)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        success: false,
        message: `No encontré la medida "${measurementName}".`,
      };
    }

    return {
      success: true,
      message: `✅ Medida "${data[0].name}" eliminada.`,
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('adnRemoveMeasurement error:', error);
    return {
      success: false,
      message: 'Error al eliminar medida.',
    };
  }
}

// ============================================================================
// PLAN TOOLS - Nutrición y Farmacología
// ============================================================================

/**
 * Agrega una comida al plan nutricional
 * Usa la tabla meals con ingredients como JSONB
 * Calcula gramos automáticamente con IA basándose en macros
 */
export async function planAddMeal(
  userId: string,
  time: string,
  ingredients: Array<{ name: string; quantity?: string; portion?: string }>
): Promise<HankToolResult> {
  try {
    // Obtener contexto del usuario para cálculos personalizados
    let userContext: { goal?: string; weight?: number; mealCount?: number } = {};
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('weight, goal')
        .eq('user_id', userId)
        .single();

      if (profile) {
        // Extraer peso numérico (ej: '75 KG' -> 75)
        const weightMatch = profile.weight?.match(/(\d+)/);
        userContext = {
          weight: weightMatch ? parseInt(weightMatch[1]) : 75,
          goal: profile.goal || 'MANTENER',
          mealCount: 4, // Estimación típica
        };
      }
    } catch (e) {
      // Sin perfil, usar defaults
      userContext = { weight: 75, goal: 'MANTENER', mealCount: 4 };
    }

    // Calcular macros y gramos óptimos con IA
    const ingredientsWithId = ingredients.map((ing, idx) => ({
      id: `ing-${idx}`,
      name: ing.name,
      quantity: ing.quantity || '',
      portion: ing.portion || '',
    }));

    console.warn(
      '🧮 Calculando gramos óptimos para:',
      ingredientsWithId.map((i) => i.name)
    );
    const calculatedIngredients = await calculateMacrosWithAI(ingredientsWithId, userContext);

    // Formatear ingredientes como JSONB array con los gramos calculados
    const ingredientsJson = calculatedIngredients.map((ing, idx) => ({
      name: ing.name,
      quantity: ing.quantity || '~100g',
      portion: ing.portion || '',
      calories: ing.nutritionInfo?.calories,
      protein: ing.nutritionInfo?.protein,
      carbs: ing.nutritionInfo?.carbs,
      fat: ing.nutritionInfo?.fat,
      order: idx,
    }));

    // Crear nombre de comida basado en hora
    const hour = parseInt(time.split(':')[0], 10);
    let mealName = 'Comida';
    if (hour >= 5 && hour < 11) mealName = 'Desayuno';
    else if (hour >= 11 && hour < 15) mealName = 'Almuerzo';
    else if (hour >= 15 && hour < 18) mealName = 'Merienda';
    else if (hour >= 18 && hour < 22) mealName = 'Cena';
    else mealName = 'Snack';

    // Crear comida directamente en meals
    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        name: mealName,
        scheduled_time: time,
        ingredients: ingredientsJson,
        is_completed: false,
      })
      .select()
      .single();

    if (mealError) throw mealError;

    const ingredientNames = ingredients.map((i) => i.name).join(', ');

    return {
      success: true,
      message: `✅ ${mealName} agregado a las ${time}: ${ingredientNames}`,
      data: { mealId: mealData.id },
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('planAddMeal error:', error);
    return { success: false, message: 'Error al agregar comida.' };
  }
}

/**
 * Elimina una comida del plan
 */
export async function planRemoveMeal(
  userId: string,
  options: { mealId?: string; time?: string; position?: string }
): Promise<HankToolResult> {
  try {
    let mealId = options.mealId;

    if (!mealId) {
      // Find meal by time or position
      const { data: meals } = await supabase
        .from('meals')
        .select('id, time')
        .eq('user_id', userId)
        .order('time', { ascending: true });

      if (!meals || meals.length === 0) {
        return { success: false, message: 'No hay comidas para eliminar.' };
      }

      if (options.time) {
        const meal = meals.find((m) => m.time.startsWith(options.time!));
        if (meal) mealId = meal.id;
      } else if (options.position) {
        if (options.position === 'first') mealId = meals[0].id;
        else if (options.position === 'last') mealId = meals[meals.length - 1].id;
        else {
          const idx = parseInt(options.position, 10) - 1;
          if (meals[idx]) mealId = meals[idx].id;
        }
      }
    }

    if (!mealId) {
      return { success: false, message: 'No encontré la comida especificada.' };
    }

    const { error } = await supabase.from('meals').delete().eq('id', mealId);

    if (error) throw error;

    return {
      success: true,
      message: '✅ Comida eliminada del plan.',
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('planRemoveMeal error:', error);
    return { success: false, message: 'Error al eliminar comida.' };
  }
}

/**
 * Actualiza la hora de una comida
 */
export async function planUpdateMealTime(
  userId: string,
  newTime: string,
  options: { mealId?: string; position?: string; currentTime?: string }
): Promise<HankToolResult> {
  try {
    let mealId = options.mealId;
    let mealName = 'comida';

    // Buscar por hora actual si se proporciona
    if (!mealId && options.currentTime) {
      const { data: meals } = await supabase
        .from('meals')
        .select('id, name, scheduled_time')
        .eq('user_id', userId);

      if (meals && meals.length > 0) {
        // Buscar comida que coincida con la hora (formato flexible)
        const targetTime = options.currentTime.replace(/[^0-9:]/g, '');
        const meal = meals.find((m) => {
          const mealTime = m.scheduled_time?.slice(0, 5) || '';
          return mealTime === targetTime || mealTime.startsWith(targetTime.split(':')[0]);
        });
        if (meal) {
          mealId = meal.id;
          mealName = meal.name || 'comida';
        }
      }
    }

    // Buscar por posición si no se encontró por hora
    if (!mealId && options.position) {
      const { data: meals } = await supabase
        .from('meals')
        .select('id, name')
        .eq('user_id', userId)
        .order('scheduled_time', { ascending: true });

      if (meals && meals.length > 0) {
        if (options.position === 'first') {
          mealId = meals[0].id;
          mealName = meals[0].name || 'desayuno';
        } else if (options.position === 'last') {
          mealId = meals[meals.length - 1].id;
          mealName = meals[meals.length - 1].name || 'cena';
        } else {
          const idx = parseInt(options.position, 10) - 1;
          if (meals[idx]) {
            mealId = meals[idx].id;
            mealName = meals[idx].name || 'comida';
          }
        }
      }
    }

    // Si solo hay una comida, usarla directamente
    if (!mealId) {
      const { data: meals } = await supabase.from('meals').select('id, name').eq('user_id', userId);

      if (meals && meals.length === 1) {
        mealId = meals[0].id;
        mealName = meals[0].name || 'comida';
      }
    }

    if (!mealId) {
      return {
        success: false,
        message:
          'No encontré la comida especificada. Intenta decir "cambia la hora de mi desayuno a las 7".',
      };
    }

    const { error } = await supabase
      .from('meals')
      .update({ scheduled_time: newTime })
      .eq('id', mealId);

    if (error) throw error;

    // Convertir a formato AM/PM
    const [hours, mins] = newTime.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const timeFormatted = `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;

    return {
      success: true,
      message: `✅ Hora de ${mealName.toLowerCase()} actualizada a ${timeFormatted}.`,
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('planUpdateMealTime error:', error);
    return { success: false, message: 'Error al actualizar hora.' };
  }
}

/**
 * Actualiza los ingredientes de una comida
 */
export async function planUpdateIngredients(
  userId: string,
  mealId: string,
  ingredients: Array<{ name: string; quantity?: string; portion?: string }>
): Promise<HankToolResult> {
  try {
    // Get the meal's option
    const { data: options } = await supabase
      .from('meal_options')
      .select('id')
      .eq('meal_id', mealId)
      .order('option_index', { ascending: true })
      .limit(1);

    if (!options || options.length === 0) {
      return { success: false, message: 'No encontré opciones para esta comida.' };
    }

    const optionId = options[0].id;

    // Delete existing ingredients
    await supabase.from('meal_ingredients').delete().eq('option_id', optionId);

    // Insert new ingredients
    const ingredientsToInsert = ingredients.map((ing, idx) => ({
      option_id: optionId,
      name: ing.name,
      quantity: ing.quantity || '~100g',
      portion: ing.portion || '',
      sort_order: idx,
    }));

    await supabase.from('meal_ingredients').insert(ingredientsToInsert);

    return {
      success: true,
      message: `✅ Ingredientes actualizados: ${ingredients.length} ingredientes.`,
      affectedRecords: ingredients.length,
    };
  } catch (error) {
    console.error('planUpdateIngredients error:', error);
    return { success: false, message: 'Error al actualizar ingredientes.' };
  }
}

// ============================================================================
// OMNISCIENT TOOL: Obtener contexto completo del usuario
// ============================================================================
export async function getFullUserContext(userId: string): Promise<HankToolResult> {
  try {
    // 1. Perfil del usuario
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    // 2. Todas las comidas con todas sus opciones
    const { data: meals } = await supabase
      .from('meals')
      .select(
        `
        id, time, selected_option,
        meal_options (
          id, name, option_index,
          meal_ingredients (id, name, quantity, portion)
        )
      `
      )
      .eq('user_id', userId)
      .order('time', { ascending: true });

    // 3. Stack de suplementos
    const { data: stack } = await supabase
      .from('supplement_stack')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    // 4. Ejercicios del usuario
    const { data: exercises } = await supabase
      .from('user_assets')
      .select('id, name, training_days, metadata')
      .eq('user_id', userId)
      .eq('asset_type', 'gym_exercise')
      .is('deleted_at', null);

    // 5. Nombres de rutinas
    const routineNames = profile?.training_routine_names || {};
    const currentDay = profile?.training_current_day || 0;
    const frequency = profile?.training_frequency || 3;

    // Formatear resumen
    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
    };

    // Comidas con todas sus opciones
    const mealsContext =
      meals
        ?.map((meal, idx) => {
          const options = (meal.meal_options as any[]) || [];
          const optionsText = options
            .map((opt, optIdx) => {
              const ings =
                opt.meal_ingredients?.map((i: any) => `${i.name} (${i.quantity})`).join(', ') ||
                'Sin ingredientes';
              return `  Opción ${optIdx + 1}: ${ings}`;
            })
            .join('\n');
          return `COMIDA ${idx + 1} (${formatTime(meal.time)}):\n${optionsText || '  Sin opciones'}`;
        })
        .join('\n\n') || 'Sin comidas';

    // Ejercicios por día
    const exercisesByDay: Record<number, string[]> = {};
    exercises?.forEach((ex) => {
      const days = ex.training_days || [];
      days.forEach((day: number) => {
        if (!exercisesByDay[day]) exercisesByDay[day] = [];
        exercisesByDay[day].push(ex.name);
      });
    });

    const routinesContext = Object.entries(routineNames)
      .map(([day, name]) => {
        const exs = exercisesByDay[parseInt(day)] || [];
        return `DÍA ${parseInt(day) + 1} - ${name}: ${exs.join(', ') || 'Sin ejercicios'}`;
      })
      .join('\n');

    // Stack
    const stackContext = stack?.map((s) => `${s.name} (${s.dose})`).join(', ') || 'Sin suplementos';

    const fullContext = `
📊 CONTEXTO COMPLETO DEL USUARIO:

🏋️ ENTRENAMIENTO:
- Día actual: ${currentDay + 1} de ${frequency}
- Rutina de hoy: ${routineNames[currentDay] || 'Sin nombre'}
${routinesContext}

🍽️ COMIDAS:
${mealsContext}

💊 STACK:
${stackContext}
`.trim();

    return {
      success: true,
      message: fullContext,
      data: { profile, meals, stack, exercises, routineNames, currentDay },
    };
  } catch (error) {
    console.error('getFullUserContext error:', error);
    return { success: false, message: 'Error al obtener contexto.' };
  }
}

/**
 * Obtiene detalles de una comida específica con TODAS sus opciones
 */
export async function planGetMealDetails(
  userId: string,
  mealIdentifier: string | number // Puede ser hora (ej: "20:00", "8pm", "cena") o índice (1, 2, 3...)
): Promise<HankToolResult> {
  try {
    // Primero obtener todas las comidas
    const { data: meals, error } = await supabase
      .from('meals')
      .select(
        `
        id, time, selected_option,
        meal_options (
          id, name, option_index,
          meal_ingredients (id, name, quantity, portion)
        )
      `
      )
      .eq('user_id', userId)
      .order('time', { ascending: true });

    if (error) throw error;
    if (!meals || meals.length === 0) {
      return { success: false, message: 'No tienes comidas configuradas.' };
    }

    // Encontrar la comida
    let targetMeal: any = null;
    let mealIndex = 0;

    // Si es número, usar como índice
    if (typeof mealIdentifier === 'number') {
      const idx = mealIdentifier - 1; // Convertir a 0-based
      if (idx >= 0 && idx < meals.length) {
        targetMeal = meals[idx];
        mealIndex = idx;
      }
    } else {
      const identifier = mealIdentifier.toLowerCase();

      // Mapear palabras comunes a horas aproximadas
      const mealTimeMap: Record<string, number[]> = {
        desayuno: [5, 6, 7, 8, 9, 10],
        almuerzo: [11, 12, 13, 14],
        comida: [11, 12, 13, 14, 15],
        merienda: [15, 16, 17, 18],
        cena: [18, 19, 20, 21, 22, 23],
        snack: [10, 11, 15, 16, 17],
      };

      // Palabras especiales que siempre funcionan
      if (identifier.includes('última') || identifier.includes('ultima')) {
        targetMeal = meals[meals.length - 1];
        mealIndex = meals.length - 1;
      } else if (identifier.includes('primera') || identifier.includes('primer')) {
        targetMeal = meals[0];
        mealIndex = 0;
      } else if (
        identifier.includes('segunda') ||
        identifier.includes('segundo') ||
        identifier.includes('2')
      ) {
        if (meals.length >= 2) {
          targetMeal = meals[1];
          mealIndex = 1;
        }
      } else if (
        identifier.includes('tercera') ||
        identifier.includes('tercer') ||
        identifier.includes('3')
      ) {
        if (meals.length >= 3) {
          targetMeal = meals[2];
          mealIndex = 2;
        }
      } else {
        // Buscar por palabra clave de tiempo (desayuno, cena, etc.)
        for (const [keyword, hours] of Object.entries(mealTimeMap)) {
          if (identifier.includes(keyword)) {
            // Buscar comida en esas horas
            for (let i = 0; i < meals.length; i++) {
              const mealHour = parseInt(meals[i].time.split(':')[0]);
              if (hours.includes(mealHour)) {
                targetMeal = meals[i];
                mealIndex = i;
                break;
              }
            }

            // Si no encontró en las horas esperadas, usar fallback inteligente
            if (!targetMeal) {
              if (keyword === 'cena') {
                // "cena" = última comida del día
                targetMeal = meals[meals.length - 1];
                mealIndex = meals.length - 1;
              } else if (keyword === 'desayuno') {
                // "desayuno" = primera comida del día
                targetMeal = meals[0];
                mealIndex = 0;
              } else if (keyword === 'almuerzo' || keyword === 'comida') {
                // "almuerzo/comida" = segunda comida si hay más de una
                if (meals.length >= 2) {
                  targetMeal = meals[1];
                  mealIndex = 1;
                } else {
                  targetMeal = meals[0];
                  mealIndex = 0;
                }
              }
            }
            break;
          }
        }
      }

      // Si no encontró por keyword, buscar por hora exacta
      if (!targetMeal && identifier.includes(':')) {
        const searchTime = identifier;
        targetMeal = meals.find((m, i) => {
          if (m.time.startsWith(searchTime)) {
            mealIndex = i;
            return true;
          }
          return false;
        });
      }

      // Último intento: buscar número en el texto
      if (!targetMeal) {
        const numMatch = identifier.match(/(\d+)/);
        if (numMatch) {
          const num = parseInt(numMatch[1]);
          if (num >= 1 && num <= meals.length) {
            targetMeal = meals[num - 1];
            mealIndex = num - 1;
          }
        }
      }
    }

    if (!targetMeal) {
      // Listar las comidas disponibles
      const available = meals
        .map((m, i) => {
          const [h] = m.time.split(':').map(Number);
          const period = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          return `${i + 1}. ${h12}:00 ${period}`;
        })
        .join('\n');
      return {
        success: false,
        message: `No encontré esa comida. Tus comidas son:\n${available}\n\nPuedes decir "la última", "cena", "comida 3", etc.`,
      };
    }

    // Formatear la respuesta con todas las opciones
    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const options = (targetMeal.meal_options as any[]) || [];
    const selectedOption = targetMeal.selected_option || 0;

    const optionsText = options
      .map((opt, idx) => {
        const isSelected = idx === selectedOption ? ' ✓ (SELECCIONADA)' : '';
        const ings =
          opt.meal_ingredients?.map((i: any) => `    • ${i.name}: ${i.quantity}`).join('\n') ||
          '    Sin ingredientes';
        return `📌 OPCIÓN ${idx + 1}${isSelected}:\n${ings}`;
      })
      .join('\n\n');

    return {
      success: true,
      message: `🍽️ COMIDA ${mealIndex + 1} (${formatTime(targetMeal.time)}):\n\n${optionsText || 'Sin opciones configuradas'}`,
      data: { meal: targetMeal, mealIndex },
    };
  } catch (error) {
    console.error('planGetMealDetails error:', error);
    return { success: false, message: 'Error al obtener detalles de la comida.' };
  }
}

/**
 * Obtiene todas las comidas del día con sus macros
 */
export async function planGetMeals(userId: string): Promise<HankToolResult> {
  try {
    const { data: meals, error } = await supabase
      .from('meals')
      .select(
        'id, name, scheduled_time, ingredients, calories, protein_g, carbs_g, fat_g, is_completed'
      )
      .eq('user_id', userId)
      .order('scheduled_time', { ascending: true });

    if (error) throw error;

    if (!meals || meals.length === 0) {
      return {
        success: true,
        message: '🍽️ No tienes comidas configuradas todavía.',
        data: { meals: [] },
      };
    }

    // Format response con macros
    const formatTime = (t: string | null) => {
      if (!t) return '??:??';
      const [h, m] = t.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
    };

    // Calcular totales
    let totalCals = 0,
      totalP = 0,
      totalC = 0,
      totalF = 0;

    const mealsSummary = meals
      .map((m: any, i: number) => {
        const ingredients = m.ingredients || [];

        // Sumar macros de ingredientes si están disponibles
        let mealCals = m.calories || 0;
        let mealP = m.protein_g || 0;
        let mealC = m.carbs_g || 0;
        let mealF = m.fat_g || 0;

        // Si no hay macros a nivel de comida, sumar de ingredientes
        if (!mealCals && ingredients.length > 0) {
          ingredients.forEach((ing: any) => {
            mealCals += ing.calories || 0;
            mealP += ing.protein || 0;
            mealC += ing.carbs || 0;
            mealF += ing.fat || 0;
          });
        }

        totalCals += mealCals;
        totalP += mealP;
        totalC += mealC;
        totalF += mealF;

        const ings =
          ingredients.map((ing: any) => `${ing.name} (${ing.quantity || '~100g'})`).join(', ') ||
          'Sin ingredientes';
        const macrosStr =
          mealCals > 0
            ? ` | ${Math.round(mealCals)}kcal ${Math.round(mealP)}P ${Math.round(mealC)}C ${Math.round(mealF)}G`
            : '';

        return `${i + 1}. ${m.name || 'Comida'} (${formatTime(m.scheduled_time)}): ${ings}${macrosStr}`;
      })
      .join('\n');

    const totalsStr =
      totalCals > 0
        ? `\n\n📊 TOTAL DEL DÍA: ${Math.round(totalCals)} kcal | ${Math.round(totalP)}g P | ${Math.round(totalC)}g C | ${Math.round(totalF)}g G`
        : '';

    return {
      success: true,
      message: `🍽️ TUS COMIDAS DE HOY:\n${mealsSummary}${totalsStr}`,
      data: { meals, totals: { calories: totalCals, protein: totalP, carbs: totalC, fat: totalF } },
    };
  } catch (error) {
    console.error('planGetMeals error:', error);
    return { success: false, message: 'Error al obtener comidas.' };
  }
}

/**
 * Agrega un suplemento al stack
 */
export async function planAddSupplement(
  userId: string,
  name: string,
  dose: string,
  options?: {
    type?: 'pill' | 'powder' | 'liquid' | 'syringe';
    time?: string;
    isPreWorkout?: boolean;
    isPostWorkout?: boolean;
  }
): Promise<HankToolResult> {
  try {
    const { error } = await supabase.from('supplement_stack').insert({
      user_id: userId,
      name: name.toUpperCase(),
      dose,
      type: options?.type || 'pill',
      time: options?.time,
      is_pre_workout: options?.isPreWorkout || false,
      is_post_workout: options?.isPostWorkout || false,
      is_active: true,
    });

    if (error) throw error;

    let timing = '';
    if (options?.isPreWorkout) timing = ' (Pre-entreno)';
    if (options?.isPostWorkout) timing = ' (Post-entreno)';

    return {
      success: true,
      message: `✅ ${name.toUpperCase()} (${dose}) agregado al stack${timing}.`,
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('planAddSupplement error:', error);
    return { success: false, message: 'Error al agregar suplemento.' };
  }
}

/**
 * Elimina un suplemento del stack
 */
export async function planRemoveSupplement(userId: string, name: string): Promise<HankToolResult> {
  try {
    const { data, error } = await supabase
      .from('supplement_stack')
      .delete()
      .eq('user_id', userId)
      .ilike('name', `%${name}%`)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, message: `No encontré "${name}" en tu stack.` };
    }

    return {
      success: true,
      message: `✅ ${data[0].name} eliminado del stack.`,
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('planRemoveSupplement error:', error);
    return { success: false, message: 'Error al eliminar suplemento.' };
  }
}

/**
 * Actualiza la hora de un suplemento
 */
export async function planUpdateSupplementTime(
  userId: string,
  name: string,
  newTime: string
): Promise<HankToolResult> {
  try {
    // Buscar el suplemento por nombre
    const { data: supplements } = await supabase
      .from('supplement_stack')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${name}%`)
      .eq('is_active', true);

    if (!supplements || supplements.length === 0) {
      return { success: false, message: `No encontré "${name}" en tu stack.` };
    }

    const supplement = supplements[0];

    // Si es PRE o POST workout, no se puede poner hora fija
    const { error } = await supabase
      .from('supplement_stack')
      .update({
        time: newTime,
        is_pre_workout: false,
        is_post_workout: false,
      })
      .eq('id', supplement.id);

    if (error) throw error;

    // Convertir a formato AM/PM
    const [hours, mins] = newTime.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const timeFormatted = `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;

    return {
      success: true,
      message: `✅ Hora de ${supplement.name} actualizada a ${timeFormatted}.`,
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('planUpdateSupplementTime error:', error);
    return { success: false, message: 'Error al actualizar hora del suplemento.' };
  }
}

/**
 * Obtiene el stack de suplementos
 */
export async function planGetStack(userId: string): Promise<HankToolResult> {
  try {
    const { data: stack, error } = await supabase
      .from('supplement_stack')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('time', { ascending: true, nullsFirst: false });

    if (error) throw error;

    if (!stack || stack.length === 0) {
      return {
        success: true,
        message: '💊 No tienes suplementos en tu stack.',
        data: { stack: [] },
      };
    }

    // Helper para formatear hora a AM/PM
    const formatTime = (time24: string | null): string => {
      if (!time24) return 'Sin hora definida';
      const [hours, minutes] = time24.split(':').map(Number);
      const h = hours || 0;
      const m = minutes || 0;
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const stackSummary = stack
      .map((s) => {
        let timing = '';
        if (s.is_pre_workout) timing = ' 🏋️ PRE';
        else if (s.is_post_workout) timing = ' 💪 POST';
        else if (s.time) timing = ` ⏰ ${formatTime(s.time)}`;
        return `• ${s.name} - ${s.dose}${timing}`;
      })
      .join('\n');

    return {
      success: true,
      message: `💊 TU STACK:\n${stackSummary}`,
      data: { stack },
    };
  } catch (error) {
    console.error('planGetStack error:', error);
    return { success: false, message: 'Error al obtener stack.' };
  }
}

// ============================================================================
// SYSTEM TOOL: Limpiar historial de chat de HANK
// ============================================================================
export async function hankClearHistory(userId: string): Promise<HankToolResult> {
  try {
    const { error, count } = await supabase
      .from('hank_chat_messages')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      message: `🧹 Historial limpiado. Empezamos de cero. ¿En qué te puedo ayudar?`,
      data: { deletedCount: count, clearUIChat: true },
    };
  } catch (error) {
    console.error('hankClearHistory error:', error);
    return { success: false, message: 'Error al limpiar historial.' };
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
    name: 'GYM_GET_TODAY_ROUTINE',
    description:
      'Obtiene el nombre de la rutina del día (ej: "PECHO | ESPALDA") y sus ejercicios. Usa cuando pregunte "qué me toca hoy", "qué toca entrenar hoy", "qué rutina tengo hoy". SIEMPRE usa esta herramienta para preguntas sobre el entrenamiento de hoy.',
    parameters: {
      trainingDay: {
        type: 'number',
        description: 'Índice del día de entrenamiento (0-based). Usa el día actual del contexto.',
        required: true,
      },
    },
    requiredParams: ['trainingDay'],
  },
  {
    name: 'GYM_LIST_EXERCISES',
    description:
      'Lista TODOS los ejercicios de la rutina completa o de un día específico. Usa para "mi rutina completa", "todos mis ejercicios", "qué ejercicios tengo en total".',
    parameters: {
      trainingDay: {
        type: 'number',
        description:
          'Índice del día de entrenamiento (0-based). Omitir para ver TODOS los ejercicios.',
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
  {
    name: 'ASSET_REMOVE_SERIES',
    description:
      'Quita una serie de un ejercicio del día actual. Usa cuando diga "quita la última serie", "elimina la primera serie", "quita la serie 3".',
    parameters: {
      assetName: {
        type: 'string',
        description: 'Nombre del ejercicio',
        required: true,
      },
      seriesIndex: {
        type: 'string',
        description:
          'Índice de la serie a quitar: "last" para última, "first" para primera, o un número (0-based)',
        required: true,
      },
      trainingDay: {
        type: 'number',
        description: 'Día de entrenamiento (0-based). SIEMPRE usa el día actual del contexto.',
        required: true,
      },
    },
    requiredParams: ['assetName', 'seriesIndex', 'trainingDay'],
  },
  {
    name: 'ASSET_ADD_SERIES',
    description:
      'Agrega una nueva serie a un ejercicio del día actual. Usa cuando diga "agrega una serie", "añade una serie de 10 reps".',
    parameters: {
      assetName: {
        type: 'string',
        description: 'Nombre del ejercicio',
        required: true,
      },
      reps: {
        type: 'number',
        description: 'Número de repeticiones (default: 10)',
        required: false,
      },
      weight: {
        type: 'number',
        description: 'Peso en kg (default: 0)',
        required: false,
      },
      seriesType: {
        type: 'string',
        description: 'Tipo de serie',
        enum: ['WARMUP', 'APPROACH', 'EFFECTIVE', 'FAILURE'],
        default: 'EFFECTIVE',
      },
      position: {
        type: 'number',
        description:
          'Posición donde insertar (0=primera, 1=segunda, etc). Si no se especifica, se agrega al final.',
        required: false,
      },
      trainingDay: {
        type: 'number',
        description: 'Día de entrenamiento (0-based). SIEMPRE usa el día actual del contexto.',
        required: true,
      },
    },
    requiredParams: ['assetName', 'trainingDay'],
  },
  {
    name: 'ASSET_REPLACE_SERIES',
    description:
      'Reemplaza una serie existente por una nueva en el día actual. Usa cuando diga "reemplaza la serie X por...", "cambia la última serie a...".',
    parameters: {
      assetName: {
        type: 'string',
        description: 'Nombre del ejercicio',
        required: true,
      },
      seriesIndex: {
        type: 'string',
        description:
          'Índice de la serie a reemplazar: "last" para última, "first" para primera, o un número (0-based)',
        required: true,
      },
      reps: {
        type: 'number',
        description: 'Número de repeticiones para la nueva serie',
        required: true,
      },
      weight: {
        type: 'number',
        description: 'Peso en kg para la nueva serie',
        required: true,
      },
      seriesType: {
        type: 'string',
        description: 'Tipo de la nueva serie',
        enum: ['WARMUP', 'APPROACH', 'EFFECTIVE', 'FAILURE'],
        required: true,
      },
      trainingDay: {
        type: 'number',
        description: 'Día de entrenamiento (0-based). SIEMPRE usa el día actual del contexto.',
        required: true,
      },
    },
    requiredParams: ['assetName', 'seriesIndex', 'reps', 'weight', 'seriesType', 'trainingDay'],
  },
  {
    name: 'ASSET_SET_SERIES',
    description:
      'Configura TODAS las series de un ejercicio del día actual, reemplazando las existentes. Usa cuando el usuario pida "configura mis series", "pon las series que recomiendas", "borra todas y pon nuevas", "resetea las series".',
    parameters: {
      assetName: {
        type: 'string',
        description: 'Nombre del ejercicio',
        required: true,
      },
      series: {
        type: 'string',
        description:
          'JSON string con array de series. Cada serie: {reps:number, weight:number, type:"WARMUP"|"APPROACH"|"EFFECTIVE"|"FAILURE"}. Ejemplo: [{"reps":12,"weight":20,"type":"WARMUP"},{"reps":10,"weight":40,"type":"APPROACH"},{"reps":8,"weight":60,"type":"EFFECTIVE"},{"reps":6,"weight":70,"type":"FAILURE"}]',
        required: true,
      },
      trainingDay: {
        type: 'number',
        description: 'Día de entrenamiento (0-based). SIEMPRE usa el día actual del contexto.',
        required: true,
      },
    },
    requiredParams: ['assetName', 'series', 'trainingDay'],
  },
  {
    name: 'ADN_GET_PROFILE',
    description:
      'Obtiene el perfil completo del atleta (TRENS ID): objetivo, peso, altura, lesiones, alergias, medidas corporales. Usa cuando necesites conocer datos biométricos, lesiones, o personalizar recomendaciones.',
    parameters: {},
    requiredParams: [],
  },
  {
    name: 'ADN_GET_RECORDS',
    description:
      'Obtiene los récords personales del atleta (máximo 3). Muestra ejercicio, peso y reps. Usa cuando el usuario pregunte por sus PRs, récords, o máximos.',
    parameters: {},
    requiredParams: [],
  },
  {
    name: 'ADN_UPDATE_PROFILE',
    description:
      'Actualiza un campo del perfil del atleta. Usa cuando diga "mi objetivo es...", "peso X kilos", "tengo lesión en...", "soy alérgico a...", "mi nombre es...".',
    parameters: {
      field: {
        type: 'string',
        description: 'Campo a actualizar',
        enum: ['goal', 'weight', 'height', 'injuries', 'allergies', 'display_name'],
        required: true,
      },
      value: {
        type: 'string',
        description: 'Nuevo valor para el campo',
        required: true,
      },
    },
    requiredParams: ['field', 'value'],
  },
  {
    name: 'ADN_ADD_MEASUREMENT',
    description:
      'Agrega una medida corporal al perfil. Usa cuando diga "mi brazo mide X", "agrega medida de pecho", "mi pierna es de X cm".',
    parameters: {
      name: {
        type: 'string',
        description: 'Nombre de la zona corporal (ej: "Brazo", "Pecho", "Pierna", "Cintura")',
        required: true,
      },
      value: {
        type: 'string',
        description: 'Valor de la medida (ej: "45cm", "110cm")',
        required: true,
      },
      isDominant: {
        type: 'boolean',
        description: 'Si es el músculo dominante/más desarrollado del atleta',
        required: false,
      },
    },
    requiredParams: ['name', 'value'],
  },
  {
    name: 'ADN_REMOVE_MEASUREMENT',
    description:
      'Elimina una medida corporal del perfil. Usa cuando diga "quita la medida de...", "elimina mi medida de brazo".',
    parameters: {
      measurementName: {
        type: 'string',
        description: 'Nombre de la medida a eliminar',
        required: true,
      },
    },
    requiredParams: ['measurementName'],
  },
  // ============================================================================
  // PLAN TOOLS - Nutrición y Farmacología
  // ============================================================================
  {
    name: 'PLAN_ADD_MEAL',
    description:
      'Agrega una comida al plan nutricional. Usa cuando diga "agrega una comida a las 7", "pon desayuno", "añade almuerzo a las 2 PM".',
    parameters: {
      time: {
        type: 'string',
        description: 'Hora de la comida en formato 24h (ej: "07:00", "14:30", "20:00")',
        required: true,
      },
      ingredients: {
        type: 'string',
        description:
          'JSON string con array de ingredientes. Cada uno: {name: string, quantity?: string}. Ej: [{"name":"Pollo","quantity":"200g"},{"name":"Arroz","quantity":"150g"}]',
        required: true,
      },
    },
    requiredParams: ['time', 'ingredients'],
  },
  {
    name: 'PLAN_REMOVE_MEAL',
    description:
      'Elimina una comida del plan. Usa cuando diga "quita la comida de las 7", "elimina el desayuno", "borra la última comida".',
    parameters: {
      mealId: {
        type: 'string',
        description: 'ID de la comida a eliminar',
        required: false,
      },
      time: {
        type: 'string',
        description: 'Hora aproximada de la comida a eliminar (ej: "07:00")',
        required: false,
      },
      position: {
        type: 'string',
        description: 'Posición de la comida: "first", "last", o número (1-based)',
        required: false,
      },
    },
    requiredParams: [],
  },
  {
    name: 'PLAN_UPDATE_MEAL_TIME',
    description:
      'Cambia la hora de una comida. Usa cuando diga "mueve el desayuno a las 8", "cambia la hora de la comida".',
    parameters: {
      mealId: {
        type: 'string',
        description: 'ID de la comida',
        required: false,
      },
      position: {
        type: 'string',
        description: 'Posición de la comida: "first", "last", o número (1-based)',
        required: false,
      },
      newTime: {
        type: 'string',
        description: 'Nueva hora en formato 24h (ej: "08:00")',
        required: true,
      },
    },
    requiredParams: ['newTime'],
  },
  {
    name: 'PLAN_UPDATE_INGREDIENTS',
    description:
      'Actualiza los ingredientes de una comida. Usa cuando diga "cambia el pollo por pescado", "agrega arroz a la comida", "quita los carbohidratos".',
    parameters: {
      mealId: {
        type: 'string',
        description: 'ID de la comida',
        required: true,
      },
      ingredients: {
        type: 'string',
        description: 'JSON string con array de ingredientes actualizados',
        required: true,
      },
    },
    requiredParams: ['mealId', 'ingredients'],
  },
  {
    name: 'PLAN_CALCULATE_MACROS',
    description:
      'Calcula los macros/gramos de ingredientes usando IA. Usa cuando diga "calcula los gramos", "cuántas calorías tiene", "ajusta las porciones".',
    parameters: {
      mealId: {
        type: 'string',
        description: 'ID de la comida para calcular (opcional, si no se da calcula todas)',
        required: false,
      },
    },
    requiredParams: [],
  },
  // ============================================================================
  // OMNISCIENT TOOLS - Para que HANK sea Dios en TRENS
  // ============================================================================
  {
    name: 'GET_FULL_USER_CONTEXT',
    description:
      'HERRAMIENTA MAESTRA: Obtiene TODO el contexto del usuario de una vez - comidas, ejercicios, rutinas, suplementos, perfil. Usa cuando necesites información general, el usuario pregunte algo ambiguo, o para entender el contexto completo antes de actuar. SIEMPRE úsala primero si tienes dudas.',
    parameters: {},
    requiredParams: [],
  },
  {
    name: 'PLAN_GET_MEAL_DETAILS',
    description:
      'Obtiene detalles de una comida específica con TODAS sus opciones/alternativas. Usa cuando pregunte sobre "la cena", "mi última comida", "comida 2", "opción 2 de la cena", "alternativa de desayuno", etc.',
    parameters: {
      mealIdentifier: {
        type: 'string',
        description:
          'Identificador de la comida: puede ser número (1, 2, 3), hora ("20:00"), o palabra clave ("cena", "desayuno", "última", "primera")',
        required: true,
      },
    },
    requiredParams: ['mealIdentifier'],
  },
  {
    name: 'PLAN_GET_MEALS',
    description:
      'Obtiene todas las comidas del día. Usa cuando pregunte "qué tengo de comer hoy", "muéstrame mis comidas", "cuál es mi plan de hoy".',
    parameters: {},
    requiredParams: [],
  },
  {
    name: 'PLAN_ADD_SUPPLEMENT',
    description:
      'Agrega un suplemento al stack. Usa cuando diga "agrega creatina", "pon proteína post entreno", "añade omega 3".',
    parameters: {
      name: {
        type: 'string',
        description: 'Nombre del suplemento (ej: "Creatina", "Proteína Whey", "Omega 3")',
        required: true,
      },
      dose: {
        type: 'string',
        description: 'Dosis (ej: "5g", "30g", "2 cápsulas")',
        required: true,
      },
      type: {
        type: 'string',
        description: 'Tipo de suplemento',
        enum: ['pill', 'powder', 'liquid', 'syringe'],
        required: false,
      },
      time: {
        type: 'string',
        description: 'Hora de toma en formato 24h',
        required: false,
      },
      isPreWorkout: {
        type: 'boolean',
        description: 'Si se toma antes del entreno',
        required: false,
      },
      isPostWorkout: {
        type: 'boolean',
        description: 'Si se toma después del entreno',
        required: false,
      },
    },
    requiredParams: ['name', 'dose'],
  },
  {
    name: 'PLAN_REMOVE_SUPPLEMENT',
    description:
      'Elimina un suplemento del stack. Usa cuando diga "quita la creatina", "elimina el pre entreno".',
    parameters: {
      name: {
        type: 'string',
        description: 'Nombre del suplemento a eliminar',
        required: true,
      },
    },
    requiredParams: ['name'],
  },
  {
    name: 'PLAN_UPDATE_SUPPLEMENT_TIME',
    description:
      'Cambia la hora de un suplemento. Usa cuando diga "cambia la hora de la creatina a las 8", "pon el omega 3 a las 9 de la mañana", "mueve la proteína a las 6 PM".',
    parameters: {
      name: {
        type: 'string',
        description: 'Nombre del suplemento a modificar',
        required: true,
      },
      newTime: {
        type: 'string',
        description: 'Nueva hora en formato 24h (ej: "08:00", "20:00")',
        required: true,
      },
    },
    requiredParams: ['name', 'newTime'],
  },
  {
    name: 'PLAN_GET_STACK',
    description:
      'Obtiene el stack de suplementos actual. Usa cuando pregunte "qué suplementos tomo", "muéstrame mi stack".',
    parameters: {},
    requiredParams: [],
  },
  {
    name: 'PLAN_ANALYZE_NUTRITION',
    description:
      'Analiza la nutrición del día completo y da recomendaciones. Usa cuando diga "analiza mi dieta", "cómo está mi nutrición", "qué me falta hoy".',
    parameters: {},
    requiredParams: [],
  },
  {
    name: 'HANK_CLEAR_HISTORY',
    description:
      'Borra el historial de chat con HANK. Usa cuando diga "borra el historial", "limpia el chat", "resetea la conversación", "olvida todo", "empieza de nuevo".',
    parameters: {},
    requiredParams: [],
  },
];
