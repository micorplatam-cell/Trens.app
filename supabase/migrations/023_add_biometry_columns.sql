-- ============================================================================
-- MIGRACIÓN 023: BIOMETRÍA AVANZADA EN USER_PROFILES
-- Agrega columnas para ultra personalización de macros con IA
-- ============================================================================

-- Agregar columnas de biometría avanzada a user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('MASCULINO', 'FEMENINO', NULL)),
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS muscle_mass DECIMAL(4,1),
ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'MODERADO' CHECK (activity_level IN ('SEDENTARIO', 'LIGERO', 'MODERADO', 'ACTIVO', 'MUY ACTIVO')),
ADD COLUMN IF NOT EXISTS training_experience TEXT DEFAULT 'INTERMEDIO' CHECK (training_experience IN ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO')),
ADD COLUMN IF NOT EXISTS metabolic_rate TEXT DEFAULT 'NORMAL' CHECK (metabolic_rate IN ('LENTO', 'NORMAL', 'RÁPIDO')),
ADD COLUMN IF NOT EXISTS training_days_per_week INTEGER DEFAULT 4 CHECK (training_days_per_week >= 1 AND training_days_per_week <= 7);

-- Comentarios descriptivos
COMMENT ON COLUMN user_profiles.age IS 'Edad del atleta en años';
COMMENT ON COLUMN user_profiles.sex IS 'Sexo biológico para cálculo de TMB';
COMMENT ON COLUMN user_profiles.body_fat_percentage IS 'Porcentaje de grasa corporal';
COMMENT ON COLUMN user_profiles.muscle_mass IS 'Masa muscular en kg';
COMMENT ON COLUMN user_profiles.activity_level IS 'Nivel de actividad diaria general';
COMMENT ON COLUMN user_profiles.training_experience IS 'Años de experiencia entrenando';
COMMENT ON COLUMN user_profiles.metabolic_rate IS 'Velocidad metabólica percibida';
COMMENT ON COLUMN user_profiles.training_days_per_week IS 'Días de entrenamiento por semana';
