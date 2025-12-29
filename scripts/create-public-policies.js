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
  db: { schema: 'public' },
});

async function executeRawSQL(sql) {
  // Usar la API de Supabase para ejecutar SQL raw via fetch
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({}),
  });
  return response;
}

async function run() {
  console.log('🔐 Ejecutando políticas RLS via pg_dump workaround...\n');

  // Estrategia: Crear una función temporal que ejecute el SQL
  // y luego llamarla via RPC

  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.temp_create_policies()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      -- Políticas para user_roles
      DROP POLICY IF EXISTS "public_user_roles_select" ON public.user_roles;
      CREATE POLICY "public_user_roles_select" ON public.user_roles FOR SELECT USING (true);
      
      -- Políticas para user_sports
      DROP POLICY IF EXISTS "public_user_sports_select" ON public.user_sports;
      CREATE POLICY "public_user_sports_select" ON public.user_sports FOR SELECT USING (true);
      
      -- Políticas para sports
      DROP POLICY IF EXISTS "public_sports_select" ON public.sports;
      CREATE POLICY "public_sports_select" ON public.sports FOR SELECT USING (true);
    END;
    $$;
  `;

  // Intentar llamar si ya existe
  console.log('Intentando ejecutar función temp_create_policies...');
  const { data, error } = await supabase.rpc('temp_create_policies');

  if (error) {
    console.log('La función no existe aún. Error:', error.message);
    console.log('\n📝 Por favor ejecuta este SQL en Supabase SQL Editor:\n');
    console.log('https://supabase.com/dashboard/project/cnrcrhlrteeqsyhlxhbb/sql/new\n');
    console.log('---');
    console.log(`
DROP POLICY IF EXISTS "public_user_roles_select" ON public.user_roles;
CREATE POLICY "public_user_roles_select" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_user_sports_select" ON public.user_sports;
CREATE POLICY "public_user_sports_select" ON public.user_sports FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_sports_select" ON public.sports;
CREATE POLICY "public_sports_select" ON public.sports FOR SELECT USING (true);
    `);
    console.log('---\n');
  } else {
    console.log('✅ Políticas creadas exitosamente!');
  }
}

run().catch(console.error);
