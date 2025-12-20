-- ============================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/cnrcrhlrteeqsyhlxhbb/sql/new
-- ============================================================================

-- 1. CREAR TABLA workout_block_position (faltante)
CREATE TABLE IF NOT EXISTS public.workout_block_position (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.workout_block_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_pos_select" ON public.workout_block_position 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workout_pos_insert" ON public.workout_block_position 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workout_pos_update" ON public.workout_block_position 
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. CREAR FUNCIÓN clean_old_hank_messages (faltante)
CREATE OR REPLACE FUNCTION public.clean_old_hank_messages(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.hank_chat_messages
    WHERE user_id = p_user_id
      AND created_at < NOW() - INTERVAL '24 hours'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clean_old_hank_messages(UUID) TO authenticated;

-- 3. ARREGLAR CONSTRAINT DE ROLE EN hank_chat_messages
-- El código usa 'model' pero el constraint solo permite 'user'|'assistant'
ALTER TABLE public.hank_chat_messages DROP CONSTRAINT IF EXISTS hank_chat_messages_role_check;

ALTER TABLE public.hank_chat_messages 
  ADD CONSTRAINT hank_chat_messages_role_check 
  CHECK (role IN ('user', 'assistant', 'model', 'system'));

-- 4. AÑADIR training_routine_names a profiles si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'training_routine_names'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN training_routine_names JSONB DEFAULT '{}';
  END IF;
END $$;

-- 5. Verificar que todo se creó correctamente
SELECT 'workout_block_position' as tabla, COUNT(*) as registros FROM public.workout_block_position
UNION ALL
SELECT 'hank_chat_messages', COUNT(*) FROM public.hank_chat_messages;

-- 6. Mostrar funciones RPC disponibles
SELECT proname as function_name 
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname LIKE '%hank%';
