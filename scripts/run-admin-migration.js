const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔗 URL:', url);
console.log('🔑 Key exists:', !!key);

if (!url || !key) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runMigration() {
  const sql = fs.readFileSync('supabase/migrations/20260102_admin_roles.sql', 'utf8');

  console.log('🚀 Ejecutando migración admin_roles...\n');

  // Execute via REST API directly using fetch
  const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (!response.ok) {
    // Try executing via SQL directly through postgres
    console.log('exec_sql no disponible, ejecutando statements individuales...\n');

    // Split by semicolons but be careful with DO blocks
    const statements = [];
    let current = '';
    let inDoBlock = false;

    for (const line of sql.split('\n')) {
      if (line.includes('DO $$')) inDoBlock = true;
      if (line.includes('$$ LANGUAGE')) inDoBlock = false;

      current += line + '\n';

      if (line.trim().endsWith(';') && !inDoBlock) {
        if (current.trim().length > 5) {
          statements.push(current.trim());
        }
        current = '';
      }
    }
    if (current.trim().length > 5) {
      statements.push(current.trim());
    }

    console.log(`📝 ${statements.length} statements a ejecutar\n`);

    // Just log them for manual execution
    console.log('⚠️  La API no soporta ejecución SQL directa.');
    console.log('📋 Por favor, ejecuta el siguiente SQL en el Supabase Dashboard:\n');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('\n🔗 URL: https://supabase.com/dashboard/project/cnrcrhlrteeqsyhlxhbb/sql/new');
  } else {
    console.log('✅ Migración ejecutada correctamente');
  }
}

runMigration().catch(console.error);
