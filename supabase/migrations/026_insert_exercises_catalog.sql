-- ============================================================================
-- MIGRACIÓN 026: INSERTAR CATÁLOGO DE EJERCICIOS
-- ============================================================================

-- Obtener el sport_id de GIMNASIO
DO $$
DECLARE
  v_gym_sport_id UUID;
BEGIN
  SELECT id INTO v_gym_sport_id FROM sports WHERE name = 'GIMNASIO';
  
  -- Si no existe el deporte, crearlo
  IF v_gym_sport_id IS NULL THEN
    INSERT INTO sports (name, icon, color) VALUES ('GIMNASIO', '🏋️', '#DC2626')
    RETURNING id INTO v_gym_sport_id;
  END IF;

  -- ============================================================================
  -- PECHO
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Press Banca', v_gym_sport_id, 'PECHO', ARRAY['TRÍCEPS', 'HOMBROS'], ARRAY['BARRA', 'BANCO'], 'INTERMEDIO', true, 'Ejercicio compuesto principal para pecho', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Press Inclinado con Barra', v_gym_sport_id, 'PECHO', ARRAY['TRÍCEPS', 'HOMBROS'], ARRAY['BARRA', 'BANCO INCLINADO'], 'INTERMEDIO', true, 'Enfoca la parte superior del pecho', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Press Inclinado con Mancuernas', v_gym_sport_id, 'PECHO', ARRAY['TRÍCEPS', 'HOMBROS'], ARRAY['MANCUERNAS', 'BANCO INCLINADO'], 'INTERMEDIO', true, 'Mayor rango de movimiento para pecho superior', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Press Declinado', v_gym_sport_id, 'PECHO', ARRAY['TRÍCEPS'], ARRAY['BARRA', 'BANCO DECLINADO'], 'INTERMEDIO', true, 'Enfoca la parte inferior del pecho', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Aperturas con Mancuernas', v_gym_sport_id, 'PECHO', ARRAY[]::TEXT[], ARRAY['MANCUERNAS', 'BANCO'], 'PRINCIPIANTE', false, 'Aislamiento para pecho', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Cruces en Polea', v_gym_sport_id, 'PECHO', ARRAY[]::TEXT[], ARRAY['POLEA'], 'PRINCIPIANTE', false, 'Aislamiento con tensión constante', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Fondos en Paralelas', v_gym_sport_id, 'PECHO', ARRAY['TRÍCEPS', 'HOMBROS'], ARRAY['PARALELAS'], 'AVANZADO', true, 'Ejercicio compuesto con peso corporal', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Pull-Over', v_gym_sport_id, 'PECHO', ARRAY['ESPALDA', 'TRÍCEPS'], ARRAY['MANCUERNA', 'BANCO'], 'INTERMEDIO', false, 'Expansión de caja torácica', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Flexiones', v_gym_sport_id, 'PECHO', ARRAY['TRÍCEPS', 'HOMBROS', 'CORE'], ARRAY['PESO CORPORAL'], 'PRINCIPIANTE', true, 'Ejercicio básico con peso corporal', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true),
  ('Press con Mancuernas', v_gym_sport_id, 'PECHO', ARRAY['TRÍCEPS', 'HOMBROS'], ARRAY['MANCUERNAS', 'BANCO'], 'PRINCIPIANTE', true, 'Alternativa al press banca con mayor rango', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- ESPALDA
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Dominadas', v_gym_sport_id, 'ESPALDA', ARRAY['BÍCEPS', 'CORE'], ARRAY['BARRA DOMINADAS'], 'AVANZADO', true, 'Rey de los ejercicios de espalda', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Jalón al Pecho', v_gym_sport_id, 'ESPALDA', ARRAY['BÍCEPS'], ARRAY['POLEA ALTA'], 'PRINCIPIANTE', true, 'Alternativa a dominadas', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Jalón Agarre Cerrado', v_gym_sport_id, 'ESPALDA', ARRAY['BÍCEPS'], ARRAY['POLEA ALTA'], 'PRINCIPIANTE', true, 'Énfasis en dorsales inferiores', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Remo con Barra', v_gym_sport_id, 'ESPALDA', ARRAY['BÍCEPS', 'CORE'], ARRAY['BARRA'], 'INTERMEDIO', true, 'Desarrollo de espalda media', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Remo con Mancuerna', v_gym_sport_id, 'ESPALDA', ARRAY['BÍCEPS'], ARRAY['MANCUERNA', 'BANCO'], 'PRINCIPIANTE', true, 'Trabajo unilateral de espalda', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Remo en Polea Baja', v_gym_sport_id, 'ESPALDA', ARRAY['BÍCEPS'], ARRAY['POLEA BAJA'], 'PRINCIPIANTE', true, 'Tensión constante en dorsales', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Peso Muerto', v_gym_sport_id, 'ESPALDA', ARRAY['PIERNAS', 'GLÚTEOS', 'CORE'], ARRAY['BARRA'], 'AVANZADO', true, 'Ejercicio compuesto total', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Face Pull', v_gym_sport_id, 'ESPALDA', ARRAY['HOMBROS', 'TRAPECIOS'], ARRAY['POLEA'], 'PRINCIPIANTE', false, 'Salud de hombros y postura', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Remo T-Bar', v_gym_sport_id, 'ESPALDA', ARRAY['BÍCEPS', 'CORE'], ARRAY['T-BAR'], 'INTERMEDIO', true, 'Desarrollo de espalda con agarre neutro', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true),
  ('Hiperextensiones', v_gym_sport_id, 'ESPALDA', ARRAY['GLÚTEOS', 'ISQUIOS'], ARRAY['BANCO HIPEREXTENSIONES'], 'PRINCIPIANTE', false, 'Fortalecimiento de espalda baja', 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- HOMBROS
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Press Militar', v_gym_sport_id, 'HOMBROS', ARRAY['TRÍCEPS', 'CORE'], ARRAY['BARRA'], 'INTERMEDIO', true, 'Press vertical principal', 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400', true),
  ('Press Arnold', v_gym_sport_id, 'HOMBROS', ARRAY['TRÍCEPS'], ARRAY['MANCUERNAS'], 'INTERMEDIO', true, 'Rotación para todas las cabezas del deltoides', 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400', true),
  ('Press con Mancuernas Sentado', v_gym_sport_id, 'HOMBROS', ARRAY['TRÍCEPS'], ARRAY['MANCUERNAS', 'BANCO'], 'PRINCIPIANTE', true, 'Press vertical con mancuernas', 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400', true),
  ('Elevaciones Laterales', v_gym_sport_id, 'HOMBROS', ARRAY[]::TEXT[], ARRAY['MANCUERNAS'], 'PRINCIPIANTE', false, 'Aislamiento de deltoides lateral', 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400', true),
  ('Elevaciones Frontales', v_gym_sport_id, 'HOMBROS', ARRAY[]::TEXT[], ARRAY['MANCUERNAS'], 'PRINCIPIANTE', false, 'Aislamiento de deltoides anterior', 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400', true),
  ('Pájaros', v_gym_sport_id, 'HOMBROS', ARRAY['ESPALDA'], ARRAY['MANCUERNAS'], 'PRINCIPIANTE', false, 'Aislamiento de deltoides posterior', 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400', true),
  ('Encogimientos de Hombros', v_gym_sport_id, 'HOMBROS', ARRAY['TRAPECIOS'], ARRAY['BARRA', 'MANCUERNAS'], 'PRINCIPIANTE', false, 'Desarrollo de trapecios', 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400', true),
  ('Elevaciones Laterales en Polea', v_gym_sport_id, 'HOMBROS', ARRAY[]::TEXT[], ARRAY['POLEA'], 'PRINCIPIANTE', false, 'Tensión constante en deltoides lateral', 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- BÍCEPS
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Curl con Barra', v_gym_sport_id, 'BÍCEPS', ARRAY['ANTEBRAZOS'], ARRAY['BARRA'], 'PRINCIPIANTE', false, 'Ejercicio básico de bíceps', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Curl con Mancuernas', v_gym_sport_id, 'BÍCEPS', ARRAY['ANTEBRAZOS'], ARRAY['MANCUERNAS'], 'PRINCIPIANTE', false, 'Curl alternado o simultáneo', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Curl Martillo', v_gym_sport_id, 'BÍCEPS', ARRAY['ANTEBRAZOS', 'BRAQUIAL'], ARRAY['MANCUERNAS'], 'PRINCIPIANTE', false, 'Agarre neutro para braquial', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Curl Concentrado', v_gym_sport_id, 'BÍCEPS', ARRAY[]::TEXT[], ARRAY['MANCUERNA'], 'PRINCIPIANTE', false, 'Aislamiento máximo de bíceps', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Curl en Polea', v_gym_sport_id, 'BÍCEPS', ARRAY['ANTEBRAZOS'], ARRAY['POLEA'], 'PRINCIPIANTE', false, 'Tensión constante en bíceps', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Curl Predicador', v_gym_sport_id, 'BÍCEPS', ARRAY[]::TEXT[], ARRAY['BARRA', 'BANCO PREDICADOR'], 'PRINCIPIANTE', false, 'Elimina balanceo del cuerpo', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Curl Inclinado', v_gym_sport_id, 'BÍCEPS', ARRAY[]::TEXT[], ARRAY['MANCUERNAS', 'BANCO INCLINADO'], 'INTERMEDIO', false, 'Mayor estiramiento del bíceps', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Curl Spider', v_gym_sport_id, 'BÍCEPS', ARRAY[]::TEXT[], ARRAY['BARRA', 'BANCO'], 'INTERMEDIO', false, 'Máxima contracción en pico', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- TRÍCEPS
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Fondos para Tríceps', v_gym_sport_id, 'TRÍCEPS', ARRAY['PECHO', 'HOMBROS'], ARRAY['PARALELAS'], 'AVANZADO', true, 'Fondos con torso vertical', 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400', true),
  ('Press Francés', v_gym_sport_id, 'TRÍCEPS', ARRAY[]::TEXT[], ARRAY['BARRA', 'BANCO'], 'INTERMEDIO', false, 'Extensión de tríceps acostado', 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400', true),
  ('Extensiones en Polea', v_gym_sport_id, 'TRÍCEPS', ARRAY[]::TEXT[], ARRAY['POLEA'], 'PRINCIPIANTE', false, 'Push-down clásico', 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400', true),
  ('Extensiones con Cuerda', v_gym_sport_id, 'TRÍCEPS', ARRAY[]::TEXT[], ARRAY['POLEA', 'CUERDA'], 'PRINCIPIANTE', false, 'Mayor rango con cuerda', 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400', true),
  ('Patada de Tríceps', v_gym_sport_id, 'TRÍCEPS', ARRAY[]::TEXT[], ARRAY['MANCUERNA'], 'PRINCIPIANTE', false, 'Aislamiento unilateral', 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400', true),
  ('Press Cerrado', v_gym_sport_id, 'TRÍCEPS', ARRAY['PECHO'], ARRAY['BARRA', 'BANCO'], 'INTERMEDIO', true, 'Press banca con agarre cerrado', 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400', true),
  ('Extensiones sobre Cabeza', v_gym_sport_id, 'TRÍCEPS', ARRAY[]::TEXT[], ARRAY['MANCUERNA'], 'PRINCIPIANTE', false, 'Extensión vertical', 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400', true),
  ('Fondos en Banco', v_gym_sport_id, 'TRÍCEPS', ARRAY['PECHO'], ARRAY['BANCO'], 'PRINCIPIANTE', true, 'Fondos apoyado en banco', 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- PIERNAS - CUÁDRICEPS
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Sentadilla con Barra', v_gym_sport_id, 'CUÁDRICEPS', ARRAY['GLÚTEOS', 'ISQUIOS', 'CORE'], ARRAY['BARRA', 'RACK'], 'INTERMEDIO', true, 'Rey de los ejercicios de pierna', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', true),
  ('Sentadilla Frontal', v_gym_sport_id, 'CUÁDRICEPS', ARRAY['CORE', 'GLÚTEOS'], ARRAY['BARRA', 'RACK'], 'AVANZADO', true, 'Mayor énfasis en cuádriceps', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', true),
  ('Prensa de Piernas', v_gym_sport_id, 'CUÁDRICEPS', ARRAY['GLÚTEOS'], ARRAY['PRENSA'], 'PRINCIPIANTE', true, 'Ejercicio guiado para piernas', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', true),
  ('Extensiones de Cuádriceps', v_gym_sport_id, 'CUÁDRICEPS', ARRAY[]::TEXT[], ARRAY['MÁQUINA EXTENSIONES'], 'PRINCIPIANTE', false, 'Aislamiento de cuádriceps', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', true),
  ('Zancadas', v_gym_sport_id, 'CUÁDRICEPS', ARRAY['GLÚTEOS', 'ISQUIOS'], ARRAY['MANCUERNAS', 'BARRA'], 'INTERMEDIO', true, 'Trabajo unilateral de piernas', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', true),
  ('Sentadilla Búlgara', v_gym_sport_id, 'CUÁDRICEPS', ARRAY['GLÚTEOS'], ARRAY['MANCUERNAS', 'BANCO'], 'AVANZADO', true, 'Zancada con pie elevado', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', true),
  ('Sentadilla Hack', v_gym_sport_id, 'CUÁDRICEPS', ARRAY['GLÚTEOS'], ARRAY['MÁQUINA HACK'], 'INTERMEDIO', true, 'Sentadilla guiada', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', true),
  ('Sentadilla Goblet', v_gym_sport_id, 'CUÁDRICEPS', ARRAY['GLÚTEOS', 'CORE'], ARRAY['MANCUERNA', 'KETTLEBELL'], 'PRINCIPIANTE', true, 'Sentadilla con peso frontal', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- PIERNAS - ISQUIOS Y GLÚTEOS
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Curl Femoral Acostado', v_gym_sport_id, 'ISQUIOS', ARRAY[]::TEXT[], ARRAY['MÁQUINA CURL'], 'PRINCIPIANTE', false, 'Aislamiento de isquiotibiales', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400', true),
  ('Curl Femoral Sentado', v_gym_sport_id, 'ISQUIOS', ARRAY[]::TEXT[], ARRAY['MÁQUINA CURL'], 'PRINCIPIANTE', false, 'Curl en posición sentada', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400', true),
  ('Peso Muerto Rumano', v_gym_sport_id, 'ISQUIOS', ARRAY['GLÚTEOS', 'ESPALDA BAJA'], ARRAY['BARRA'], 'INTERMEDIO', true, 'Énfasis en isquios y glúteos', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400', true),
  ('Peso Muerto Piernas Rígidas', v_gym_sport_id, 'ISQUIOS', ARRAY['GLÚTEOS', 'ESPALDA BAJA'], ARRAY['BARRA'], 'AVANZADO', true, 'Máximo estiramiento de isquios', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400', true),
  ('Hip Thrust', v_gym_sport_id, 'GLÚTEOS', ARRAY['ISQUIOS'], ARRAY['BARRA', 'BANCO'], 'INTERMEDIO', true, 'Ejercicio principal de glúteos', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400', true),
  ('Puente de Glúteos', v_gym_sport_id, 'GLÚTEOS', ARRAY['ISQUIOS'], ARRAY['PESO CORPORAL'], 'PRINCIPIANTE', false, 'Activación de glúteos', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400', true),
  ('Buenos Días', v_gym_sport_id, 'ISQUIOS', ARRAY['GLÚTEOS', 'ESPALDA BAJA'], ARRAY['BARRA'], 'AVANZADO', true, 'Inclinación con barra en espalda', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400', true),
  ('Abductores', v_gym_sport_id, 'GLÚTEOS', ARRAY[]::TEXT[], ARRAY['MÁQUINA ABDUCTORES'], 'PRINCIPIANTE', false, 'Trabajo de glúteo medio', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- PIERNAS - PANTORRILLAS
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Elevación de Talones de Pie', v_gym_sport_id, 'PANTORRILLAS', ARRAY[]::TEXT[], ARRAY['MÁQUINA', 'BARRA'], 'PRINCIPIANTE', false, 'Gemelos de pie', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', true),
  ('Elevación de Talones Sentado', v_gym_sport_id, 'PANTORRILLAS', ARRAY[]::TEXT[], ARRAY['MÁQUINA'], 'PRINCIPIANTE', false, 'Énfasis en sóleo', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', true),
  ('Elevación de Talones en Prensa', v_gym_sport_id, 'PANTORRILLAS', ARRAY[]::TEXT[], ARRAY['PRENSA'], 'PRINCIPIANTE', false, 'Gemelos en la prensa', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- CORE / ABDOMINALES
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Plancha', v_gym_sport_id, 'CORE', ARRAY['HOMBROS'], ARRAY['PESO CORPORAL'], 'PRINCIPIANTE', false, 'Isométrico para core', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Plancha Lateral', v_gym_sport_id, 'CORE', ARRAY['OBLICUOS'], ARRAY['PESO CORPORAL'], 'INTERMEDIO', false, 'Isométrico para oblicuos', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Crunch', v_gym_sport_id, 'CORE', ARRAY[]::TEXT[], ARRAY['PESO CORPORAL'], 'PRINCIPIANTE', false, 'Flexión abdominal básica', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Crunch en Polea', v_gym_sport_id, 'CORE', ARRAY[]::TEXT[], ARRAY['POLEA'], 'PRINCIPIANTE', false, 'Crunch con resistencia', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Elevación de Piernas Colgado', v_gym_sport_id, 'CORE', ARRAY['FLEXORES CADERA'], ARRAY['BARRA DOMINADAS'], 'AVANZADO', false, 'Trabajo de abdomen inferior', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Elevación de Piernas Acostado', v_gym_sport_id, 'CORE', ARRAY['FLEXORES CADERA'], ARRAY['PESO CORPORAL'], 'PRINCIPIANTE', false, 'Abdomen inferior en piso', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Russian Twist', v_gym_sport_id, 'CORE', ARRAY['OBLICUOS'], ARRAY['PESO CORPORAL', 'MANCUERNA'], 'INTERMEDIO', false, 'Rotación para oblicuos', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Ab Wheel Rollout', v_gym_sport_id, 'CORE', ARRAY['HOMBROS', 'ESPALDA'], ARRAY['AB WHEEL'], 'AVANZADO', false, 'Rodillo abdominal', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Dead Bug', v_gym_sport_id, 'CORE', ARRAY[]::TEXT[], ARRAY['PESO CORPORAL'], 'PRINCIPIANTE', false, 'Estabilización de core', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true),
  ('Mountain Climbers', v_gym_sport_id, 'CORE', ARRAY['HOMBROS', 'CARDIO'], ARRAY['PESO CORPORAL'], 'INTERMEDIO', false, 'Core dinámico', 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400', true)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- ANTEBRAZOS
  -- ============================================================================
  INSERT INTO exercises (name, sport_id, muscle_group, secondary_muscles, equipment, difficulty, is_compound, description, thumbnail_url, is_active)
  VALUES
  ('Curl de Muñeca', v_gym_sport_id, 'ANTEBRAZOS', ARRAY[]::TEXT[], ARRAY['BARRA', 'MANCUERNAS'], 'PRINCIPIANTE', false, 'Flexión de muñeca', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Curl de Muñeca Invertido', v_gym_sport_id, 'ANTEBRAZOS', ARRAY[]::TEXT[], ARRAY['BARRA', 'MANCUERNAS'], 'PRINCIPIANTE', false, 'Extensión de muñeca', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true),
  ('Farmer Walk', v_gym_sport_id, 'ANTEBRAZOS', ARRAY['CORE', 'TRAPECIOS'], ARRAY['MANCUERNAS', 'KETTLEBELLS'], 'INTERMEDIO', true, 'Caminata con peso', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400', true)
  ON CONFLICT DO NOTHING;

END $$;

-- Verificar que se insertaron los ejercicios
SELECT COUNT(*) as total_exercises FROM exercises WHERE is_active = true;
