-- ============================================================================
-- FIX RLS POLICIES FOR user_assets
-- Ejecuta esto en Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own assets" ON user_assets;
DROP POLICY IF EXISTS "Users can insert own assets" ON user_assets;
DROP POLICY IF EXISTS "Users can update own assets" ON user_assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON user_assets;

-- 2. Asegurar que RLS está habilitado
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas correctas con auth.uid()
CREATE POLICY "Enable read access for authenticated users"
ON user_assets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users"
ON user_assets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users"
ON user_assets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for authenticated users"
ON user_assets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_assets';
