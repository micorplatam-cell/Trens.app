-- ============================================================================
-- TRENS: SISTEMA DE DEPORTES MULTI-DISCIPLINA
-- Migración: 20241224_sports_system.sql
-- Descripción: Crea la infraestructura para soportar múltiples deportes
--              con módulos dinámicos, inventario y herramientas específicas
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE DEPORTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  code TEXT UNIQUE NOT NULL,           -- 'GYM', 'MOTO', 'AUTO', 'SURF'
  name TEXT NOT NULL,                   -- 'Gym & Fitness'
  description TEXT,                     -- Descripción del deporte
  
  -- Visual
  icon TEXT NOT NULL,                   -- Emoji o nombre de icono lucide
  color_primary TEXT DEFAULT '#DC2626', -- Color principal del deporte
  color_secondary TEXT,                 -- Color secundario
  
  -- Configuración de módulos dinámicos
  tab_4_name TEXT NOT NULL,            -- Nombre del tab 4: 'GYM', 'GARAGE', 'QUIVER'
  tab_4_icon TEXT NOT NULL,            -- Icono del tab 4
  tab_5_name TEXT NOT NULL,            -- Nombre del tab 5: 'PLAN', 'TRACK', 'WAVES'
  tab_5_icon TEXT NOT NULL,            -- Icono del tab 5
  
  -- Categorías de inventario disponibles
  inventory_categories JSONB DEFAULT '[]',
  
  -- Herramientas disponibles para este deporte
  available_tools JSONB DEFAULT '[]',
  
  -- Campos de perfil específicos del deporte
  profile_fields JSONB DEFAULT '[]',
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. INSERTAR DEPORTES MVP
-- ============================================================================

-- GYM & FITNESS
INSERT INTO sports (
  code, name, description, icon, color_primary,
  tab_4_name, tab_4_icon, tab_5_name, tab_5_icon,
  inventory_categories, available_tools, profile_fields, display_order
) VALUES (
  'GYM',
  'Gym & Fitness',
  'Entrenamiento de fuerza, hipertrofia y acondicionamiento físico',
  'Dumbbell',
  '#DC2626',
  'GYM', 'Dumbbell',
  'PLAN', 'Utensils',
  '[
    {"code": "SUPPLEMENTS", "name": "Suplementos", "icon": "Pill"},
    {"code": "EQUIPMENT", "name": "Equipamiento", "icon": "Dumbbell"},
    {"code": "WEARABLES", "name": "Wearables", "icon": "Watch"}
  ]'::jsonb,
  '[
    {"code": "ROUTINE_GENERATOR", "name": "Generador de Rutinas"},
    {"code": "NUTRITION_CALC", "name": "Calculadora de Macros"},
    {"code": "PR_TRACKER", "name": "Tracker de PRs"},
    {"code": "PERIODIZATION", "name": "Periodización"},
    {"code": "SUPPLEMENT_STACK", "name": "Stack de Suplementos"}
  ]'::jsonb,
  '[
    {"code": "goal", "name": "Objetivo", "type": "select", "options": ["HIPERTROFIA", "FUERZA", "DEFINICION", "RECOMPOSICION"]},
    {"code": "training_days", "name": "Días de entreno", "type": "number"},
    {"code": "experience_years", "name": "Años de experiencia", "type": "number"}
  ]'::jsonb,
  1
);

-- MOTOCROSS / ENDURO / SUPERBIKE
INSERT INTO sports (
  code, name, description, icon, color_primary, color_secondary,
  tab_4_name, tab_4_icon, tab_5_name, tab_5_icon,
  inventory_categories, available_tools, profile_fields, display_order
) VALUES (
  'MOTO',
  'Motociclismo',
  'Motocross, Enduro, Superbike y Track Days',
  'Bike',
  '#F97316',
  '#EA580C',
  'GARAJE', 'Warehouse',
  'RACE', 'Flag',
  '[
    {"code": "BIKES", "name": "Motos", "icon": "Bike", "fields": [
      {"code": "brand", "name": "Marca", "type": "text"},
      {"code": "model", "name": "Modelo", "type": "text"},
      {"code": "year", "name": "Año", "type": "number"},
      {"code": "engine_hours", "name": "Horas motor", "type": "number"},
      {"code": "km", "name": "Kilómetros", "type": "number"}
    ]},
    {"code": "HELMETS", "name": "Cascos", "icon": "HardHat", "fields": [
      {"code": "brand", "name": "Marca", "type": "text"},
      {"code": "purchase_date", "name": "Fecha compra", "type": "date"},
      {"code": "impacts", "name": "Impactos", "type": "number"},
      {"code": "expiry_date", "name": "Fecha caducidad", "type": "date"}
    ]},
    {"code": "BOOTS", "name": "Botas", "icon": "Footprints"},
    {"code": "PROTECTION", "name": "Protección", "icon": "Shield"},
    {"code": "GOGGLES", "name": "Goggles", "icon": "Glasses"},
    {"code": "TOOLS", "name": "Herramientas", "icon": "Wrench"},
    {"code": "SPARES", "name": "Repuestos", "icon": "Package"}
  ]'::jsonb,
  '[
    {"code": "ENGINE_HOURS", "name": "Contador Horas Motor"},
    {"code": "OIL_CHANGE", "name": "Recordatorio Cambio Aceite"},
    {"code": "TIRE_PRESSURE", "name": "Calculadora Presión Neumáticos"},
    {"code": "SUSPENSION_SETUP", "name": "Setup Suspensión"},
    {"code": "PRE_RIDE_CHECKLIST", "name": "Checklist Pre-Rodada"},
    {"code": "MAINTENANCE_LOG", "name": "Log de Mantenimiento"},
    {"code": "EVENT_CALENDAR", "name": "Calendario de Eventos"}
  ]'::jsonb,
  '[
    {"code": "discipline", "name": "Disciplina", "type": "select", "options": ["MOTOCROSS", "ENDURO", "SUPERBIKE", "TRACK_DAY", "SUPERMOTO"]},
    {"code": "bike_count", "name": "Cantidad de motos", "type": "number"},
    {"code": "license_type", "name": "Tipo de licencia", "type": "text"},
    {"code": "experience_years", "name": "Años de experiencia", "type": "number"}
  ]'::jsonb,
  2
);

-- AUTOMOVILISMO (Drift, Track, Street)
INSERT INTO sports (
  code, name, description, icon, color_primary, color_secondary,
  tab_4_name, tab_4_icon, tab_5_name, tab_5_icon,
  inventory_categories, available_tools, profile_fields, display_order
) VALUES (
  'AUTO',
  'Automovilismo',
  'Drift, Track Days, Time Attack y cultura automotriz',
  'Car',
  '#EAB308',
  '#CA8A04',
  'GARAJE', 'Warehouse',
  'RACE', 'Flag',
  '[
    {"code": "CARS", "name": "Autos", "icon": "Car", "fields": [
      {"code": "brand", "name": "Marca", "type": "text"},
      {"code": "model", "name": "Modelo", "type": "text"},
      {"code": "year", "name": "Año", "type": "number"},
      {"code": "km", "name": "Kilómetros", "type": "number"},
      {"code": "hp", "name": "Potencia HP", "type": "number"}
    ]},
    {"code": "TIRES", "name": "Neumáticos", "icon": "Circle", "fields": [
      {"code": "brand", "name": "Marca", "type": "text"},
      {"code": "compound", "name": "Compuesto", "type": "text"},
      {"code": "size", "name": "Medida", "type": "text"},
      {"code": "wear_percent", "name": "Desgaste %", "type": "number"}
    ]},
    {"code": "MODS", "name": "Modificaciones", "icon": "Wrench"},
    {"code": "SAFETY", "name": "Seguridad", "icon": "Shield"},
    {"code": "HELMET", "name": "Casco", "icon": "HardHat"},
    {"code": "SUIT", "name": "Traje", "icon": "Shirt"}
  ]'::jsonb,
  '[
    {"code": "MOD_LOG", "name": "Log de Modificaciones"},
    {"code": "ALIGNMENT_SETUP", "name": "Setup Alineación"},
    {"code": "TIRE_PRESSURE", "name": "Calculadora Presión por Temp"},
    {"code": "LAP_TIMES", "name": "Tiempos por Vuelta"},
    {"code": "MAINTENANCE_LOG", "name": "Log de Mantenimiento"},
    {"code": "BRAKE_WEAR", "name": "Desgaste de Frenos"},
    {"code": "EVENT_CALENDAR", "name": "Calendario de Eventos"}
  ]'::jsonb,
  '[
    {"code": "discipline", "name": "Disciplina", "type": "select", "options": ["DRIFT", "TRACK_DAY", "TIME_ATTACK", "DRAG", "STREET"]},
    {"code": "car_count", "name": "Cantidad de autos", "type": "number"},
    {"code": "license_type", "name": "Tipo de licencia", "type": "text"},
    {"code": "experience_years", "name": "Años de experiencia", "type": "number"}
  ]'::jsonb,
  3
);

-- SURF
INSERT INTO sports (
  code, name, description, icon, color_primary, color_secondary,
  tab_4_name, tab_4_icon, tab_5_name, tab_5_icon,
  inventory_categories, available_tools, profile_fields, display_order
) VALUES (
  'SURF',
  'Surf',
  'Shortboard, Longboard, Bodyboard y deportes de olas',
  'Waves',
  '#0EA5E9',
  '#0284C7',
  'TABLA', 'Sailboat',
  'SPOT', 'Waves',
  '[
    {"code": "BOARDS", "name": "Tablas", "icon": "Sailboat", "fields": [
      {"code": "brand", "name": "Marca/Shaper", "type": "text"},
      {"code": "model", "name": "Modelo", "type": "text"},
      {"code": "size_ft", "name": "Tamaño (pies)", "type": "text"},
      {"code": "liters", "name": "Litros", "type": "number"},
      {"code": "ideal_conditions", "name": "Condiciones ideales", "type": "text"}
    ]},
    {"code": "WETSUITS", "name": "Trajes", "icon": "Shirt", "fields": [
      {"code": "brand", "name": "Marca", "type": "text"},
      {"code": "thickness", "name": "Grosor (mm)", "type": "text"},
      {"code": "condition", "name": "Estado", "type": "select", "options": ["NUEVO", "BUENO", "USADO", "REPARAR"]}
    ]},
    {"code": "FINS", "name": "Quillas", "icon": "Triangle"},
    {"code": "LEASHES", "name": "Leashes", "icon": "Link"},
    {"code": "WAX", "name": "Wax", "icon": "Droplet"},
    {"code": "ACCESSORIES", "name": "Accesorios", "icon": "Package"}
  ]'::jsonb,
  '[
    {"code": "WAVE_FORECAST", "name": "Forecast de Olas"},
    {"code": "BEST_HOUR", "name": "Mejor Hora para Surfear"},
    {"code": "SPOT_TRACKER", "name": "Spots Favoritos"},
    {"code": "SESSION_LOG", "name": "Log de Sesiones"},
    {"code": "BOARD_MATCH", "name": "Compatibilidad Tabla-Olas"},
    {"code": "TIDE_CHART", "name": "Tabla de Mareas"}
  ]'::jsonb,
  '[
    {"code": "discipline", "name": "Disciplina", "type": "select", "options": ["SHORTBOARD", "LONGBOARD", "BODYBOARD", "SUP", "FOIL"]},
    {"code": "home_spot", "name": "Spot principal", "type": "text"},
    {"code": "experience_years", "name": "Años de experiencia", "type": "number"},
    {"code": "board_count", "name": "Cantidad de tablas", "type": "number"}
  ]'::jsonb,
  4
);

-- ============================================================================
-- 3. DEPORTES DEL USUARIO (Multi-deporte)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,       -- Deporte activo (el que se muestra)
  is_primary BOOLEAN DEFAULT false,     -- Deporte principal del usuario
  
  -- Configuración específica del usuario para este deporte
  custom_config JSONB DEFAULT '{}',
  
  -- Preferencia de modo de personalización
  -- 'MANUAL' = Usuario hace todo
  -- 'AI' = Hank genera todo
  -- 'HYBRID' = Usuario + ajustes de Hank
  personalization_mode TEXT DEFAULT 'HYBRID' CHECK (personalization_mode IN ('MANUAL', 'AI', 'HYBRID')),
  
  -- Datos específicos del perfil para este deporte
  sport_profile JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, sport_id)
);

-- Índices
CREATE INDEX idx_user_sports_user ON user_sports(user_id);
CREATE INDEX idx_user_sports_active ON user_sports(user_id, is_active);

-- ============================================================================
-- 4. INVENTARIO UNIVERSAL
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id),
  
  -- Categorización
  category_code TEXT NOT NULL,          -- 'BIKES', 'CARS', 'BOARDS', etc.
  
  -- Identificación
  name TEXT NOT NULL,                   -- "KTM 450 SX-F 2023"
  brand TEXT,
  model TEXT,
  year INTEGER,
  
  -- Media
  photo_url TEXT,
  
  -- Datos específicos del item (estructura flexible)
  attributes JSONB DEFAULT '{}',        -- {engine_hours: 45, km: 1200, ...}
  
  -- Estado
  is_primary BOOLEAN DEFAULT false,     -- Item principal de esa categoría
  status TEXT DEFAULT 'ACTIVE',         -- 'ACTIVE', 'SOLD', 'BROKEN', 'STORED'
  
  -- Fechas
  purchase_date DATE,
  last_service_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_inventory_user ON inventory_items(user_id);
CREATE INDEX idx_inventory_sport ON inventory_items(user_id, sport_id);
CREATE INDEX idx_inventory_category ON inventory_items(user_id, category_code);

-- ============================================================================
-- 5. LOG DE MANTENIMIENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  
  -- Tipo de mantenimiento
  type TEXT NOT NULL,                   -- 'OIL_CHANGE', 'TIRE_CHANGE', 'REPAIR', 'UPGRADE', etc.
  title TEXT NOT NULL,                  -- "Cambio de aceite motor"
  description TEXT,
  
  -- Métricas al momento del mantenimiento
  at_km INTEGER,
  at_hours DECIMAL(10,1),
  
  -- Costo
  cost DECIMAL(10,2),
  currency TEXT DEFAULT 'PEN',
  
  -- Próximo mantenimiento (para alertas)
  next_due_km INTEGER,
  next_due_hours DECIMAL(10,1),
  next_due_date DATE,
  
  -- Media
  photo_urls TEXT[],
  receipt_url TEXT,
  
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_maintenance_item ON maintenance_logs(item_id);
CREATE INDEX idx_maintenance_user ON maintenance_logs(user_id);
CREATE INDEX idx_maintenance_next ON maintenance_logs(next_due_date) WHERE next_due_date IS NOT NULL;

-- ============================================================================
-- 6. EVENTOS / TRACK DAYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS sport_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id),
  
  -- Información del evento
  name TEXT NOT NULL,                   -- "Enduro de Canta 2024"
  location TEXT,
  venue TEXT,                           -- Circuito, spot, etc.
  
  -- Fechas
  event_date DATE NOT NULL,
  event_end_date DATE,                  -- Para eventos multi-día
  
  -- Tipo
  event_type TEXT,                      -- 'COMPETITION', 'TRACK_DAY', 'SESSION', 'TRAINING'
  
  -- Estado
  status TEXT DEFAULT 'UPCOMING',       -- 'UPCOMING', 'COMPLETED', 'CANCELLED'
  
  -- Items que se usaron/usarán
  items_used UUID[],                    -- Referencias a inventory_items
  
  -- Resultados (post-evento)
  results JSONB DEFAULT '{}',           -- {position: 3, best_lap: "1:23.456", notes: "..."}
  
  -- Checklist
  checklist JSONB DEFAULT '[]',         -- [{item: "Revisar aceite", done: true}, ...]
  
  -- Media
  photo_urls TEXT[],
  video_urls TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_events_user ON sport_events(user_id);
CREATE INDEX idx_events_date ON sport_events(event_date);
CREATE INDEX idx_events_upcoming ON sport_events(user_id, status, event_date) 
  WHERE status = 'UPCOMING';

-- ============================================================================
-- 7. SESIONES DE SURF (específico)
-- ============================================================================
CREATE TABLE IF NOT EXISTS surf_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Spot
  spot_name TEXT NOT NULL,
  spot_lat DECIMAL(10,7),
  spot_lng DECIMAL(10,7),
  
  -- Condiciones
  wave_size_ft DECIMAL(3,1),
  wave_period_s INTEGER,
  wind_direction TEXT,
  wind_speed_kts INTEGER,
  tide TEXT,                            -- 'HIGH', 'MID', 'LOW'
  water_temp_c INTEGER,
  
  -- Equipo usado
  board_id UUID REFERENCES inventory_items(id),
  wetsuit_id UUID REFERENCES inventory_items(id),
  
  -- Sesión
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_min INTEGER,
  
  -- Rating
  wave_quality INTEGER CHECK (wave_quality BETWEEN 1 AND 5),
  session_rating INTEGER CHECK (session_rating BETWEEN 1 AND 5),
  
  -- Notas
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_surf_sessions_user ON surf_sessions(user_id);

-- ============================================================================
-- 8. ACTUALIZAR USER_PROFILES
-- ============================================================================
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS active_sport_id UUID REFERENCES sports(id),
ADD COLUMN IF NOT EXISTS personalization_mode TEXT DEFAULT 'HYBRID' 
  CHECK (personalization_mode IN ('MANUAL', 'AI', 'HYBRID')),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hank_first_time_shown BOOLEAN DEFAULT false;

-- ============================================================================
-- 9. TRIGGERS PARA UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sports_updated_at
  BEFORE UPDATE ON sports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sports_updated_at
  BEFORE UPDATE ON user_sports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sport_events_updated_at
  BEFORE UPDATE ON sport_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

-- Sports (lectura pública)
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sports are viewable by everyone" ON sports FOR SELECT USING (true);

-- User Sports
ALTER TABLE user_sports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sports" ON user_sports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sports" ON user_sports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sports" ON user_sports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sports" ON user_sports FOR DELETE USING (auth.uid() = user_id);

-- Inventory Items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inventory" ON inventory_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON inventory_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON inventory_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON inventory_items FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Logs
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own maintenance" ON maintenance_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance" ON maintenance_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance" ON maintenance_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance" ON maintenance_logs FOR DELETE USING (auth.uid() = user_id);

-- Sport Events
ALTER TABLE sport_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON sport_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON sport_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON sport_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON sport_events FOR DELETE USING (auth.uid() = user_id);

-- Surf Sessions
ALTER TABLE surf_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON surf_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON surf_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON surf_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON surf_sessions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 11. FUNCIÓN PARA OBTENER CONFIGURACIÓN DE TABS POR DEPORTE
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_active_sport(p_user_id UUID)
RETURNS TABLE (
  sport_id UUID,
  sport_code TEXT,
  sport_name TEXT,
  sport_icon TEXT,
  color_primary TEXT,
  tab_4_name TEXT,
  tab_4_icon TEXT,
  tab_5_name TEXT,
  tab_5_icon TEXT,
  personalization_mode TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.code,
    s.name,
    s.icon,
    s.color_primary,
    s.tab_4_name,
    s.tab_4_icon,
    s.tab_5_name,
    s.tab_5_icon,
    COALESCE(us.personalization_mode, 'HYBRID')
  FROM user_profiles up
  JOIN sports s ON s.id = up.active_sport_id
  LEFT JOIN user_sports us ON us.user_id = up.user_id AND us.sport_id = s.id
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================
