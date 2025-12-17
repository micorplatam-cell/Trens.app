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
