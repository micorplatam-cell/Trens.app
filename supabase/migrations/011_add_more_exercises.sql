-- ============================================================================
-- AGREGAR MÁS EJERCICIOS AL CATÁLOGO
-- ============================================================================

INSERT INTO asset_templates (asset_type, name, description, image_url, category, difficulty, default_metadata)
VALUES
  -- PIERNAS
  ('gym_exercise', 'LUNGES', 'Zancadas con peso corporal o mancuernas', NULL, 'LEGS', 'INTERMEDIATE', 
   '{"muscle_groups": ["quadriceps", "glutes", "hamstrings"], "equipment": ["dumbbells"], "instructions": "Da un paso largo hacia adelante, baja hasta que ambas rodillas formen 90 grados, empuja hacia arriba y regresa"}'::jsonb),
  
  ('gym_exercise', 'LEG PRESS', 'Prensa de piernas en máquina', NULL, 'LEGS', 'BEGINNER',
   '{"muscle_groups": ["quadriceps", "glutes"], "equipment": ["machine"], "instructions": "Siéntate en la máquina, empuja la plataforma con los pies separados al ancho de hombros"}'::jsonb),
  
  ('gym_exercise', 'LEG CURL', 'Curl de piernas en máquina', NULL, 'LEGS', 'BEGINNER',
   '{"muscle_groups": ["hamstrings"], "equipment": ["machine"], "instructions": "Acuéstate boca abajo, flexiona las rodillas llevando los talones hacia los glúteos"}'::jsonb),
  
  ('gym_exercise', 'CALF RAISES', 'Elevaciones de pantorrillas', NULL, 'LEGS', 'BEGINNER',
   '{"muscle_groups": ["calves"], "equipment": ["bodyweight"], "instructions": "De pie, eleva los talones del suelo contrayendo las pantorrillas"}'::jsonb),

  -- ESPALDA
  ('gym_exercise', 'LAT PULLDOWN', 'Jalón al pecho en polea alta', NULL, 'BACK', 'BEGINNER',
   '{"muscle_groups": ["lats", "biceps"], "equipment": ["cable"], "instructions": "Tira de la barra hacia el pecho, aprieta los omóplatos"}'::jsonb),
  
  ('gym_exercise', 'BARBELL ROW', 'Remo con barra', NULL, 'BACK', 'INTERMEDIATE',
   '{"muscle_groups": ["lats", "rhomboids", "biceps"], "equipment": ["barbell"], "instructions": "Inclínate hacia adelante, tira de la barra hacia el abdomen"}'::jsonb),
  
  ('gym_exercise', 'CABLE ROW', 'Remo en polea baja', NULL, 'BACK', 'BEGINNER',
   '{"muscle_groups": ["lats", "rhomboids"], "equipment": ["cable"], "instructions": "Siéntate, tira del cable hacia el abdomen apretando los omóplatos"}'::jsonb),

  -- PECHO
  ('gym_exercise', 'INCLINE BENCH PRESS', 'Press inclinado con barra', NULL, 'CHEST', 'INTERMEDIATE',
   '{"muscle_groups": ["upper_chest", "shoulders", "triceps"], "equipment": ["barbell", "bench"], "instructions": "Acostado en banco inclinado, empuja la barra desde el pecho"}'::jsonb),
  
  ('gym_exercise', 'DUMBBELL FLY', 'Aperturas con mancuernas', NULL, 'CHEST', 'INTERMEDIATE',
   '{"muscle_groups": ["chest"], "equipment": ["dumbbells", "bench"], "instructions": "Acostado, abre los brazos en arco y junta las mancuernas arriba"}'::jsonb),
  
  ('gym_exercise', 'CABLE CROSSOVER', 'Cruces en poleas', NULL, 'CHEST', 'INTERMEDIATE',
   '{"muscle_groups": ["chest"], "equipment": ["cable"], "instructions": "De pie entre las poleas, cruza las manos frente al pecho"}'::jsonb),

  -- HOMBROS
  ('gym_exercise', 'LATERAL RAISE', 'Elevaciones laterales', NULL, 'SHOULDERS', 'BEGINNER',
   '{"muscle_groups": ["lateral_deltoid"], "equipment": ["dumbbells"], "instructions": "De pie, eleva las mancuernas hacia los lados hasta la altura de los hombros"}'::jsonb),
  
  ('gym_exercise', 'FRONT RAISE', 'Elevaciones frontales', NULL, 'SHOULDERS', 'BEGINNER',
   '{"muscle_groups": ["front_deltoid"], "equipment": ["dumbbells"], "instructions": "De pie, eleva las mancuernas al frente hasta la altura de los hombros"}'::jsonb),
  
  ('gym_exercise', 'FACE PULL', 'Tirón a la cara', NULL, 'SHOULDERS', 'INTERMEDIATE',
   '{"muscle_groups": ["rear_deltoid", "upper_back"], "equipment": ["cable"], "instructions": "Tira de la cuerda hacia la cara separando las manos"}'::jsonb),

  -- BRAZOS
  ('gym_exercise', 'HAMMER CURL', 'Curl martillo', NULL, 'ARMS', 'BEGINNER',
   '{"muscle_groups": ["biceps", "brachialis"], "equipment": ["dumbbells"], "instructions": "Curl con agarre neutro (palmas mirándose)"}'::jsonb),
  
  ('gym_exercise', 'PREACHER CURL', 'Curl en banco predicador', NULL, 'ARMS', 'INTERMEDIATE',
   '{"muscle_groups": ["biceps"], "equipment": ["barbell", "bench"], "instructions": "Apoya los brazos en el banco, haz curl sin mover los codos"}'::jsonb),
  
  ('gym_exercise', 'SKULL CRUSHER', 'Extensión de tríceps acostado', NULL, 'ARMS', 'INTERMEDIATE',
   '{"muscle_groups": ["triceps"], "equipment": ["barbell", "bench"], "instructions": "Acostado, baja la barra hacia la frente y extiende"}'::jsonb),
  
  ('gym_exercise', 'CABLE TRICEP PUSHDOWN', 'Extensión de tríceps en polea', NULL, 'ARMS', 'BEGINNER',
   '{"muscle_groups": ["triceps"], "equipment": ["cable"], "instructions": "De pie, empuja la barra hacia abajo extendiendo los codos"}'::jsonb),

  -- CORE
  ('gym_exercise', 'RUSSIAN TWIST', 'Giro ruso', NULL, 'CORE', 'INTERMEDIATE',
   '{"muscle_groups": ["obliques", "abs"], "equipment": ["bodyweight"], "instructions": "Sentado con torso inclinado, gira de lado a lado"}'::jsonb),
  
  ('gym_exercise', 'LEG RAISE', 'Elevación de piernas', NULL, 'CORE', 'INTERMEDIATE',
   '{"muscle_groups": ["lower_abs", "hip_flexors"], "equipment": ["bodyweight"], "instructions": "Colgado o acostado, eleva las piernas rectas"}'::jsonb),
  
  ('gym_exercise', 'MOUNTAIN CLIMBERS', 'Escaladores', NULL, 'CORE', 'BEGINNER',
   '{"muscle_groups": ["abs", "hip_flexors"], "equipment": ["bodyweight"], "instructions": "En posición de plancha, alterna llevando rodillas al pecho"}'::jsonb),

  -- CARDIO
  ('gym_exercise', 'BURPEES', 'Burpees', NULL, 'CARDIO', 'ADVANCED',
   '{"muscle_groups": ["full_body"], "equipment": ["bodyweight"], "instructions": "Agáchate, salta a plancha, haz push-up, salta de vuelta y salta arriba"}'::jsonb),
  
  ('gym_exercise', 'JUMPING JACKS', 'Saltos de tijera', NULL, 'CARDIO', 'BEGINNER',
   '{"muscle_groups": ["full_body"], "equipment": ["bodyweight"], "instructions": "Salta abriendo piernas y brazos, luego cierra"}'::jsonb),

  -- VARIACIONES
  ('gym_exercise', 'ROMANIAN DEADLIFT', 'Peso muerto rumano', NULL, 'LEGS', 'INTERMEDIATE',
   '{"muscle_groups": ["hamstrings", "glutes", "lower_back"], "equipment": ["barbell"], "instructions": "Con piernas casi rectas, baja la barra manteniendo la espalda recta"}'::jsonb),
  
  ('gym_exercise', 'SUMO DEADLIFT', 'Peso muerto sumo', NULL, 'LEGS', 'INTERMEDIATE',
   '{"muscle_groups": ["quads", "glutes", "adductors"], "equipment": ["barbell"], "instructions": "Piernas muy separadas, agarre entre las piernas"}'::jsonb),
  
  ('gym_exercise', 'GOBLET SQUAT', 'Sentadilla goblet', NULL, 'LEGS', 'BEGINNER',
   '{"muscle_groups": ["quadriceps", "glutes"], "equipment": ["dumbbell", "kettlebell"], "instructions": "Sostén el peso frente al pecho, haz sentadilla profunda"}'::jsonb),
  
  ('gym_exercise', 'BULGARIAN SPLIT SQUAT', 'Sentadilla búlgara', NULL, 'LEGS', 'ADVANCED',
   '{"muscle_groups": ["quadriceps", "glutes"], "equipment": ["bench", "dumbbells"], "instructions": "Un pie en banco detrás, baja en zancada"}'::jsonb),

  ('gym_exercise', 'DUMBBELL CURL', 'Curl con mancuernas', NULL, 'ARMS', 'BEGINNER',
   '{"muscle_groups": ["biceps"], "equipment": ["dumbbells"], "instructions": "De pie, flexiona los codos alternando o simultáneo"}'::jsonb)

ON CONFLICT (asset_type, name) DO NOTHING;
