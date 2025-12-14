-- DIAGNÓSTICO COMPLETO

-- 1. Ver TODOS los user_assets (activos y eliminados)
SELECT 
  'TODOS LOS EJERCICIOS' as categoria,
  id,
  name,
  "order",
  deleted_at IS NULL as activo,
  created_at
FROM user_assets 
WHERE user_id = '8c7bd3e1-a8b7-4574-be08-b85af38e25a9'
ORDER BY created_at DESC;

-- 2. Ver específicamente BICEP CURL (todos)
SELECT 
  'BICEP CURLS (TODOS)' as categoria,
  id,
  name,
  deleted_at,
  "order",
  created_at
FROM user_assets 
WHERE user_id = '8c7bd3e1-a8b7-4574-be08-b85af38e25a9'
AND name = 'BICEP CURL'
ORDER BY created_at;

-- 3. Ver las alternativas existentes
SELECT 
  'ALTERNATIVAS EXISTENTES' as categoria,
  id,
  main_exercise_id,
  alternative_exercise_id,
  created_at
FROM user_exercise_alternatives
WHERE user_id = '8c7bd3e1-a8b7-4574-be08-b85af38e25a9';
