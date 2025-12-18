// ============================================================================
// HANK TOOLS - Las 'manos' de la IA (Conexión con Supabase)
// Sistema completo de herramientas para el Agente HANK
// ============================================================================

import { supabase } from '../../lib/supabase';
import type { HankToolResult, ToolDefinition } from '../../types/hank';

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

    const summary = exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      days: ex.training_days,
      series: (ex.metadata as Record<string, unknown>)?.custom_series
        ? ((ex.metadata as Record<string, unknown>).custom_series as unknown[]).length
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
 */
export async function planAddMeal(
  userId: string,
  time: string,
  ingredients: Array<{ name: string; quantity?: string; portion?: string }>
): Promise<HankToolResult> {
  try {
    // Get or create active plan
    let { data: plan } = await supabase
      .from('nutrition_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!plan) {
      const { data: newPlan, error: planError } = await supabase
        .from('nutrition_plans')
        .insert({ user_id: userId, name: 'MI PLAN', is_active: true })
        .select()
        .single();

      if (planError) throw planError;
      plan = newPlan;
    }

    if (!plan) {
      return { success: false, message: 'No se pudo obtener el plan.' };
    }

    // Create meal
    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert({
        plan_id: plan.id,
        user_id: userId,
        time: time,
      })
      .select()
      .single();

    if (mealError) throw mealError;

    // Create meal option
    const { data: optionData, error: optError } = await supabase
      .from('meal_options')
      .insert({
        meal_id: mealData.id,
        name: 'Opción Principal',
        option_index: 0,
      })
      .select()
      .single();

    if (optError) throw optError;

    // Create ingredients
    const ingredientsToInsert = ingredients.map((ing, idx) => ({
      option_id: optionData.id,
      name: ing.name,
      quantity: ing.quantity || '~100g',
      portion: ing.portion || '',
      sort_order: idx,
    }));

    await supabase.from('meal_ingredients').insert(ingredientsToInsert);

    return {
      success: true,
      message: `✅ Comida agregada a las ${time} con ${ingredients.length} ingredientes.`,
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
  options: { mealId?: string; position?: string }
): Promise<HankToolResult> {
  try {
    let mealId = options.mealId;

    if (!mealId && options.position) {
      const { data: meals } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', userId)
        .order('time', { ascending: true });

      if (meals && meals.length > 0) {
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

    const { error } = await supabase.from('meals').update({ time: newTime }).eq('id', mealId);

    if (error) throw error;

    return {
      success: true,
      message: `✅ Hora de comida actualizada a ${newTime}.`,
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

/**
 * Obtiene todas las comidas del día
 */
export async function planGetMeals(userId: string): Promise<HankToolResult> {
  try {
    const { data: meals, error } = await supabase
      .from('meals')
      .select(
        `
        id,
        time,
        selected_option,
        meal_options (
          id,
          name,
          meal_ingredients (
            id,
            name,
            quantity,
            portion
          )
        )
      `
      )
      .eq('user_id', userId)
      .order('time', { ascending: true });

    if (error) throw error;

    if (!meals || meals.length === 0) {
      return {
        success: true,
        message: '🍽️ No tienes comidas configuradas todavía.',
        data: { meals: [] },
      };
    }

    // Format response
    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const mealsSummary = meals
      .map((m, i) => {
        const option = (
          m.meal_options as {
            name: string;
            meal_ingredients: { name: string; quantity: string }[];
          }[]
        )?.[0];
        const ings =
          option?.meal_ingredients?.map((ing) => `${ing.name} (${ing.quantity})`).join(', ') ||
          'Sin ingredientes';
        return `${i + 1}. ${formatTime(m.time)}: ${ings}`;
      })
      .join('\n');

    return {
      success: true,
      message: `🍽️ TUS COMIDAS DE HOY:\n${mealsSummary}`,
      data: { meals },
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
 * Obtiene el stack de suplementos
 */
export async function planGetStack(userId: string): Promise<HankToolResult> {
  try {
    const { data: stack, error } = await supabase
      .from('supplement_stack')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    if (!stack || stack.length === 0) {
      return {
        success: true,
        message: '💊 No tienes suplementos en tu stack.',
        data: { stack: [] },
      };
    }

    const stackSummary = stack
      .map((s) => {
        let timing = '';
        if (s.is_pre_workout) timing = ' 🏋️ PRE';
        if (s.is_post_workout) timing = ' 💪 POST';
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
];
