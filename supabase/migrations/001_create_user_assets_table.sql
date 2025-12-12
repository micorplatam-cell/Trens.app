-- ============================================================================
-- TABLA: user_assets
-- Descripción: Almacena ejercicios, dietas, y otros assets del usuario
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'gym_exercise', 'diet_meal', 'pro_challenge', etc.
  name TEXT NOT NULL,
  asset_url TEXT, -- URL de imagen/video del asset
  metadata JSONB, -- Sets, reps, calorías, etc.
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================================================
CREATE INDEX idx_user_assets_user_id ON user_assets(user_id);
CREATE INDEX idx_user_assets_type ON user_assets(asset_type);
CREATE INDEX idx_user_assets_order ON user_assets("order");

-- ============================================================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ============================================================================
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- Permitir a los usuarios leer sus propios assets
CREATE POLICY "Users can view own assets"
  ON user_assets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Permitir a los usuarios insertar sus propios assets
CREATE POLICY "Users can insert own assets"
  ON user_assets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Permitir a los usuarios actualizar sus propios assets
CREATE POLICY "Users can update own assets"
  ON user_assets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Permitir a los usuarios eliminar sus propios assets
CREATE POLICY "Users can delete own assets"
  ON user_assets
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_assets_updated_at
  BEFORE UPDATE ON user_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
