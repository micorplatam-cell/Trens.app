-- ============================================================================
-- MIGRACIÓN: Dividir HOMBROS en FRONTAL, LATERAL, POSTERIOR
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Actualizar ejercicios de HOMBROS existentes basándose en el nombre
-- ============================================================================

-- HOMBRO FRONTAL: Press, elevaciones frontales
UPDATE exercises SET muscle_group = 'HOMBRO FRONTAL'
WHERE muscle_group = 'HOMBROS' 
AND (
  name ILIKE '%press%' 
  OR name ILIKE '%frontal%'
  OR name ILIKE '%arnold%'
);

-- HOMBRO LATERAL: Elevaciones laterales, remo al mentón
UPDATE exercises SET muscle_group = 'HOMBRO LATERAL'
WHERE muscle_group = 'HOMBROS'
AND (
  name ILIKE '%lateral%'
  OR name ILIKE '%mentón%'
  OR name ILIKE '%menton%'
  OR name ILIKE '%remo alto%'
);

-- HOMBRO POSTERIOR: Pájaros, face pull, inverso
UPDATE exercises SET muscle_group = 'HOMBRO POSTERIOR'
WHERE muscle_group = 'HOMBROS'
AND (
  name ILIKE '%pájaro%'
  OR name ILIKE '%pajaro%'
  OR name ILIKE '%posterior%'
  OR name ILIKE '%face%'
  OR name ILIKE '%inverso%'
  OR name ILIKE '%reverse%'
  OR name ILIKE '%rear%'
);

-- Los que queden como HOMBROS, ponerlos en FRONTAL (son los más comunes)
UPDATE exercises SET muscle_group = 'HOMBRO FRONTAL'
WHERE muscle_group = 'HOMBROS';

-- 2. Actualizar secondary_muscles que contengan 'HOMBROS'
-- ============================================================================

-- Para ejercicios de press/pecho → HOMBRO FRONTAL
UPDATE exercises 
SET secondary_muscles = array_replace(secondary_muscles, 'HOMBROS', 'HOMBRO FRONTAL')
WHERE 'HOMBROS' = ANY(secondary_muscles)
AND (name ILIKE '%press%' OR name ILIKE '%fondos%' OR name ILIKE '%flexion%');

-- Para ejercicios de espalda/remo → HOMBRO POSTERIOR
UPDATE exercises 
SET secondary_muscles = array_replace(secondary_muscles, 'HOMBROS', 'HOMBRO POSTERIOR')
WHERE 'HOMBROS' = ANY(secondary_muscles)
AND (name ILIKE '%remo%' OR name ILIKE '%dominada%' OR name ILIKE '%jalón%' OR name ILIKE '%pull%');

-- El resto → HOMBRO FRONTAL (default)
UPDATE exercises 
SET secondary_muscles = array_replace(secondary_muscles, 'HOMBROS', 'HOMBRO FRONTAL')
WHERE 'HOMBROS' = ANY(secondary_muscles);

-- 3. Agregar nuevos ejercicios de hombros
-- ============================================================================

-- HOMBRO FRONTAL
INSERT INTO exercises (name, muscle_group, secondary_muscles, equipment, description) VALUES
('Press Militar Sentado con Mancuernas', 'HOMBRO FRONTAL', ARRAY['TRÍCEPS', 'HOMBRO LATERAL'], ARRAY['mancuernas'], 'Press de hombros sentado con mancuernas, excelente para desarrollo del deltoides anterior.'),
('Press de Hombros en Landmine', 'HOMBRO FRONTAL', ARRAY['CORE', 'TRÍCEPS'], ARRAY['barra'], 'Press usando landmine attachment, reduce estrés en hombros.'),
('Elevación Frontal Alternada', 'HOMBRO FRONTAL', ARRAY['CORE'], ARRAY['mancuernas'], 'Elevación frontal alternando brazos para máximo enfoque.')
ON CONFLICT (name) DO NOTHING;

-- HOMBRO LATERAL
INSERT INTO exercises (name, muscle_group, secondary_muscles, equipment, description) VALUES
('Elevación Lateral Sentado', 'HOMBRO LATERAL', ARRAY['TRAPECIOS'], ARRAY['mancuernas'], 'Elevación lateral sentado elimina impulso y aísla mejor el deltoides medio.'),
('Elevación Lateral con Agarre Neutro', 'HOMBRO LATERAL', ARRAY['TRAPECIOS'], ARRAY['mancuernas'], 'Variante con pulgares arriba para diferente activación.'),
('W-Raise (Elevación en W)', 'HOMBRO LATERAL', ARRAY['HOMBRO POSTERIOR', 'TRAPECIOS'], ARRAY['mancuernas'], 'Elevación formando una W, trabaja lateral y posterior.'),
('Remo al Mentón con Agarre Amplio', 'HOMBRO LATERAL', ARRAY['TRAPECIOS', 'BÍCEPS'], ARRAY['barra'], 'Remo alto con agarre amplio enfocado en deltoides lateral.')
ON CONFLICT (name) DO NOTHING;

-- HOMBRO POSTERIOR
INSERT INTO exercises (name, muscle_group, secondary_muscles, equipment, description) VALUES
('Pájaro en Banco Inclinado', 'HOMBRO POSTERIOR', ARRAY['TRAPECIOS', 'ESPALDA'], ARRAY['mancuernas'], 'Pájaro apoyado en banco inclinado para mejor aislamiento.'),
('Face Pull con Cuerda', 'HOMBRO POSTERIOR', ARRAY['TRAPECIOS', 'HOMBRO LATERAL'], ARRAY['polea'], 'Face pull clásico con cuerda, esencial para salud del hombro.'),
('Cruces Posteriores en Polea Baja', 'HOMBRO POSTERIOR', ARRAY['TRAPECIOS'], ARRAY['polea'], 'Cruces inversos desde polea baja para diferente ángulo.'),
('Pájaro de Pie con Mancuernas', 'HOMBRO POSTERIOR', ARRAY['CORE', 'ESPALDA'], ARRAY['mancuernas'], 'Pájaro de pie inclinado, requiere estabilización del core.'),
('Pull-Apart con Banda', 'HOMBRO POSTERIOR', ARRAY['TRAPECIOS'], ARRAY['bandas'], 'Ejercicio de rehabilitación y activación con banda elástica.')
ON CONFLICT (name) DO NOTHING;

-- 4. Verificar resultado
-- ============================================================================
SELECT muscle_group, COUNT(*) as total
FROM exercises
WHERE muscle_group IN ('HOMBRO FRONTAL', 'HOMBRO LATERAL', 'HOMBRO POSTERIOR', 'HOMBROS')
GROUP BY muscle_group
ORDER BY muscle_group;
