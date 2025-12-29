-- ============================================================================
-- MIGRACIÓN: Políticas públicas para perfiles
-- Permite que cualquier usuario vea el rol y deportes de otros usuarios
-- ============================================================================

-- 1. Política pública para ver roles de usuarios (solo lectura)
-- Esto permite saber si un usuario es PRO cuando se visita su perfil
DROP POLICY IF EXISTS "public_user_roles_select" ON public.user_roles;
CREATE POLICY "public_user_roles_select" ON public.user_roles 
  FOR SELECT 
  USING (true);

-- 2. Política pública para ver deportes de usuarios (solo lectura)
-- Esto permite ver qué deportes practica un usuario en su perfil público
DROP POLICY IF EXISTS "public_user_sports_select" ON public.user_sports;
CREATE POLICY "public_user_sports_select" ON public.user_sports 
  FOR SELECT 
  USING (true);

-- 3. La tabla sports ya debería ser pública, pero aseguramos
DROP POLICY IF EXISTS "public_sports_select" ON public.sports;
CREATE POLICY "public_sports_select" ON public.sports 
  FOR SELECT 
  USING (true);
