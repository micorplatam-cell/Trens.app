-- ============================================================================
-- SCRIPT: Insertar datos de prueba para alternativas
-- Fecha: 2025-12-14
-- Descripción: Vincula automáticamente ejercicios de la misma categoría
-- ============================================================================

-- PASO 1: Ver tus ejercicios actuales y sus categorías
-- Ejecuta esto primero para ver qué ejercicios tienes
SELECT 
  id, 
  name, 
  metadata->>'category' as category,
  "order"
FROM user_assets
WHERE user_id = auth.uid()
  AND asset_type = 'gym_exercise'
  AND deleted_at IS NULL
ORDER BY metadata->>'category', "order";

-- PASO 2: Vincular automáticamente ejercicios de la misma categoría como alternativas
-- Este script toma cada ejercicio y le asigna hasta 3 alternativas de su misma categoría
-- ⚠️ EJECUTA ESTO SOLO UNA VEZ para evitar duplicados

WITH ejercicios_por_categoria AS (
  SELECT 
    id,
    name,
    metadata->>'category' as category,
    ROW_NUMBER() OVER (PARTITION BY metadata->>'category' ORDER BY "order") as rn
  FROM user_assets
  WHERE user_id = auth.uid()
    AND asset_type = 'gym_exercise'
    AND deleted_at IS NULL
),
vinculos_completos AS (
  SELECT 
    main.id as main_id,
    alt.id as alt_id,
    ROW_NUMBER() OVER (PARTITION BY main.id ORDER BY alt.rn) - 1 as order_index
  FROM ejercicios_por_categoria main
  CROSS JOIN ejercicios_por_categoria alt
  WHERE main.category = alt.category
    AND main.id != alt.id
),
vinculos_limitados AS (
  SELECT main_id, alt_id, order_index
  FROM vinculos_completos
  WHERE order_index < 4 -- Máximo 4 alternativas (índices 0-3)
)
INSERT INTO user_exercise_alternatives (user_id, main_exercise_id, alternative_exercise_id, order_index)
SELECT 
  auth.uid(),
  main_id,
  alt_id,
  order_index
FROM vinculos_limitados
ON CONFLICT (main_exercise_id, alternative_exercise_id) DO NOTHING;

-- PASO 3: Verificar las relaciones creadas
SELECT 
  main.name as "Ejercicio Principal",
  main.metadata->>'category' as "Categoría",
  alt.name as "Alternativa",
  uea.order_index as "Posición"
FROM user_exercise_alternatives uea
JOIN user_assets main ON main.id = uea.main_exercise_id
JOIN user_assets alt ON alt.id = uea.alternative_exercise_id
WHERE uea.user_id = auth.uid()
ORDER BY main.metadata->>'category', main.name, uea.order_index;

-- PASO 4 (Opcional): Eliminar todas las vinculaciones para empezar de nuevo
-- DELETE FROM user_exercise_alternatives WHERE user_id = auth.uid();

-- ============================================================================
-- ALTERNATIVA: Vincular manualmente un ejercicio específico
-- ============================================================================
-- Si querés vincular manualmente, primero ejecutá esto para ver los IDs:

-- SELECT id, name FROM user_assets 
-- WHERE user_id = auth.uid() 
--   AND asset_type = 'gym_exercise' 
--   AND deleted_at IS NULL
--   AND name ILIKE '%press%'; -- Cambiá el nombre que buscás

-- Luego ejecutá esto reemplazando los IDs reales:
-- INSERT INTO user_exercise_alternatives (user_id, main_exercise_id, alternative_exercise_id, order_index)
-- VALUES (auth.uid(), 'ID_PRINCIPAL_AQUI', 'ID_ALTERNATIVA_AQUI', 0);
