-- ============================================================================
-- MIGRACIÓN 024: ARQUITECTURA MULTIDEPORTE
-- Catálogo global de ejercicios + Personalización por usuario
-- ============================================================================

-- 1. TABLA DE DEPORTES
CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT DEFAULT '#DC2626',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deportes iniciales
INSERT INTO sports (name, icon, color) VALUES
('GIMNASIO', '🏋️', '#DC2626'),
('CALISTENIA', '🤸', '#3B82F6'),
('CROSSFIT', '💪', '#F59E0B'),
('POWERLIFTING', '🏆', '#8B5CF6'),
('RUNNING', '🏃', '#10B981'),
('NATACIÓN', '🏊', '#0EA5E9'),
('CICLISMO', '🚴', '#F97316'),
('YOGA', '🧘', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- 2. CATÁLOGO GLOBAL DE EJERCICIOS
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  sport_id UUID REFERENCES sports(id),
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT[],
  equipment TEXT[],
  equipment_optional TEXT[],
  difficulty TEXT CHECK (difficulty IN ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO')),
  movement_type TEXT,
  is_compound BOOLEAN DEFAULT FALSE,
  is_unilateral BOOLEAN DEFAULT FALSE,
  description TEXT,
  instructions TEXT[],
  tips TEXT[],
  common_mistakes TEXT[],
  thumbnail_url TEXT,
  video_url TEXT,
  animation_url TEXT,
  parent_exercise_id UUID REFERENCES exercises(id),
  alternative_exercises UUID[],
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_sport ON exercises(sport_id);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises USING GIN(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_slug ON exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = TRUE;

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_select_all" ON exercises FOR SELECT USING (TRUE);

-- 3. CONFIGURACIÓN DE EJERCICIO POR USUARIO
CREATE TABLE IF NOT EXISTS user_exercise_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  training_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  default_sets INTEGER DEFAULT 3,
  default_reps TEXT DEFAULT '8-12',
  default_weight DECIMAL(5,2),
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  last_performed_at TIMESTAMPTZ,
  times_performed INTEGER DEFAULT 0,
  pr_weight DECIMAL(5,2),
  pr_reps INTEGER,
  pr_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_user_exercise_user ON user_exercise_config(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_days ON user_exercise_config USING GIN(training_days);
CREATE INDEX IF NOT EXISTS idx_user_exercise_favorite ON user_exercise_config(user_id, is_favorite) WHERE is_favorite = TRUE;

ALTER TABLE user_exercise_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_exercise_config_all" ON user_exercise_config FOR ALL USING (auth.uid() = user_id);

-- 4. HISTORIAL DE ENTRENAMIENTO
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  weight_kg DECIMAL(5,2),
  reps INTEGER,
  duration_seconds INTEGER,
  distance_meters INTEGER,
  rpe DECIMAL(3,1) CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT,
  video_id UUID,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise ON workout_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(performed_at);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_logs_all" ON workout_logs FOR ALL USING (auth.uid() = user_id);

-- 5. VISTA PARA CONSULTA FÁCIL
CREATE OR REPLACE VIEW user_exercises_view AS
SELECT 
  e.*,
  uec.training_days AS user_training_days,
  uec.default_sets AS user_sets,
  uec.default_reps AS user_reps,
  uec.default_weight AS user_weight,
  uec.is_favorite,
  uec.pr_weight,
  uec.pr_reps,
  uec.times_performed,
  uec.notes AS user_notes,
  s.name AS sport_name,
  s.icon AS sport_icon
FROM exercises e
LEFT JOIN user_exercise_config uec ON uec.exercise_id = e.id AND uec.user_id = auth.uid()
LEFT JOIN sports s ON s.id = e.sport_id
WHERE e.is_active = TRUE
  AND (uec.is_hidden IS NULL OR uec.is_hidden = FALSE);
