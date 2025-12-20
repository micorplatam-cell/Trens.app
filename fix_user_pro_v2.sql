-- ============================================================================
-- FIX: Agregar columnas de Spotify y actualizar a PRO
-- ============================================================================

-- 1. Agregar columnas de Spotify si no existen
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS spotify_connected BOOLEAN DEFAULT FALSE;

ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS spotify_premium BOOLEAN DEFAULT FALSE;

-- 2. Ver usuarios actuales
SELECT user_id, role FROM user_roles;

-- 3. Actualizar TODOS los usuarios a PRO con Spotify habilitado
UPDATE user_roles 
SET role = 'pro', 
    spotify_connected = true, 
    spotify_premium = true,
    updated_at = NOW();

-- 4. Verificar el cambio
SELECT user_id, role, spotify_connected, spotify_premium FROM user_roles;
