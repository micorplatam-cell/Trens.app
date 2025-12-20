-- ============================================================================
-- MIGRACIÓN: Expandir user_profiles para cálculo ultra personalizado de macros
-- ============================================================================

-- Agregar nuevos campos para personalización avanzada
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS muscle_mass DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'MODERADO',
  ADD COLUMN IF NOT EXISTS training_experience TEXT DEFAULT 'INTERMEDIO',
  ADD COLUMN IF NOT EXISTS metabolic_rate TEXT DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS training_days_per_week INTEGER DEFAULT 4;

-- Agregar constraint para sexo
ALTER TABLE public.user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_sex_check;
ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_sex_check 
  CHECK (sex IS NULL OR sex IN ('M', 'F', 'MASCULINO', 'FEMENINO'));

-- Agregar constraint para nivel de actividad
ALTER TABLE public.user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_activity_check;
ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_activity_check 
  CHECK (activity_level IS NULL OR activity_level IN ('SEDENTARIO', 'LIGERO', 'MODERADO', 'ACTIVO', 'MUY ACTIVO'));

-- Agregar constraint para experiencia de entrenamiento
ALTER TABLE public.user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_experience_check;
ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_experience_check 
  CHECK (training_experience IS NULL OR training_experience IN ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO', 'ELITE'));

-- Agregar constraint para metabolismo
ALTER TABLE public.user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_metabolism_check;
ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_metabolism_check 
  CHECK (metabolic_rate IS NULL OR metabolic_rate IN ('LENTO', 'NORMAL', 'RAPIDO'));

-- Comentarios de documentación
COMMENT ON COLUMN public.user_profiles.age IS 'Edad del usuario en años';
COMMENT ON COLUMN public.user_profiles.sex IS 'Sexo: M, F, MASCULINO, FEMENINO';
COMMENT ON COLUMN public.user_profiles.body_fat_percentage IS 'Porcentaje de grasa corporal (ej: 15.5)';
COMMENT ON COLUMN public.user_profiles.muscle_mass IS 'Masa muscular en kg';
COMMENT ON COLUMN public.user_profiles.activity_level IS 'Nivel de actividad física diaria';
COMMENT ON COLUMN public.user_profiles.training_experience IS 'Experiencia de entrenamiento';
COMMENT ON COLUMN public.user_profiles.metabolic_rate IS 'Velocidad metabólica percibida';
COMMENT ON COLUMN public.user_profiles.training_days_per_week IS 'Días de entrenamiento por semana (1-7)';
