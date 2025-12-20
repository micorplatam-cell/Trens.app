-- ============================================================================
-- MIGRACIÓN 027: CONFIGURAR ALTERNATIVAS DE EJERCICIOS
-- ============================================================================
-- Actualizar el campo alternative_exercises con UUIDs de ejercicios alternativos

-- Obtener IDs de ejercicios y configurar alternativas
DO $$
DECLARE
  -- PECHO
  v_press_banca UUID;
  v_press_inclinado_barra UUID;
  v_press_inclinado_mancuernas UUID;
  v_press_declinado UUID;
  v_press_mancuernas UUID;
  v_aperturas UUID;
  v_cruces_polea UUID;
  v_fondos_paralelas UUID;
  v_pullover UUID;
  v_flexiones UUID;
  
  -- ESPALDA
  v_dominadas UUID;
  v_jalon_pecho UUID;
  v_jalon_cerrado UUID;
  v_remo_barra UUID;
  v_remo_mancuerna UUID;
  v_remo_polea UUID;
  v_peso_muerto UUID;
  v_face_pull UUID;
  v_remo_tbar UUID;
  
  -- HOMBROS
  v_press_militar UUID;
  v_press_arnold UUID;
  v_press_mancuernas_sentado UUID;
  v_elevaciones_laterales UUID;
  v_elevaciones_frontales UUID;
  v_pajaros UUID;
  v_elevaciones_laterales_polea UUID;
  
  -- BICEPS
  v_curl_barra UUID;
  v_curl_mancuernas UUID;
  v_curl_martillo UUID;
  v_curl_concentrado UUID;
  v_curl_polea UUID;
  v_curl_predicador UUID;
  v_curl_inclinado UUID;
  
  -- TRICEPS
  v_fondos_triceps UUID;
  v_press_frances UUID;
  v_extensiones_polea UUID;
  v_extensiones_cuerda UUID;
  v_patada_triceps UUID;
  v_press_cerrado UUID;
  v_extensiones_cabeza UUID;
  
  -- CUADRICEPS
  v_sentadilla UUID;
  v_sentadilla_frontal UUID;
  v_prensa UUID;
  v_extensiones_cuadriceps UUID;
  v_zancadas UUID;
  v_sentadilla_bulgara UUID;
  v_sentadilla_hack UUID;
  v_sentadilla_goblet UUID;
  
  -- ISQUIOS/GLUTEOS
  v_curl_femoral_acostado UUID;
  v_curl_femoral_sentado UUID;
  v_peso_muerto_rumano UUID;
  v_hip_thrust UUID;
  
BEGIN
  -- ============================================================================
  -- OBTENER IDs DE EJERCICIOS
  -- ============================================================================
  
  -- PECHO
  SELECT id INTO v_press_banca FROM exercises WHERE name = 'Press Banca';
  SELECT id INTO v_press_inclinado_barra FROM exercises WHERE name = 'Press Inclinado con Barra';
  SELECT id INTO v_press_inclinado_mancuernas FROM exercises WHERE name = 'Press Inclinado con Mancuernas';
  SELECT id INTO v_press_declinado FROM exercises WHERE name = 'Press Declinado';
  SELECT id INTO v_press_mancuernas FROM exercises WHERE name = 'Press con Mancuernas';
  SELECT id INTO v_aperturas FROM exercises WHERE name = 'Aperturas con Mancuernas';
  SELECT id INTO v_cruces_polea FROM exercises WHERE name = 'Cruces en Polea';
  SELECT id INTO v_fondos_paralelas FROM exercises WHERE name = 'Fondos en Paralelas';
  SELECT id INTO v_pullover FROM exercises WHERE name = 'Pull-Over';
  SELECT id INTO v_flexiones FROM exercises WHERE name = 'Flexiones';
  
  -- ESPALDA
  SELECT id INTO v_dominadas FROM exercises WHERE name = 'Dominadas';
  SELECT id INTO v_jalon_pecho FROM exercises WHERE name = 'Jalón al Pecho';
  SELECT id INTO v_jalon_cerrado FROM exercises WHERE name = 'Jalón Agarre Cerrado';
  SELECT id INTO v_remo_barra FROM exercises WHERE name = 'Remo con Barra';
  SELECT id INTO v_remo_mancuerna FROM exercises WHERE name = 'Remo con Mancuerna';
  SELECT id INTO v_remo_polea FROM exercises WHERE name = 'Remo en Polea Baja';
  SELECT id INTO v_peso_muerto FROM exercises WHERE name = 'Peso Muerto';
  SELECT id INTO v_face_pull FROM exercises WHERE name = 'Face Pull';
  SELECT id INTO v_remo_tbar FROM exercises WHERE name = 'Remo T-Bar';
  
  -- HOMBROS
  SELECT id INTO v_press_militar FROM exercises WHERE name = 'Press Militar';
  SELECT id INTO v_press_arnold FROM exercises WHERE name = 'Press Arnold';
  SELECT id INTO v_press_mancuernas_sentado FROM exercises WHERE name = 'Press con Mancuernas Sentado';
  SELECT id INTO v_elevaciones_laterales FROM exercises WHERE name = 'Elevaciones Laterales';
  SELECT id INTO v_elevaciones_frontales FROM exercises WHERE name = 'Elevaciones Frontales';
  SELECT id INTO v_pajaros FROM exercises WHERE name = 'Pájaros';
  SELECT id INTO v_elevaciones_laterales_polea FROM exercises WHERE name = 'Elevaciones Laterales en Polea';
  
  -- BICEPS
  SELECT id INTO v_curl_barra FROM exercises WHERE name = 'Curl con Barra';
  SELECT id INTO v_curl_mancuernas FROM exercises WHERE name = 'Curl con Mancuernas';
  SELECT id INTO v_curl_martillo FROM exercises WHERE name = 'Curl Martillo';
  SELECT id INTO v_curl_concentrado FROM exercises WHERE name = 'Curl Concentrado';
  SELECT id INTO v_curl_polea FROM exercises WHERE name = 'Curl en Polea';
  SELECT id INTO v_curl_predicador FROM exercises WHERE name = 'Curl Predicador';
  SELECT id INTO v_curl_inclinado FROM exercises WHERE name = 'Curl Inclinado';
  
  -- TRICEPS
  SELECT id INTO v_fondos_triceps FROM exercises WHERE name = 'Fondos para Tríceps';
  SELECT id INTO v_press_frances FROM exercises WHERE name = 'Press Francés';
  SELECT id INTO v_extensiones_polea FROM exercises WHERE name = 'Extensiones en Polea';
  SELECT id INTO v_extensiones_cuerda FROM exercises WHERE name = 'Extensiones con Cuerda';
  SELECT id INTO v_patada_triceps FROM exercises WHERE name = 'Patada de Tríceps';
  SELECT id INTO v_press_cerrado FROM exercises WHERE name = 'Press Cerrado';
  SELECT id INTO v_extensiones_cabeza FROM exercises WHERE name = 'Extensiones sobre Cabeza';
  
  -- CUADRICEPS
  SELECT id INTO v_sentadilla FROM exercises WHERE name = 'Sentadilla con Barra';
  SELECT id INTO v_sentadilla_frontal FROM exercises WHERE name = 'Sentadilla Frontal';
  SELECT id INTO v_prensa FROM exercises WHERE name = 'Prensa de Piernas';
  SELECT id INTO v_extensiones_cuadriceps FROM exercises WHERE name = 'Extensiones de Cuádriceps';
  SELECT id INTO v_zancadas FROM exercises WHERE name = 'Zancadas';
  SELECT id INTO v_sentadilla_bulgara FROM exercises WHERE name = 'Sentadilla Búlgara';
  SELECT id INTO v_sentadilla_hack FROM exercises WHERE name = 'Sentadilla Hack';
  SELECT id INTO v_sentadilla_goblet FROM exercises WHERE name = 'Sentadilla Goblet';
  
  -- ISQUIOS/GLUTEOS
  SELECT id INTO v_curl_femoral_acostado FROM exercises WHERE name = 'Curl Femoral Acostado';
  SELECT id INTO v_curl_femoral_sentado FROM exercises WHERE name = 'Curl Femoral Sentado';
  SELECT id INTO v_peso_muerto_rumano FROM exercises WHERE name = 'Peso Muerto Rumano';
  SELECT id INTO v_hip_thrust FROM exercises WHERE name = 'Hip Thrust';

  -- ============================================================================
  -- CONFIGURAR ALTERNATIVAS - PECHO
  -- ============================================================================
  
  -- Press Banca: alternativas = Press Mancuernas, Press Inclinado, Flexiones
  UPDATE exercises SET alternative_exercises = ARRAY[v_press_mancuernas, v_press_inclinado_barra, v_flexiones]
  WHERE id = v_press_banca;
  
  -- Press Inclinado con Barra: alternativas = Press Inclinado Mancuernas, Press Banca
  UPDATE exercises SET alternative_exercises = ARRAY[v_press_inclinado_mancuernas, v_press_banca]
  WHERE id = v_press_inclinado_barra;
  
  -- Press con Mancuernas: alternativas = Press Banca, Flexiones
  UPDATE exercises SET alternative_exercises = ARRAY[v_press_banca, v_flexiones]
  WHERE id = v_press_mancuernas;
  
  -- Aperturas: alternativas = Cruces en Polea
  UPDATE exercises SET alternative_exercises = ARRAY[v_cruces_polea]
  WHERE id = v_aperturas;
  
  -- Cruces en Polea: alternativas = Aperturas
  UPDATE exercises SET alternative_exercises = ARRAY[v_aperturas]
  WHERE id = v_cruces_polea;
  
  -- Fondos en Paralelas: alternativas = Press Declinado, Flexiones
  UPDATE exercises SET alternative_exercises = ARRAY[v_press_declinado, v_flexiones]
  WHERE id = v_fondos_paralelas;

  -- ============================================================================
  -- CONFIGURAR ALTERNATIVAS - ESPALDA
  -- ============================================================================
  
  -- Dominadas: alternativas = Jalón al Pecho, Jalón Agarre Cerrado
  UPDATE exercises SET alternative_exercises = ARRAY[v_jalon_pecho, v_jalon_cerrado]
  WHERE id = v_dominadas;
  
  -- Jalón al Pecho: alternativas = Dominadas, Jalón Agarre Cerrado
  UPDATE exercises SET alternative_exercises = ARRAY[v_dominadas, v_jalon_cerrado]
  WHERE id = v_jalon_pecho;
  
  -- Remo con Barra: alternativas = Remo con Mancuerna, Remo en Polea, Remo T-Bar
  UPDATE exercises SET alternative_exercises = ARRAY[v_remo_mancuerna, v_remo_polea, v_remo_tbar]
  WHERE id = v_remo_barra;
  
  -- Remo con Mancuerna: alternativas = Remo con Barra, Remo en Polea
  UPDATE exercises SET alternative_exercises = ARRAY[v_remo_barra, v_remo_polea]
  WHERE id = v_remo_mancuerna;
  
  -- Remo en Polea: alternativas = Remo con Barra, Remo con Mancuerna
  UPDATE exercises SET alternative_exercises = ARRAY[v_remo_barra, v_remo_mancuerna]
  WHERE id = v_remo_polea;

  -- ============================================================================
  -- CONFIGURAR ALTERNATIVAS - HOMBROS
  -- ============================================================================
  
  -- Press Militar: alternativas = Press Arnold, Press Mancuernas Sentado
  UPDATE exercises SET alternative_exercises = ARRAY[v_press_arnold, v_press_mancuernas_sentado]
  WHERE id = v_press_militar;
  
  -- Press Arnold: alternativas = Press Militar, Press Mancuernas Sentado
  UPDATE exercises SET alternative_exercises = ARRAY[v_press_militar, v_press_mancuernas_sentado]
  WHERE id = v_press_arnold;
  
  -- Elevaciones Laterales: alternativas = Elevaciones Laterales en Polea
  UPDATE exercises SET alternative_exercises = ARRAY[v_elevaciones_laterales_polea]
  WHERE id = v_elevaciones_laterales;
  
  -- Elevaciones Laterales en Polea: alternativas = Elevaciones Laterales
  UPDATE exercises SET alternative_exercises = ARRAY[v_elevaciones_laterales]
  WHERE id = v_elevaciones_laterales_polea;

  -- ============================================================================
  -- CONFIGURAR ALTERNATIVAS - BÍCEPS
  -- ============================================================================
  
  -- Curl con Barra: alternativas = Curl con Mancuernas, Curl en Polea
  UPDATE exercises SET alternative_exercises = ARRAY[v_curl_mancuernas, v_curl_polea]
  WHERE id = v_curl_barra;
  
  -- Curl con Mancuernas: alternativas = Curl con Barra, Curl Martillo
  UPDATE exercises SET alternative_exercises = ARRAY[v_curl_barra, v_curl_martillo]
  WHERE id = v_curl_mancuernas;
  
  -- Curl Martillo: alternativas = Curl con Mancuernas, Curl Inclinado
  UPDATE exercises SET alternative_exercises = ARRAY[v_curl_mancuernas, v_curl_inclinado]
  WHERE id = v_curl_martillo;
  
  -- Curl Concentrado: alternativas = Curl Predicador
  UPDATE exercises SET alternative_exercises = ARRAY[v_curl_predicador]
  WHERE id = v_curl_concentrado;
  
  -- Curl Predicador: alternativas = Curl Concentrado, Curl en Polea
  UPDATE exercises SET alternative_exercises = ARRAY[v_curl_concentrado, v_curl_polea]
  WHERE id = v_curl_predicador;

  -- ============================================================================
  -- CONFIGURAR ALTERNATIVAS - TRÍCEPS
  -- ============================================================================
  
  -- Fondos para Tríceps: alternativas = Press Cerrado, Press Francés
  UPDATE exercises SET alternative_exercises = ARRAY[v_press_cerrado, v_press_frances]
  WHERE id = v_fondos_triceps;
  
  -- Press Francés: alternativas = Extensiones sobre Cabeza, Extensiones en Polea
  UPDATE exercises SET alternative_exercises = ARRAY[v_extensiones_cabeza, v_extensiones_polea]
  WHERE id = v_press_frances;
  
  -- Extensiones en Polea: alternativas = Extensiones con Cuerda, Patada de Tríceps
  UPDATE exercises SET alternative_exercises = ARRAY[v_extensiones_cuerda, v_patada_triceps]
  WHERE id = v_extensiones_polea;
  
  -- Extensiones con Cuerda: alternativas = Extensiones en Polea
  UPDATE exercises SET alternative_exercises = ARRAY[v_extensiones_polea]
  WHERE id = v_extensiones_cuerda;
  
  -- Press Cerrado: alternativas = Fondos para Tríceps, Press Francés
  UPDATE exercises SET alternative_exercises = ARRAY[v_fondos_triceps, v_press_frances]
  WHERE id = v_press_cerrado;

  -- ============================================================================
  -- CONFIGURAR ALTERNATIVAS - CUÁDRICEPS
  -- ============================================================================
  
  -- Sentadilla: alternativas = Prensa, Sentadilla Frontal, Sentadilla Hack
  UPDATE exercises SET alternative_exercises = ARRAY[v_prensa, v_sentadilla_frontal, v_sentadilla_hack]
  WHERE id = v_sentadilla;
  
  -- Sentadilla Frontal: alternativas = Sentadilla, Sentadilla Goblet
  UPDATE exercises SET alternative_exercises = ARRAY[v_sentadilla, v_sentadilla_goblet]
  WHERE id = v_sentadilla_frontal;
  
  -- Prensa: alternativas = Sentadilla, Sentadilla Hack
  UPDATE exercises SET alternative_exercises = ARRAY[v_sentadilla, v_sentadilla_hack]
  WHERE id = v_prensa;
  
  -- Zancadas: alternativas = Sentadilla Búlgara
  UPDATE exercises SET alternative_exercises = ARRAY[v_sentadilla_bulgara]
  WHERE id = v_zancadas;
  
  -- Sentadilla Búlgara: alternativas = Zancadas
  UPDATE exercises SET alternative_exercises = ARRAY[v_zancadas]
  WHERE id = v_sentadilla_bulgara;

  -- ============================================================================
  -- CONFIGURAR ALTERNATIVAS - ISQUIOS/GLÚTEOS
  -- ============================================================================
  
  -- Curl Femoral Acostado: alternativas = Curl Femoral Sentado
  UPDATE exercises SET alternative_exercises = ARRAY[v_curl_femoral_sentado]
  WHERE id = v_curl_femoral_acostado;
  
  -- Curl Femoral Sentado: alternativas = Curl Femoral Acostado
  UPDATE exercises SET alternative_exercises = ARRAY[v_curl_femoral_acostado]
  WHERE id = v_curl_femoral_sentado;
  
  -- Peso Muerto Rumano: alternativas = Peso Muerto
  UPDATE exercises SET alternative_exercises = ARRAY[v_peso_muerto]
  WHERE id = v_peso_muerto_rumano;
  
  -- Peso Muerto: alternativas = Peso Muerto Rumano
  UPDATE exercises SET alternative_exercises = ARRAY[v_peso_muerto_rumano]
  WHERE id = v_peso_muerto;

END $$;

-- Verificar alternativas configuradas
SELECT name, array_length(alternative_exercises, 1) as num_alternatives 
FROM exercises 
WHERE alternative_exercises IS NOT NULL AND array_length(alternative_exercises, 1) > 0
ORDER BY name;
