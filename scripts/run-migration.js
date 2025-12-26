// Script para ejecutar migraciones en Supabase
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno manualmente
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runMigration() {
  console.log('🚀 Conectando a Supabase...');
  console.log('URL:', SUPABASE_URL);

  // Leer el archivo de migración
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20241224_sports_system.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migración cargada:', migrationPath);
  console.log('📏 Tamaño:', sql.length, 'caracteres');

  try {
    // Ejecutar via Supabase REST API (pg_query)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({}),
    });

    // Verificar si la tabla sports ya existe
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/sports?select=code&limit=1`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    const checkResult = await checkResponse.text();
    console.log('📊 Check sports table:', checkResponse.status, checkResult);

    if (checkResponse.status === 200) {
      const sports = JSON.parse(checkResult);
      if (sports.length > 0) {
        console.log('✅ La migración ya fue ejecutada. Sports encontrados:', sports);
        return;
      }
    }

    console.log('⚠️ La tabla sports no existe o está vacía.');
    console.log('');
    console.log('👉 Para ejecutar la migración, ve a:');
    console.log(
      `   ${SUPABASE_URL.replace('.supabase.co', '')}/project/cnrcrhlrteeqsyhlxhbb/sql/new`
    );
    console.log('');
    console.log('   Y pega el contenido de:');
    console.log('   supabase/migrations/20241224_sports_system.sql');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
