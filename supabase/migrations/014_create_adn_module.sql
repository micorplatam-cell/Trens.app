-- =============================================
-- MÓDULO ADN: IDENTIDAD & STATS
-- Versión: 2.0 (Identity & Inline Expansion)
-- =============================================

-- =============================================
-- TABLA: user_profiles (TRENS ID)
-- Ficha técnica biológica del atleta
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Datos públicos
  display_name TEXT NOT NULL DEFAULT 'ATLETA',
  avatar_url TEXT,
  
  -- TRENS ID (Privado)
  height TEXT DEFAULT '0.00 M',
  weight TEXT DEFAULT '0.0 KG',
  goal TEXT DEFAULT 'DEFINIR OBJETIVO',
  injuries TEXT DEFAULT 'NINGUNA',
  allergies TEXT DEFAULT 'NINGUNA',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_timestamp();

-- =============================================
-- TABLA: body_measurements
-- Medidas corporales con músculo dominante
-- =============================================
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,           -- ej: "Bíceps", "Pecho", "Pierna"
  value TEXT NOT NULL,          -- ej: "45cm", "110cm"
  is_dominant BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER body_measurements_updated_at
  BEFORE UPDATE ON body_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_timestamp();

-- =============================================
-- TABLA: personal_records
-- Records verificados del atleta (máximo 3)
-- =============================================
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  exercise_id TEXT NOT NULL,    -- 'squat', 'bench', 'deadlift', 'ohp'
  exercise_name TEXT NOT NULL,  -- 'SENTADILLA', 'BANCA', etc.
  exercise_icon TEXT NOT NULL,  -- '🦵', '💪', etc.
  
  weight NUMERIC NOT NULL,      -- Peso en KG
  reps INTEGER NOT NULL,        -- Repeticiones (1 = 1RM)
  
  video_id UUID REFERENCES user_assets(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER personal_records_updated_at
  BEFORE UPDATE ON personal_records
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_timestamp();

-- =============================================
-- TABLA: followers (Sistema social)
-- =============================================
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id)
);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- USER_PROFILES: Público para lectura (display_name, avatar), privado para el resto
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT TO authenticated
  USING (true);  -- Todos pueden ver perfiles públicos

CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- BODY_MEASUREMENTS: Solo el dueño
CREATE POLICY "body_measurements_select" ON body_measurements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "body_measurements_insert" ON body_measurements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "body_measurements_update" ON body_measurements
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "body_measurements_delete" ON body_measurements
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- PERSONAL_RECORDS: Público para lectura
CREATE POLICY "personal_records_select" ON personal_records
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "personal_records_insert" ON personal_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_records_update" ON personal_records
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "personal_records_delete" ON personal_records
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- FOLLOWERS: Público para lectura, solo insertar/borrar propios
CREATE POLICY "followers_select" ON followers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "followers_insert" ON followers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "followers_delete" ON followers
  FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- =============================================
-- GRANTS
-- =============================================
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON body_measurements TO authenticated;
GRANT ALL ON personal_records TO authenticated;
GRANT ALL ON followers TO authenticated;

-- =============================================
-- FUNCIÓN: Obtener conteo de seguidores
-- =============================================
CREATE OR REPLACE FUNCTION get_followers_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM followers WHERE following_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCIÓN: Crear perfil automáticamente al registrarse
-- =============================================
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'ATLETA'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- =============================================
-- FUNCIÓN: Asegurar solo un músculo dominante
-- =============================================
CREATE OR REPLACE FUNCTION ensure_single_dominant_muscle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_dominant = TRUE THEN
    UPDATE body_measurements 
    SET is_dominant = FALSE 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_dominant = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_dominant
  BEFORE INSERT OR UPDATE ON body_measurements
  FOR EACH ROW
  WHEN (NEW.is_dominant = TRUE)
  EXECUTE FUNCTION ensure_single_dominant_muscle();

-- =============================================
-- FUNCIÓN: Limitar a 3 récords por usuario
-- =============================================
CREATE OR REPLACE FUNCTION limit_personal_records()
RETURNS TRIGGER AS $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count 
  FROM personal_records 
  WHERE user_id = NEW.user_id;
  
  IF record_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 personal records allowed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER limit_records_to_three
  BEFORE INSERT ON personal_records
  FOR EACH ROW
  EXECUTE FUNCTION limit_personal_records();
