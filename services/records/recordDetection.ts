// =============================================================================
// RECORDS SERVICE - Detección automática de Personal Records (PRs)
// Sistema de análisis matemático para identificar récords en levantamientos
// =============================================================================

import { supabase } from '../../lib/supabase';
import {
  RecordType,
  DetectedRecord,
  RecordDetectionResult,
  RecordDetectionInput,
  VideoForRecordComparison,
  RECORD_CONFIG,
  calculateEstimated1RM,
  formatWeight,
  formatLift,
} from '../../types/records';

// =============================================================================
// CORE: FUNCIÓN PRINCIPAL DE DETECCIÓN
// =============================================================================

/**
 * Detecta récords personales comparando el nuevo levantamiento contra el historial
 *
 * LÓGICA DE RÉCORDS:
 * 1. PR DOMINANTE: peso > max_historico AND reps > max_historicas (PRIORIDAD MÁXIMA)
 * 2. PR PESO MÁXIMO: peso > max_historico
 * 3. PR 1RM ESTIMADO: 1RM_actual > max(1RM_estimado_historico)
 * 4. PR REPS A PESO: peso == peso_historico AND reps > max_reps_a_ese_peso
 *
 * JERARQUÍA DE VISUALIZACIÓN:
 * - Solo mostrar 1 récord principal + 1 secundario opcional
 * - Prioridad: DOMINANT > MAX_WEIGHT > ESTIMATED_1RM > MAX_REPS
 *
 * @param input - Datos del levantamiento actual e historial
 * @returns Resultado con récords detectados ordenados por prioridad
 */
export function detectRecords(input: RecordDetectionInput): RecordDetectionResult {
  const { currentWeight, currentReps, exerciseName, historicalVideos } = input;

  // Guard: Si no hay datos válidos, no hay récord
  if (currentWeight <= 0 || currentReps <= 0) {
    return createEmptyResult();
  }

  // Guard: Si no hay historial, TODO es un récord (primer registro)
  if (historicalVideos.length === 0) {
    return createFirstTimeResult(currentWeight, currentReps, exerciseName);
  }

  // Calcular estadísticas históricas
  const stats = calculateHistoricalStats(historicalVideos);

  // Calcular 1RM actual
  const current1RM = calculateEstimated1RM(currentWeight, currentReps);

  // Detectar todos los récords aplicables
  const detectedRecords: DetectedRecord[] = [];

  // 1. CHECK: PR DOMINANTE (peso > max AND reps > max)
  if (currentWeight > stats.maxWeight && currentReps > stats.maxReps) {
    detectedRecords.push(createDominantRecord(currentWeight, currentReps, stats));
  }

  // 2. CHECK: PR PESO MÁXIMO
  if (currentWeight > stats.maxWeight) {
    detectedRecords.push(createMaxWeightRecord(currentWeight, stats));
  }

  // 3. CHECK: PR 1RM ESTIMADO
  if (current1RM > stats.max1RM) {
    detectedRecords.push(createEstimated1RMRecord(current1RM, stats));
  }

  // 4. CHECK: PR REPS A PESO (solo si hay registros previos con el mismo peso)
  const previousRepsAtWeight = stats.maxRepsPerWeight.get(currentWeight);
  if (previousRepsAtWeight !== undefined && currentReps > previousRepsAtWeight) {
    detectedRecords.push(
      createMaxRepsAtWeightRecord(currentWeight, currentReps, previousRepsAtWeight)
    );
  }

  // Ordenar por prioridad y seleccionar top 2
  detectedRecords.sort((a, b) => a.priority - b.priority);

  return {
    hasRecord: detectedRecords.length > 0,
    primaryRecord: detectedRecords[0] || null,
    secondaryRecord: detectedRecords[1] || null,
    allRecords: detectedRecords,
  };
}

// =============================================================================
// ESTADÍSTICAS HISTÓRICAS
// =============================================================================

interface HistoricalStats {
  maxWeight: number;
  maxReps: number;
  max1RM: number;
  maxRepsPerWeight: Map<number, number>; // peso -> max reps a ese peso
}

/**
 * Calcula estadísticas agregadas del historial de videos
 */
function calculateHistoricalStats(videos: VideoForRecordComparison[]): HistoricalStats {
  let maxWeight = 0;
  let maxReps = 0;
  let max1RM = 0;
  const maxRepsPerWeight = new Map<number, number>();

  for (const video of videos) {
    const weight = video.weight_kg ?? 0;
    const reps = video.reps ?? 0;

    if (weight <= 0 || reps <= 0) continue;

    // Max peso
    if (weight > maxWeight) {
      maxWeight = weight;
    }

    // Max reps
    if (reps > maxReps) {
      maxReps = reps;
    }

    // Max 1RM estimado
    const estimated1RM = calculateEstimated1RM(weight, reps);
    if (estimated1RM > max1RM) {
      max1RM = estimated1RM;
    }

    // Max reps por peso
    const currentMaxReps = maxRepsPerWeight.get(weight) ?? 0;
    if (reps > currentMaxReps) {
      maxRepsPerWeight.set(weight, reps);
    }
  }

  return { maxWeight, maxReps, max1RM, maxRepsPerWeight };
}

// =============================================================================
// CREADORES DE RÉCORDS
// =============================================================================

function createEmptyResult(): RecordDetectionResult {
  return {
    hasRecord: false,
    primaryRecord: null,
    secondaryRecord: null,
    allRecords: [],
  };
}

function createFirstTimeResult(
  weight: number,
  reps: number,
  exerciseName: string
): RecordDetectionResult {
  // Primer registro = automáticamente es un récord de peso máximo
  const record: DetectedRecord = {
    type: 'MAX_WEIGHT',
    priority: RECORD_CONFIG.PRIORITY.MAX_WEIGHT,
    emoji: '🏆',
    title: 'PRIMER REGISTRO',
    subtitle: `${formatLift(weight, reps)}`,
    comparison: {
      previous: 'Sin datos',
      current: formatLift(weight, reps),
      improvement: `${exerciseName} desbloqueado`,
    },
  };

  return {
    hasRecord: true,
    primaryRecord: record,
    secondaryRecord: null,
    allRecords: [record],
  };
}

function createDominantRecord(
  weight: number,
  reps: number,
  stats: HistoricalStats
): DetectedRecord {
  return {
    type: 'DOMINANT',
    priority: RECORD_CONFIG.PRIORITY.DOMINANT,
    emoji: RECORD_CONFIG.EMOJI.DOMINANT,
    title: RECORD_CONFIG.TITLE.DOMINANT,
    subtitle: formatLift(weight, reps),
    comparison: {
      previous: `${formatWeight(stats.maxWeight)} kg / ${stats.maxReps} reps`,
      current: formatLift(weight, reps),
      improvement: RECORD_CONFIG.COPY.DOMINANT,
    },
  };
}

function createMaxWeightRecord(weight: number, stats: HistoricalStats): DetectedRecord {
  const improvement = weight - stats.maxWeight;
  return {
    type: 'MAX_WEIGHT',
    priority: RECORD_CONFIG.PRIORITY.MAX_WEIGHT,
    emoji: RECORD_CONFIG.EMOJI.MAX_WEIGHT,
    title: RECORD_CONFIG.TITLE.MAX_WEIGHT,
    subtitle: `${formatWeight(weight)} kg`,
    comparison: {
      previous: `${formatWeight(stats.maxWeight)} kg`,
      current: `${formatWeight(weight)} kg`,
      improvement: `+${formatWeight(improvement)} kg`,
    },
  };
}

function createEstimated1RMRecord(current1RM: number, stats: HistoricalStats): DetectedRecord {
  const improvement = current1RM - stats.max1RM;
  return {
    type: 'ESTIMATED_1RM',
    priority: RECORD_CONFIG.PRIORITY.ESTIMATED_1RM,
    emoji: RECORD_CONFIG.EMOJI.ESTIMATED_1RM,
    title: RECORD_CONFIG.TITLE.ESTIMATED_1RM,
    subtitle: `1RM estimado: ${formatWeight(current1RM)} kg`,
    comparison: {
      previous: `${formatWeight(stats.max1RM)} kg`,
      current: `${formatWeight(current1RM)} kg`,
      improvement: `+${formatWeight(improvement)} kg de poder`,
    },
  };
}

function createMaxRepsAtWeightRecord(
  weight: number,
  currentReps: number,
  previousReps: number
): DetectedRecord {
  const improvement = currentReps - previousReps;
  return {
    type: 'MAX_REPS_AT_WEIGHT',
    priority: RECORD_CONFIG.PRIORITY.MAX_REPS_AT_WEIGHT,
    emoji: RECORD_CONFIG.EMOJI.MAX_REPS_AT_WEIGHT,
    title: RECORD_CONFIG.TITLE.MAX_REPS_AT_WEIGHT,
    subtitle: formatLift(weight, currentReps),
    comparison: {
      previous: `${previousReps} reps`,
      current: `${currentReps} reps`,
      improvement: `+${improvement} reps a ${formatWeight(weight)} kg`,
    },
  };
}

// =============================================================================
// API: OBTENER HISTORIAL DESDE SUPABASE
// =============================================================================

/**
 * Obtiene el historial de videos PRO para un ejercicio específico
 * Usado para comparar contra el nuevo levantamiento
 *
 * @param userId - ID del usuario
 * @param exerciseId - ID del ejercicio
 * @returns Array de videos con peso y reps
 */
export async function fetchExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<VideoForRecordComparison[]> {
  const { data, error } = await supabase
    .from('pro_videos')
    .select('id, exercise_id, exercise_name, weight_kg, reps, created_at')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('🚨 Error fetching exercise history for records:', error);
    return [];
  }

  return data || [];
}

/**
 * Detecta récords para un nuevo video guardado
 * Función de conveniencia que combina fetch + detect
 *
 * @param userId - ID del usuario
 * @param exerciseId - ID del ejercicio
 * @param exerciseName - Nombre del ejercicio (para display)
 * @param weight - Peso del levantamiento actual
 * @param reps - Repeticiones del levantamiento actual
 * @returns Resultado de detección de récords
 */
export async function detectRecordsForNewVideo(
  userId: string,
  exerciseId: string,
  exerciseName: string,
  weight: number,
  reps: number
): Promise<RecordDetectionResult> {
  // 1. Obtener historial (excluyendo el video que se acaba de guardar)
  const history = await fetchExerciseHistory(userId, exerciseId);

  // 2. Detectar récords
  return detectRecords({
    currentWeight: weight,
    currentReps: reps,
    exerciseId,
    exerciseName,
    historicalVideos: history.slice(1), // Excluir el más reciente (el actual)
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export { calculateEstimated1RM, formatWeight, formatLift };
export type {
  RecordType,
  DetectedRecord,
  RecordDetectionResult,
  RecordDetectionInput,
  VideoForRecordComparison,
};
