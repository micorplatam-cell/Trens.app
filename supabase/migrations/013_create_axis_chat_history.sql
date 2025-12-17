-- ============================================================================
-- AXIS CHAT HISTORY - Historial de conversaciones con AXIS (memoria de 24h)
-- El chat se limpia automáticamente cada medianoche
-- ============================================================================

-- Tabla principal de mensajes del chat
CREATE TABLE IF NOT EXISTS axis_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas rápidas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_axis_chat_user_date 
  ON axis_chat_messages(user_id, created_at DESC);

-- Índice para la limpieza por fecha (medianoche)
CREATE INDEX IF NOT EXISTS idx_axis_chat_created 
  ON axis_chat_messages(created_at);

-- ============================================================================
-- RLS (Row Level Security) - Políticas separadas por operación
-- ============================================================================
ALTER TABLE axis_chat_messages ENABLE ROW LEVEL SECURITY;

-- Dar permisos a usuarios autenticados
GRANT ALL ON axis_chat_messages TO authenticated;

-- Política SELECT: usuarios pueden ver sus propios mensajes
CREATE POLICY "allow_authenticated_select"
  ON axis_chat_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política INSERT: usuarios pueden insertar sus propios mensajes
CREATE POLICY "allow_authenticated_insert"
  ON axis_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: usuarios pueden actualizar sus propios mensajes
CREATE POLICY "allow_authenticated_update"
  ON axis_chat_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Política DELETE: usuarios pueden eliminar sus propios mensajes
CREATE POLICY "allow_authenticated_delete"
  ON axis_chat_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCIÓN: Limpiar mensajes anteriores a medianoche de hoy
-- ============================================================================
CREATE OR REPLACE FUNCTION clean_old_axis_messages(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM axis_chat_messages
  WHERE user_id = p_user_id
    AND created_at < DATE_TRUNC('day', NOW());
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clean_old_axis_messages(UUID) TO authenticated;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE axis_chat_messages IS 'Historial de chat con AXIS - se limpia cada medianoche';
COMMENT ON COLUMN axis_chat_messages.role IS 'user = mensaje del usuario, model = respuesta de AXIS';
