-- ============================================================================
-- DIAGNÓSTICO COMPLETO RLS
-- Ejecuta esto en Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Verificar que la tabla existe
SELECT 
  tablename, 
  schemaname,
  tableowner,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_assets';

-- 2. Ver políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE tablename = 'user_assets';

-- 3. Verificar permisos de la tabla
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'user_assets';

-- 4. Verificar el rol del usuario actual
SELECT current_user, session_user;

-- 5. SOLUCIÓN: Deshabilitar RLS temporalmente para pruebas
-- DESCOMENTA ESTA LÍNEA SI QUIERES PROBAR SIN RLS:
-- ALTER TABLE user_assets DISABLE ROW LEVEL SECURITY;
