-- ============================================================================
-- LIMPIAR RESTOS DE AXIS - La tabla hank_chat_messages ya existe
-- ============================================================================

-- 1. Eliminar tabla antigua de axis si existe (ya migramos a hank)
DROP TABLE IF EXISTS axis_chat_messages CASCADE;

-- 2. Limpiar índices antiguos de axis
DROP INDEX IF EXISTS idx_axis_chat_user_date;
DROP INDEX IF EXISTS idx_axis_chat_created;

-- 3. Asegurar que los índices de hank existan
CREATE INDEX IF NOT EXISTS idx_hank_chat_user_date 
  ON hank_chat_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hank_chat_created 
  ON hank_chat_messages(created_at);

-- 4. Eliminar función antigua de axis
DROP FUNCTION IF EXISTS clean_old_axis_messages(UUID);

-- 5. Asegurar que la función de hank existe
CREATE OR REPLACE FUNCTION clean_old_hank_messages(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hank_chat_messages
  WHERE user_id = p_user_id
    AND created_at < DATE_TRUNC('day', NOW());
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clean_old_hank_messages(UUID) TO authenticated;

-- 6. Actualizar comentarios
COMMENT ON TABLE hank_chat_messages IS 'Historial de chat con HANK - se limpia cada medianoche';
COMMENT ON COLUMN hank_chat_messages.role IS 'user = mensaje del usuario, model = respuesta de HANK';
