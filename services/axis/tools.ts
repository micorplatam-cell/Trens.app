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
function getSeriesForDay(
  metadata: Record<string, unknown>,
  trainingDay: number
): SeriesConfig[] {
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
): Promise<AxisToolResult> {
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
        : oldTrainingDays[0] ?? 0;

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
): Promise<AxisToolResult> {
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
      return { success: false, message: `${typedAsset.name} no tiene series para quitar en día ${trainingDay + 1}.` };
    }

    if (customSeries.length === 1) {
      return { success: false, message: `${typedAsset.name} solo tiene 1 serie en día ${trainingDay + 1}. No puedo dejarla sin series.` };
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
        message: `Índice ${indexToRemove} fuera de rango. Hay ${customSeries.length} series (0-${customSeries.length - 1}).` 
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
): Promise<AxisToolResult> {
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
): Promise<AxisToolResult> {
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
      return { success: false, message: `${typedAsset.name} no tiene series para reemplazar en día ${trainingDay + 1}.` };
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
        message: `Índice ${indexToReplace} fuera de rango. Hay ${customSeries.length} series (0-${customSeries.length - 1}).` 
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
): Promise<AxisToolResult> {
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
    const seriesSummary = newSeries.map((s, i) => 
      `${i + 1}. ${s.reps} reps × ${s.weight}kg (${s.type})`
    ).join('\n');

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
        description: 'Índice de la serie a quitar: "last" para última, "first" para primera, o un número (0-based)',
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
        description: 'Posición donde insertar (0=primera, 1=segunda, etc). Si no se especifica, se agrega al final.',
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
        description: 'Índice de la serie a reemplazar: "last" para última, "first" para primera, o un número (0-based)',
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
        description: 'JSON string con array de series. Cada serie: {reps:number, weight:number, type:"WARMUP"|"APPROACH"|"EFFECTIVE"|"FAILURE"}. Ejemplo: [{"reps":12,"weight":20,"type":"WARMUP"},{"reps":10,"weight":40,"type":"APPROACH"},{"reps":8,"weight":60,"type":"EFFECTIVE"},{"reps":6,"weight":70,"type":"FAILURE"}]',
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
];
