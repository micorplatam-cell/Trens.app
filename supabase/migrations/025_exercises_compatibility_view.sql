-- ============================================================================
-- MIGRACIÓN 025: VIEW DE COMPATIBILIDAD EXERCISES ↔ USER_ASSETS
-- ============================================================================
-- Esta view permite que el código existente siga funcionando mientras migramos
-- gradualmente a la nueva arquitectura de exercises + user_exercise_config

-- ============================================================================
-- AGREGAR COLUMNAS FALTANTES A user_exercise_config
-- ============================================================================
ALTER TABLE user_exercise_config 
ADD COLUMN IF NOT EXISTS custom_media_url TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS personal_records JSONB DEFAULT '{}'::JSONB;

-- Agregar columna default_media_url a exercises si no existe
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS default_media_url TEXT;

-- Copiar thumbnail_url a default_media_url si está vacío
UPDATE exercises 
SET default_media_url = thumbnail_url 
WHERE default_media_url IS NULL AND thumbnail_url IS NOT NULL;

-- Eliminar la view existente si existe (para poder recrearla con columnas diferentes)
DROP VIEW IF EXISTS user_exercises_view;

-- Crear la view que simula user_assets usando exercises + user_exercise_config
CREATE OR REPLACE VIEW user_exercises_view AS
SELECT 
  -- Generar ID compuesto único: exercise_id + user_id
  COALESCE(uec.id::text, e.id::text) as id,
  uec.user_id,
  'exercise' as type,
  e.name,
  COALESCE(uec.custom_media_url, e.default_media_url, e.thumbnail_url) as media_url,
  uec.training_days,
  COALESCE(uec.display_order, 0) as "order",
  NULL::timestamptz as deleted_at,
  COALESCE(uec.created_at, e.created_at) as created_at,
  COALESCE(uec.updated_at, e.updated_at) as updated_at,
  -- Metadata combinada
  jsonb_build_object(
    'sets', COALESCE((uec.config->>'sets'), '4x10'),
    'rest', COALESCE((uec.config->>'rest'), uec.rest_seconds::text || 's', '90s'),
    'category', e.muscle_group,
    'difficulty', e.difficulty,
    'series_by_day', COALESCE(uec.config->'series_by_day', '{}'::jsonb),
    'custom_series', uec.config->'custom_series',
    'description', e.description,
    -- Nuevos campos de exercises
    'exercise_id', e.id,
    'sport_id', e.sport_id,
    'equipment', e.equipment,
    'video_url', e.video_url
  ) as metadata,
  -- Referencias directas a exercises
  e.id as exercise_id,
  e.sport_id,
  e.muscle_group,
  e.secondary_muscles,
  e.equipment,
  e.difficulty,
  e.description as exercise_description,
  COALESCE(e.default_media_url, e.thumbnail_url) as default_image_url,
  e.video_url as default_video_url
FROM exercises e
LEFT JOIN user_exercise_config uec ON e.id = uec.exercise_id
WHERE e.is_active = true;

-- ============================================================================
-- FUNCIÓN: Agregar ejercicio a usuario (simula INSERT en user_assets)
-- ============================================================================
CREATE OR REPLACE FUNCTION add_exercise_to_user(
  p_user_id uuid,
  p_exercise_id uuid,
  p_training_days integer[] DEFAULT ARRAY[0],
  p_config jsonb DEFAULT '{}'::jsonb,
  p_display_order integer DEFAULT 0
) RETURNS uuid AS $$
DECLARE
  v_config_id uuid;
BEGIN
  -- Verificar si ya existe configuración para este usuario y ejercicio
  SELECT id INTO v_config_id
  FROM user_exercise_config
  WHERE user_id = p_user_id AND exercise_id = p_exercise_id;
  
  IF v_config_id IS NOT NULL THEN
    -- Actualizar configuración existente
    UPDATE user_exercise_config
    SET 
      training_days = p_training_days,
      config = COALESCE(config, '{}'::jsonb) || p_config,
      display_order = p_display_order,
      updated_at = NOW()
    WHERE id = v_config_id;
    
    RETURN v_config_id;
  ELSE
    -- Crear nueva configuración
    INSERT INTO user_exercise_config (
      user_id,
      exercise_id,
      training_days,
      config,
      display_order
    ) VALUES (
      p_user_id,
      p_exercise_id,
      p_training_days,
      p_config,
      p_display_order
    ) RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCIÓN: Buscar ejercicio por nombre (para compatibilidad con templates)
-- ============================================================================
CREATE OR REPLACE FUNCTION find_exercise_by_name(p_name text)
RETURNS uuid AS $$
DECLARE
  v_exercise_id uuid;
BEGIN
  SELECT id INTO v_exercise_id
  FROM exercises
  WHERE LOWER(name) = LOWER(p_name)
  LIMIT 1;
  
  RETURN v_exercise_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Remover ejercicio de día específico
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_exercise_from_day(
  p_user_id uuid,
  p_config_id uuid,
  p_day_index integer
) RETURNS void AS $$
DECLARE
  v_current_days integer[];
  v_new_days integer[];
BEGIN
  -- Obtener días actuales
  SELECT training_days INTO v_current_days
  FROM user_exercise_config
  WHERE id = p_config_id AND user_id = p_user_id;
  
  -- Remover el día del array
  SELECT array_agg(d) INTO v_new_days
  FROM unnest(v_current_days) AS d
  WHERE d != p_day_index;
  
  IF v_new_days IS NULL OR array_length(v_new_days, 1) = 0 THEN
    -- Si no quedan días, eliminar la configuración
    DELETE FROM user_exercise_config
    WHERE id = p_config_id AND user_id = p_user_id;
  ELSE
    -- Actualizar con los nuevos días
    UPDATE user_exercise_config
    SET training_days = v_new_days, updated_at = NOW()
    WHERE id = p_config_id AND user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES PARA user_exercise_config (si no existen)
-- ============================================================================
DO $$
BEGIN
  -- Verificar si la política ya existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_exercise_config' 
    AND policyname = 'Users can view own exercise config'
  ) THEN
    CREATE POLICY "Users can view own exercise config" ON user_exercise_config
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_exercise_config' 
    AND policyname = 'Users can insert own exercise config'
  ) THEN
    CREATE POLICY "Users can insert own exercise config" ON user_exercise_config
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_exercise_config' 
    AND policyname = 'Users can update own exercise config'
  ) THEN
    CREATE POLICY "Users can update own exercise config" ON user_exercise_config
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_exercise_config' 
    AND policyname = 'Users can delete own exercise config'
  ) THEN
    CREATE POLICY "Users can delete own exercise config" ON user_exercise_config
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Habilitar RLS si no está habilitado
ALTER TABLE user_exercise_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES PARA exercises (lectura pública)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exercises' 
    AND policyname = 'Public read access to exercises'
  ) THEN
    CREATE POLICY "Public read access to exercises" ON exercises
      FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT permisos
-- ============================================================================
GRANT SELECT ON user_exercises_view TO authenticated;
GRANT EXECUTE ON FUNCTION add_exercise_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION find_exercise_by_name TO authenticated;
GRANT EXECUTE ON FUNCTION remove_exercise_from_day TO authenticated;
