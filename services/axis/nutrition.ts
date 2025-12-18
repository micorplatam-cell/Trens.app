// ============================================================================
// AXIS NUTRITION SERVICE - Cálculo de macros con Gemini AI
// ============================================================================

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ============================================================================
// TYPES
// ============================================================================
interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  portion?: string;
}

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  suggestedGrams: number;
}

interface CalculatedIngredient extends Ingredient {
  nutritionInfo?: NutritionInfo;
}

// ============================================================================
// SYSTEM PROMPT FOR NUTRITION CALCULATIONS
// ============================================================================
const NUTRITION_SYSTEM_PROMPT = `Eres AXIS, un experto nutricionista deportivo de élite. Tu objetivo es calcular gramos precisos y macros para atletas.

REGLAS:
1. Para cada ingrediente, estima los gramos óptimos basándote en una comida balanceada de atleta (150-250g proteína, moderados carbos)
2. Si el ingrediente ya tiene cantidad/gramos, respétala
3. Si solo tiene nombre, calcula gramos típicos para un atleta
4. Prioriza proteínas magras y fuentes de calidad
5. Responde SOLO con JSON válido, sin markdown

FORMATO DE RESPUESTA (JSON puro):
{
  "ingredients": [
    {
      "name": "nombre del ingrediente",
      "suggestedGrams": 150,
      "portion": "aproximadamente 1 filete",
      "calories": 250,
      "protein": 35,
      "carbs": 0,
      "fat": 8
    }
  ],
  "totalMeal": {
    "calories": 500,
    "protein": 45,
    "carbs": 30,
    "fat": 15
  }
}`;

// ============================================================================
// CALCULATE MACROS WITH AI
// ============================================================================
export async function calculateMacrosWithAI(
  ingredients: Ingredient[],
  userContext?: {
    goal?: string;
    weight?: number;
    mealCount?: number;
  }
): Promise<CalculatedIngredient[]> {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, returning original ingredients');
    return ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity || '~100g',
    }));
  }

  try {
    // Build prompt with user context
    let userMessage = `Calcula los gramos y macros para estos ingredientes de una comida de atleta:\n\n`;

    ingredients.forEach((ing, i) => {
      userMessage += `${i + 1}. ${ing.name}`;
      if (ing.quantity) userMessage += ` - Cantidad actual: ${ing.quantity}`;
      if (ing.portion) userMessage += ` (${ing.portion})`;
      userMessage += '\n';
    });

    if (userContext) {
      userMessage += `\nContexto del atleta:\n`;
      if (userContext.goal) userMessage += `- Objetivo: ${userContext.goal}\n`;
      if (userContext.weight) userMessage += `- Peso: ${userContext.weight}kg\n`;
      if (userContext.mealCount) userMessage += `- Comidas por día: ${userContext.mealCount}\n`;
    }

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: NUTRITION_SYSTEM_PROMPT + '\n\n' + userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON response
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const calculatedIngredients = parsed.ingredients || [];

    // Map back to original ingredients with calculated values
    return ingredients.map((ing, index) => {
      const calculated = calculatedIngredients[index];
      if (calculated) {
        return {
          ...ing,
          quantity: `${calculated.suggestedGrams || 100}g`,
          portion: calculated.portion || ing.portion,
          nutritionInfo: {
            calories: calculated.calories || 0,
            protein: calculated.protein || 0,
            carbs: calculated.carbs || 0,
            fat: calculated.fat || 0,
            suggestedGrams: calculated.suggestedGrams || 100,
          },
        };
      }
      return { ...ing, quantity: ing.quantity || '~100g' };
    });
  } catch (error) {
    console.error('calculateMacrosWithAI error:', error);
    // Return original ingredients with placeholder
    return ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity || '~100g',
    }));
  }
}

// ============================================================================
// SUGGEST MEAL OPTIONS WITH AI
// ============================================================================
export async function suggestMealAlternatives(
  currentIngredients: Ingredient[],
  preferences?: {
    avoidIngredients?: string[];
    preferredCuisine?: string;
    calorieTarget?: number;
  }
): Promise<{ name: string; ingredients: Ingredient[] }[]> {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set');
    return [];
  }

  try {
    const prompt = `Basándote en esta comida:
${currentIngredients.map((i) => `- ${i.name} (${i.quantity})`).join('\n')}

Sugiere 2 alternativas equivalentes en macros pero con diferentes ingredientes.
${preferences?.avoidIngredients ? `Evitar: ${preferences.avoidIngredients.join(', ')}` : ''}
${preferences?.preferredCuisine ? `Preferencia: ${preferences.preferredCuisine}` : ''}

Responde SOLO con JSON:
{
  "alternatives": [
    {
      "name": "Nombre de la alternativa",
      "ingredients": [
        { "name": "ingrediente", "quantity": "150g", "portion": "1 porción" }
      ]
    }
  ]
}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.alternatives || []).map(
      (alt: {
        name: string;
        ingredients: { name: string; quantity: string; portion?: string }[];
      }) => ({
        name: alt.name,
        ingredients: alt.ingredients.map((ing, i) => ({
          id: `ai-${Date.now()}-${i}`,
          name: ing.name,
          quantity: ing.quantity,
          portion: ing.portion,
        })),
      })
    );
  } catch (error) {
    console.error('suggestMealAlternatives error:', error);
    return [];
  }
}

// ============================================================================
// ANALYZE DAILY NUTRITION
// ============================================================================
interface SimpleIngredient {
  name: string;
  quantity: string;
}

// ============================================================================
// USER PROFILE FOR MACROS CALCULATION
// ============================================================================
interface UserMacroProfile {
  weight: string;        // "80.5 KG"
  height: string;        // "1.75 M"
  goal: string;          // "GANAR MASA MUSCULAR", "DEFINIR", "MANTENER"
  activityLevel?: string; // "SEDENTARIO", "MODERADO", "ACTIVO", "MUY ACTIVO"
  mealCount: number;     // Número de comidas del usuario
}

interface DailyMacros {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  perMeal: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// ============================================================================
// CALCULATE USER DAILY MACROS
// Calcula los macros totales del usuario basado en su perfil
// ============================================================================
export async function calculateUserDailyMacros(
  profile: UserMacroProfile
): Promise<DailyMacros> {
  // Extraer peso en kg
  const weightMatch = profile.weight.match(/(\d+\.?\d*)/);
  const weightKg = weightMatch ? parseFloat(weightMatch[1]) : 75;
  
  // Extraer altura en metros
  const heightMatch = profile.height.match(/(\d+\.?\d*)/);
  const heightM = heightMatch ? parseFloat(heightMatch[1]) : 1.75;
  
  // Calcular BMR (Basal Metabolic Rate) con Harris-Benedict
  // Asumiendo hombre adulto por defecto
  const bmr = 88.362 + (13.397 * weightKg) + (4.799 * heightM * 100) - (5.677 * 30); // Edad estimada 30
  
  // Factor de actividad
  let activityFactor = 1.55; // Moderadamente activo por defecto
  switch (profile.activityLevel?.toUpperCase()) {
    case 'SEDENTARIO': activityFactor = 1.2; break;
    case 'LIGERO': activityFactor = 1.375; break;
    case 'MODERADO': activityFactor = 1.55; break;
    case 'ACTIVO': activityFactor = 1.725; break;
    case 'MUY ACTIVO': activityFactor = 1.9; break;
  }
  
  // TDEE (Total Daily Energy Expenditure)
  let tdee = bmr * activityFactor;
  
  // Ajuste por objetivo
  const goalLower = profile.goal.toLowerCase();
  let proteinMultiplier = 2.0; // g por kg por defecto
  let carbPercentage = 0.40;
  let fatPercentage = 0.25;
  
  if (goalLower.includes('ganar') || goalLower.includes('masa') || goalLower.includes('volumen')) {
    tdee *= 1.15; // Surplus del 15%
    proteinMultiplier = 2.2;
    carbPercentage = 0.45;
    fatPercentage = 0.25;
  } else if (goalLower.includes('defin') || goalLower.includes('perder') || goalLower.includes('bajar')) {
    tdee *= 0.85; // Deficit del 15%
    proteinMultiplier = 2.4; // Más proteína en déficit
    carbPercentage = 0.30;
    fatPercentage = 0.30;
  } else if (goalLower.includes('mantener') || goalLower.includes('recomp')) {
    proteinMultiplier = 2.0;
    carbPercentage = 0.40;
    fatPercentage = 0.25;
  }
  
  // Calcular macros
  const totalCalories = Math.round(tdee);
  const totalProtein = Math.round(weightKg * proteinMultiplier);
  const proteinCalories = totalProtein * 4;
  const remainingCalories = totalCalories - proteinCalories;
  const totalCarbs = Math.round((remainingCalories * carbPercentage) / 4);
  const totalFat = Math.round((remainingCalories * fatPercentage) / 9);
  
  // Distribuir entre comidas
  const mealCount = Math.max(profile.mealCount, 1);
  
  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    perMeal: {
      calories: Math.round(totalCalories / mealCount),
      protein: Math.round(totalProtein / mealCount),
      carbs: Math.round(totalCarbs / mealCount),
      fat: Math.round(totalFat / mealCount),
    },
  };
}

// ============================================================================
// CALCULATE MACROS WITH AI + USER CONTEXT
// Versión mejorada que usa los macros del usuario para calcular porciones
// ============================================================================
export async function calculateMealWithUserMacros(
  ingredients: Ingredient[],
  mealMacros: { calories: number; protein: number; carbs: number; fat: number }
): Promise<CalculatedIngredient[]> {
  if (!GEMINI_API_KEY) {
    return ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity || '~100g',
    }));
  }

  try {
    const prompt = `Eres AXIS, nutricionista deportivo de élite. Calcula los gramos EXACTOS para que esta comida cumpla estos macros objetivo:

MACROS OBJETIVO PARA ESTA COMIDA:
- Calorías: ${mealMacros.calories} kcal
- Proteína: ${mealMacros.protein}g
- Carbohidratos: ${mealMacros.carbs}g
- Grasas: ${mealMacros.fat}g

INGREDIENTES A CALCULAR:
${ingredients.map((i, idx) => `${idx + 1}. ${i.name}`).join('\n')}

INSTRUCCIONES:
1. Ajusta los gramos de cada ingrediente para alcanzar los macros objetivo
2. Prioriza la proteína (±5g de margen)
3. Ajusta carbohidratos y grasas proporcionalmente
4. Da porciones aproximadas útiles (ej: "~1 pechuga", "~2 tazas")

Responde SOLO JSON:
{
  "ingredients": [
    {
      "name": "nombre",
      "suggestedGrams": 150,
      "portion": "~1 pechuga mediana",
      "calories": 250,
      "protein": 35,
      "carbs": 0,
      "fat": 5
    }
  ],
  "totalMeal": {
    "calories": ${mealMacros.calories},
    "protein": ${mealMacros.protein},
    "carbs": ${mealMacros.carbs},
    "fat": ${mealMacros.fat}
  }
}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    const calculatedIngredients = parsed.ingredients || [];

    return ingredients.map((ing, index) => {
      const calculated = calculatedIngredients[index];
      if (calculated) {
        return {
          ...ing,
          quantity: `${calculated.suggestedGrams || 100}g`,
          portion: calculated.portion || ing.portion,
          nutritionInfo: {
            calories: calculated.calories || 0,
            protein: calculated.protein || 0,
            carbs: calculated.carbs || 0,
            fat: calculated.fat || 0,
            suggestedGrams: calculated.suggestedGrams || 100,
          },
        };
      }
      return { ...ing, quantity: ing.quantity || '~100g' };
    });
  } catch (error) {
    console.error('calculateMealWithUserMacros error:', error);
    return ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity || '~100g',
    }));
  }
}

export async function analyzeDailyNutrition(
  meals: { time: string; ingredients: SimpleIngredient[] }[]
): Promise<{
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  analysis: string;
  recommendations: string[];
}> {
  if (!GEMINI_API_KEY) {
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      analysis: 'API key no configurada',
      recommendations: [],
    };
  }

  try {
    const prompt = `Analiza el plan nutricional de un atleta para hoy:

${meals.map((m) => `${m.time}:\n${m.ingredients.map((i) => `  - ${i.name} (${i.quantity})`).join('\n')}`).join('\n\n')}

Calcula totales y da recomendaciones. Responde SOLO JSON:
{
  "totals": { "calories": 2500, "protein": 180, "carbs": 200, "fat": 80 },
  "analysis": "Breve análisis de 1-2 líneas",
  "recommendations": ["Recomendación 1", "Recomendación 2"]
}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      totalCalories: parsed.totals?.calories || 0,
      totalProtein: parsed.totals?.protein || 0,
      totalCarbs: parsed.totals?.carbs || 0,
      totalFat: parsed.totals?.fat || 0,
      analysis: parsed.analysis || '',
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error('analyzeDailyNutrition error:', error);
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      analysis: 'Error al analizar',
      recommendations: [],
    };
  }
}
