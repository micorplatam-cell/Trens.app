-- ============================================================================
-- MIGRACIÓN: Tabla de ejercicios alternativos
-- Fecha: 2025-12-14
-- Descripción: Relaciona ejercicios principales con sus alternativas
-- ============================================================================

-- Tabla para vincular ejercicios con sus alternativas
CREATE TABLE IF NOT EXISTS user_exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  main_exercise_id UUID NOT NULL REFERENCES user_assets(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES user_assets(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0, -- Orden de las alternativas (0 = primera)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicados
  UNIQUE(main_exercise_id, alternative_exercise_id)
);

-- Índices para rendimiento
CREATE INDEX idx_alternatives_main ON user_exercise_alternatives(main_exercise_id);
CREATE INDEX idx_alternatives_user ON user_exercise_alternatives(user_id);

-- RLS Policies
ALTER TABLE user_exercise_alternatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alternatives"
  ON user_exercise_alternatives
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alternatives"
  ON user_exercise_alternatives
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alternatives"
  ON user_exercise_alternatives
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE user_exercise_alternatives IS 'Relaciona ejercicios principales con sus alternativas';
COMMENT ON COLUMN user_exercise_alternatives.main_exercise_id IS 'ID del ejercicio principal';
COMMENT ON COLUMN user_exercise_alternatives.alternative_exercise_id IS 'ID del ejercicio alternativo';
COMMENT ON COLUMN user_exercise_alternatives.order_index IS 'Orden de visualización de alternativas';
