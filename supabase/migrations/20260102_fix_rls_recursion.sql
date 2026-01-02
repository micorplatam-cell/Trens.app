-- ============================================================================
-- FIX: Recursión infinita en políticas RLS de admin_users
-- ============================================================================

-- Primero: eliminar todas las políticas problemáticas
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON admin_users;

DROP POLICY IF EXISTS "training_templates_select" ON training_plan_templates;
DROP POLICY IF EXISTS "training_templates_insert" ON training_plan_templates;
DROP POLICY IF EXISTS "training_templates_update" ON training_plan_templates;
DROP POLICY IF EXISTS "training_templates_delete" ON training_plan_templates;

-- Recrear funciones SECURITY DEFINER que NO usan RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_ceo()
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'ceo'
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ahora crear políticas usando las funciones (no subqueries directas)
-- admin_users policies
CREATE POLICY "admin_users_select" ON admin_users 
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "admin_users_insert" ON admin_users 
  FOR INSERT 
  WITH CHECK (is_ceo());

CREATE POLICY "admin_users_update" ON admin_users 
  FOR UPDATE 
  USING (is_ceo());

CREATE POLICY "admin_users_delete" ON admin_users 
  FOR DELETE 
  USING (is_ceo());

-- training_plan_templates policies
CREATE POLICY "training_templates_select" ON training_plan_templates 
  FOR SELECT 
  USING (is_active = true OR is_admin());

CREATE POLICY "training_templates_insert" ON training_plan_templates 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "training_templates_update" ON training_plan_templates 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "training_templates_delete" ON training_plan_templates 
  FOR DELETE 
  USING (is_ceo());

-- exercises policies (también arreglar)
DROP POLICY IF EXISTS "exercises_admin_update" ON exercises;
DROP POLICY IF EXISTS "exercises_admin_insert" ON exercises;
DROP POLICY IF EXISTS "exercises_admin_delete" ON exercises;

CREATE POLICY "exercises_admin_update" ON exercises 
  FOR UPDATE 
  USING (is_admin());

CREATE POLICY "exercises_admin_insert" ON exercises 
  FOR INSERT 
  WITH CHECK (is_admin());

CREATE POLICY "exercises_admin_delete" ON exercises 
  FOR DELETE 
  USING (is_ceo());
