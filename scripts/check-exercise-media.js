const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' },
});

async function checkAndMigrate() {
  console.log('🔍 Verificando tabla user_exercise_media...');

  // Verificar si la tabla ya existe
  const { data, error } = await supabase.from('user_exercise_media').select('id').limit(1);

  if (!error) {
    console.log('✅ Tabla user_exercise_media ya existe');

    // Mostrar cuántos registros hay
    const { count } = await supabase
      .from('user_exercise_media')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Registros actuales: ${count || 0}`);
    return;
  }

  if (error.code === '42P01') {
    console.log('⚠️ Tabla no existe.');
    console.log('');
    console.log('📋 Para crear la tabla, ejecuta el siguiente SQL en Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/cnrcrhlrteeqsyhlxhbb/sql/new');
    console.log('');
    console.log('--- COPIAR DESDE AQUÍ ---');
    const sqlPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20260102_user_exercise_media.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(sql);
    console.log('--- HASTA AQUÍ ---');
  } else {
    console.log('Error desconocido:', error);
  }
}

checkAndMigrate().catch(console.error);
