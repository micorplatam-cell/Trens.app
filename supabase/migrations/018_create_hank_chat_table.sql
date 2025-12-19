-- ============================================================================
-- HANK CHAT HISTORY - Crear tabla correctamente
-- La tabla hank_chat_messages nunca fue creada porque la migración 017
-- asumió que ya existía al renombrar de axis.
-- ============================================================================

-- 1. Eliminar tabla axis si existe (legacy)
DROP TABLE IF EXISTS axis_chat_messages CASCADE;

-- 2. Crear tabla hank_chat_messages si no existe
CREATE TABLE IF NOT EXISTS hank_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_hank_chat_user_date 
  ON hank_chat_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hank_chat_created 
  ON hank_chat_messages(created_at);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
ALTER TABLE hank_chat_messages ENABLE ROW LEVEL SECURITY;

-- Dar permisos a usuarios autenticados
GRANT ALL ON hank_chat_messages TO authenticated;

-- Política SELECT: usuarios pueden ver sus propios mensajes
DROP POLICY IF EXISTS "hank_select_own" ON hank_chat_messages;
CREATE POLICY "hank_select_own"
  ON hank_chat_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política INSERT: usuarios pueden insertar sus propios mensajes
DROP POLICY IF EXISTS "hank_insert_own" ON hank_chat_messages;
CREATE POLICY "hank_insert_own"
  ON hank_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: usuarios pueden actualizar sus propios mensajes
DROP POLICY IF EXISTS "hank_update_own" ON hank_chat_messages;
CREATE POLICY "hank_update_own"
  ON hank_chat_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Política DELETE: usuarios pueden eliminar sus propios mensajes
DROP POLICY IF EXISTS "hank_delete_own" ON hank_chat_messages;
CREATE POLICY "hank_delete_own"
  ON hank_chat_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCIÓN: Limpiar mensajes anteriores a medianoche de hoy
-- ============================================================================
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

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE hank_chat_messages IS 'Historial de chat con HANK - se limpia cada medianoche';
COMMENT ON COLUMN hank_chat_messages.role IS 'user = mensaje del usuario, model = respuesta de HANK';
