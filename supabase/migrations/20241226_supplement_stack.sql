-- ============================================================================
-- SUPPLEMENT_STACK - Stack de suplementos y fármacos
-- Ejecutar en SQL Editor de Supabase
-- ============================================================================

-- Crear tabla supplement_stack
CREATE TABLE IF NOT EXISTS public.supplement_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'pill' CHECK (type IN ('pill', 'syringe', 'powder', 'liquid')),
  notes TEXT,
  time TIME,
  is_pre_workout BOOLEAN DEFAULT false,
  is_post_workout BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  days_of_week INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_supplement_stack_user ON public.supplement_stack(user_id);
CREATE INDEX IF NOT EXISTS idx_supplement_stack_active ON public.supplement_stack(user_id, is_active);

-- Habilitar RLS
ALTER TABLE public.supplement_stack ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
DROP POLICY IF EXISTS "supplement_stack_select" ON public.supplement_stack;
CREATE POLICY "supplement_stack_select" ON public.supplement_stack FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "supplement_stack_insert" ON public.supplement_stack;
CREATE POLICY "supplement_stack_insert" ON public.supplement_stack FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "supplement_stack_update" ON public.supplement_stack;
CREATE POLICY "supplement_stack_update" ON public.supplement_stack FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "supplement_stack_delete" ON public.supplement_stack;
CREATE POLICY "supplement_stack_delete" ON public.supplement_stack FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- ✅ MIGRACIÓN COMPLETADA
-- ============================================================================
