-- ============================================================================
-- TABLA: asset_templates
-- Descripción: Catálogo global de ejercicios, comidas, desafíos
-- ============================================================================

-- Eliminar tabla existente si tiene estructura incorrecta
DROP TABLE IF EXISTS asset_templates CASCADE;

-- Crear tabla con estructura correcta
CREATE TABLE asset_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  default_metadata JSONB,
  category TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_asset_templates_type ON asset_templates(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_templates_category ON asset_templates(category);

-- ============================================================================
-- RLS: Catálogo público de solo lectura
-- ============================================================================
ALTER TABLE asset_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
ON asset_templates FOR SELECT
USING (true);

-- ============================================================================
-- DATOS DE EJEMPLO (EJERCICIOS GYM)
-- ============================================================================
INSERT INTO asset_templates (asset_type, name, description, image_url, default_metadata, category, difficulty) VALUES
('gym_exercise', 'BENCH PRESS', 'Ejercicio compuesto de pecho', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', '{"sets": "4x10", "rest": "90s"}', 'CHEST', 'INTERMEDIATE'),
('gym_exercise', 'DEADLIFT', 'Rey de los ejercicios de espalda', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800', '{"sets": "5x5", "rest": "180s"}', 'BACK', 'SAVAGE'),
('gym_exercise', 'SQUAT', 'Desarrollo de piernas completo', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800', '{"sets": "4x8", "rest": "120s"}', 'LEGS', 'INTERMEDIATE'),
('gym_exercise', 'PULL-UPS', 'Dominadas para espalda', 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800', '{"sets": "4xMax", "rest": "90s"}', 'BACK', 'INTERMEDIATE'),
('gym_exercise', 'SHOULDER PRESS', 'Press militar de hombros', 'https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800', '{"sets": "4x10", "rest": "90s"}', 'SHOULDERS', 'BEGINNER'),
('gym_exercise', 'BICEP CURL', 'Curl de bíceps con barra', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800', '{"sets": "3x12", "rest": "60s"}', 'ARMS', 'BEGINNER'),
('gym_exercise', 'TRICEP DIPS', 'Fondos para tríceps', 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800', '{"sets": "4x12", "rest": "75s"}', 'ARMS', 'INTERMEDIATE'),
('gym_exercise', 'PLANK', 'Plancha para core', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800', '{"sets": "3x60s", "rest": "60s"}', 'CORE', 'BEGINNER')
ON CONFLICT DO NOTHING;
