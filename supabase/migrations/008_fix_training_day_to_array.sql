-- ============================================================================
-- MIGRACIÓN: Cambiar training_day de INTEGER a INTEGER[]
-- Fecha: 2025-12-15
-- Descripción: Permitir que un ejercicio exista en múltiples días sin duplicarse
-- ============================================================================

-- 1. Crear nueva columna como array
ALTER TABLE user_assets
ADD COLUMN IF NOT EXISTS training_days INTEGER[] DEFAULT '{0}';

-- 2. Migrar datos existentes de training_day a training_days
UPDATE user_assets
SET training_days = ARRAY[training_day]
WHERE training_day IS NOT NULL;

-- 3. Eliminar columna antigua
ALTER TABLE user_assets
DROP COLUMN IF EXISTS training_day;

-- 4. Crear índice GIN para búsquedas eficientes en arrays
CREATE INDEX IF NOT EXISTS idx_user_assets_training_days 
ON user_assets USING GIN (training_days);

-- 5. Actualizar índice compuesto
DROP INDEX IF EXISTS idx_user_assets_training_day;
CREATE INDEX IF NOT EXISTS idx_user_assets_user_deleted 
ON user_assets(user_id, deleted_at);

-- Comentarios
COMMENT ON COLUMN user_assets.training_days IS 'Array de días en los que aparece el ejercicio (ej: {0,2} = día 0 y día 2)';
