-- ============================================================================
-- MIGRATION: Admin Roles - Sistema de roles de administrador
-- ============================================================================

-- Agregar columna role a user_roles si no existe
DO $$ 
BEGIN
  -- Verificar si la columna role ya tiene el tipo correcto
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role_type'
  ) THEN
    -- Crear tipo ENUM para roles
    CREATE TYPE user_role_type AS ENUM ('free', 'pro', 'admin', 'ceo');
  END IF;
END $$;

-- Crear tabla admin_users para gestión de acceso admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'ceo')),
  permissions JSONB DEFAULT '{"rutinas": true, "ejercicios": true, "usuarios": true, "pagos": true, "finanzas": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- RLS Policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver la tabla
CREATE POLICY "admin_users_select" ON admin_users 
  FOR SELECT 
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Solo CEOs pueden modificar
CREATE POLICY "admin_users_insert" ON admin_users 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'ceo')
  );

CREATE POLICY "admin_users_update" ON admin_users 
  FOR UPDATE 
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'ceo')
  );

CREATE POLICY "admin_users_delete" ON admin_users 
  FOR DELETE 
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'ceo')
  );

-- Función para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es CEO
CREATE OR REPLACE FUNCTION is_ceo(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = check_user_id AND role = 'ceo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TABLA: training_plan_templates - Planes de entrenamiento predefinidos
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Perfil objetivo
  target_levels TEXT[] DEFAULT ARRAY['INTERMEDIO'],
  target_goals TEXT[] DEFAULT ARRAY['HIPERTROFIA'],
  frequency INTEGER NOT NULL DEFAULT 4,
  equipment TEXT[] DEFAULT ARRAY['gym-completo'],
  
  -- Estructura de días
  days JSONB NOT NULL DEFAULT '[]',
  -- Formato: [{dayIndex: 0, name: "Push", focus: "Pecho/Hombros", exercises: [{name, sets, reps, rest}]}]
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_templates_active ON training_plan_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_training_templates_frequency ON training_plan_templates(frequency);

ALTER TABLE training_plan_templates ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer templates activos
CREATE POLICY "training_templates_select" ON training_plan_templates 
  FOR SELECT 
  USING (is_active = true OR auth.uid() IN (SELECT user_id FROM admin_users));

-- Solo admins pueden crear/editar
CREATE POLICY "training_templates_insert" ON training_plan_templates 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "training_templates_update" ON training_plan_templates 
  FOR UPDATE 
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "training_templates_delete" ON training_plan_templates 
  FOR DELETE 
  USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'ceo'));

-- ============================================================================
-- ACTUALIZAR exercises para admin
-- ============================================================================
-- Agregar campos faltantes si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'alternatives') THEN
    ALTER TABLE exercises ADD COLUMN alternatives UUID[] DEFAULT ARRAY[]::UUID[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'muscle_groups') THEN
    ALTER TABLE exercises ADD COLUMN muscle_groups TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'default_image_url') THEN
    ALTER TABLE exercises ADD COLUMN default_image_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'created_by') THEN
    ALTER TABLE exercises ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Política para que admins puedan editar ejercicios
DROP POLICY IF EXISTS "exercises_admin_update" ON exercises;
CREATE POLICY "exercises_admin_update" ON exercises 
  FOR UPDATE 
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

DROP POLICY IF EXISTS "exercises_admin_insert" ON exercises;
CREATE POLICY "exercises_admin_insert" ON exercises 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

DROP POLICY IF EXISTS "exercises_admin_delete" ON exercises;
CREATE POLICY "exercises_admin_delete" ON exercises 
  FOR DELETE 
  USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'ceo'));
