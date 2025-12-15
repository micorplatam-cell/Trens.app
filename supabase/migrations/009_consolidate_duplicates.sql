-- ============================================================================
-- LIMPIAR DUPLICADOS: Consolidar ejercicios con mismo nombre pero IDs diferentes
-- ============================================================================

-- 1. Ver duplicados actuales
SELECT 
  user_id,
  name,
  array_agg(id ORDER BY 
    CASE WHEN asset_url NOT LIKE '%unsplash%' THEN 0 ELSE 1 END,
    created_at ASC
  ) as all_ids,
  array_agg(training_days ORDER BY created_at) as all_days,
  COUNT(*) as count
FROM user_assets
WHERE deleted_at IS NULL
  AND asset_type = 'gym_exercise'
GROUP BY user_id, name
HAVING COUNT(*) > 1;

-- 2. Consolidar duplicados
WITH duplicates AS (
  SELECT 
    user_id,
    name,
    (array_agg(id ORDER BY 
      CASE WHEN asset_url NOT LIKE '%unsplash%' THEN 0 ELSE 1 END,
      created_at ASC
    ))[1] as keep_id,
    array_agg(DISTINCT COALESCE(days.day, 0)) as all_days
  FROM user_assets,
  LATERAL unnest(COALESCE(training_days, ARRAY[0])) as days(day)
  WHERE deleted_at IS NULL
    AND asset_type = 'gym_exercise'
  GROUP BY user_id, name
  HAVING COUNT(DISTINCT id) > 1
)
UPDATE user_assets ua
SET training_days = d.all_days
FROM duplicates d
WHERE ua.id = d.keep_id
  AND ua.user_id = d.user_id
  AND ua.name = d.name;

-- 3. Soft delete de los duplicados
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

-- 4. Verificar resultado
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
