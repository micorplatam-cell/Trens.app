#!/usr/bin/env node
/**
 * Script para actualizar ejercicios de hombros dividiendo en:
 * - HOMBRO FRONTAL (deltoides anterior)
 * - HOMBRO LATERAL (deltoides medio)
 * - HOMBRO POSTERIOR (deltoides posterior)
 *
 * Ejecutar con: node scripts/update-shoulder-exercises.js
 */

const { createClient } = require('@supabase/supabase-js');

// Leer credenciales del archivo .env o variables de entorno
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Falta EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeo de ejercicios existentes a la nueva clasificación
const shoulderClassification = {
  // HOMBRO FRONTAL - Press, elevaciones frontales
  'Press Militar con Barra': 'HOMBRO FRONTAL',
  'Press Militar': 'HOMBRO FRONTAL',
  'Press de Hombros con Mancuernas': 'HOMBRO FRONTAL',
  'Press Arnold': 'HOMBRO FRONTAL',
  'Elevación Frontal con Mancuernas': 'HOMBRO FRONTAL',
  'Elevación Frontal con Barra': 'HOMBRO FRONTAL',
  'Elevación Frontal con Disco': 'HOMBRO FRONTAL',
  'Press de Hombros en Máquina': 'HOMBRO FRONTAL',
  'Press Militar en Máquina Smith': 'HOMBRO FRONTAL',

  // HOMBRO LATERAL - Elevaciones laterales
  'Elevación Lateral con Mancuernas': 'HOMBRO LATERAL',
  'Elevación Lateral en Polea': 'HOMBRO LATERAL',
  'Elevación Lateral en Máquina': 'HOMBRO LATERAL',
  'Elevación Lateral Inclinado': 'HOMBRO LATERAL',
  'Remo al Mentón': 'HOMBRO LATERAL',
  'Remo al Mentón con Barra': 'HOMBRO LATERAL',
  'Remo Alto con Mancuernas': 'HOMBRO LATERAL',

  // HOMBRO POSTERIOR - Pájaros, face pulls
  'Pájaro con Mancuernas': 'HOMBRO POSTERIOR',
  'Pájaro en Polea': 'HOMBRO POSTERIOR',
  'Pájaro en Máquina (Pec Deck Inverso)': 'HOMBRO POSTERIOR',
  'Face Pull': 'HOMBRO POSTERIOR',
  'Face Pull en Polea': 'HOMBRO POSTERIOR',
  'Cruces Inversos en Polea': 'HOMBRO POSTERIOR',
  'Elevación Posterior en Banco Inclinado': 'HOMBRO POSTERIOR',
};

// Ejercicios NUEVOS a agregar
const newShoulderExercises = [
  // HOMBRO FRONTAL
  {
    name: 'Press Militar Sentado con Mancuernas',
    muscle_group: 'HOMBRO FRONTAL',
    secondary_muscles: ['TRÍCEPS', 'HOMBRO LATERAL'],
    equipment: ['mancuernas'],
    description:
      'Press de hombros sentado con mancuernas, excelente para desarrollo del deltoides anterior.',
  },
  {
    name: 'Press de Hombros en Landmine',
    muscle_group: 'HOMBRO FRONTAL',
    secondary_muscles: ['CORE', 'TRÍCEPS'],
    equipment: ['barra'],
    description: 'Press usando landmine attachment, reduce estrés en hombros.',
  },
  {
    name: 'Elevación Frontal Alternada',
    muscle_group: 'HOMBRO FRONTAL',
    secondary_muscles: ['CORE'],
    equipment: ['mancuernas'],
    description: 'Elevación frontal alternando brazos para máximo enfoque.',
  },

  // HOMBRO LATERAL
  {
    name: 'Elevación Lateral Sentado',
    muscle_group: 'HOMBRO LATERAL',
    secondary_muscles: ['TRAPECIOS'],
    equipment: ['mancuernas'],
    description: 'Elevación lateral sentado elimina impulso y aísla mejor el deltoides medio.',
  },
  {
    name: 'Elevación Lateral con Agarre Neutro',
    muscle_group: 'HOMBRO LATERAL',
    secondary_muscles: ['TRAPECIOS'],
    equipment: ['mancuernas'],
    description: 'Variante con pulgares arriba para diferente activación.',
  },
  {
    name: 'W-Raise (Elevación en W)',
    muscle_group: 'HOMBRO LATERAL',
    secondary_muscles: ['HOMBRO POSTERIOR', 'TRAPECIOS'],
    equipment: ['mancuernas'],
    description: 'Elevación formando una W, trabaja lateral y posterior.',
  },
  {
    name: 'Remo al Mentón con Agarre Amplio',
    muscle_group: 'HOMBRO LATERAL',
    secondary_muscles: ['TRAPECIOS', 'BÍCEPS'],
    equipment: ['barra'],
    description: 'Remo alto con agarre amplio enfocado en deltoides lateral.',
  },

  // HOMBRO POSTERIOR
  {
    name: 'Pájaro en Banco Inclinado',
    muscle_group: 'HOMBRO POSTERIOR',
    secondary_muscles: ['TRAPECIOS', 'ESPALDA'],
    equipment: ['mancuernas'],
    description: 'Pájaro apoyado en banco inclinado para mejor aislamiento.',
  },
  {
    name: 'Face Pull con Cuerda',
    muscle_group: 'HOMBRO POSTERIOR',
    secondary_muscles: ['TRAPECIOS', 'HOMBRO LATERAL'],
    equipment: ['polea'],
    description: 'Face pull clásico con cuerda, esencial para salud del hombro.',
  },
  {
    name: 'Cruces Posteriores en Polea Baja',
    muscle_group: 'HOMBRO POSTERIOR',
    secondary_muscles: ['TRAPECIOS'],
    equipment: ['polea'],
    description: 'Cruces inversos desde polea baja para diferente ángulo.',
  },
  {
    name: 'Pájaro de Pie con Mancuernas',
    muscle_group: 'HOMBRO POSTERIOR',
    secondary_muscles: ['CORE', 'ESPALDA'],
    equipment: ['mancuernas'],
    description: 'Pájaro de pie inclinado, requiere estabilización del core.',
  },
  {
    name: 'Pull-Apart con Banda',
    muscle_group: 'HOMBRO POSTERIOR',
    secondary_muscles: ['TRAPECIOS'],
    equipment: ['bandas'],
    description: 'Ejercicio de rehabilitación y activación con banda elástica.',
  },
];

async function main() {
  console.log('🏋️ Actualizando ejercicios de hombros...\n');

  // 1. Obtener ejercicios actuales de HOMBROS
  const { data: currentExercises, error: fetchError } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, secondary_muscles')
    .eq('muscle_group', 'HOMBROS')
    .order('name');

  if (fetchError) {
    console.error('❌ Error obteniendo ejercicios:', fetchError);
    return;
  }

  console.log(
    `📊 Ejercicios actuales con muscle_group="HOMBROS": ${currentExercises?.length || 0}`
  );

  // 2. Actualizar ejercicios existentes
  let updated = 0;
  for (const exercise of currentExercises || []) {
    const newMuscleGroup = shoulderClassification[exercise.name];

    if (newMuscleGroup) {
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ muscle_group: newMuscleGroup })
        .eq('id', exercise.id);

      if (updateError) {
        console.error(`❌ Error actualizando "${exercise.name}":`, updateError.message);
      } else {
        console.log(`✅ ${exercise.name}: HOMBROS → ${newMuscleGroup}`);
        updated++;
      }
    } else {
      // Si no hay mapeo definido, clasificar por nombre
      let autoGroup = 'HOMBRO FRONTAL'; // default
      const nameLower = exercise.name.toLowerCase();

      if (
        nameLower.includes('lateral') ||
        nameLower.includes('mentón') ||
        nameLower.includes('remo alto')
      ) {
        autoGroup = 'HOMBRO LATERAL';
      } else if (
        nameLower.includes('posterior') ||
        nameLower.includes('pájaro') ||
        nameLower.includes('face') ||
        nameLower.includes('inverso')
      ) {
        autoGroup = 'HOMBRO POSTERIOR';
      } else if (nameLower.includes('frontal')) {
        autoGroup = 'HOMBRO FRONTAL';
      }

      const { error: updateError } = await supabase
        .from('exercises')
        .update({ muscle_group: autoGroup })
        .eq('id', exercise.id);

      if (updateError) {
        console.error(`❌ Error auto-clasificando "${exercise.name}":`, updateError.message);
      } else {
        console.log(`🔄 ${exercise.name}: HOMBROS → ${autoGroup} (auto)`);
        updated++;
      }
    }
  }

  console.log(`\n📝 Actualizados: ${updated} ejercicios existentes\n`);

  // 3. También actualizar secondary_muscles que contengan "HOMBROS"
  const { data: withSecondary, error: secError } = await supabase
    .from('exercises')
    .select('id, name, secondary_muscles')
    .contains('secondary_muscles', ['HOMBROS']);

  if (!secError && withSecondary?.length > 0) {
    console.log(`🔍 Ejercicios con "HOMBROS" en secundarios: ${withSecondary.length}`);

    for (const ex of withSecondary) {
      // Reemplazar HOMBROS por los 3 tipos según el ejercicio
      const newSecondary = ex.secondary_muscles.map((m) => {
        if (m === 'HOMBROS') {
          // Para press de pecho → frontal, para remos → posterior
          const nameLower = ex.name.toLowerCase();
          if (nameLower.includes('press') || nameLower.includes('fondos')) {
            return 'HOMBRO FRONTAL';
          } else if (nameLower.includes('remo') || nameLower.includes('dominada')) {
            return 'HOMBRO POSTERIOR';
          }
          return 'HOMBRO FRONTAL'; // default
        }
        return m;
      });

      const { error: upErr } = await supabase
        .from('exercises')
        .update({ secondary_muscles: newSecondary })
        .eq('id', ex.id);

      if (!upErr) {
        console.log(`  ✅ ${ex.name}: secundarios actualizados`);
      }
    }
  }

  // 4. Agregar nuevos ejercicios
  console.log('\n➕ Agregando nuevos ejercicios de hombros...\n');

  let added = 0;
  for (const newEx of newShoulderExercises) {
    // Verificar si ya existe
    const { data: exists } = await supabase
      .from('exercises')
      .select('id')
      .eq('name', newEx.name)
      .single();

    if (exists) {
      console.log(`⏭️  "${newEx.name}" ya existe, omitiendo...`);
      continue;
    }

    const { error: insertError } = await supabase.from('exercises').insert({
      name: newEx.name,
      muscle_group: newEx.muscle_group,
      secondary_muscles: newEx.secondary_muscles,
      equipment: newEx.equipment,
      description: newEx.description,
    });

    if (insertError) {
      console.error(`❌ Error insertando "${newEx.name}":`, insertError.message);
    } else {
      console.log(`✅ NUEVO: ${newEx.name} (${newEx.muscle_group})`);
      added++;
    }
  }

  console.log(`\n🎉 Resumen:`);
  console.log(`   - Actualizados: ${updated}`);
  console.log(`   - Nuevos: ${added}`);

  // 5. Mostrar distribución final
  const { data: final } = await supabase
    .from('exercises')
    .select('muscle_group')
    .in('muscle_group', ['HOMBRO FRONTAL', 'HOMBRO LATERAL', 'HOMBRO POSTERIOR']);

  if (final) {
    const counts = {
      'HOMBRO FRONTAL': 0,
      'HOMBRO LATERAL': 0,
      'HOMBRO POSTERIOR': 0,
    };
    final.forEach((e) => {
      if (counts[e.muscle_group] !== undefined) counts[e.muscle_group]++;
    });

    console.log('\n📊 Distribución final:');
    console.log(`   - HOMBRO FRONTAL: ${counts['HOMBRO FRONTAL']}`);
    console.log(`   - HOMBRO LATERAL: ${counts['HOMBRO LATERAL']}`);
    console.log(`   - HOMBRO POSTERIOR: ${counts['HOMBRO POSTERIOR']}`);
  }
}

main().catch(console.error);
