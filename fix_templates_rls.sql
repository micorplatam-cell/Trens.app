-- ============================================================================
-- FIX RLS para asset_templates
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Anyone can view templates" ON asset_templates;

-- Asegurar que RLS está habilitado
ALTER TABLE asset_templates ENABLE ROW LEVEL SECURITY;

-- Dar permisos explícitos
GRANT SELECT ON asset_templates TO authenticated;
GRANT SELECT ON asset_templates TO anon;

-- Crear política permisiva
CREATE POLICY "Public read access to templates"
ON asset_templates FOR SELECT
TO public
USING (true);

-- Verificar
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'asset_templates';
