-- ============================================================================
-- MIGRACIÓN: Añadir preferencia de sincronización Spotify en Feed
-- ============================================================================

-- Añadir columna para guardar si el usuario tiene activada la sincronización
-- de Spotify con los videos del Feed (true = sincronizar canción del video)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS spotify_feed_sync BOOLEAN DEFAULT true;

-- Comentario para documentación
COMMENT ON COLUMN public.user_roles.spotify_feed_sync IS 
  'Si true, el Feed reproduce la canción del video. Si false, el usuario escucha su propia música.';
