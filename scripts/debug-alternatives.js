const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cnrcrhlrteeqsyhlxhbb.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNucmNyaGxydGVlcXN5aGx4aGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxODIyODYsImV4cCI6MjA4MTc1ODI4Nn0.9C2orxQ6xSBIt2Y7ua37rvlvPZBxNNIv0eZoYVRM5tE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🔄 Conectando a Supabase...');

  const { data: allExercises, error } = await supabase
    .from('exercises')
    .select('id, name, alternatives')
    .not('alternatives', 'is', null)
    .limit(100);

  if (error) {
    console.error('❌ Error exercises:', error);
    return;
  }

  const withAlternatives = allExercises.filter(
    (e) => Array.isArray(e.alternatives) && e.alternatives.length > 0
  );

  console.log(
    `📊 Recibidos ${allExercises.length}, encontrados ${withAlternatives.length} con array de alternativas.`
  );

  if (withAlternatives.length === 0) {
    console.log('⚠️ Ningún ejercicio tiene alternativas definidas en la muestra.');
    return;
  }

  // Check all of them
  let totalMissing = 0;
  for (const target of withAlternatives) {
    const altIds = target.alternatives;
    const { data: details } = await supabase.from('exercises').select('id, name').in('id', altIds);

    const foundIds = details ? details.map((d) => d.id) : [];
    const missing = altIds.filter((id) => !foundIds.includes(id));

    if (missing.length > 0) {
      console.warn(`⚠️ Ejercicio: ${target.name} tiene ${missing.length} alternativas huérfanas.`);
      totalMissing += missing.length;
    }
  }

  if (totalMissing === 0) {
    console.log('✅ Verificación completada: 0 huérfanos encontrados en la muestra.');
  }
}

run();
