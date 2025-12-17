-- ============================================================================
-- MIGRACIÓN 015: MÓDULO PLAN - Nutrición y Farmacología
-- "Agenda Metabólica Adaptable"
-- ============================================================================

-- ============================================================================
-- 1. TABLA: PLANES DE NUTRICIÓN
-- ============================================================================
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'MI PLAN',
  description TEXT,
  daily_calories INTEGER,
  daily_protein INTEGER,
  daily_carbs INTEGER,
  daily_fats INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice parcial: solo un plan activo por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_plan 
  ON nutrition_plans (user_id) 
  WHERE is_active = true;

-- ============================================================================
-- 2. TABLA: COMIDAS (MEALS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time TIME NOT NULL,
  sort_order INTEGER DEFAULT 0,
  selected_option INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TABLA: OPCIONES DE COMIDA (MEAL OPTIONS - Para el Swap)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Opción Principal',
  option_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TABLA: INGREDIENTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES meal_options(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  portion TEXT,
  protein_gr NUMERIC(6,1),
  carbs_gr NUMERIC(6,1),
  fats_gr NUMERIC(6,1),
  calories INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. TABLA: STACK DE SUPLEMENTOS/FÁRMACOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplement_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pill', 'syringe', 'powder', 'liquid')),
  dose TEXT NOT NULL,
  notes TEXT,
  -- Configuración temporal
  time TIME, -- NULL si es PRE/POST entreno
  is_pre_workout BOOLEAN DEFAULT false,
  is_post_workout BOOLEAN DEFAULT false,
  -- Días de la semana (array de 0-6, donde 0=Domingo)
  days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Si es PRE o POST, time debe ser NULL
  CONSTRAINT valid_time_binding CHECK (
    (time IS NOT NULL AND is_pre_workout = false AND is_post_workout = false) OR
    (time IS NULL AND (is_pre_workout = true OR is_post_workout = true)) OR
    (time IS NULL AND is_pre_workout = false AND is_post_workout = false)
  )
);

-- ============================================================================
-- 6. TABLA: POSICIÓN DEL BLOQUE DE ENTRENAMIENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_block_position (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  position_index INTEGER DEFAULT 2, -- Posición en la línea de tiempo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_workout_position UNIQUE (user_id, plan_id)
);

-- ============================================================================
-- 7. TABLA: LOG DE COMIDAS CONSUMIDAS (Tracking diario)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  option_used INTEGER DEFAULT 0, -- Qué opción usó ese día
  consumed_date DATE DEFAULT CURRENT_DATE, -- Fecha del consumo (para unique)
  consumed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  -- Evitar duplicados del mismo día
  CONSTRAINT unique_daily_meal UNIQUE (user_id, meal_id, consumed_date)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_meals_plan ON meals(plan_id);
CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_time ON meals(time);
CREATE INDEX IF NOT EXISTS idx_meal_options_meal ON meal_options(meal_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_option ON meal_ingredients(option_id);
CREATE INDEX IF NOT EXISTS idx_stack_user ON supplement_stack(user_id);
CREATE INDEX IF NOT EXISTS idx_stack_time ON supplement_stack(time);
CREATE INDEX IF NOT EXISTS idx_meal_log_user_date ON meal_log(user_id, consumed_at);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Plans
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans"
  ON nutrition_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON nutrition_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON nutrition_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON nutrition_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Meals
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meals"
  ON meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals"
  ON meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals"
  ON meals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals"
  ON meals FOR DELETE
  USING (auth.uid() = user_id);

-- Meal Options (via meal ownership)
ALTER TABLE meal_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meal options"
  ON meal_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meals WHERE meals.id = meal_options.meal_id AND meals.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert meal options"
  ON meal_options FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meals WHERE meals.id = meal_options.meal_id AND meals.user_id = auth.uid()
  ));

CREATE POLICY "Users can update meal options"
  ON meal_options FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM meals WHERE meals.id = meal_options.meal_id AND meals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete meal options"
  ON meal_options FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM meals WHERE meals.id = meal_options.meal_id AND meals.user_id = auth.uid()
  ));

-- Meal Ingredients (via option -> meal ownership)
ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ingredients"
  ON meal_ingredients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meal_options mo
    JOIN meals m ON m.id = mo.meal_id
    WHERE mo.id = meal_ingredients.option_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert ingredients"
  ON meal_ingredients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meal_options mo
    JOIN meals m ON m.id = mo.meal_id
    WHERE mo.id = meal_ingredients.option_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Users can update ingredients"
  ON meal_ingredients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM meal_options mo
    JOIN meals m ON m.id = mo.meal_id
    WHERE mo.id = meal_ingredients.option_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete ingredients"
  ON meal_ingredients FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM meal_options mo
    JOIN meals m ON m.id = mo.meal_id
    WHERE mo.id = meal_ingredients.option_id AND m.user_id = auth.uid()
  ));

-- Supplement Stack
ALTER TABLE supplement_stack ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stack"
  ON supplement_stack FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stack"
  ON supplement_stack FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stack"
  ON supplement_stack FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stack"
  ON supplement_stack FOR DELETE
  USING (auth.uid() = user_id);

-- Workout Block Position
ALTER TABLE workout_block_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout position"
  ON workout_block_position FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout position"
  ON workout_block_position FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout position"
  ON workout_block_position FOR UPDATE
  USING (auth.uid() = user_id);

-- Meal Log
ALTER TABLE meal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal log"
  ON meal_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal log"
  ON meal_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-crear plan por defecto al registrarse
CREATE OR REPLACE FUNCTION create_default_nutrition_plan()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO nutrition_plans (user_id, name, description)
  VALUES (NEW.id, 'MI PLAN', 'Plan de nutrición personalizado')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conectar al trigger existente o crear uno nuevo
DROP TRIGGER IF EXISTS on_auth_user_created_nutrition ON auth.users;
CREATE TRIGGER on_auth_user_created_nutrition
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_nutrition_plan();

-- Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nutrition_plans_timestamp
  BEFORE UPDATE ON nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION update_plan_timestamp();

CREATE TRIGGER update_meals_timestamp
  BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_plan_timestamp();

CREATE TRIGGER update_stack_timestamp
  BEFORE UPDATE ON supplement_stack
  FOR EACH ROW EXECUTE FUNCTION update_plan_timestamp();

-- ============================================================================
-- FUNCIÓN: Obtener nombre dinámico de comida
-- ============================================================================
CREATE OR REPLACE FUNCTION get_meal_name(meal_index INTEGER, total_meals INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF total_meals = 1 THEN
    RETURN 'COMIDA ÚNICA';
  ELSIF total_meals = 2 THEN
    RETURN CASE meal_index
      WHEN 0 THEN 'DESAYUNO'
      WHEN 1 THEN 'CENA'
      ELSE 'COMIDA ' || (meal_index + 1)
    END;
  ELSIF total_meals = 3 THEN
    RETURN CASE meal_index
      WHEN 0 THEN 'DESAYUNO'
      WHEN 1 THEN 'ALMUERZO'
      WHEN 2 THEN 'CENA'
      ELSE 'COMIDA ' || (meal_index + 1)
    END;
  ELSIF total_meals = 4 THEN
    RETURN 'COMIDA ' || (meal_index + 1);
  ELSIF total_meals = 5 THEN
    RETURN CASE meal_index
      WHEN 0 THEN 'DESAYUNO'
      WHEN 1 THEN 'MEDIA MAÑANA'
      WHEN 2 THEN 'ALMUERZO'
      WHEN 3 THEN 'MEDIA TARDE'
      WHEN 4 THEN 'CENA'
      ELSE 'COMIDA ' || (meal_index + 1)
    END;
  ELSE
    RETURN 'COMIDA ' || (meal_index + 1);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- DATOS INICIALES DE EJEMPLO (Para desarrollo)
-- ============================================================================
-- Se pueden insertar datos de prueba ejecutando manualmente después
