-- Script para limpiar BICEP CURL duplicados (USER_ID CORRECTO)

-- 1. Ver todos los BICEP CURL actuales
SELECT 
  'ANTES DEL CLEAN' as status,
  id, 
  name, 
  "order",
  created_at,
  deleted_at
FROM user_assets 
WHERE user_id = '81255d38-959e-4178-9a52-b862cfb983e3' 
AND name = 'BICEP CURL'
ORDER BY "order", created_at;

-- 2. Marcar como eliminados los duplicados (mantener solo el primero)
UPDATE user_assets
SET deleted_at = NOW()
WHERE user_id = '81255d38-959e-4178-9a52-b862cfb983e3'
AND name = 'BICEP CURL'
AND deleted_at IS NULL
AND id != (
  SELECT id 
  FROM user_assets 
  WHERE user_id = '81255d38-959e-4178-9a52-b862cfb983e3' 
  AND name = 'BICEP CURL'
  AND deleted_at IS NULL
  ORDER BY "order" ASC, created_at ASC
  LIMIT 1
);

-- 3. Verificar el resultado (debe quedar solo 1)
SELECT 
  'DESPUÉS DEL CLEAN' as status,
  id, 
  name, 
  "order",
  deleted_at IS NULL as activo
FROM user_assets 
WHERE user_id = '81255d38-959e-4178-9a52-b862cfb983e3' 
AND name = 'BICEP CURL'
ORDER BY "order", created_at;

-- 4. VER EL BICEP CURL QUE QUEDÓ ACTIVO (ESTE ES EL ID CORRECTO)
SELECT 
  '🎯 BICEP CURL FINAL' as status,
  id as bicep_curl_id,
  name,
  "order",
  created_at
FROM user_assets 
WHERE user_id = '81255d38-959e-4178-9a52-b862cfb983e3' 
AND name = 'BICEP CURL'
AND deleted_at IS NULL;

-- 5. Ver las alternativas asignadas
SELECT 
  'ALTERNATIVAS FINALES' as status,
  uea.id,
  main.name as ejercicio_principal,
  alt.name as alternativa
FROM user_exercise_alternatives uea
JOIN user_assets main ON uea.main_exercise_id = main.id
JOIN user_assets alt ON uea.alternative_exercise_id = alt.id
WHERE uea.user_id = '81255d38-959e-4178-9a52-b862cfb983e3'
AND main.deleted_at IS NULL;

-- 6. Si las alternativas no están conectadas, actualizar con el ID correcto
UPDATE user_exercise_alternatives
SET main_exercise_id = (
  SELECT id FROM user_assets 
  WHERE user_id = '81255d38-959e-4178-9a52-b862cfb983e3' 
  AND name = 'BICEP CURL'
  AND deleted_at IS NULL
  LIMIT 1
)
WHERE user_id = '81255d38-959e-4178-9a52-b862cfb983e3';

-- 7. Verificar alternativas después de actualizar
SELECT 
  '✅ RESULTADO FINAL' as status,
  uea.id,
  main.id as bicep_curl_id,
  main.name as ejercicio_principal,
  alt.name as alternativa
FROM user_exercise_alternatives uea
JOIN user_assets main ON uea.main_exercise_id = main.id
JOIN user_assets alt ON uea.alternative_exercise_id = alt.id
WHERE uea.user_id = '81255d38-959e-4178-9a52-b862cfb983e3'
AND main.deleted_at IS NULL;
