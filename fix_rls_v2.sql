-- ============================================================================
-- FIX DEFINITIVO RLS - VERSION 2
-- Ejecuta esto en Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Eliminar TODAS las políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_assets') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_assets';
    END LOOP;
END $$;

-- 2. Asegurar que RLS está habilitado
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- 3. Dar permisos explícitos a usuarios autenticados
GRANT ALL ON user_assets TO authenticated;
GRANT ALL ON user_assets TO service_role;

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

-- 5. Verificar
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_assets';
