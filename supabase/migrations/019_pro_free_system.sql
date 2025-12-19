-- ============================================================================
-- MIGRACIÓN 019: SISTEMA PRO/FREE + VIDEOS
-- Crea el sistema de roles y la tabla para videos del módulo PRO
-- ============================================================================

-- 1. TABLA USER_ROLES: Define si el usuario es PRO o FREE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'free' CHECK (role IN ('pro', 'free')),
  spotify_connected BOOLEAN DEFAULT FALSE,
  spotify_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsquedas rápidas por role
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- RLS para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo ven su propio rol
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Usuarios pueden insertar su propio registro
CREATE POLICY "Users can insert their own role"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Política: Usuarios pueden actualizar su propio registro (para spotify_connected)
CREATE POLICY "Users can update their own role"
  ON public.user_roles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. FUNCIÓN: Auto-crear rol FREE cuando se registra usuario
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 3. TABLA PRO_VIDEOS: Videos grabados por usuarios PRO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pro_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Video info
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- Contexto (tactical vs free)
  context_type TEXT NOT NULL DEFAULT 'free' CHECK (context_type IN ('tactical', 'free')),
  exercise_id UUID REFERENCES public.user_assets(id) ON DELETE SET NULL,
  exercise_name TEXT,
  
  -- Métricas (solo contexto táctico)
  weight_kg DECIMAL(5,2),
  reps INTEGER,
  
  -- Texto libre (solo contexto libre)
  free_text TEXT,
  
  -- Filtro aplicado
  filter TEXT DEFAULT 'RAW',
  
  -- Spotify metadata (JSON para flexibilidad)
  spotify JSONB DEFAULT '{"enabled": false}'::jsonb,
  -- Ejemplo: {"enabled": true, "trackUri": "spotify:track:XYZ", "positionMs": 43500, "trackName": "POWER", "artist": "Kanye West"}
  
  -- Audio ambiente siempre disponible
  ambient_audio BOOLEAN DEFAULT TRUE,
  
  -- Visibilidad
  is_public BOOLEAN DEFAULT TRUE,
  
  -- Trim info
  trim_start_percent INTEGER DEFAULT 0,
  trim_end_percent INTEGER DEFAULT 100,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para el feed
CREATE INDEX IF NOT EXISTS idx_pro_videos_user ON public.pro_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_videos_public ON public.pro_videos(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_pro_videos_created ON public.pro_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_videos_exercise ON public.pro_videos(exercise_id) WHERE exercise_id IS NOT NULL;

-- RLS para pro_videos
ALTER TABLE public.pro_videos ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver videos públicos
CREATE POLICY "Anyone can view public videos"
  ON public.pro_videos
  FOR SELECT
  USING (is_public = TRUE);

-- Política: Usuarios pueden ver sus propios videos (incluso privados)
CREATE POLICY "Users can view their own videos"
  ON public.pro_videos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Solo usuarios PRO pueden insertar videos
CREATE POLICY "Only PRO users can insert videos"
  ON public.pro_videos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = auth.uid() AND role = 'pro'
    )
  );

-- Política: Usuarios pueden actualizar sus propios videos
CREATE POLICY "Users can update their own videos"
  ON public.pro_videos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuarios pueden eliminar sus propios videos
CREATE POLICY "Users can delete their own videos"
  ON public.pro_videos
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. STORAGE BUCKET: pro-videos
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pro-videos',
  'pro-videos',
  TRUE,
  52428800, -- 50MB max
  ARRAY['video/mp4', 'video/mov', 'video/quicktime', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: Solo usuarios PRO pueden subir
CREATE POLICY "PRO users can upload videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pro-videos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE id = auth.uid() AND role = 'pro'
    )
  );

-- Política de storage: Cualquiera puede ver videos públicos
CREATE POLICY "Anyone can view pro videos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pro-videos');

-- Política de storage: Usuarios pueden eliminar sus propios videos
CREATE POLICY "Users can delete their own pro videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pro-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. FUNCIÓN HELPER: Verificar si usuario es PRO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_user_pro(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE id = user_uuid AND role = 'pro'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. INSERTAR ROL PARA USUARIOS EXISTENTES
-- ============================================================================
INSERT INTO public.user_roles (id, role)
SELECT id, 'free'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_roles)
ON CONFLICT (id) DO NOTHING;
