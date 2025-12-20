-- ============================================================================
-- MIGRACIÓN 028: CREAR BUCKET exercise-media
-- ============================================================================

-- Crear el bucket para media de ejercicios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-media',
  'exercise-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Políticas de storage para exercise-media
-- Usuarios autenticados pueden subir
CREATE POLICY "Users can upload exercise media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-media');

-- Usuarios autenticados pueden ver su propia media
CREATE POLICY "Users can view exercise media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'exercise-media');

-- Usuarios autenticados pueden actualizar su propia media
CREATE POLICY "Users can update own exercise media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exercise-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Usuarios autenticados pueden eliminar su propia media
CREATE POLICY "Users can delete own exercise media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exercise-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Acceso público para lectura (ya que el bucket es público)
CREATE POLICY "Public read access to exercise media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exercise-media');
