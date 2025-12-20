-- Actualizar usuario a PRO
-- Primero ver los usuarios existentes
SELECT user_id, role, spotify_connected, spotify_premium FROM user_roles;

-- Actualizar TODOS los usuarios a PRO (para desarrollo)
UPDATE user_roles 
SET role = 'pro', 
    spotify_connected = true, 
    spotify_premium = true,
    updated_at = NOW()
WHERE role = 'free';

-- Verificar el cambio
SELECT user_id, role, spotify_connected, spotify_premium FROM user_roles;
