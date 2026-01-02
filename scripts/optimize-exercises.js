/**
 * TRENS - Script de Optimización Profesional de Ejercicios
 *
 * Este script:
 * 1. Mejora nombres para ser más específicos (ej: "Press Banca" → "Press de Banca con Barra")
 * 2. Asigna exactamente 3 alternativas por ejercicio (mismo músculo, diferente equipo)
 * 3. Agrega ejercicios faltantes para un catálogo completo
 * 4. Actualiza descripciones más detalladas
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// EJERCICIOS NUEVOS A AGREGAR
// =============================================================================
const NEW_EXERCISES = [
  // PECHO - Nuevos
  {
    name: 'Press de Pecho en Máquina',
    muscle_group: 'PECHO',
    secondary_muscles: ['TRÍCEPS', 'HOMBROS'],
    equipment: ['MÁQUINA'],
    description: 'Press guiado en máquina para aislamiento seguro del pecho',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  },
  {
    name: 'Press Inclinado en Máquina',
    muscle_group: 'PECHO',
    secondary_muscles: ['TRÍCEPS', 'HOMBROS'],
    equipment: ['MÁQUINA'],
    description: 'Press inclinado guiado para pecho superior',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  },
  {
    name: 'Aperturas en Máquina (Pec Deck)',
    muscle_group: 'PECHO',
    secondary_muscles: [],
    equipment: ['MÁQUINA PEC DECK'],
    description: 'Aislamiento de pecho con movimiento guiado',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  },
  {
    name: 'Cruces en Polea Alta',
    muscle_group: 'PECHO',
    secondary_muscles: [],
    equipment: ['POLEA ALTA'],
    description: 'Cruces desde arriba para pecho inferior',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  },
  {
    name: 'Cruces en Polea Baja',
    muscle_group: 'PECHO',
    secondary_muscles: [],
    equipment: ['POLEA BAJA'],
    description: 'Cruces desde abajo para pecho superior',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  },

  // ESPALDA - Nuevos
  {
    name: 'Jalón con Agarre Supino',
    muscle_group: 'ESPALDA',
    secondary_muscles: ['BÍCEPS'],
    equipment: ['POLEA ALTA'],
    description: 'Jalón con palmas hacia ti para mayor activación de bíceps',
    thumbnail_url: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400',
  },
  {
    name: 'Remo en Máquina',
    muscle_group: 'ESPALDA',
    secondary_muscles: ['BÍCEPS'],
    equipment: ['MÁQUINA'],
    description: 'Remo guiado para aislamiento de dorsales',
    thumbnail_url: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400',
  },
  {
    name: 'Dominadas con Agarre Supino',
    muscle_group: 'ESPALDA',
    secondary_muscles: ['BÍCEPS'],
    equipment: ['BARRA DOMINADAS'],
    description: 'Chin-ups con palmas hacia ti',
    thumbnail_url: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400',
  },
  {
    name: 'Pull-Over en Polea',
    muscle_group: 'ESPALDA',
    secondary_muscles: ['PECHO', 'TRÍCEPS'],
    equipment: ['POLEA ALTA'],
    description: 'Pull-over con tensión constante',
    thumbnail_url: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400',
  },
  {
    name: 'Remo con Mancuernas a Dos Manos',
    muscle_group: 'ESPALDA',
    secondary_muscles: ['BÍCEPS', 'CORE'],
    equipment: ['MANCUERNAS'],
    description: 'Remo inclinado bilateral con mancuernas',
    thumbnail_url: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400',
  },

  // HOMBROS - Nuevos
  {
    name: 'Press de Hombros en Máquina',
    muscle_group: 'HOMBROS',
    secondary_muscles: ['TRÍCEPS'],
    equipment: ['MÁQUINA'],
    description: 'Press vertical guiado para seguridad',
    thumbnail_url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400',
  },
  {
    name: 'Elevaciones Laterales en Máquina',
    muscle_group: 'HOMBROS',
    secondary_muscles: [],
    equipment: ['MÁQUINA'],
    description: 'Elevaciones laterales con movimiento guiado',
    thumbnail_url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400',
  },
  {
    name: 'Pájaros en Polea',
    muscle_group: 'HOMBROS',
    secondary_muscles: ['ESPALDA'],
    equipment: ['POLEA'],
    description: 'Deltoides posterior con tensión constante',
    thumbnail_url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400',
  },
  {
    name: 'Pájaros en Máquina (Reverse Pec Deck)',
    muscle_group: 'HOMBROS',
    secondary_muscles: ['ESPALDA'],
    equipment: ['MÁQUINA PEC DECK'],
    description: 'Deltoides posterior en máquina',
    thumbnail_url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400',
  },
  {
    name: 'Remo al Mentón con Barra',
    muscle_group: 'HOMBROS',
    secondary_muscles: ['TRAPECIOS', 'BÍCEPS'],
    equipment: ['BARRA'],
    description: 'Remo vertical para deltoides y trapecios',
    thumbnail_url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400',
  },
  {
    name: 'Remo al Mentón con Mancuernas',
    muscle_group: 'HOMBROS',
    secondary_muscles: ['TRAPECIOS', 'BÍCEPS'],
    equipment: ['MANCUERNAS'],
    description: 'Remo vertical con mancuernas para mayor rango',
    thumbnail_url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400',
  },

  // BÍCEPS - Nuevos
  {
    name: 'Curl con Barra Z',
    muscle_group: 'BÍCEPS',
    secondary_muscles: ['ANTEBRAZOS'],
    equipment: ['BARRA Z'],
    description: 'Curl con agarre ergonómico para muñecas',
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400',
  },
  {
    name: 'Curl en Predicador con Mancuerna',
    muscle_group: 'BÍCEPS',
    secondary_muscles: [],
    equipment: ['MANCUERNA', 'BANCO PREDICADOR'],
    description: 'Curl predicador unilateral para máximo aislamiento',
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400',
  },
  {
    name: 'Curl en Polea Baja',
    muscle_group: 'BÍCEPS',
    secondary_muscles: ['ANTEBRAZOS'],
    equipment: ['POLEA BAJA'],
    description: 'Curl con tensión constante desde abajo',
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400',
  },
  {
    name: 'Curl Martillo en Polea',
    muscle_group: 'BÍCEPS',
    secondary_muscles: ['ANTEBRAZOS', 'BRAQUIAL'],
    equipment: ['POLEA', 'CUERDA'],
    description: 'Curl martillo con tensión constante',
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400',
  },
  {
    name: 'Curl 21s con Barra',
    muscle_group: 'BÍCEPS',
    secondary_muscles: ['ANTEBRAZOS'],
    equipment: ['BARRA'],
    description: 'Técnica de 21 repeticiones parciales',
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400',
  },

  // TRÍCEPS - Nuevos
  {
    name: 'Press Francés con Mancuernas',
    muscle_group: 'TRÍCEPS',
    secondary_muscles: [],
    equipment: ['MANCUERNAS', 'BANCO'],
    description: 'Extensión de tríceps acostado con mancuernas',
    thumbnail_url: 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400',
  },
  {
    name: 'Extensiones sobre Cabeza en Polea',
    muscle_group: 'TRÍCEPS',
    secondary_muscles: [],
    equipment: ['POLEA BAJA', 'CUERDA'],
    description: 'Extensión vertical con polea',
    thumbnail_url: 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400',
  },
  {
    name: 'Extensiones sobre Cabeza con Barra',
    muscle_group: 'TRÍCEPS',
    secondary_muscles: [],
    equipment: ['BARRA'],
    description: 'Extensión vertical con barra',
    thumbnail_url: 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400',
  },
  {
    name: 'Patada de Tríceps en Polea',
    muscle_group: 'TRÍCEPS',
    secondary_muscles: [],
    equipment: ['POLEA BAJA'],
    description: 'Kickback con tensión constante',
    thumbnail_url: 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400',
  },
  {
    name: 'Press Cerrado con Mancuernas',
    muscle_group: 'TRÍCEPS',
    secondary_muscles: ['PECHO'],
    equipment: ['MANCUERNAS', 'BANCO'],
    description: 'Press con agarre neutro para tríceps',
    thumbnail_url: 'https://images.unsplash.com/photo-1590507621108-433608c97823?w=400',
  },

  // CUÁDRICEPS - Nuevos
  {
    name: 'Sentadilla en Máquina Smith',
    muscle_group: 'CUÁDRICEPS',
    secondary_muscles: ['GLÚTEOS', 'ISQUIOS'],
    equipment: ['MÁQUINA SMITH'],
    description: 'Sentadilla guiada en máquina Smith',
    thumbnail_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
  },
  {
    name: 'Sentadilla Sumo con Mancuerna',
    muscle_group: 'CUÁDRICEPS',
    secondary_muscles: ['GLÚTEOS', 'ADUCTORES'],
    equipment: ['MANCUERNA'],
    description: 'Sentadilla con piernas abiertas',
    thumbnail_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
  },
  {
    name: 'Zancadas en Máquina Smith',
    muscle_group: 'CUÁDRICEPS',
    secondary_muscles: ['GLÚTEOS', 'ISQUIOS'],
    equipment: ['MÁQUINA SMITH'],
    description: 'Zancadas guiadas para mayor seguridad',
    thumbnail_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
  },
  {
    name: 'Step-Up con Mancuernas',
    muscle_group: 'CUÁDRICEPS',
    secondary_muscles: ['GLÚTEOS'],
    equipment: ['MANCUERNAS', 'CAJÓN'],
    description: 'Subida al cajón con peso',
    thumbnail_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
  },
  {
    name: 'Sissy Squat',
    muscle_group: 'CUÁDRICEPS',
    secondary_muscles: [],
    equipment: ['PESO CORPORAL'],
    description: 'Aislamiento extremo de cuádriceps',
    thumbnail_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
  },

  // ISQUIOS - Nuevos
  {
    name: 'Peso Muerto Rumano con Mancuernas',
    muscle_group: 'ISQUIOS',
    secondary_muscles: ['GLÚTEOS', 'ESPALDA BAJA'],
    equipment: ['MANCUERNAS'],
    description: 'RDL con mancuernas para mayor rango',
    thumbnail_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
  },
  {
    name: 'Peso Muerto Rumano Unilateral',
    muscle_group: 'ISQUIOS',
    secondary_muscles: ['GLÚTEOS', 'CORE'],
    equipment: ['MANCUERNA'],
    description: 'RDL a una pierna para equilibrio',
    thumbnail_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
  },
  {
    name: 'Curl Nórdico',
    muscle_group: 'ISQUIOS',
    secondary_muscles: [],
    equipment: ['PESO CORPORAL'],
    description: 'Ejercicio excéntrico avanzado para isquios',
    thumbnail_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
  },
  {
    name: 'Curl Femoral en Polea',
    muscle_group: 'ISQUIOS',
    secondary_muscles: [],
    equipment: ['POLEA BAJA', 'TOBILLERA'],
    description: 'Curl de piernas con polea',
    thumbnail_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
  },

  // GLÚTEOS - Nuevos
  {
    name: 'Hip Thrust con Mancuerna',
    muscle_group: 'GLÚTEOS',
    secondary_muscles: ['ISQUIOS'],
    equipment: ['MANCUERNA', 'BANCO'],
    description: 'Hip thrust con mancuerna en cadera',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    name: 'Hip Thrust en Máquina',
    muscle_group: 'GLÚTEOS',
    secondary_muscles: ['ISQUIOS'],
    equipment: ['MÁQUINA HIP THRUST'],
    description: 'Hip thrust guiado en máquina',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    name: 'Patada de Glúteo en Polea',
    muscle_group: 'GLÚTEOS',
    secondary_muscles: [],
    equipment: ['POLEA BAJA', 'TOBILLERA'],
    description: 'Kickback de glúteo con polea',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    name: 'Patada de Glúteo en Máquina',
    muscle_group: 'GLÚTEOS',
    secondary_muscles: [],
    equipment: ['MÁQUINA'],
    description: 'Kickback guiado en máquina',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    name: 'Sentadilla Sumo en Máquina Smith',
    muscle_group: 'GLÚTEOS',
    secondary_muscles: ['CUÁDRICEPS', 'ADUCTORES'],
    equipment: ['MÁQUINA SMITH'],
    description: 'Sentadilla sumo guiada',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    name: 'Aductores en Máquina',
    muscle_group: 'GLÚTEOS',
    secondary_muscles: [],
    equipment: ['MÁQUINA ADUCTORES'],
    description: 'Trabajo de aductores internos',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },

  // PANTORRILLAS - Nuevos
  {
    name: 'Elevación de Talones en Máquina Smith',
    muscle_group: 'PANTORRILLAS',
    secondary_muscles: [],
    equipment: ['MÁQUINA SMITH'],
    description: 'Gemelos de pie en Smith',
    thumbnail_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
  },
  {
    name: 'Elevación de Talones con Mancuernas',
    muscle_group: 'PANTORRILLAS',
    secondary_muscles: [],
    equipment: ['MANCUERNAS'],
    description: 'Gemelos de pie con mancuernas',
    thumbnail_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
  },
  {
    name: 'Elevación de Talones a Una Pierna',
    muscle_group: 'PANTORRILLAS',
    secondary_muscles: [],
    equipment: ['PESO CORPORAL', 'MANCUERNA'],
    description: 'Gemelos unilaterales para equilibrio',
    thumbnail_url: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400',
  },

  // CORE - Nuevos
  {
    name: 'Crunch en Máquina',
    muscle_group: 'CORE',
    secondary_muscles: [],
    equipment: ['MÁQUINA'],
    description: 'Crunch con resistencia guiada',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    name: 'Plancha con Peso',
    muscle_group: 'CORE',
    secondary_muscles: ['HOMBROS'],
    equipment: ['DISCO', 'PESO CORPORAL'],
    description: 'Plancha isométrica con carga adicional',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    name: 'Pallof Press',
    muscle_group: 'CORE',
    secondary_muscles: ['OBLICUOS'],
    equipment: ['POLEA'],
    description: 'Anti-rotación para core estable',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },
  {
    name: 'Rotación con Polea (Woodchop)',
    muscle_group: 'CORE',
    secondary_muscles: ['OBLICUOS'],
    equipment: ['POLEA'],
    description: 'Rotación de core con resistencia',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  },

  // ANTEBRAZOS - Nuevos
  {
    name: 'Curl de Muñeca con Mancuerna',
    muscle_group: 'ANTEBRAZOS',
    secondary_muscles: [],
    equipment: ['MANCUERNA'],
    description: 'Flexión de muñeca unilateral',
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400',
  },
  {
    name: 'Curl Inverso con Barra',
    muscle_group: 'ANTEBRAZOS',
    secondary_muscles: ['BÍCEPS'],
    equipment: ['BARRA'],
    description: 'Curl con agarre prono para extensores',
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400',
  },
  {
    name: 'Pinza de Dedos con Disco',
    muscle_group: 'ANTEBRAZOS',
    secondary_muscles: [],
    equipment: ['DISCO'],
    description: 'Agarre de pinza para fuerza de dedos',
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400',
  },
];

// =============================================================================
// ACTUALIZACIONES DE EJERCICIOS EXISTENTES
// =============================================================================
const EXERCISE_UPDATES = {
  // PECHO
  'Press Banca 🗿': {
    newName: 'Press de Banca con Barra',
    description:
      'Ejercicio fundamental de empuje horizontal. Acuéstate en el banco, agarra la barra con agarre medio, baja controlado al pecho y empuja explosivo.',
  },
  'Press con Mancuernas': {
    newName: 'Press de Banca con Mancuernas',
    description:
      'Mayor rango de movimiento que la barra. Permite rotación natural de muñecas y trabajo independiente de cada lado.',
  },
  'Press Inclinado con Barra': {
    newName: 'Press Inclinado con Barra (30-45°)',
    description:
      'Enfatiza la porción clavicular (superior) del pecho. Banco a 30-45 grados para máxima activación.',
  },
  'Press Inclinado con Mancuernas': {
    newName: 'Press Inclinado con Mancuernas (30-45°)',
    description:
      'Mayor rango de movimiento para pecho superior. Permite contracción máxima en la parte alta.',
  },
  'Press Declinado': {
    newName: 'Press Declinado con Barra',
    description:
      'Enfatiza la porción esternal (inferior) del pecho. Banco a 15-30 grados de declinación.',
  },
  'Aperturas con Mancuernas': {
    newName: 'Aperturas con Mancuernas en Banco Plano',
    description:
      'Aislamiento de pecho con énfasis en estiramiento. Codos ligeramente flexionados, baja hasta sentir tensión.',
  },
  'Cruces en Polea': {
    newName: 'Cruces en Polea (Cable Crossover)',
    description:
      'Tensión constante durante todo el movimiento. Ideal para congestión y definición del pecho.',
  },
  'Fondos en Paralelas': {
    newName: 'Fondos en Paralelas (Énfasis Pecho)',
    description:
      'Inclina el torso hacia adelante para mayor activación del pecho. Codos hacia afuera.',
  },
  Flexiones: {
    newName: 'Flexiones de Pecho (Push-Ups)',
    description:
      'Ejercicio básico con peso corporal. Manos más anchas que hombros, baja hasta que el pecho casi toque el suelo.',
  },

  // ESPALDA
  Dominadas: {
    newName: 'Dominadas con Agarre Prono (Pull-Ups)',
    description:
      'Rey de los ejercicios de espalda. Agarre prono ancho, tira hacia arriba hasta que la barbilla pase la barra.',
  },
  'Jalón al Pecho': {
    newName: 'Jalón al Pecho en Polea Alta (Lat Pulldown)',
    description:
      'Alternativa a dominadas. Tira la barra hacia la clavícula, aprieta escápulas abajo y atrás.',
  },
  'Jalón Agarre Cerrado': {
    newName: 'Jalón con Agarre Cerrado Neutro',
    description: 'Mayor énfasis en dorsales inferiores y bíceps. Usa agarre en V o triángulo.',
  },
  'Remo con Barra': {
    newName: 'Remo con Barra Inclinado (Bent-Over Row)',
    description:
      'Ejercicio compuesto para espalda media. Inclínate 45°, tira hacia el ombligo, aprieta escápulas.',
  },
  'Remo con Mancuerna': {
    newName: 'Remo con Mancuerna a Una Mano',
    description:
      'Trabajo unilateral para corregir desbalances. Apoya rodilla en banco, tira hacia la cadera.',
  },
  'Remo en Polea Baja': {
    newName: 'Remo Sentado en Polea Baja (Cable Row)',
    description: 'Tensión constante para dorsales. Mantén espalda recta, tira hacia el abdomen.',
  },
  'Remo T-Bar': {
    newName: 'Remo T-Bar con Agarre Neutro',
    description:
      'Desarrollo de espalda media y dorsales. Mantén core apretado, tira hacia el pecho.',
  },
  'Peso Muerto': {
    newName: 'Peso Muerto Convencional con Barra',
    description:
      'Ejercicio compuesto total. Pies ancho de caderas, agarra la barra, empuja el suelo y extiende caderas.',
  },
  'Face Pull': {
    newName: 'Face Pull en Polea (Tirón Facial)',
    description:
      'Esencial para salud de hombros y postura. Tira hacia la cara, rota externamente al final.',
  },
  Hiperextensiones: {
    newName: 'Hiperextensiones en Banco 45°',
    description:
      'Fortalecimiento de erectores espinales. No hiperextiendas, llega hasta posición neutra.',
  },

  // HOMBROS
  'Press Militar': {
    newName: 'Press Militar con Barra (Overhead Press)',
    description:
      'Ejercicio fundamental de empuje vertical. Barra desde clavículas hasta brazos extendidos sobre la cabeza.',
  },
  'Press Arnold': {
    newName: 'Press Arnold con Mancuernas',
    description:
      'Creado por Arnold Schwarzenegger. Rotación durante el press para trabajar las tres cabezas del deltoides.',
  },
  'Press con Mancuernas Sentado': {
    newName: 'Press de Hombros Sentado con Mancuernas',
    description: 'Press vertical con mancuernas. Banco a 90°, empuja hasta extensión completa.',
  },
  'Elevaciones Laterales': {
    newName: 'Elevaciones Laterales con Mancuernas',
    description:
      'Aislamiento de deltoides lateral. Codos ligeramente flexionados, eleva hasta paralelo al suelo.',
  },
  'Elevaciones Laterales en Polea': {
    newName: 'Elevaciones Laterales en Polea Baja',
    description:
      'Tensión constante para deltoides lateral. Polea del lado contrario, cruza por delante del cuerpo.',
  },
  'Elevaciones Frontales': {
    newName: 'Elevaciones Frontales con Mancuernas',
    description: 'Aislamiento de deltoides anterior. Eleva frente a ti hasta altura de hombros.',
  },
  Pájaros: {
    newName: 'Pájaros con Mancuernas (Rear Delt Fly)',
    description:
      'Aislamiento de deltoides posterior. Inclinado hacia adelante, eleva lateralmente.',
  },
  'Encogimientos de Hombros': {
    newName: 'Encogimientos de Trapecios con Mancuernas',
    description:
      'Desarrollo de trapecios superiores. Eleva hombros hacia las orejas, mantén contracción.',
  },

  // BÍCEPS
  'Curl con Barra': {
    newName: 'Curl de Bíceps con Barra Recta',
    description:
      'Ejercicio básico de bíceps. Codos pegados al cuerpo, flexiona hasta contracción máxima.',
  },
  'Curl con Mancuernas': {
    newName: 'Curl Alternado con Mancuernas',
    description:
      'Trabajo alternado para máxima concentración. Supina la muñeca durante el movimiento.',
  },
  'Curl Martillo': {
    newName: 'Curl Martillo con Mancuernas',
    description:
      'Agarre neutro para braquial y braquiorradial. Mantén las palmas mirándose entre sí.',
  },
  'Curl Predicador': {
    newName: 'Curl Predicador con Barra Z',
    description:
      'Aislamiento máximo eliminando balanceo. Brazos apoyados en el pad, flexiona controlado.',
  },
  'Curl Concentrado': {
    newName: 'Curl Concentrado con Mancuerna',
    description:
      'Máximo aislamiento unilateral. Codo apoyado en muslo interno, flexiona con control.',
  },
  'Curl Inclinado': {
    newName: 'Curl Inclinado con Mancuernas',
    description: 'Mayor estiramiento del bíceps. Banco a 45-60°, brazos colgando, curl completo.',
  },
  'Curl Spider': {
    newName: 'Curl Spider con Barra',
    description: 'Máxima contracción en pico del bíceps. Acostado boca abajo en banco inclinado.',
  },
  'Curl en Polea': {
    newName: 'Curl de Bíceps en Polea Alta',
    description: 'Tensión constante con brazos extendidos lateralmente. Tira hacia las orejas.',
  },

  // TRÍCEPS
  'Press Francés': {
    newName: 'Press Francés con Barra Z (Skullcrusher)',
    description:
      'Extensión de tríceps acostado. Baja la barra hacia la frente, extiende sin mover codos.',
  },
  'Press Cerrado': {
    newName: 'Press de Banca con Agarre Cerrado',
    description: 'Enfatiza tríceps sobre pecho. Manos a ancho de hombros, codos cerca del cuerpo.',
  },
  'Extensiones en Polea': {
    newName: 'Extensiones de Tríceps en Polea Alta (Pushdown)',
    description:
      'Aislamiento clásico de tríceps. Codos fijos, extiende hasta contracción completa.',
  },
  'Extensiones con Cuerda': {
    newName: 'Extensiones de Tríceps con Cuerda',
    description: 'Mayor rango separando la cuerda al final. Permite rotación externa de muñecas.',
  },
  'Extensiones sobre Cabeza': {
    newName: 'Extensión de Tríceps sobre Cabeza con Mancuerna',
    description:
      'Estiramiento máximo de cabeza larga. Sostén mancuerna sobre la cabeza, baja detrás.',
  },
  'Patada de Tríceps': {
    newName: 'Patada de Tríceps con Mancuerna (Kickback)',
    description: 'Aislamiento en contracción. Inclinado, codo fijo, extiende el brazo hacia atrás.',
  },
  'Fondos para Tríceps': {
    newName: 'Fondos en Paralelas (Énfasis Tríceps)',
    description: 'Mantén torso vertical para mayor activación de tríceps. Codos cerca del cuerpo.',
  },
  'Fondos en Banco': {
    newName: 'Fondos en Banco (Bench Dips)',
    description: 'Versión básica de fondos. Manos en banco, pies en suelo, baja y sube.',
  },

  // CUÁDRICEPS
  'Sentadilla con Barra': {
    newName: 'Sentadilla con Barra Alta (Back Squat)',
    description:
      'Rey de los ejercicios de pierna. Barra en trapecios, baja hasta paralelo o más, empuja el suelo.',
  },
  'Sentadilla Frontal': {
    newName: 'Sentadilla Frontal con Barra',
    description:
      'Mayor énfasis en cuádriceps y core. Barra en deltoides frontales, torso más vertical.',
  },
  'Sentadilla Hack': {
    newName: 'Sentadilla Hack en Máquina',
    description:
      'Sentadilla guiada con énfasis en cuádriceps. Espalda apoyada, empuja la plataforma.',
  },
  'Sentadilla Goblet': {
    newName: 'Sentadilla Goblet con Mancuerna',
    description:
      'Excelente para aprender técnica. Sostén mancuerna contra el pecho, sentadilla profunda.',
  },
  'Sentadilla Búlgara': {
    newName: 'Sentadilla Búlgara con Mancuernas',
    description:
      'Zancada con pie trasero elevado. Trabajo unilateral intenso para cuádriceps y glúteos.',
  },
  'Prensa de Piernas': {
    newName: 'Prensa de Piernas 45° (Leg Press)',
    description: 'Ejercicio guiado de piernas. Pies arriba para glúteos, abajo para cuádriceps.',
  },
  'Extensiones de Cuádriceps': {
    newName: 'Extensión de Cuádriceps en Máquina (Leg Extension)',
    description:
      'Aislamiento de cuádriceps. Extiende las piernas completamente, contrae en la cima.',
  },
  Zancadas: {
    newName: 'Zancadas Caminando con Mancuernas',
    description:
      'Trabajo unilateral dinámico. Da pasos largos, rodilla trasera casi toca el suelo.',
  },

  // ISQUIOS
  'Peso Muerto Rumano': {
    newName: 'Peso Muerto Rumano con Barra (RDL)',
    description:
      'Énfasis en isquios y glúteos. Caderas hacia atrás, piernas casi rectas, baja hasta tensión.',
  },
  'Peso Muerto Piernas Rígidas': {
    newName: 'Peso Muerto con Piernas Rígidas (Stiff-Leg)',
    description: 'Máximo estiramiento de isquios. Piernas completamente rectas, mayor ROM que RDL.',
  },
  'Curl Femoral Acostado': {
    newName: 'Curl Femoral Acostado en Máquina (Lying Leg Curl)',
    description: 'Aislamiento de isquios acostado. Flexiona las piernas hacia los glúteos.',
  },
  'Curl Femoral Sentado': {
    newName: 'Curl Femoral Sentado en Máquina (Seated Leg Curl)',
    description: 'Mayor estiramiento de isquios que acostado. Isquios en posición elongada.',
  },
  'Buenos Días': {
    newName: 'Buenos Días con Barra (Good Mornings)',
    description:
      'Barra en espalda, inclínate hacia adelante desde las caderas. Fortalece cadena posterior.',
  },

  // GLÚTEOS
  'Hip Thrust': {
    newName: 'Hip Thrust con Barra',
    description:
      'Ejercicio principal de glúteos. Espalda en banco, barra en cadera, empuja hasta extensión completa.',
  },
  'Puente de Glúteos': {
    newName: 'Puente de Glúteos (Glute Bridge)',
    description:
      'Versión en suelo del hip thrust. Excelente para activación y calentamiento de glúteos.',
  },
  Abductores: {
    newName: 'Abducción de Cadera en Máquina',
    description: 'Trabajo de glúteo medio. Abre las piernas contra la resistencia.',
  },

  // PANTORRILLAS
  'Elevación de Talones de Pie': {
    newName: 'Elevación de Talones de Pie en Máquina',
    description: 'Desarrollo de gastrocnemios. Piernas rectas, sube hasta máxima contracción.',
  },
  'Elevación de Talones Sentado': {
    newName: 'Elevación de Talones Sentado en Máquina',
    description: 'Énfasis en sóleo. Rodillas a 90°, sube y baja controlado.',
  },
  'Elevación de Talones en Prensa': {
    newName: 'Elevación de Talones en Prensa de Piernas',
    description: 'Gemelos en la prensa. Solo puntas en plataforma, flexiona y extiende tobillos.',
  },

  // CORE
  Plancha: {
    newName: 'Plancha Isométrica (Plank)',
    description:
      'Isométrico fundamental de core. Cuerpo recto desde cabeza a talones, aprieta glúteos y core.',
  },
  'Plancha Lateral': {
    newName: 'Plancha Lateral Isométrica (Side Plank)',
    description: 'Trabajo de oblicuos y estabilidad lateral. Cuerpo recto, caderas elevadas.',
  },
  Crunch: {
    newName: 'Crunch Abdominal en Suelo',
    description: 'Flexión básica de tronco. Eleva hombros del suelo, no tires del cuello.',
  },
  'Crunch en Polea': {
    newName: 'Crunch en Polea Alta (Cable Crunch)',
    description: 'Crunch con resistencia progresiva. Arrodillado, flexiona tronco hacia el suelo.',
  },
  'Elevación de Piernas Colgado': {
    newName: 'Elevación de Piernas Colgado en Barra',
    description: 'Trabajo intenso de abdomen inferior. Cuelga de la barra, eleva piernas rectas.',
  },
  'Elevación de Piernas Acostado': {
    newName: 'Elevación de Piernas Acostado en Suelo',
    description: 'Abdomen inferior en piso. Espalda baja pegada, eleva y baja piernas controlado.',
  },
  'Russian Twist': {
    newName: 'Giro Ruso con Peso (Russian Twist)',
    description: 'Rotación de core para oblicuos. Sentado, pies elevados, rota de lado a lado.',
  },
  'Ab Wheel Rollout': {
    newName: 'Rodillo Abdominal (Ab Wheel)',
    description: 'Ejercicio avanzado de core. Rueda hacia adelante manteniendo core contraído.',
  },
  'Dead Bug': {
    newName: 'Dead Bug (Bicho Muerto)',
    description:
      'Estabilización de core y coordinación. Acostado, alterna brazos y piernas opuestos.',
  },
  'Mountain Climbers': {
    newName: 'Escaladores (Mountain Climbers)',
    description: 'Core dinámico con cardio. Posición de plancha, alterna rodillas hacia el pecho.',
  },

  // ANTEBRAZOS
  'Curl de Muñeca': {
    newName: 'Curl de Muñeca con Barra',
    description:
      'Flexión de muñeca para flexores. Antebrazos en banco, flexiona muñecas hacia arriba.',
  },
  'Curl de Muñeca Invertido': {
    newName: 'Curl de Muñeca Invertido con Barra',
    description:
      'Extensión de muñeca para extensores. Dorso de manos hacia arriba, extiende muñecas.',
  },
  'Farmer Walk': {
    newName: 'Caminata del Granjero (Farmer Walk)',
    description:
      'Agarre y core bajo carga. Camina con pesos pesados en cada mano, postura erguida.',
  },
};

// =============================================================================
// FUNCIONES
// =============================================================================

async function getAllExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_active', true)
    .order('muscle_group');

  if (error) throw error;
  return data;
}

async function insertNewExercises() {
  console.log('\n📦 Insertando nuevos ejercicios...\n');

  for (const exercise of NEW_EXERCISES) {
    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('name', exercise.name)
      .single();

    if (existing) {
      console.log(`⏭️  Ya existe: ${exercise.name}`);
      continue;
    }

    const { error } = await supabase.from('exercises').insert({
      ...exercise,
      is_active: true,
      alternative_exercises: [],
    });

    if (error) {
      console.error(`❌ Error insertando ${exercise.name}:`, error.message);
    } else {
      console.log(`✅ Insertado: ${exercise.name}`);
    }
  }
}

async function updateExistingExercises(exercises) {
  console.log('\n✏️  Actualizando ejercicios existentes...\n');

  for (const exercise of exercises) {
    const update = EXERCISE_UPDATES[exercise.name];
    if (update) {
      const { error } = await supabase
        .from('exercises')
        .update({
          name: update.newName,
          description: update.description,
        })
        .eq('id', exercise.id);

      if (error) {
        console.error(`❌ Error actualizando ${exercise.name}:`, error.message);
      } else {
        console.log(`✅ ${exercise.name} → ${update.newName}`);
      }
    }
  }
}

async function assignAlternatives() {
  console.log('\n🔗 Asignando alternativas (3 por ejercicio)...\n');

  // Obtener todos los ejercicios actualizados
  const exercises = await getAllExercises();

  // Agrupar por muscle_group
  const byMuscle = {};
  for (const ex of exercises) {
    if (!byMuscle[ex.muscle_group]) {
      byMuscle[ex.muscle_group] = [];
    }
    byMuscle[ex.muscle_group].push(ex);
  }

  // Para cada ejercicio, asignar 3 alternativas del mismo muscle_group pero diferente equipment
  for (const exercise of exercises) {
    const sameGroup = byMuscle[exercise.muscle_group] || [];

    // Encontrar alternativas con diferente equipo principal
    const alternatives = sameGroup
      .filter((alt) => {
        if (alt.id === exercise.id) return false;

        // Verificar que el equipo sea diferente
        const exEquip = (exercise.equipment || []).join(',');
        const altEquip = (alt.equipment || []).join(',');
        return exEquip !== altEquip;
      })
      .slice(0, 3)
      .map((alt) => alt.id);

    // Si no hay suficientes con diferente equipo, agregar del mismo grupo
    if (alternatives.length < 3) {
      const remaining = sameGroup
        .filter((alt) => alt.id !== exercise.id && !alternatives.includes(alt.id))
        .slice(0, 3 - alternatives.length)
        .map((alt) => alt.id);
      alternatives.push(...remaining);
    }

    if (alternatives.length > 0) {
      const { error } = await supabase
        .from('exercises')
        .update({ alternative_exercises: alternatives.slice(0, 3) })
        .eq('id', exercise.id);

      if (error) {
        console.error(`❌ Error asignando alternativas a ${exercise.name}:`, error.message);
      } else {
        console.log(`✅ ${exercise.name}: ${alternatives.length} alternativas`);
      }
    }
  }
}

async function main() {
  console.log('🏋️ TRENS - Optimización de Ejercicios\n');
  console.log('='.repeat(50));

  try {
    // 1. Obtener ejercicios actuales
    const exercises = await getAllExercises();
    console.log(`\n📊 Ejercicios actuales: ${exercises.length}`);

    // 2. Insertar nuevos ejercicios
    await insertNewExercises();

    // 3. Actualizar nombres y descripciones
    await updateExistingExercises(exercises);

    // 4. Asignar alternativas
    await assignAlternatives();

    // 5. Contar final
    const finalExercises = await getAllExercises();
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ COMPLETADO!`);
    console.log(`📊 Total de ejercicios: ${finalExercises.length}`);

    // Contar por grupo muscular
    const counts = {};
    for (const ex of finalExercises) {
      counts[ex.muscle_group] = (counts[ex.muscle_group] || 0) + 1;
    }
    console.log('\n📈 Por grupo muscular:');
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([group, count]) => {
        console.log(`   ${group}: ${count}`);
      });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
