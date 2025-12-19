-- ============================================================================
-- SCRIPT DE EMERGENCIA: Crear tabla hank_chat_messages
-- Ejecutar este script directamente en el SQL Editor de Supabase
-- ============================================================================

-- Verificar si la tabla existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hank_chat_messages') THEN
    RAISE NOTICE '❌ La tabla hank_chat_messages NO existe. Creándola ahora...';
    
    -- Crear la tabla
    CREATE TABLE hank_chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'model')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Índices
    CREATE INDEX idx_hank_chat_user_date ON hank_chat_messages(user_id, created_at DESC);
    CREATE INDEX idx_hank_chat_created ON hank_chat_messages(created_at);
    
    -- RLS
    ALTER TABLE hank_chat_messages ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON hank_chat_messages TO authenticated;
    
    -- Políticas
    CREATE POLICY "hank_select_own" ON hank_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "hank_insert_own" ON hank_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "hank_update_own" ON hank_chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "hank_delete_own" ON hank_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Tabla hank_chat_messages creada exitosamente';
  ELSE
    RAISE NOTICE '✅ La tabla hank_chat_messages ya existe';
  END IF;
END $$;

-- Asegurar que la función de limpieza existe
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

-- Verificación final
SELECT 
  EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hank_chat_messages') AS table_exists,
  (SELECT COUNT(*) FROM hank_chat_messages) AS total_messages;
