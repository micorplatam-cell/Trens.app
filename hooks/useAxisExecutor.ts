// ============================================================================
// AXIS EXECUTOR HOOK - El cerebro que decide qué herramienta ejecutar
// ============================================================================

import { useState, useCallback } from 'react';
import {
  gymAddExercise,
  gymRemoveExercise,
  gymReplaceExercise,
  gymListExercises,
  assetUpdateField,
  assetRead,
  assetGetSchema,
  assetRemoveSeries,
  assetAddSeries,
  assetReplaceSeries,
  assetSetSeries,
  dietAddCalories,
  logWorkoutSet,
  adnGetProfile,
  adnGetRecords,
  adnUpdateProfile,
  adnAddMeasurement,
  adnRemoveMeasurement,
  // PLAN Tools
  planAddMeal,
  planRemoveMeal,
  planUpdateMealTime,
  planUpdateIngredients,
  planGetMeals,
  planAddSupplement,
  planRemoveSupplement,
  planGetStack,
  TOOL_DEFINITIONS,
} from '../services/axis/tools';
import { calculateMacrosWithAI, analyzeDailyNutrition } from '../services/axis/nutrition';
import type { AxisToolCall, AxisToolResult, ToolDefinition } from '../types/axis';

interface UseAxisExecutorProps {
  userId: string | null;
  currentTrainingDay?: number; // Día de entrenamiento desde el contexto de pantalla
}

export const useAxisExecutor = (
  { userId, currentTrainingDay = 0 }: UseAxisExecutorProps = { userId: null, currentTrainingDay: 0 }
) => {
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Ejecuta una herramienta específica
   * IMPORTANTE: currentTrainingDay del contexto sobrescribe el de Gemini para evitar errores
   */
  const executeTool = useCallback(
    async (toolCall: AxisToolCall): Promise<AxisToolResult> => {
      if (!userId) {
        return { success: false, message: 'Usuario no autenticado.' };
      }

      setIsExecuting(true);
      console.warn(`🤖 AXIS Ejecutando: ${toolCall.tool}`, toolCall.parameters);

      let result: AxisToolResult;

      try {
        const p = toolCall.parameters;

        switch (toolCall.tool) {
          case 'GYM_ADD_EXERCISE':
            result = await gymAddExercise(
              userId,
              p.exerciseName as string,
              p.trainingDay as number,
              p.customSeries as Array<{ reps: number; weight: number; type: string }> | undefined
            );
            break;

          case 'GYM_REMOVE_EXERCISE':
            result = await gymRemoveExercise(
              userId,
              p.exerciseName as string,
              p.trainingDay as number | undefined,
              p.deleteCompletely as boolean | undefined
            );
            break;

          case 'GYM_REPLACE_EXERCISE':
            result = await gymReplaceExercise(
              userId,
              p.oldExerciseName as string,
              p.newExerciseName as string,
              p.trainingDay as number | undefined
            );
            break;

          case 'GYM_LIST_EXERCISES':
            result = await gymListExercises(userId, p.trainingDay as number | undefined);
            break;

          case 'ASSET_UPDATE_FIELD':
            result = await assetUpdateField(
              userId,
              p.assetId as string | undefined,
              p.assetName as string | undefined,
              p.fieldPath as string,
              p.newValue,
              (p.operation as 'set' | 'increment' | 'decrement') || 'set'
            );
            break;

          case 'ASSET_READ':
            result = await assetRead(
              userId,
              p.assetId as string | undefined,
              p.assetName as string | undefined,
              p.assetType as string | undefined
            );
            break;

          case 'ASSET_GET_SCHEMA':
            result = await assetGetSchema(p.assetType as string);
            break;

          case 'DIET_ADD_CALORIES':
            result = await dietAddCalories(
              userId,
              p.mealName as string,
              p.caloriesChange as number
            );
            break;

          case 'LOG_WORKOUT_SET':
            result = await logWorkoutSet(
              p.sessionId as string,
              p.assetId as string,
              p.setDetails as { weight: number; reps: number; rir?: number }
            );
            break;

          case 'ASSET_REMOVE_SERIES':
            result = await assetRemoveSeries(
              userId,
              p.assetName as string,
              p.seriesIndex === 'last' || p.seriesIndex === 'first'
                ? p.seriesIndex
                : parseInt(String(p.seriesIndex), 10),
              currentTrainingDay // Usar día del contexto de pantalla
            );
            break;

          case 'ASSET_ADD_SERIES':
            // position puede ser number, 'end', 'start', o undefined
            let addPosition: 'end' | 'start' | number = 'end';
            if (typeof p.position === 'number') {
              addPosition = p.position;
            } else if (p.position === 'start') {
              addPosition = 'start';
            }
            result = await assetAddSeries(
              userId,
              p.assetName as string,
              (p.reps as number) || 10,
              (p.weight as number) || 0,
              (p.seriesType as 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE') || 'EFFECTIVE',
              addPosition,
              currentTrainingDay // Usar día del contexto de pantalla
            );
            break;

          case 'ASSET_REPLACE_SERIES':
            // seriesIndex puede ser 'last', 'first', o un número
            let replaceIdx: 'last' | 'first' | number = 'last';
            if (p.seriesIndex === 'first') {
              replaceIdx = 'first';
            } else if (p.seriesIndex === 'last') {
              replaceIdx = 'last';
            } else if (typeof p.seriesIndex === 'number') {
              replaceIdx = p.seriesIndex;
            } else if (typeof p.seriesIndex === 'string' && !isNaN(parseInt(p.seriesIndex))) {
              replaceIdx = parseInt(p.seriesIndex);
            }
            result = await assetReplaceSeries(
              userId,
              p.assetName as string,
              replaceIdx,
              (p.reps as number) || 10,
              (p.weight as number) || 0,
              (p.seriesType as 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE') || 'EFFECTIVE',
              currentTrainingDay // Usar día del contexto de pantalla
            );
            break;

          case 'ASSET_SET_SERIES':
            // Recibe un array de series (puede venir como string JSON o como array)
            let seriesArray = p.series;
            if (typeof seriesArray === 'string') {
              try {
                seriesArray = JSON.parse(seriesArray);
              } catch {
                result = { success: false, message: 'Error parseando series JSON' };
                break;
              }
            }
            // Convertir al formato esperado, agregando id si no existe
            const formattedSeries = (
              seriesArray as Array<{
                id?: string;
                reps: number;
                weight: number;
                type: 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE';
                note?: string;
              }>
            ).map((s, i) => ({
              id: s.id || String(Date.now() + i),
              reps: s.reps,
              weight: s.weight,
              type: s.type,
              note: s.note,
            }));
            result = await assetSetSeries(
              userId,
              p.assetName as string,
              formattedSeries,
              currentTrainingDay // Usar día del contexto de pantalla
            );
            break;

          case 'GET_USER_CONTEXT':
            // Este se maneja desde el contexto, no aquí
            result = { success: true, message: 'Contexto obtenido desde AxisContext.' };
            break;

          // ADN TOOLS
          case 'ADN_GET_PROFILE':
            result = await adnGetProfile(userId);
            break;

          case 'ADN_GET_RECORDS':
            result = await adnGetRecords(userId);
            break;

          case 'ADN_UPDATE_PROFILE':
            result = await adnUpdateProfile(
              userId,
              p.field as 'goal' | 'weight' | 'height' | 'injuries' | 'allergies' | 'display_name',
              p.value as string
            );
            break;

          case 'ADN_ADD_MEASUREMENT':
            result = await adnAddMeasurement(
              userId,
              p.name as string,
              p.value as string,
              (p.isDominant as boolean) || false
            );
            break;

          case 'ADN_REMOVE_MEASUREMENT':
            result = await adnRemoveMeasurement(userId, p.measurementName as string);
            break;

          // PLAN TOOLS
          case 'PLAN_ADD_MEAL':
            result = await planAddMeal(
              userId,
              p.time as string,
              JSON.parse(p.ingredients as string)
            );
            break;

          case 'PLAN_REMOVE_MEAL':
            result = await planRemoveMeal(userId, {
              mealId: p.mealId as string | undefined,
              time: p.time as string | undefined,
              position: p.position as string | undefined,
            });
            break;

          case 'PLAN_UPDATE_MEAL_TIME':
            result = await planUpdateMealTime(userId, p.newTime as string, {
              mealId: p.mealId as string | undefined,
              position: p.position as string | undefined,
            });
            break;

          case 'PLAN_UPDATE_INGREDIENTS':
            result = await planUpdateIngredients(
              userId,
              p.mealId as string,
              JSON.parse(p.ingredients as string)
            );
            break;

          case 'PLAN_CALCULATE_MACROS': {
            // Get meals first, then calculate macros
            const mealsResult = await planGetMeals(userId);
            if (mealsResult.success && mealsResult.data) {
              const meals = (
                mealsResult.data as {
                  meals: {
                    time: string;
                    meal_options: {
                      meal_ingredients: {
                        id: string;
                        name: string;
                        quantity: string;
                        portion?: string;
                      }[];
                    }[];
                  }[];
                }
              ).meals;
              const allIngredients = meals.flatMap(
                (m) => m.meal_options?.[0]?.meal_ingredients || []
              );
              const calculated = await calculateMacrosWithAI(allIngredients);
              result = {
                success: true,
                message: `✅ Macros calculados para ${calculated.length} ingredientes.`,
                data: { calculated },
              };
            } else {
              result = { success: false, message: 'No hay comidas para calcular.' };
            }
            break;
          }

          case 'PLAN_GET_MEALS':
            result = await planGetMeals(userId);
            break;

          case 'PLAN_ADD_SUPPLEMENT':
            result = await planAddSupplement(userId, p.name as string, p.dose as string, {
              type: p.type as 'pill' | 'powder' | 'liquid' | 'syringe' | undefined,
              time: p.time as string | undefined,
              isPreWorkout: p.isPreWorkout as boolean | undefined,
              isPostWorkout: p.isPostWorkout as boolean | undefined,
            });
            break;

          case 'PLAN_REMOVE_SUPPLEMENT':
            result = await planRemoveSupplement(userId, p.name as string);
            break;

          case 'PLAN_GET_STACK':
            result = await planGetStack(userId);
            break;

          case 'PLAN_ANALYZE_NUTRITION': {
            const mealsData = await planGetMeals(userId);
            if (mealsData.success && mealsData.data) {
              const meals = (
                mealsData.data as {
                  meals: {
                    time: string;
                    meal_options: { meal_ingredients: { name: string; quantity: string }[] }[];
                  }[];
                }
              ).meals;
              const formattedMeals = meals.map((m) => ({
                time: m.time,
                ingredients: m.meal_options?.[0]?.meal_ingredients || [],
              }));
              const analysis = await analyzeDailyNutrition(formattedMeals);
              result = {
                success: true,
                message: `📊 ANÁLISIS NUTRICIONAL:
🔥 Calorías: ${analysis.totalCalories} kcal
🥩 Proteína: ${analysis.totalProtein}g
🍞 Carbos: ${analysis.totalCarbs}g
🥑 Grasa: ${analysis.totalFat}g

${analysis.analysis}

💡 Recomendaciones:
${analysis.recommendations.map((r) => `• ${r}`).join('\n')}`,
                data: analysis,
              };
            } else {
              result = { success: false, message: 'No hay datos para analizar.' };
            }
            break;
          }

          default:
            console.warn(`Herramienta no implementada: ${toolCall.tool}`);
            result = { success: false, message: `Herramienta "${toolCall.tool}" no reconocida.` };
        }
      } catch (e) {
        console.error('Error crítico en Axis Executor:', e);
        result = { success: false, message: 'Error interno de ejecución.' };
      } finally {
        setIsExecuting(false);
      }

      console.warn(`🤖 AXIS Resultado:`, result);
      return result;
    },
    [userId, currentTrainingDay] // Agregar currentTrainingDay a las dependencias
  );

  /**
   * Ejecuta múltiples herramientas en secuencia
   */
  const executeToolChain = useCallback(
    async (toolCalls: AxisToolCall[]): Promise<AxisToolResult[]> => {
      const results: AxisToolResult[] = [];

      for (const call of toolCalls) {
        const result = await executeTool(call);
        results.push(result);

        // Si una falla, detener la cadena
        if (!result.success) {
          console.warn('🤖 AXIS: Cadena detenida por error en:', call.tool);
          break;
        }
      }

      return results;
    },
    [executeTool]
  );

  /**
   * Obtiene las definiciones de herramientas para el LLM
   */
  const getToolDefinitions = useCallback((): ToolDefinition[] => {
    return TOOL_DEFINITIONS;
  }, []);

  return {
    executeTool,
    executeToolChain,
    getToolDefinitions,
    isExecuting,
  };
};
