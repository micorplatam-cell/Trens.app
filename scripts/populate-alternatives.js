/**
 * 🏋️ SCRIPT: Poblar alternativas para todos los ejercicios
 *
 * LÓGICA:
 * - Cada ejercicio tendrá 3 alternativas
 * - Las alternativas son del MISMO grupo muscular
 * - Prioriza alternativas con EQUIPAMIENTO DIFERENTE (para cuando la máquina esté ocupada)
 * - No se incluye a sí mismo como alternativa
 *
 * USO:
 *   node scripts/populate-alternatives.js --dry-run   (solo muestra qué haría)
 *   node scripts/populate-alternatives.js --execute   (ejecuta los cambios)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!DRY_RUN && !EXECUTE) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🏋️  SCRIPT: POBLAR ALTERNATIVAS PARA EJERCICIOS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('USO:');
  console.log('  node scripts/populate-alternatives.js --dry-run   → Solo muestra qué haría');
  console.log('  node scripts/populate-alternatives.js --execute   → Ejecuta los cambios');
  console.log('');
  process.exit(0);
}

/**
 * Normaliza el equipamiento para comparación
 */
function normalizeEquipment(equipment) {
  if (!equipment) return [];
  if (!Array.isArray(equipment)) return [String(equipment).toLowerCase()];
  return equipment.map((e) => String(e).toLowerCase().trim());
}

/**
 * Calcula qué tan diferente es el equipamiento entre dos ejercicios
 * Retorna un número: mayor = más diferente (mejor para alternativa)
 */
function equipmentDifference(equip1, equip2) {
  const set1 = new Set(normalizeEquipment(equip1));
  const set2 = new Set(normalizeEquipment(equip2));

  // Contar elementos que NO están en común
  let different = 0;
  set1.forEach((e) => {
    if (!set2.has(e)) different++;
  });
  set2.forEach((e) => {
    if (!set1.has(e)) different++;
  });

  // Bonus si NO comparten ningún equipo
  const intersection = [...set1].filter((e) => set2.has(e));
  if (intersection.length === 0) {
    different += 10; // Gran bonus por no compartir nada
  }

  return different;
}

/**
 * Selecciona las 3 mejores alternativas para un ejercicio
 */
function selectBestAlternatives(exercise, allInGroup) {
  // Filtrar: no incluirse a sí mismo
  const candidates = allInGroup.filter((e) => e.id !== exercise.id);

  if (candidates.length === 0) {
    return [];
  }

  // Ordenar por diferencia de equipamiento (mayor diferencia primero)
  candidates.sort((a, b) => {
    const diffA = equipmentDifference(exercise.equipment, a.equipment);
    const diffB = equipmentDifference(exercise.equipment, b.equipment);
    return diffB - diffA; // Mayor diferencia primero
  });

  // Tomar los 3 primeros (o menos si no hay suficientes)
  return candidates.slice(0, 3).map((e) => e.id);
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🏋️  POBLAR ALTERNATIVAS PARA EJERCICIOS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(
    '📋 MODO:',
    DRY_RUN ? '🔍 DRY-RUN (solo muestra, no modifica)' : '⚡ EJECUTAR (modificará la DB)'
  );
  console.log('');

  // Cargar todos los ejercicios
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, equipment, alternatives')
    .order('muscle_group')
    .order('name');

  if (error) {
    console.error('❌ Error cargando ejercicios:', error.message);
    process.exit(1);
  }

  console.log('📊 Total de ejercicios en la base de datos:', exercises.length);

  // Agrupar por grupo muscular
  const byMuscle = {};
  exercises.forEach((e) => {
    const mg = e.muscle_group || 'SIN_GRUPO';
    if (!byMuscle[mg]) byMuscle[mg] = [];
    byMuscle[mg].push(e);
  });

  console.log('📊 Grupos musculares:', Object.keys(byMuscle).length);
  console.log('');

  // Estadísticas antes
  const yaConAlternativas = exercises.filter((e) => e.alternatives && e.alternatives.length > 0);
  const sinAlternativas = exercises.filter((e) => !e.alternatives || e.alternatives.length === 0);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📈 ESTADO ACTUAL:');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   Ejercicios CON alternativas:', yaConAlternativas.length);
  console.log('   Ejercicios SIN alternativas:', sinAlternativas.length);
  console.log('');

  if (yaConAlternativas.length > 0) {
    console.log('   📌 Ejercicios que ya tienen alternativas (se sobrescribirán):');
    yaConAlternativas.forEach((e) => {
      console.log(`      - ${e.name}: ${e.alternatives.length} alternativas`);
    });
    console.log('');
  }

  // Preparar actualizaciones
  const updates = [];
  const details = [];

  for (const [grupo, ejerciciosGrupo] of Object.entries(byMuscle)) {
    for (const exercise of ejerciciosGrupo) {
      const newAlternatives = selectBestAlternatives(exercise, ejerciciosGrupo);

      // Obtener nombres de las alternativas para el log
      const altNames = newAlternatives.map((altId) => {
        const found = exercises.find((e) => e.id === altId);
        return found ? found.name : altId.substring(0, 8);
      });

      updates.push({
        id: exercise.id,
        name: exercise.name,
        muscle_group: grupo,
        equipment: normalizeEquipment(exercise.equipment).join(', '),
        newAlternatives,
        altNames,
        previousCount: exercise.alternatives?.length || 0,
      });

      details.push({
        id: exercise.id,
        alternatives: newAlternatives,
      });
    }
  }

  // Mostrar plan de actualización
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📋 PLAN DE ACTUALIZACIÓN:');
  console.log('═══════════════════════════════════════════════════════════════════');

  let currentGroup = '';
  for (const update of updates) {
    if (update.muscle_group !== currentGroup) {
      currentGroup = update.muscle_group;
      console.log('');
      console.log(`🏋️ ${currentGroup}:`);
    }

    const status =
      update.newAlternatives.length === 3 ? '✅' : update.newAlternatives.length > 0 ? '⚠️' : '❌';

    console.log(`   ${status} ${update.name}`);
    console.log(`      Equipo: ${update.equipment || 'N/A'}`);
    console.log(`      Alternativas (${update.newAlternatives.length}):`);
    update.altNames.forEach((name, i) => {
      const altExercise = exercises.find((e) => e.id === update.newAlternatives[i]);
      const altEquip = altExercise ? normalizeEquipment(altExercise.equipment).join(', ') : 'N/A';
      console.log(`         ${i + 1}. ${name} [${altEquip}]`);
    });
  }

  // Resumen
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN:');
  console.log('═══════════════════════════════════════════════════════════════════');

  const con3 = updates.filter((u) => u.newAlternatives.length === 3).length;
  const con2 = updates.filter((u) => u.newAlternatives.length === 2).length;
  const con1 = updates.filter((u) => u.newAlternatives.length === 1).length;
  const con0 = updates.filter((u) => u.newAlternatives.length === 0).length;

  console.log(`   Ejercicios con 3 alternativas: ${con3}`);
  console.log(`   Ejercicios con 2 alternativas: ${con2}`);
  console.log(`   Ejercicios con 1 alternativa:  ${con1}`);
  console.log(`   Ejercicios con 0 alternativas: ${con0}`);
  console.log('');

  if (con0 > 0) {
    console.log('   ⚠️  Ejercicios sin alternativas (grupo muscular muy pequeño):');
    updates
      .filter((u) => u.newAlternatives.length === 0)
      .forEach((u) => {
        console.log(`      - ${u.name} (${u.muscle_group})`);
      });
    console.log('');
  }

  // Ejecutar o mostrar mensaje
  if (DRY_RUN) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 DRY-RUN COMPLETADO - No se realizaron cambios');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Para ejecutar los cambios, usa:');
    console.log('  node scripts/populate-alternatives.js --execute');
    console.log('');
  } else if (EXECUTE) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('⚡ EJECUTANDO ACTUALIZACIONES EN LA BASE DE DATOS...');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

    let success = 0;
    let failed = 0;

    for (const item of details) {
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ alternatives: item.alternatives })
        .eq('id', item.id);

      if (updateError) {
        console.error(`   ❌ Error actualizando ${item.id}:`, updateError.message);
        failed++;
      } else {
        success++;
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('✅ ACTUALIZACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`   Exitosos: ${success}`);
    console.log(`   Fallidos: ${failed}`);
    console.log('');
  }
}

main().catch(console.error);
