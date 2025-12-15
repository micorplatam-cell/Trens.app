-- Agregar columnas para sistema de días de entrenamiento
-- En tabla profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS training_last_access TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS training_current_day INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 3;

-- En tabla user_assets (para ejercicios)
ALTER TABLE user_assets
ADD COLUMN IF NOT EXISTS training_day INTEGER DEFAULT 0;

-- Índice para mejorar queries por día de entrenamiento
CREATE INDEX IF NOT EXISTS idx_user_assets_training_day 
ON user_assets(user_id, training_day, deleted_at);

-- Comentarios
COMMENT ON COLUMN profiles.training_last_access IS 'Última vez que el usuario accedió al módulo GYM';
COMMENT ON COLUMN profiles.training_current_day IS 'Índice del día de entrenamiento actual (0-based)';
COMMENT ON COLUMN profiles.training_frequency IS 'Frecuencia de entrenamiento por semana (ej: 3, 4, 5)';
COMMENT ON COLUMN user_assets.training_day IS 'Día de entrenamiento al que pertenece el ejercicio (0-based)';
