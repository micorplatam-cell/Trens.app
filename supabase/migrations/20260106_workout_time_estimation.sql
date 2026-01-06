-- ============================================================================
-- WORKOUT TIME ESTIMATION
-- Agrega campos para estimar hora del entrenamiento basándose en posición
-- del bloque de entrenamiento en el plan
-- ============================================================================

-- Agregar campos a user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS estimated_workout_time TIME,
ADD COLUMN IF NOT EXISTS is_fasted_training BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS workout_time_description TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN user_profiles.estimated_workout_time IS 'Hora estimada del entrenamiento basada en posición del bloque en el plan';
COMMENT ON COLUMN user_profiles.is_fasted_training IS 'True si el entrenamiento es en ayunas (sin comidas previas)';
COMMENT ON COLUMN user_profiles.workout_time_description IS 'Descripción del contexto del entrenamiento (ej: "Después de Desayuno, antes de Almuerzo")';
