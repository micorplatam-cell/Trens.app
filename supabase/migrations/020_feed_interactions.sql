-- ============================================================================
-- MIGRACIÓN 020: SISTEMA DE INTERACCIONES DEL FEED
-- Tablas para likes, saves y comentarios de videos
-- ============================================================================

-- 1. TABLA VIDEO_LIKES: Likes de videos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.pro_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint único para evitar likes duplicados
  UNIQUE(user_id, video_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_likes_video ON public.video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user ON public.video_likes(user_id);

-- RLS
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden ver likes
CREATE POLICY "Authenticated users can view likes"
  ON public.video_likes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política: Usuarios pueden crear sus propios likes
CREATE POLICY "Users can create their own likes"
  ON public.video_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuarios pueden eliminar sus propios likes
CREATE POLICY "Users can delete their own likes"
  ON public.video_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. TABLA VIDEO_SAVES: Videos guardados/favoritos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.video_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.pro_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint único
  UNIQUE(user_id, video_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_saves_video ON public.video_saves(video_id);
CREATE INDEX IF NOT EXISTS idx_video_saves_user ON public.video_saves(user_id);

-- RLS
ALTER TABLE public.video_saves ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver sus propios saves
CREATE POLICY "Users can view their own saves"
  ON public.video_saves
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuarios pueden crear sus propios saves
CREATE POLICY "Users can create their own saves"
  ON public.video_saves
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuarios pueden eliminar sus propios saves
CREATE POLICY "Users can delete their own saves"
  ON public.video_saves
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. TABLA VIDEO_COMMENTS: Comentarios de videos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.pro_videos(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE, -- Para respuestas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_comments_video ON public.video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_user ON public.video_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON public.video_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created ON public.video_comments(created_at DESC);

-- RLS
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver comentarios de videos públicos
CREATE POLICY "Anyone can view comments on public videos"
  ON public.video_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pro_videos
      WHERE id = video_id AND is_public = TRUE
    )
  );

-- Política: Usuarios autenticados pueden crear comentarios
CREATE POLICY "Authenticated users can create comments"
  ON public.video_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuarios pueden editar sus propios comentarios
CREATE POLICY "Users can update their own comments"
  ON public.video_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuarios pueden eliminar sus propios comentarios
CREATE POLICY "Users can delete their own comments"
  ON public.video_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. TABLA VIDEO_VIEWS: Conteo de vistas
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.pro_videos(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL para anónimos
  viewer_ip TEXT, -- Para tracking de anónimos
  watched_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_views_video ON public.video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewer ON public.video_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_video_views_created ON public.video_views(created_at DESC);

-- RLS
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede insertar vistas
CREATE POLICY "Anyone can insert views"
  ON public.video_views
  FOR INSERT
  WITH CHECK (TRUE);

-- Política: Usuarios pueden ver sus propias vistas
CREATE POLICY "Users can view their own views"
  ON public.video_views
  FOR SELECT
  USING (auth.uid() = viewer_id OR viewer_id IS NULL);

-- 5. FUNCIONES HELPER: Conteos
-- ============================================================================

-- Función: Contar likes de un video
CREATE OR REPLACE FUNCTION public.get_video_likes_count(video_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.video_likes
    WHERE video_id = video_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Contar comentarios de un video
CREATE OR REPLACE FUNCTION public.get_video_comments_count(video_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.video_comments
    WHERE video_id = video_uuid AND parent_id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Contar vistas de un video
CREATE OR REPLACE FUNCTION public.get_video_views_count(video_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.video_views
    WHERE video_id = video_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar si usuario dio like a un video
CREATE OR REPLACE FUNCTION public.user_liked_video(user_uuid UUID, video_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.video_likes
    WHERE user_id = user_uuid AND video_id = video_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar si usuario guardó un video
CREATE OR REPLACE FUNCTION public.user_saved_video(user_uuid UUID, video_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.video_saves
    WHERE user_id = user_uuid AND video_id = video_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. AGREGAR COLUMNAS DE CONTEO A PRO_VIDEOS (para performance)
-- ============================================================================
ALTER TABLE public.pro_videos 
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- 7. TRIGGERS PARA MANTENER CONTEOS ACTUALIZADOS
-- ============================================================================

-- Trigger: Actualizar likes_count
CREATE OR REPLACE FUNCTION public.update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pro_videos
    SET likes_count = likes_count + 1
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pro_videos
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_like_change ON public.video_likes;
CREATE TRIGGER on_video_like_change
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_video_likes_count();

-- Trigger: Actualizar comments_count
CREATE OR REPLACE FUNCTION public.update_video_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NULL THEN
    UPDATE public.pro_videos
    SET comments_count = comments_count + 1
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NULL THEN
    UPDATE public.pro_videos
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_comment_change ON public.video_comments;
CREATE TRIGGER on_video_comment_change
  AFTER INSERT OR DELETE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_video_comments_count();

-- Trigger: Actualizar views_count
CREATE OR REPLACE FUNCTION public.update_video_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.pro_videos
  SET views_count = views_count + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_view_insert ON public.video_views;
CREATE TRIGGER on_video_view_insert
  AFTER INSERT ON public.video_views
  FOR EACH ROW EXECUTE FUNCTION public.update_video_views_count();
