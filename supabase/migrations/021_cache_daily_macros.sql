-- ============================================================================
-- MIGRATION: Cache Daily Macros in user_profiles
-- Agrega columnas para cachear los macros calculados por IA
-- Esto evita recalcular en cada recarga de la app
-- ============================================================================

-- Agregar columnas de cache a user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS cached_daily_macros JSONB,
ADD COLUMN IF NOT EXISTS cached_macros_meal_count INTEGER,
ADD COLUMN IF NOT EXISTS cached_macros_updated_at TIMESTAMPTZ;

-- Crear índice para mejorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_user_profiles_cached_macros 
ON user_profiles(user_id, cached_macros_meal_count) 
WHERE cached_daily_macros IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN user_profiles.cached_daily_macros IS 
'Macros diarios calculados por IA (incluyendo perMeal). Se invalida al actualizar perfil.';

COMMENT ON COLUMN user_profiles.cached_macros_meal_count IS 
'Número de comidas para el cual se calcularon los macros. Se usa para validar el cache.';

COMMENT ON COLUMN user_profiles.cached_macros_updated_at IS 
'Última vez que se calcularon los macros. Para debugging y potencial expiración futura.';
