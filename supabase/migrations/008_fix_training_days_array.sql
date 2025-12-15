-- ============================================================================
-- FIX COMPLETO: Un ejercicio = un ID, múltiples días con training_days[]
-- ============================================================================

-- PASO 1: Agregar nueva columna training_days como array
ALTER TABLE user_assets
ADD COLUMN IF NOT EXISTS training_days INTEGER[] DEFAULT '{0}';

-- PASO 2: Migrar datos - copiar training_day a training_days
UPDATE user_assets
SET training_days = ARRAY[COALESCE(training_day, 0)]
WHERE training_days = '{0}' OR training_days IS NULL;

-- PASO 3: Identificar y CONSOLIDAR ejercicios duplicados
-- (mismo user_id + mismo name + diferentes training_day)

-- 3.1: Ver los duplicados ANTES de consolidar
SELECT 
  user_id,
  name,
  array_agg(id ORDER BY created_at) as all_ids,
  array_agg(training_day ORDER BY created_at) as all_days,
  array_agg(created_at ORDER BY created_at) as created_dates,
  array_agg(asset_url ORDER BY created_at) as all_urls,
  COUNT(*) as count
FROM user_assets
WHERE deleted_at IS NULL
  AND asset_type = 'gym_exercise'
GROUP BY user_id, name
HAVING COUNT(*) > 1;

-- 3.2: CONSOLIDAR - Actualizar el ejercicio que tiene imagen custom (o el más antiguo) para que contenga TODOS los días
WITH duplicates AS (
  SELECT 
    user_id,
    name,
    (array_agg(id ORDER BY 
      CASE WHEN asset_url NOT LIKE '%unsplash%' THEN 0 ELSE 1 END, -- Priorizar custom image
      created_at ASC -- Luego el más antiguo
    ))[1] as keep_id,
    array_agg(DISTINCT training_day) as all_days
  FROM user_assets
  WHERE deleted_at IS NULL
    AND asset_type = 'gym_exercise'
  GROUP BY user_id, name
  HAVING COUNT(*) > 1
)
UPDATE user_assets ua
SET training_days = d.all_days
FROM duplicates d
WHERE ua.id = d.keep_id
  AND ua.user_id = d.user_id
  AND ua.name = d.name;

-- 3.3: ELIMINAR los duplicados (soft delete), manteniendo solo el consolidado
WITH duplicates AS (
  SELECT 
    user_id,
    name,
    (array_agg(id ORDER BY 
      CASE WHEN asset_url NOT LIKE '%unsplash%' THEN 0 ELSE 1 END,
      created_at ASC
    ))[1] as keep_id
  FROM user_assets
  WHERE deleted_at IS NULL
    AND asset_type = 'gym_exercise'
  GROUP BY user_id, name
  HAVING COUNT(*) > 1
)
UPDATE user_assets ua
SET deleted_at = NOW()
FROM duplicates d
WHERE ua.user_id = d.user_id
  AND ua.name = d.name
  AND ua.id != d.keep_id
  AND ua.deleted_at IS NULL;

-- PASO 4: Eliminar columna antigua training_day
ALTER TABLE user_assets
DROP COLUMN IF EXISTS training_day;

-- PASO 5: Crear índice GIN para búsquedas eficientes en arrays
DROP INDEX IF EXISTS idx_user_assets_training_day;
CREATE INDEX IF NOT EXISTS idx_user_assets_training_days 
ON user_assets USING GIN (training_days);

-- PASO 6: Verificar resultado final
SELECT 
  id,
  name,
  training_days,
  CASE 
    WHEN asset_url LIKE '%unsplash%' THEN 'default'
    ELSE 'custom'
  END as image_type,
  created_at
FROM user_assets
WHERE deleted_at IS NULL
  AND asset_type = 'gym_exercise'
ORDER BY name, created_at;

-- COMENTARIO
COMMENT ON COLUMN user_assets.training_days IS 'Array de días donde aparece el ejercicio (ej: {0,2} = día 0 y día 2)';
