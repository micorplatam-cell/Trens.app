// =============================================================================
// TYPES: PERSONAL RECORDS (PRs) - Sistema de detección de récords
// =============================================================================

/**
 * Tipos de récord detectables por el sistema TRENS
 * Ordenados por prioridad visual (mayor a menor)
 */
export type RecordType = 'DOMINANT' | 'MAX_WEIGHT' | 'ESTIMATED_1RM' | 'MAX_REPS_AT_WEIGHT';

/**
 * Metadata de un récord detectado
 */
export interface DetectedRecord {
  type: RecordType;
  priority: 1 | 2 | 3 | 4; // 1 = máxima prioridad (DOMINANT)
  emoji: string;
  title: string;
  subtitle: string;
  comparison?: {
    previous: string;
    current: string;
    improvement: string;
  };
}

/**
 * Resultado de la detección de récords
 * Devuelto por la función detectRecords()
 */
export interface RecordDetectionResult {
  hasRecord: boolean;
  primaryRecord: DetectedRecord | null;
  secondaryRecord: DetectedRecord | null;
  allRecords: DetectedRecord[]; // Para debugging/analytics
}

/**
 * Datos mínimos de un video para comparación de récords
 */
export interface VideoForRecordComparison {
  id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  weight_kg: number | null;
  reps: number | null;
  created_at: string;
}

/**
 * Input para el servicio de detección
 */
export interface RecordDetectionInput {
  currentWeight: number;
  currentReps: number;
  exerciseId: string;
  exerciseName: string;
  historicalVideos: VideoForRecordComparison[];
}

/**
 * Récord de peso máximo a unas reps específicas
 * Para tracking interno de "mejores a X reps"
 */
export interface MaxWeightAtReps {
  reps: number;
  weight: number;
  videoId: string;
  date: string;
}

/**
 * Récord de reps máximas a un peso específico
 */
export interface MaxRepsAtWeight {
  weight: number;
  reps: number;
  videoId: string;
  date: string;
}

// =============================================================================
// CONSTANTES DE CONFIGURACIÓN
// =============================================================================

export const RECORD_CONFIG = {
  // Prioridades (menor número = mayor prioridad)
  PRIORITY: {
    DOMINANT: 1,
    MAX_WEIGHT: 2,
    ESTIMATED_1RM: 3,
    MAX_REPS_AT_WEIGHT: 4,
  } as const,

  // Emojis por tipo
  EMOJI: {
    DOMINANT: '🔥',
    MAX_WEIGHT: '🏆',
    ESTIMATED_1RM: '⚡',
    MAX_REPS_AT_WEIGHT: '🔁',
  } as const,

  // Títulos principales
  TITLE: {
    DOMINANT: 'RÉCORD ABSOLUTO',
    MAX_WEIGHT: 'NUEVO PESO MÁXIMO',
    ESTIMATED_1RM: 'FUERZA DESBLOQUEADA',
    MAX_REPS_AT_WEIGHT: 'MÁS REPS QUE NUNCA',
  } as const,

  // Copy agresivo para cada tipo
  COPY: {
    DOMINANT: 'Más peso. Más reps. Dominaste.',
    MAX_WEIGHT: 'Superaste tu límite anterior.',
    ESTIMATED_1RM: 'Tu potencial acaba de subir.',
    MAX_REPS_AT_WEIGHT: 'Más volumen, más ganancia.',
  } as const,
} as const;

// =============================================================================
// UTILIDADES
// =============================================================================

/**
 * Calcula el 1RM estimado usando la fórmula de Epley
 * 1RM = peso × (1 + reps / 30)
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight; // Si es 1 rep, es el 1RM real
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Formatea el peso para display
 */
export function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? `${weight}` : `${weight.toFixed(1)}`;
}

/**
 * Formatea peso × reps para display
 */
export function formatLift(weight: number, reps: number): string {
  return `${formatWeight(weight)} kg × ${reps}`;
}
