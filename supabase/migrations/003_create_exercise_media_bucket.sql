-- ============================================================================
-- MIGRATION: CREATE EXERCISE MEDIA STORAGE BUCKET
-- ============================================================================
-- Descripción: Crea el bucket para almacenar fotos/videos de ejercicios
-- Fecha: 2025-12-13
-- ============================================================================

-- Crear bucket público para media de ejercicios
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-media', 'exercise-media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================================================

-- Política 1: Los usuarios autenticados pueden SUBIR archivos a su propia carpeta
CREATE POLICY "Users can upload exercise media to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 2: Los usuarios autenticados pueden ACTUALIZAR sus propios archivos
CREATE POLICY "Users can update own exercise media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercise-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 3: Los usuarios autenticados pueden ELIMINAR sus propios archivos
CREATE POLICY "Users can delete own exercise media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 4: TODO EL MUNDO puede VER archivos (bucket público)
CREATE POLICY "Anyone can view exercise media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'exercise-media');

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Estructura de carpetas: user_id/exercise_id/filename.ext
-- Ejemplo: abc123-def456/exercise-789/exercise_1702456789.jpg
-- 
-- Cada usuario solo puede:
-- - Subir archivos a su carpeta (user_id)
-- - Actualizar/Eliminar sus propios archivos
-- - Ver todos los archivos (públicos)
-- ============================================================================
