-- ============================================================================
-- RECREAR TABLA user_assets COMPLETAMENTE
-- ============================================================================

-- 1. Eliminar tabla existente
DROP TABLE IF EXISTS user_assets CASCADE;

-- 2. Crear tabla con estructura correcta
CREATE TABLE user_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_url TEXT,
  metadata JSONB,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX idx_user_assets_user_id ON user_assets(user_id);
CREATE INDEX idx_user_assets_type ON user_assets(asset_type);
CREATE INDEX idx_user_assets_order ON user_assets("order");

-- 4. RLS
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- 5. Políticas
CREATE POLICY "Enable read access for authenticated users"
ON user_assets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users"
ON user_assets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users"
ON user_assets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users"
ON user_assets FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Trigger para updated_at
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

-- 7. Verificar
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_assets'
ORDER BY ordinal_position;
