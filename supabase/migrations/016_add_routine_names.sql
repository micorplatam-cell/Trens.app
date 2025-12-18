-- ============================================================================
-- MIGRACIÓN 016: Agregar nombres de rutinas por día
-- Permite al usuario definir nombres personalizados para cada día de entreno
-- Ej: Día 0 = "PECHO + ESPALDA", Día 1 = "PIERNA + GLÚTEOS"
-- ============================================================================

-- Agregar columna para nombres de rutinas en profiles
-- Es un JSONB donde las keys son el índice del día y los valores son los nombres
-- Ejemplo: {"0": "PECHO + ESPALDA", "1": "PIERNA + GLÚTEOS", "2": "HOMBROS + BRAZOS"}
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS training_routine_names JSONB DEFAULT '{}';

-- Comentario
COMMENT ON COLUMN profiles.training_routine_names IS 'Nombres personalizados para cada día de entrenamiento. Formato: {"0": "NOMBRE DÍA 0", "1": "NOMBRE DÍA 1", ...}';

-- Ejemplo de cómo actualizar:
-- UPDATE profiles 
-- SET training_routine_names = '{"0": "PECHO + ESPALDA", "1": "PIERNA + GLÚTEOS", "2": "HOMBROS + BRAZOS"}'
-- WHERE id = 'user-id';
