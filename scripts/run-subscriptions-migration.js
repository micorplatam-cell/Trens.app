// ============================================================================
// EJECUTAR MIGRACIÓN DE SUBSCRIPTIONS
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://cnrcrhlrteeqsyhlxhbb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.log('Ejecuta: export SUPABASE_SERVICE_ROLE_KEY="tu_key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Ejecutando migración de subscriptions...\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/20260106_subscriptions.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Dividir por statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        console.error('❌ Error en statement:', statement.substring(0, 50) + '...');
        console.error(error.message);
      } else {
        console.log('✅ Ejecutado:', statement.substring(0, 50) + '...');
      }
    } catch (err) {
      console.error('❌ Error ejecutando:', err);
    }
  }

  console.log('\n✅ Migración completada');
}

runMigration().catch(console.error);
