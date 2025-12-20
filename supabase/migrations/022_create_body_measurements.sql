-- ============================================================================
-- MIGRACIÓN 022: TABLA BODY_MEASUREMENTS
-- Almacena medidas corporales personalizadas del usuario
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT DEFAULT 'cm',
  is_dominant BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON public.body_measurements(user_id);

-- RLS
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuario solo ve/modifica sus propias medidas
CREATE POLICY "Users can view own measurements"
  ON public.body_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements"
  ON public.body_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own measurements"
  ON public.body_measurements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own measurements"
  ON public.body_measurements FOR DELETE
  USING (auth.uid() = user_id);
