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

console.log('URL:', SUPABASE_URL);
console.log('Key exists:', !!SERVICE_KEY);

if (!SERVICE_KEY) {
  console.log('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definido en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log('\n🔐 Creando políticas RLS públicas para perfiles...\n');

  // Las políticas no se pueden crear via REST API normal
  // Pero con service_role key podemos leer cualquier tabla
  // Verificamos que podemos leer

  const { data: roles, error: rolesErr } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .limit(3);

  console.log('user_roles accesible:', !rolesErr);
  if (rolesErr) console.log('  Error:', rolesErr.message);
  else console.log('  Sample:', JSON.stringify(roles));

  const { data: sports, error: sportsErr } = await supabase
    .from('user_sports')
    .select('user_id, sport_id')
    .limit(3);

  console.log('user_sports accesible:', !sportsErr);
  if (sportsErr) console.log('  Error:', sportsErr.message);
  else console.log('  Sample:', JSON.stringify(sports));

  const { data: sportsList, error: sportsListErr } = await supabase
    .from('sports')
    .select('code, name')
    .limit(3);

  console.log('sports accesible:', !sportsListErr);
  if (sportsListErr) console.log('  Error:', sportsListErr.message);
  else console.log('  Sample:', JSON.stringify(sportsList));

  console.log('\n✅ Con service_role key, las tablas son accesibles.');
  console.log('📝 Las políticas RLS deben ejecutarse en el SQL Editor de Supabase:');
  console.log('   https://supabase.com/dashboard/project/cnrcrhlrteeqsyhlxhbb/sql/new\n');
}

run().catch(console.error);
