-- ============================================================================
-- MIGRACIÓN: Modos de Entrenamiento Simplificado
-- Fecha: 2026-01-06
-- 
-- FILOSOFÍA: Reutilizar tablas existentes en lugar de crear nuevas.
-- El módulo GYM (user_exercise_config + profiles) YA soporta planes personalizados.
-- Solo necesitamos:
--   1. Un modo "externo" para usuarios que entrenan por su cuenta
--   2. Un indicador de si el plan actual fue creado por Hank o manualmente
-- ============================================================================

-- ============================================================================
-- 1. NUEVOS CAMPOS EN user_profiles (mínimos necesarios)
-- ============================================================================

-- training_mode: Define cómo el usuario gestiona su entrenamiento
-- 'gym_module' = Usa el módulo GYM completo con ejercicios detallados
-- 'external' = Entrena por su cuenta, solo guarda frecuencia/horario simple
-- 'none' = No tiene nada configurado aún
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS training_mode TEXT DEFAULT 'none' 
  CHECK (training_mode IN ('gym_module', 'external', 'none'));

-- external_schedule: Horario simple para usuarios que no usan módulo GYM
-- Formato: {"Lunes": "Pecho y Tríceps", "Martes": "Espalda", "Jueves": "Piernas"}
-- Solo se usa cuando training_mode = 'external'
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS external_schedule JSONB DEFAULT NULL;

-- ============================================================================
-- 2. NUEVO CAMPO EN profiles (para indicar fuente del plan)
-- ============================================================================

-- plan_source: Indica si el plan de entrenamiento actual fue:
-- 'hank' = Creado automáticamente por Hank (template)
-- 'custom' = Creado/editado manualmente por el usuario
-- NULL = Sin plan asignado
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_source TEXT DEFAULT NULL
  CHECK (plan_source IS NULL OR plan_source IN ('hank', 'custom'));

-- ============================================================================
-- 3. FUNCIÓN: Detectar modo de entrenamiento automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_training_status(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  profile_rec RECORD;
  user_profile_rec RECORD;
  exercise_count INTEGER;
BEGIN
  -- Obtener datos de profiles (plan de entrenamiento)
  SELECT 
    training_frequency,
    training_current_day,
    training_routine_names,
    plan_source
  INTO profile_rec
  FROM public.profiles
  WHERE id = user_uuid;

  -- Obtener datos de user_profiles (nivel, modo, horario externo)
  SELECT 
    training_experience,
    training_mode,
    external_schedule,
    training_days_per_week
  INTO user_profile_rec
  FROM public.user_profiles
  WHERE user_id = user_uuid;

  -- Contar ejercicios configurados
  SELECT COUNT(*) INTO exercise_count
  FROM public.user_exercise_config
  WHERE user_id = user_uuid;

  -- Determinar el modo efectivo
  -- Si tiene ejercicios → está usando el módulo GYM (aunque diga otra cosa)
  -- Si no tiene ejercicios pero tiene external_schedule → modo externo
  -- Si no tiene nada → none
  
  result := jsonb_build_object(
    'level', COALESCE(user_profile_rec.training_experience, 'INTERMEDIO'),
    'declared_mode', COALESCE(user_profile_rec.training_mode, 'none'),
    'effective_mode', CASE
      WHEN exercise_count > 0 THEN 'gym_module'
      WHEN user_profile_rec.external_schedule IS NOT NULL 
           AND user_profile_rec.external_schedule != '{}'::jsonb THEN 'external'
      ELSE 'none'
    END,
    'frequency', COALESCE(
      profile_rec.training_frequency, 
      user_profile_rec.training_days_per_week,
      jsonb_array_length(
        CASE WHEN user_profile_rec.external_schedule IS NOT NULL 
             THEN (SELECT jsonb_agg(key) FROM jsonb_object_keys(user_profile_rec.external_schedule) AS key)
             ELSE '[]'::jsonb 
        END
      ),
      0
    ),
    'current_day', COALESCE(profile_rec.training_current_day, 0),
    'routine_names', COALESCE(profile_rec.training_routine_names, '{}'::jsonb),
    'external_schedule', user_profile_rec.external_schedule,
    'exercise_count', exercise_count,
    'plan_source', profile_rec.plan_source,
    'is_experienced', user_profile_rec.training_experience IN ('INTERMEDIO', 'AVANZADO', 'ELITE')
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. TRIGGER: Auto-detectar modo cuando cambian los ejercicios
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_update_training_mode()
RETURNS TRIGGER AS $$
DECLARE
  exercise_count INTEGER;
BEGIN
  -- Contar ejercicios del usuario
  SELECT COUNT(*) INTO exercise_count
  FROM public.user_exercise_config
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  -- Actualizar training_mode basado en ejercicios
  UPDATE public.user_profiles
  SET training_mode = CASE 
    WHEN exercise_count > 0 THEN 'gym_module'
    ELSE training_mode -- Mantener el modo actual si no hay ejercicios
  END,
  updated_at = NOW()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS on_exercise_config_change ON public.user_exercise_config;
CREATE TRIGGER on_exercise_config_change
  AFTER INSERT OR DELETE ON public.user_exercise_config
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_training_mode();

-- ============================================================================
-- 5. ACTUALIZAR USUARIOS EXISTENTES
-- ============================================================================

-- Usuarios que ya tienen ejercicios → gym_module
UPDATE public.user_profiles up
SET training_mode = 'gym_module'
WHERE EXISTS (
  SELECT 1 FROM public.user_exercise_config uec 
  WHERE uec.user_id = up.user_id
)
AND (up.training_mode IS NULL OR up.training_mode = 'none');

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON COLUMN public.user_profiles.training_mode IS 
  'Modo de entrenamiento: gym_module (usa ejercicios), external (entrena por su cuenta), none (sin configurar)';

COMMENT ON COLUMN public.user_profiles.external_schedule IS 
  'Horario simple para modo externo: {"Lunes": "Pecho", "Miércoles": "Piernas"}. Solo para usuarios que no usan módulo GYM.';

COMMENT ON COLUMN public.profiles.plan_source IS 
  'Fuente del plan actual: hank (asignado por IA) o custom (creado manualmente por usuario)';

COMMENT ON FUNCTION public.get_training_status IS 
  'Devuelve el estado completo de entrenamiento: modo, frecuencia, nivel, si es experimentado, etc.';

-- ============================================================================
-- ✅ MIGRACIÓN COMPLETA - ENFOQUE MINIMALISTA
-- ============================================================================
