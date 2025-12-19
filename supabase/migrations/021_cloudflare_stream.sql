-- ============================================================================
-- MIGRACIÓN 021: CLOUDFLARE STREAM INTEGRATION
-- Agregar soporte para videos en Cloudflare Stream
-- ============================================================================

-- 1. AGREGAR COLUMNA cloudflare_video_id A pro_videos
-- ============================================================================
ALTER TABLE public.pro_videos 
  ADD COLUMN IF NOT EXISTS cloudflare_video_id TEXT;

-- Índice para búsqueda rápida por ID de Cloudflare
CREATE INDEX IF NOT EXISTS idx_pro_videos_cloudflare_id 
  ON public.pro_videos(cloudflare_video_id);

-- 2. COMENTARIO EXPLICATIVO
-- ============================================================================
COMMENT ON COLUMN public.pro_videos.cloudflare_video_id IS 
  'ID del video en Cloudflare Stream. Si está presente, video_url apunta a HLS de Stream.';

-- 3. FUNCIÓN HELPER: Verificar si video usa Cloudflare Stream
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_cloudflare_video(video_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.pro_videos
    WHERE id = video_uuid 
    AND cloudflare_video_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NOTAS DE MIGRACIÓN:
-- 
-- Videos antiguos (Supabase Storage):
--   - cloudflare_video_id = NULL
--   - video_url = URL de Supabase Storage
--
-- Videos nuevos (Cloudflare Stream):
--   - cloudflare_video_id = ID de Stream (ej: "abc123xyz")
--   - video_url = URL HLS de Stream (ej: "https://customer-xxx.cloudflarestream.com/abc123xyz/manifest/video.m3u8")
--   - thumbnail_url = Thumbnail auto-generado (ej: "https://customer-xxx.cloudflarestream.com/abc123xyz/thumbnails/thumbnail.jpg")
--
-- El reproductor debe detectar si es HLS (.m3u8) y usar el player adecuado.
-- ============================================================================
