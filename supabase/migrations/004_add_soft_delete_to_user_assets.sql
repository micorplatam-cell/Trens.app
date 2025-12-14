-- ============================================================================
-- MIGRACIÓN: Agregar soft delete a user_assets
-- Fecha: 2025-12-14
-- Descripción: Agrega campo deleted_at para preservar media personalizado
-- ============================================================================

-- Agregar columna deleted_at
ALTER TABLE user_assets 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Crear índice para consultas de assets activos
CREATE INDEX idx_user_assets_deleted_at ON user_assets(deleted_at) 
WHERE deleted_at IS NULL;

-- Comentario para documentación
COMMENT ON COLUMN user_assets.deleted_at IS 'Timestamp de eliminación lógica. NULL = activo, NOT NULL = eliminado';
