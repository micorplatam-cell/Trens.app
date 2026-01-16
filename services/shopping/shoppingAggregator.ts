// ============================================================================
// SHOPPING AGGREGATOR SERVICE - Agregación de ingredientes para lista de compras
// Combina ingredientes de múltiples comidas, normaliza y categoriza
// ============================================================================

import {
  ShoppingPeriod,
  ShoppingIngredient,
  ShoppingCategory,
  ShoppingList,
  IngredientCategory,
  CATEGORY_CONFIG,
} from '../../types/shopping';

// ============================================================================
// INGREDIENT CATEGORIZATION KEYWORDS
// Basado en ingredientAnalyzer.ts pero expandido para categorización
// ============================================================================

const PROTEIN_KEYWORDS = [
  'pollo',
  'pechuga',
  'muslo',
  'pavo',
  'pavita',
  'gallina',
  'carne',
  'res',
  'bistec',
  'filete',
  'lomo',
  'asado',
  'bife',
  'cerdo',
  'chuleta',
  'costilla',
  'cordero',
  'ternera',
  'jamón',
  'jamon',
  'tocino',
  'bacon',
  'salchicha',
  'chorizo',
  'pescado',
  'atún',
  'atun',
  'salmón',
  'salmon',
  'tilapia',
  'trucha',
  'corvina',
  'robalo',
  'mero',
  'bacalao',
  'camarón',
  'camaron',
  'camarones',
  'langosta',
  'langostino',
  'pulpo',
  'calamar',
  'mariscos',
  'huevo',
  'huevos',
  'claras',
  'clara',
  'tofu',
  'tempeh',
  'seitan',
  'proteína',
  'proteina',
  'whey',
];

const VEGETABLE_KEYWORDS = [
  'lechuga',
  'espinaca',
  'espinacas',
  'kale',
  'acelga',
  'col',
  'repollo',
  'brócoli',
  'brocoli',
  'coliflor',
  'zanahoria',
  'zanahorias',
  'tomate',
  'jitomate',
  'pepino',
  'pimiento',
  'pimentón',
  'cebolla',
  'ajo',
  'apio',
  'berenjena',
  'calabacín',
  'calabacin',
  'chayote',
  'ejotes',
  'judías',
  'habichuelas',
  'champiñones',
  'champinones',
  'hongos',
  'setas',
  'espárragos',
  'esparragos',
  'nopal',
  'palmito',
  'ensalada',
  'verduras',
  'vegetales',
  'rúcula',
  'rucula',
  'berro',
  'cilantro',
  'perejil',
  'albahaca',
];

const CARB_KEYWORDS = [
  'arroz',
  'pasta',
  'espagueti',
  'fideos',
  'macarrones',
  'tallarines',
  'pan',
  'tortilla',
  'arepa',
  'avena',
  'quinoa',
  'quinua',
  'cebada',
  'trigo',
  'maíz',
  'maiz',
  'elote',
  'choclo',
  'papa',
  'papas',
  'patata',
  'patatas',
  'camote',
  'batata',
  'yuca',
  'plátano',
  'platano',
  'cereal',
  'granola',
  'harina',
  'galleta',
  'crackers',
  'frijol',
  'frijoles',
  'lentejas',
  'garbanzos',
  'habas',
  'alubias',
  'porotos',
];

const FAT_KEYWORDS = [
  'aceite',
  'oliva',
  'aceite de oliva',
  'aceite de coco',
  'aguacate',
  'palta',
  'guacamole',
  'nueces',
  'nuez',
  'almendras',
  'almendra',
  'cacahuate',
  'maní',
  'mani',
  'pistachos',
  'avellanas',
  'pecanas',
  'macadamia',
  'semillas',
  'chía',
  'chia',
  'linaza',
  'sésamo',
  'sesamo',
  'mantequilla',
  'manteca',
  'crema',
  'nata',
  'mayonesa',
  'aceitunas',
  'olivas',
  'coco',
];

const DAIRY_KEYWORDS = [
  'leche',
  'queso',
  'requesón',
  'requeson',
  'cottage',
  'yogur',
  'yogurt',
  'crema',
  'nata',
  'mantequilla',
  'suero',
  'caseína',
  'caseina',
  'mozzarella',
  'parmesano',
  'cheddar',
  'gouda',
  'feta',
  'panela',
  'oaxaca',
];

const FRUIT_KEYWORDS = [
  'manzana',
  'banana',
  'banano',
  'pera',
  'naranja',
  'mandarina',
  'uva',
  'uvas',
  'mango',
  'piña',
  'papaya',
  'sandía',
  'sandia',
  'melón',
  'melon',
  'fresa',
  'fresas',
  'mora',
  'arándano',
  'arandano',
  'kiwi',
  'durazno',
  'melocotón',
  'ciruela',
  'higo',
  'chirimoya',
  'maracuyá',
  'maracuya',
  'limón',
  'limon',
  'lima',
  'toronja',
  'pomelo',
  'coco',
];

const CONDIMENT_KEYWORDS = [
  'sal',
  'pimienta',
  'orégano',
  'oregano',
  'comino',
  'curry',
  'paprika',
  'páprika',
  'salsa',
  'mostaza',
  'ketchup',
  'soya',
  'soja',
  'vinagre',
  'especias',
  'hierbas',
  'canela',
  'clavo',
  'nuez moscada',
  'chile',
  'chiles',
  'jalapeño',
  'jalapeno',
  'habanero',
  'serrano',
  'ají',
  'aji',
  'rocoto',
  'panca',
  'amarillo',
];

// ============================================================================
// HELPER: Categorizar un ingrediente
// ============================================================================
function categorizeIngredient(name: string): IngredientCategory {
  const lowerName = name.toLowerCase().trim();

  // Verificar cada categoría en orden de prioridad
  const checks: [string[], IngredientCategory][] = [
    [PROTEIN_KEYWORDS, 'PROTEINAS'],
    [VEGETABLE_KEYWORDS, 'VEGETALES'],
    [DAIRY_KEYWORDS, 'LACTEOS'],
    [FRUIT_KEYWORDS, 'FRUTAS'],
    [CARB_KEYWORDS, 'CARBOHIDRATOS'],
    [FAT_KEYWORDS, 'GRASAS'],
    [CONDIMENT_KEYWORDS, 'CONDIMENTOS'],
  ];

  for (const [keywords, category] of checks) {
    if (keywords.some((kw) => lowerName.includes(kw) || kw.includes(lowerName))) {
      return category;
    }
  }

  return 'OTROS';
}

// ============================================================================
// HELPER: Normalizar nombre de ingrediente
// ============================================================================
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/s$/, '') // Remover plural simple
    .replace(/es$/, ''); // Remover plural -es
}

// ============================================================================
// HELPER: Parsear cantidad a gramos
// ============================================================================
function parseQuantityToGrams(quantity: string): number {
  if (!quantity) return 100; // Default 100g

  const lower = quantity.toLowerCase();

  // Extraer número
  const numMatch = lower.match(/[\d.]+/);
  const num = numMatch ? parseFloat(numMatch[0]) : 100;

  // Detectar unidad y convertir
  if (lower.includes('kg') || lower.includes('kilo')) {
    return num * 1000;
  }
  if (lower.includes('lb') || lower.includes('libra')) {
    return num * 453.6;
  }
  if (lower.includes('oz') || lower.includes('onza')) {
    return num * 28.35;
  }
  if (lower.includes('taza') || lower.includes('cup')) {
    return num * 240; // Aproximado
  }
  if (lower.includes('cucharada') || lower.includes('tbsp')) {
    return num * 15;
  }
  if (lower.includes('cucharadita') || lower.includes('tsp')) {
    return num * 5;
  }
  if (lower.includes('unidad') || lower.includes('pieza') || lower.includes('u')) {
    return num * 150; // Aproximado para piezas
  }
  if (lower.includes('g') || lower.includes('gramo')) {
    return num;
  }

  // Si no tiene unidad, asumir gramos
  return num || 100;
}

// ============================================================================
// HELPER: Formatear cantidad total
// ============================================================================
function formatTotalQuantity(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`;
  }
  return `${Math.round(grams)}g`;
}

// ============================================================================
// MAIN: Agregar ingredientes de comidas
// ============================================================================
export interface MealForShopping {
  id: string;
  name: string;
  selectedOption: number;
  options: {
    id: string;
    name: string;
    ingredients: {
      id: string;
      name: string;
      quantity: string;
      portion?: string;
    }[];
  }[];
}

export function aggregateIngredients(
  meals: MealForShopping[],
  period: ShoppingPeriod = 'today',
  daysMultiplier: number = 1
): ShoppingList {
  // Mapa para agrupar ingredientes por nombre normalizado
  const ingredientMap = new Map<string, ShoppingIngredient>();

  // Procesar cada comida
  for (const meal of meals) {
    // Obtener opción seleccionada
    const selectedOption = meal.options[meal.selectedOption] || meal.options[0];
    if (!selectedOption?.ingredients) continue;

    // Procesar cada ingrediente
    for (const ing of selectedOption.ingredients) {
      if (!ing.name || ing.name.trim().length < 2) continue;

      const normalizedName = normalizeIngredientName(ing.name);
      const quantityGrams = parseQuantityToGrams(ing.quantity) * daysMultiplier;

      if (ingredientMap.has(normalizedName)) {
        // Agregar a ingrediente existente
        const existing = ingredientMap.get(normalizedName)!;
        existing.quantityGrams += quantityGrams;
        existing.quantity = formatTotalQuantity(existing.quantityGrams);
        if (!existing.mealIds.includes(meal.id)) {
          existing.mealIds.push(meal.id);
          existing.mealNames.push(meal.name);
        }
      } else {
        // Crear nuevo ingrediente
        ingredientMap.set(normalizedName, {
          id: `shop-${normalizedName}-${Date.now()}`,
          name: ing.name.charAt(0).toUpperCase() + ing.name.slice(1).toLowerCase(),
          normalizedName,
          quantity: formatTotalQuantity(quantityGrams),
          quantityGrams,
          category: categorizeIngredient(ing.name),
          mealIds: [meal.id],
          mealNames: [meal.name],
          isChecked: false,
        });
      }
    }
  }

  // Agrupar por categoría
  const categoryMap = new Map<IngredientCategory, ShoppingIngredient[]>();
  const categoryOrder: IngredientCategory[] = [
    'PROTEINAS',
    'VEGETALES',
    'CARBOHIDRATOS',
    'FRUTAS',
    'LACTEOS',
    'GRASAS',
    'CONDIMENTOS',
    'OTROS',
  ];

  // Inicializar todas las categorías
  for (const cat of categoryOrder) {
    categoryMap.set(cat, []);
  }

  // Distribuir ingredientes
  for (const ing of ingredientMap.values()) {
    const items = categoryMap.get(ing.category) || [];
    items.push(ing);
    categoryMap.set(ing.category, items);
  }

  // Construir categorías finales (solo las que tienen items)
  const categories: ShoppingCategory[] = [];
  for (const cat of categoryOrder) {
    const items = categoryMap.get(cat) || [];
    if (items.length > 0) {
      // Ordenar items por cantidad (mayor primero)
      items.sort((a, b) => b.quantityGrams - a.quantityGrams);

      const config = CATEGORY_CONFIG[cat];
      categories.push({
        category: cat,
        icon: config.icon,
        color: config.color,
        items,
        totalItems: items.length,
        checkedItems: items.filter((i) => i.isChecked).length,
      });
    }
  }

  // Calcular totales
  const totalItems = Array.from(ingredientMap.values()).length;
  const checkedItems = Array.from(ingredientMap.values()).filter((i) => i.isChecked).length;

  // Label del periodo
  const periodLabels: Record<ShoppingPeriod, string> = {
    today: 'Hoy',
    '3days': 'Próximos 3 días',
    week: 'Esta semana',
    custom: 'Personalizado',
  };

  return {
    period,
    periodLabel: periodLabels[period],
    categories,
    totalItems,
    checkedItems,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// HELPER: Generar texto plano de lista para compartir/copiar
// ============================================================================
export function shoppingListToText(list: ShoppingList): string {
  let text = `🛒 LISTA DE COMPRAS - ${list.periodLabel.toUpperCase()}\n`;
  text += `${'─'.repeat(40)}\n\n`;

  for (const category of list.categories) {
    text += `${category.icon} ${CATEGORY_CONFIG[category.category].label.toUpperCase()}\n`;
    for (const item of category.items) {
      const check = item.isChecked ? '✅' : '⬜';
      text += `  ${check} ${item.name}: ${item.quantity}\n`;
    }
    text += '\n';
  }

  text += `${'─'.repeat(40)}\n`;
  text += `📊 Total: ${list.totalItems} ingredientes\n`;
  text += `🗓️ Generado: ${new Date(list.generatedAt).toLocaleDateString('es-ES')}\n`;

  return text;
}

// ============================================================================
// HELPER: Generar resumen para HANK
// ============================================================================
export function shoppingListForHank(list: ShoppingList): string {
  let text = `🛒 LISTA DE COMPRAS (${list.periodLabel}):\n\n`;

  for (const category of list.categories) {
    text += `${category.icon} **${CATEGORY_CONFIG[category.category].label}:**\n`;
    const itemsList = category.items.map((item) => `• ${item.name}: ${item.quantity}`).join('\n');
    text += `${itemsList}\n\n`;
  }

  text += `📊 **Total:** ${list.totalItems} ingredientes`;

  return text;
}
