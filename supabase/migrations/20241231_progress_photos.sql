-- =============================================================================
-- MIGRATION: Progress Photos - Historial de progreso visual
-- =============================================================================

-- Tabla principal de fotos de progreso
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_created_at ON progress_photos(created_at DESC);

-- RLS Policies
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Política: Usuario puede ver solo sus propias fotos
CREATE POLICY "Users can view own progress photos"
  ON progress_photos FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuario puede insertar sus propias fotos
CREATE POLICY "Users can insert own progress photos"
  ON progress_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuario puede actualizar sus propias fotos
CREATE POLICY "Users can update own progress photos"
  ON progress_photos FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Usuario puede eliminar sus propias fotos
CREATE POLICY "Users can delete own progress photos"
  ON progress_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_progress_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_progress_photos_updated_at
  BEFORE UPDATE ON progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_photos_updated_at();

-- Storage bucket para las fotos (ejecutar en Supabase Dashboard si no existe)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('progress-photos', 'progress-photos', true)
-- ON CONFLICT (id) DO NOTHING;
