-- Script para corregir las relaciones de alternativas del BICEP CURL

-- 1. Ver estado actual
SELECT 
  'CURRENT STATE' as status,
  uea.id,
  uea.main_exercise_id,
  main.name as main_name,
  uea.alternative_exercise_id,
  alt.name as alternative_name
FROM user_exercise_alternatives uea
LEFT JOIN user_assets main ON uea.main_exercise_id = main.id
LEFT JOIN user_assets alt ON uea.alternative_exercise_id = alt.id
WHERE uea.user_id = '8c7bd3e1-a8b7-4574-be08-b85af38e25a9';

-- 2. Ver el ID actual del BICEP CURL
SELECT 
  'CURRENT BICEP CURL ID' as info,
  id, 
  name 
FROM user_assets 
WHERE user_id = '8c7bd3e1-a8b7-4574-be08-b85af38e25a9' 
AND name ILIKE '%bicep%curl%' 
AND deleted_at IS NULL;

-- 3. Actualizar las relaciones al nuevo ID
UPDATE user_exercise_alternatives
SET main_exercise_id = 'fb3c9fc5-163b-40a6-a7f8-1fb537f60e0f'
WHERE user_id = '8c7bd3e1-a8b7-4574-be08-b85af38e25a9'
AND main_exercise_id != 'fb3c9fc5-163b-40a6-a7f8-1fb537f60e0f'
AND alternative_exercise_id IN (
  SELECT id FROM user_assets 
  WHERE user_id = '8c7bd3e1-a8b7-4574-be08-b85af38e25a9'
  AND name IN ('PLANK', 'TRICEP DIPS')
);

-- 4. Verificar resultado
SELECT 
  'AFTER FIX' as status,
  uea.id,
  uea.main_exercise_id,
  main.name as main_name,
  uea.alternative_exercise_id,
  alt.name as alternative_name
FROM user_exercise_alternatives uea
LEFT JOIN user_assets main ON uea.main_exercise_id = main.id
LEFT JOIN user_assets alt ON uea.alternative_exercise_id = alt.id
WHERE uea.user_id = '8c7bd3e1-a8b7-4574-be08-b85af38e25a9';
