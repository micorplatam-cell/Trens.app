const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Cargar .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function executeMigration() {
  console.log('🚀 Ejecutando migración del Sistema de Deportes...');
  console.log('URL:', SUPABASE_URL);
  console.log('');

  // Leer SQL
  const sqlPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20241224_sports_system.sql'
  );
  const fullSql = fs.readFileSync(sqlPath, 'utf8');

  // Dividir en statements individuales (por seguridad)
  // Primero ejecutamos las partes críticas una por una

  const statements = [
    // 1. Crear tabla sports
    `CREATE TABLE IF NOT EXISTS sports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT NOT NULL,
      color_primary TEXT DEFAULT '#DC2626',
      color_secondary TEXT,
      tab_4_name TEXT NOT NULL,
      tab_4_icon TEXT NOT NULL,
      tab_5_name TEXT NOT NULL,
      tab_5_icon TEXT NOT NULL,
      inventory_categories JSONB DEFAULT '[]',
      available_tools JSONB DEFAULT '[]',
      profile_fields JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // 2. Insert GYM
    `INSERT INTO sports (code, name, description, icon, color_primary, tab_4_name, tab_4_icon, tab_5_name, tab_5_icon, inventory_categories, available_tools, profile_fields, display_order) 
    VALUES ('GYM', 'Gym & Fitness', 'Entrenamiento de fuerza, hipertrofia y acondicionamiento físico', 'Dumbbell', '#DC2626', 'GYM', 'Dumbbell', 'PLAN', 'Utensils',
    '[{"code": "SUPPLEMENTS", "name": "Suplementos", "icon": "Pill"},{"code": "EQUIPMENT", "name": "Equipamiento", "icon": "Dumbbell"},{"code": "WEARABLES", "name": "Wearables", "icon": "Watch"}]'::jsonb,
    '[{"code": "ROUTINE_GENERATOR", "name": "Generador de Rutinas"},{"code": "NUTRITION_CALC", "name": "Calculadora de Macros"},{"code": "PR_TRACKER", "name": "Tracker de PRs"}]'::jsonb,
    '[{"code": "goal", "name": "Objetivo", "type": "select", "options": ["HIPERTROFIA", "FUERZA", "DEFINICION", "RECOMPOSICION"]}]'::jsonb, 1)
    ON CONFLICT (code) DO NOTHING`,

    // 3. Insert MOTO
    `INSERT INTO sports (code, name, description, icon, color_primary, color_secondary, tab_4_name, tab_4_icon, tab_5_name, tab_5_icon, display_order) 
    VALUES ('MOTO', 'Motociclismo', 'Motocross, Enduro, Superbike y Track Days', 'Bike', '#F97316', '#EA580C', 'GARAJE', 'Warehouse', 'RACE', 'Flag', 2)
    ON CONFLICT (code) DO NOTHING`,

    // 4. Insert AUTO
    `INSERT INTO sports (code, name, description, icon, color_primary, color_secondary, tab_4_name, tab_4_icon, tab_5_name, tab_5_icon, display_order) 
    VALUES ('AUTO', 'Automovilismo', 'Drift, Track Days, Time Attack y cultura automotriz', 'Car', '#EAB308', '#CA8A04', 'GARAJE', 'Warehouse', 'RACE', 'Flag', 3)
    ON CONFLICT (code) DO NOTHING`,

    // 5. Insert SURF
    `INSERT INTO sports (code, name, description, icon, color_primary, color_secondary, tab_4_name, tab_4_icon, tab_5_name, tab_5_icon, display_order) 
    VALUES ('SURF', 'Surf', 'Shortboard, Longboard, Bodyboard y deportes de olas', 'Waves', '#0EA5E9', '#0284C7', 'TABLA', 'Sailboat', 'SPOT', 'Waves', 4)
    ON CONFLICT (code) DO NOTHING`,

    // 6. Crear user_sports
    `CREATE TABLE IF NOT EXISTS user_sports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT true,
      is_primary BOOLEAN DEFAULT false,
      custom_config JSONB DEFAULT '{}',
      personalization_mode TEXT DEFAULT 'HYBRID' CHECK (personalization_mode IN ('MANUAL', 'AI', 'HYBRID')),
      sport_profile JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, sport_id)
    )`,

    // 7. Crear inventory_items
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      sport_id UUID NOT NULL REFERENCES sports(id),
      category_code TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      year INTEGER,
      photo_url TEXT,
      attributes JSONB DEFAULT '{}',
      is_primary BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'ACTIVE',
      purchase_date DATE,
      last_service_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // 8. Crear maintenance_logs
    `CREATE TABLE IF NOT EXISTS maintenance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      at_km INTEGER,
      at_hours DECIMAL(10,1),
      cost DECIMAL(10,2),
      currency TEXT DEFAULT 'PEN',
      next_due_km INTEGER,
      next_due_hours DECIMAL(10,1),
      next_due_date DATE,
      photo_urls TEXT[],
      receipt_url TEXT,
      performed_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // 9. Crear sport_events
    `CREATE TABLE IF NOT EXISTS sport_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      sport_id UUID NOT NULL REFERENCES sports(id),
      name TEXT NOT NULL,
      location TEXT,
      venue TEXT,
      event_date DATE NOT NULL,
      event_end_date DATE,
      event_type TEXT,
      status TEXT DEFAULT 'UPCOMING',
      items_used UUID[],
      results JSONB DEFAULT '{}',
      checklist JSONB DEFAULT '[]',
      photo_urls TEXT[],
      video_urls TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // 10. Crear surf_sessions
    `CREATE TABLE IF NOT EXISTS surf_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      spot_name TEXT NOT NULL,
      spot_lat DECIMAL(10,7),
      spot_lng DECIMAL(10,7),
      wave_size_ft DECIMAL(3,1),
      wave_period_s INTEGER,
      wind_direction TEXT,
      wind_speed_kts INTEGER,
      tide TEXT,
      water_temp_c INTEGER,
      board_id UUID REFERENCES inventory_items(id),
      wetsuit_id UUID REFERENCES inventory_items(id),
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ,
      duration_min INTEGER,
      wave_quality INTEGER CHECK (wave_quality BETWEEN 1 AND 5),
      session_rating INTEGER CHECK (session_rating BETWEEN 1 AND 5),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // 11. RLS para sports
    `ALTER TABLE sports ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Sports are viewable by everyone" ON sports`,
    `CREATE POLICY "Sports are viewable by everyone" ON sports FOR SELECT USING (true)`,

    // 12. RLS para user_sports
    `ALTER TABLE user_sports ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Users can view own sports" ON user_sports`,
    `CREATE POLICY "Users can view own sports" ON user_sports FOR SELECT USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can insert own sports" ON user_sports`,
    `CREATE POLICY "Users can insert own sports" ON user_sports FOR INSERT WITH CHECK (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can update own sports" ON user_sports`,
    `CREATE POLICY "Users can update own sports" ON user_sports FOR UPDATE USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can delete own sports" ON user_sports`,
    `CREATE POLICY "Users can delete own sports" ON user_sports FOR DELETE USING (auth.uid() = user_id)`,

    // 13. RLS para inventory_items
    `ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Users can view own inventory" ON inventory_items`,
    `CREATE POLICY "Users can view own inventory" ON inventory_items FOR SELECT USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can insert own inventory" ON inventory_items`,
    `CREATE POLICY "Users can insert own inventory" ON inventory_items FOR INSERT WITH CHECK (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can update own inventory" ON inventory_items`,
    `CREATE POLICY "Users can update own inventory" ON inventory_items FOR UPDATE USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can delete own inventory" ON inventory_items`,
    `CREATE POLICY "Users can delete own inventory" ON inventory_items FOR DELETE USING (auth.uid() = user_id)`,

    // 14. RLS para maintenance_logs
    `ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Users can view own maintenance" ON maintenance_logs`,
    `CREATE POLICY "Users can view own maintenance" ON maintenance_logs FOR SELECT USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can insert own maintenance" ON maintenance_logs`,
    `CREATE POLICY "Users can insert own maintenance" ON maintenance_logs FOR INSERT WITH CHECK (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can update own maintenance" ON maintenance_logs`,
    `CREATE POLICY "Users can update own maintenance" ON maintenance_logs FOR UPDATE USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can delete own maintenance" ON maintenance_logs`,
    `CREATE POLICY "Users can delete own maintenance" ON maintenance_logs FOR DELETE USING (auth.uid() = user_id)`,

    // 15. RLS para sport_events
    `ALTER TABLE sport_events ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Users can view own events" ON sport_events`,
    `CREATE POLICY "Users can view own events" ON sport_events FOR SELECT USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can insert own events" ON sport_events`,
    `CREATE POLICY "Users can insert own events" ON sport_events FOR INSERT WITH CHECK (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can update own events" ON sport_events`,
    `CREATE POLICY "Users can update own events" ON sport_events FOR UPDATE USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can delete own events" ON sport_events`,
    `CREATE POLICY "Users can delete own events" ON sport_events FOR DELETE USING (auth.uid() = user_id)`,

    // 16. RLS para surf_sessions
    `ALTER TABLE surf_sessions ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Users can view own sessions" ON surf_sessions`,
    `CREATE POLICY "Users can view own sessions" ON surf_sessions FOR SELECT USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can insert own sessions" ON surf_sessions`,
    `CREATE POLICY "Users can insert own sessions" ON surf_sessions FOR INSERT WITH CHECK (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can update own sessions" ON surf_sessions`,
    `CREATE POLICY "Users can update own sessions" ON surf_sessions FOR UPDATE USING (auth.uid() = user_id)`,
    `DROP POLICY IF EXISTS "Users can delete own sessions" ON surf_sessions`,
    `CREATE POLICY "Users can delete own sessions" ON surf_sessions FOR DELETE USING (auth.uid() = user_id)`,
  ];

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    const shortSql = sql.substring(0, 60).replace(/\n/g, ' ') + '...';

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        // Si no existe exec_sql, intentamos con query directa
        throw error;
      }

      console.log(`✅ [${i + 1}/${statements.length}] ${shortSql}`);
      success++;
    } catch (err) {
      // Intentar via fetch directo al endpoint de SQL
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql_query: sql }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        console.log(`✅ [${i + 1}/${statements.length}] ${shortSql}`);
        success++;
      } catch (e2) {
        console.log(`❌ [${i + 1}/${statements.length}] ${shortSql}`);
        console.log(`   Error: ${e2.message?.substring(0, 100) || e2}`);
        failed++;
      }
    }
  }

  console.log('');
  console.log(`📊 Resultado: ${success} exitosos, ${failed} fallidos`);

  // Verificar final
  const { data: sports, error: checkError } = await supabase
    .from('sports')
    .select('code, name')
    .order('display_order');

  if (sports && sports.length > 0) {
    console.log('');
    console.log('🎉 MIGRACIÓN EXITOSA! Deportes creados:');
    sports.forEach((s) => console.log(`   - ${s.code}: ${s.name}`));
  } else {
    console.log('');
    console.log('⚠️ No se pudieron verificar los deportes.');
    console.log('   Por favor ejecuta el SQL manualmente en:');
    console.log('   https://supabase.com/dashboard/project/cnrcrhlrteeqsyhlxhbb/sql/new');
  }
}

executeMigration().catch(console.error);
