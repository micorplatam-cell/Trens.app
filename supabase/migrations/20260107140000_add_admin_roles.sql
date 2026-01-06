-- Migración para añadir roles de admin y ceo
-- ===========================================

-- Primero, eliminamos el constraint existente que limita los roles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Añadimos un nuevo constraint que incluye 'admin' y 'ceo'
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('free', 'pro', 'admin', 'ceo'));

-- Comentario: Ahora los roles válidos son:
-- - free: Usuario gratuito
-- - pro: Usuario con suscripción activa
-- - admin: Administrador con acceso al panel de admin
-- - ceo: CEO con acceso total
