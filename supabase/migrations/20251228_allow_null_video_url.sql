-- Permitir video_url NULL para registros de notas sin video
ALTER TABLE pro_videos ALTER COLUMN video_url DROP NOT NULL;

-- Agregar comentario explicativo
COMMENT ON COLUMN pro_videos.video_url IS 'URL del video. NULL cuando es solo un registro de notas sin video asociado.';
