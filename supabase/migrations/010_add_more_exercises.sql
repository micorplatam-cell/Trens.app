-- ============================================================================
-- MIGRACIÓN: Agregar más ejercicios al catálogo
-- ============================================================================

INSERT INTO asset_templates (asset_type, name, description, image_url, category, difficulty, default_metadata)
VALUES
  -- PIERNAS
  ('gym_exercise', 'LEG PRESS', 'Prensa de piernas para cuádriceps y glúteos', 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800', 'LEGS', 'INTERMEDIATE', '{"muscle_groups": ["quadriceps", "glutes"], "equipment": "machine"}'),
  ('gym_exercise', 'LUNGES', 'Zancadas para piernas completas', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800', 'LEGS', 'BEGINNER', '{"muscle_groups": ["quadriceps", "glutes", "hamstrings"], "equipment": "bodyweight"}'),
  ('gym_exercise', 'LEG CURL', 'Curl de piernas para isquiotibiales', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'LEGS', 'BEGINNER', '{"muscle_groups": ["hamstrings"], "equipment": "machine"}'),
  ('gym_exercise', 'LEG EXTENSION', 'Extensión de piernas para cuádriceps', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'LEGS', 'BEGINNER', '{"muscle_groups": ["quadriceps"], "equipment": "machine"}'),
  ('gym_exercise', 'CALF RAISE', 'Elevación de pantorrillas', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'LEGS', 'BEGINNER', '{"muscle_groups": ["calves"], "equipment": "machine"}'),
  ('gym_exercise', 'HIP THRUST', 'Empuje de cadera para glúteos', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'LEGS', 'INTERMEDIATE', '{"muscle_groups": ["glutes", "hamstrings"], "equipment": "barbell"}'),
  
  -- PECHO
  ('gym_exercise', 'INCLINE BENCH PRESS', 'Press inclinado para pecho superior', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'CHEST', 'INTERMEDIATE', '{"muscle_groups": ["chest", "shoulders", "triceps"], "equipment": "barbell"}'),
  ('gym_exercise', 'DUMBBELL PRESS', 'Press con mancuernas', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'CHEST', 'INTERMEDIATE', '{"muscle_groups": ["chest", "shoulders", "triceps"], "equipment": "dumbbells"}'),
  ('gym_exercise', 'CABLE FLY', 'Aperturas en polea para pecho', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'CHEST', 'INTERMEDIATE', '{"muscle_groups": ["chest"], "equipment": "cable"}'),
  ('gym_exercise', 'PUSH-UPS', 'Flexiones de brazos', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'CHEST', 'BEGINNER', '{"muscle_groups": ["chest", "shoulders", "triceps"], "equipment": "bodyweight"}'),
  
  -- ESPALDA
  ('gym_exercise', 'LAT PULLDOWN', 'Jalón al pecho para dorsales', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'BACK', 'BEGINNER', '{"muscle_groups": ["lats", "biceps"], "equipment": "cable"}'),
  ('gym_exercise', 'BARBELL ROW', 'Remo con barra', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'BACK', 'INTERMEDIATE', '{"muscle_groups": ["lats", "rhomboids", "biceps"], "equipment": "barbell"}'),
  ('gym_exercise', 'CABLE ROW', 'Remo en polea', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'BACK', 'BEGINNER', '{"muscle_groups": ["lats", "rhomboids"], "equipment": "cable"}'),
  ('gym_exercise', 'T-BAR ROW', 'Remo T-Bar', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'BACK', 'INTERMEDIATE', '{"muscle_groups": ["lats", "rhomboids", "traps"], "equipment": "barbell"}'),
  
  -- HOMBROS
  ('gym_exercise', 'LATERAL RAISE', 'Elevaciones laterales', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'SHOULDERS', 'BEGINNER', '{"muscle_groups": ["deltoids"], "equipment": "dumbbells"}'),
  ('gym_exercise', 'FRONT RAISE', 'Elevaciones frontales', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'SHOULDERS', 'BEGINNER', '{"muscle_groups": ["deltoids"], "equipment": "dumbbells"}'),
  ('gym_exercise', 'FACE PULL', 'Tirón facial para deltoides posterior', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'SHOULDERS', 'BEGINNER', '{"muscle_groups": ["rear_deltoids", "traps"], "equipment": "cable"}'),
  
  -- BRAZOS
  ('gym_exercise', 'HAMMER CURL', 'Curl martillo para bíceps', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'ARMS', 'BEGINNER', '{"muscle_groups": ["biceps", "forearms"], "equipment": "dumbbells"}'),
  ('gym_exercise', 'TRICEP PUSHDOWN', 'Extensión de tríceps en polea', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'ARMS', 'BEGINNER', '{"muscle_groups": ["triceps"], "equipment": "cable"}'),
  ('gym_exercise', 'SKULL CRUSHER', 'Extensión de tríceps acostado', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'ARMS', 'INTERMEDIATE', '{"muscle_groups": ["triceps"], "equipment": "barbell"}'),
  ('gym_exercise', 'PREACHER CURL', 'Curl en banco predicador', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'ARMS', 'BEGINNER', '{"muscle_groups": ["biceps"], "equipment": "barbell"}'),
  
  -- CORE
  ('gym_exercise', 'CRUNCHES', 'Abdominales clásicos', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'CORE', 'BEGINNER', '{"muscle_groups": ["abs"], "equipment": "bodyweight"}'),
  ('gym_exercise', 'LEG RAISE', 'Elevación de piernas', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'CORE', 'INTERMEDIATE', '{"muscle_groups": ["abs", "hip_flexors"], "equipment": "bodyweight"}'),
  ('gym_exercise', 'RUSSIAN TWIST', 'Giro ruso para oblicuos', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'CORE', 'BEGINNER', '{"muscle_groups": ["obliques", "abs"], "equipment": "bodyweight"}'),
  ('gym_exercise', 'MOUNTAIN CLIMBERS', 'Escaladores', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'CORE', 'BEGINNER', '{"muscle_groups": ["abs", "hip_flexors"], "equipment": "bodyweight"}'),
  
  -- COMPUESTOS
  ('gym_exercise', 'CLEAN AND PRESS', 'Cargada y press', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'COMPOUND', 'ADVANCED', '{"muscle_groups": ["full_body"], "equipment": "barbell"}'),
  ('gym_exercise', 'KETTLEBELL SWING', 'Swing con pesa rusa', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'COMPOUND', 'INTERMEDIATE', '{"muscle_groups": ["glutes", "hamstrings", "core"], "equipment": "kettlebell"}'),
  ('gym_exercise', 'BURPEES', 'Burpees cardio', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'COMPOUND', 'INTERMEDIATE', '{"muscle_groups": ["full_body"], "equipment": "bodyweight"}')

ON CONFLICT (name, asset_type) DO NOTHING;
