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

const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verificando Supabase...');
console.log('URL:', SUPABASE_URL);

async function checkAndMigrate() {
  // 1. Verificar si tabla sports existe
  const checkUrl = `${SUPABASE_URL}/rest/v1/sports?select=code,name&limit=10`;

  try {
    const response = await fetch(checkUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);

    if (response.status === 200) {
      const data = JSON.parse(text);
      if (data.length > 0) {
        console.log('');
        console.log('✅ MIGRACIÓN YA EJECUTADA');
        console.log('Deportes encontrados:', data.map((s) => s.code).join(', '));
        return;
      }
    }

    if (response.status === 404 || text.includes('does not exist')) {
      console.log('');
      console.log('⚠️  TABLA SPORTS NO EXISTE');
      console.log('');
      console.log('Ejecuta la migración manualmente:');
      console.log('1. Abre: https://supabase.com/dashboard/project/cnrcrhlrteeqsyhlxhbb/sql/new');
      console.log('2. Pega el contenido de: supabase/migrations/20241224_sports_system.sql');
      console.log('3. Click en RUN');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkAndMigrate();
