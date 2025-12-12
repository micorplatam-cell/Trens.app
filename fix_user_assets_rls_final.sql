-- ============================================================================
-- FIX RLS DEFINITIVO para user_assets después de recrear
-- ============================================================================

-- 1. Dar permisos explícitos
GRANT ALL ON user_assets TO authenticated;
GRANT ALL ON user_assets TO service_role;

-- 2. Eliminar políticas existentes
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_assets;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_assets;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON user_assets;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON user_assets;

-- 3. Asegurar RLS habilitado
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas simples y permisivas
CREATE POLICY "allow_authenticated_select"
ON user_assets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow_authenticated_insert"
ON user_assets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_update"
ON user_assets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_delete"
ON user_assets FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Verificar políticas creadas
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'user_assets';
