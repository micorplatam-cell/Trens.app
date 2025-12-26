-- ============================================================================
-- LIMPIEZA: Eliminar tabla sports existente (estructura vieja)
-- ============================================================================
DROP TABLE IF EXISTS surf_sessions CASCADE;
DROP TABLE IF EXISTS sport_events CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS user_sports CASCADE;

-- Eliminar la tabla sports vieja
DROP TABLE IF EXISTS sports CASCADE;

-- Recrear ejercicios con sport_id nullable temporalmente
ALTER TABLE exercises ALTER COLUMN sport_id DROP NOT NULL;
