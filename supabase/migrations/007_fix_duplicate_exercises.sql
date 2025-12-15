-- Script para limpiar ejercicios duplicados y mantener solo los que tienen imágenes personalizadas
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Ver ejercicios duplicados (sin imágenes personalizadas de Unsplash)
SELECT id, name, asset_url, training_day, created_at 
FROM user_assets 
WHERE asset_type = 'gym_exercise' 
  AND deleted_at IS NULL
  AND asset_url LIKE '%unsplash%'
ORDER BY created_at DESC;

-- 2. ELIMINAR ejercicios duplicados sin imágenes personalizadas (los de hoy)
-- IMPORTANTE: Revisa los IDs antes de ejecutar
DELETE FROM user_assets
WHERE asset_type = 'gym_exercise'
  AND asset_url LIKE '%unsplash%'
  AND created_at::date = '2025-12-14'
  AND deleted_at IS NULL;

-- 3. Actualizar training_day de ejercicios con imágenes personalizadas a DÍA 0
UPDATE user_assets
SET training_day = 0
WHERE asset_type = 'gym_exercise'
  AND deleted_at IS NULL
  AND asset_url NOT LIKE '%unsplash%';

-- 4. Verificar alternativas de BICEP CURL
SELECT 
  alt.id as relation_id,
  alt.main_exercise_id,
  main.name as main_exercise_name,
  alt.alternative_exercise_id,
  altex.name as alternative_name,
  altex.asset_url as alt_image
FROM user_exercise_alternatives alt
LEFT JOIN user_assets main ON main.id = alt.main_exercise_id
LEFT JOIN user_assets altex ON altex.id = alt.alternative_exercise_id
WHERE main.name LIKE '%CURL%' OR altex.name LIKE '%CURL%';

-- 5. Recuperar el ID del BICEP CURL con imagen personalizada
-- (Deberías ver el ID aquí para el siguiente paso)
SELECT id, name, asset_url, training_day
FROM user_assets 
WHERE name LIKE '%CURL%' 
  AND deleted_at IS NULL
  AND asset_url NOT LIKE '%unsplash%';

-- 6. Si las alternativas apuntan al BICEP CURL duplicado (sin imagen),
-- actualizar para que apunten al BICEP CURL con imagen personalizada
-- REEMPLAZA 'ID_DEL_BICEP_CURL_CON_IMAGEN' con el ID del paso 5
-- REEMPLAZA 'ID_DEL_BICEP_CURL_DUPLICADO' con el ID del duplicado que se va a eliminar

-- UPDATE user_exercise_alternatives
-- SET main_exercise_id = 'ID_DEL_BICEP_CURL_CON_IMAGEN'
-- WHERE main_exercise_id = 'ID_DEL_BICEP_CURL_DUPLICADO';

-- 7. Verificar resultado final
SELECT 
  id, 
  name, 
  training_day,
  CASE 
    WHEN asset_url LIKE '%unsplash%' THEN 'Default'
    ELSE 'Custom'
  END as image_type,
  created_at::date as created
FROM user_assets 
WHERE asset_type = 'gym_exercise' 
  AND deleted_at IS NULL
ORDER BY training_day, name;
