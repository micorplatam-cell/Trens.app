// ============================================================================
// HANK EXECUTOR HOOK - El cerebro que decide qué herramienta ejecutar
// ============================================================================

import { useState, useCallback } from 'react';
import {
  gymAddExercise,
  gymRemoveExercise,
  gymReplaceExercise,
  gymGetTodayRoutine,
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
  planGetNextMeal,
  spotifyGetCurrentTrack,
  planAddSupplement,
  planRemoveSupplement,
  planUpdateSupplementTime,
  planGetStack,
  // Omniscient Tools
  getFullUserContext,
  planGetMealDetails,
  // System Tools
  hankClearHistory,
  TOOL_DEFINITIONS,
} from '../services/hank/tools';
import {
  // Inventory Tools
  inventoryAddItem,
  inventoryUpdateItem,
  inventoryRemoveItem,
  inventoryListItems,
  // Maintenance Tools
  maintenanceLog,
  maintenanceGetHistory,
  maintenanceGetAlerts,
  // Event Tools
  eventCreate,
  eventUpdate,
  eventDelete,
  eventList,
  // Surf Tools
  surfLogSession,
  surfGetSessions,
  surfFavoriteSpot,
  surfGetSpots,
  SPORT_TOOL_DEFINITIONS,
} from '../services/hank/sportTools';
import { calculateMacrosWithAI, analyzeDailyNutrition } from '../services/hank/nutrition';
import type { HankToolCall, HankToolResult, ToolDefinition } from '../types/hank';

interface UseHankExecutorProps {
  userId: string | null;
  currentTrainingDay?: number; // Día de entrenamiento desde el contexto de pantalla
}

export const useHankExecutor = (
  { userId, currentTrainingDay = 0 }: UseHankExecutorProps = { userId: null, currentTrainingDay: 0 }
) => {
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Ejecuta una herramienta específica
   * IMPORTANTE: currentTrainingDay del contexto sobrescribe el de Gemini para evitar errores
   */
  const executeTool = useCallback(
    async (toolCall: HankToolCall): Promise<HankToolResult> => {
      if (!userId) {
        return { success: false, message: 'Usuario no autenticado.' };
      }

      setIsExecuting(true);
      console.warn(`🤖 HANK Ejecutando: ${toolCall.tool}`, toolCall.parameters);

      let result: HankToolResult;

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

          case 'GYM_GET_TODAY_ROUTINE':
            result = await gymGetTodayRoutine(
              userId,
              (p.trainingDay as number) ?? currentTrainingDay
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
                type: 'CALENTAMIENTO' | 'APROXIMACION' | 'EFECTIVA' | 'FALLO';
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
            result = { success: true, message: 'Contexto obtenido desde HankContext.' };
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
              currentTime: p.currentTime as string | undefined,
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
            // Get meals first - ya tiene los macros calculados
            const mealsResult = await planGetMeals(userId);
            if (mealsResult.success && mealsResult.data) {
              const data = mealsResult.data as {
                meals: any[];
                totals?: { calories: number; protein: number; carbs: number; fat: number };
              };

              if (data.meals.length === 0) {
                result = { success: false, message: 'No hay comidas para mostrar.' };
              } else if (data.totals && data.totals.calories > 0) {
                // Ya tiene macros calculados, mostrar resumen
                const t = data.totals;
                result = {
                  success: true,
                  message: `📊 MACROS DEL DÍA:\n🔥 ${Math.round(t.calories)} kcal\n💪 ${Math.round(t.protein)}g proteína\n🍞 ${Math.round(t.carbs)}g carbohidratos\n🥑 ${Math.round(t.fat)}g grasa`,
                  data: { totals: t, meals: data.meals },
                };
              } else {
                // No tiene macros guardados - calcular con IA ahora
                console.warn('🧮 Calculando macros con IA para ingredientes sin datos...');

                // Extraer todos los ingredientes de todas las comidas
                const allIngredients: Array<{
                  id: string;
                  name: string;
                  quantity: string;
                  portion?: string;
                }> = [];
                let mealNames: string[] = [];

                data.meals.forEach((meal: any) => {
                  mealNames.push(meal.name || 'Comida');
                  const ingredients = meal.ingredients || [];
                  ingredients.forEach((ing: any, idx: number) => {
                    allIngredients.push({
                      id: `${meal.id}-${idx}`,
                      name: ing.name,
                      quantity: ing.quantity || '~100g',
                      portion: ing.portion,
                    });
                  });
                });

                if (allIngredients.length === 0) {
                  result = { success: false, message: 'No hay ingredientes para calcular.' };
                } else {
                  // Calcular con IA
                  const calculated = await calculateMacrosWithAI(allIngredients);

                  // Sumar totales
                  let totalCals = 0,
                    totalP = 0,
                    totalC = 0,
                    totalF = 0;
                  calculated.forEach((ing) => {
                    totalCals += ing.nutritionInfo?.calories || 0;
                    totalP += ing.nutritionInfo?.protein || 0;
                    totalC += ing.nutritionInfo?.carbs || 0;
                    totalF += ing.nutritionInfo?.fat || 0;
                  });

                  result = {
                    success: true,
                    message: `📊 MACROS DE ${mealNames.join(' + ')}:\n🔥 ${Math.round(totalCals)} kcal\n💪 ${Math.round(totalP)}g proteína\n🍞 ${Math.round(totalC)}g carbohidratos\n🥑 ${Math.round(totalF)}g grasa\n\n(Calculado con IA basado en ${allIngredients.length} ingredientes)`,
                    data: {
                      calculated,
                      totals: { calories: totalCals, protein: totalP, carbs: totalC, fat: totalF },
                    },
                  };
                }
              }
            } else {
              result = { success: false, message: 'No hay comidas configuradas.' };
            }
            break;
          }

          // ============================================================================
          // OMNISCIENT TOOLS - HANK es Dios en TRENS
          // ============================================================================
          case 'GET_FULL_USER_CONTEXT':
            result = await getFullUserContext(userId);
            break;

          case 'PLAN_GET_MEAL_DETAILS':
            result = await planGetMealDetails(userId, p.mealIdentifier as string);
            break;

          case 'PLAN_GET_MEALS':
            result = await planGetMeals(userId);
            break;

          case 'PLAN_GET_NEXT_MEAL':
            result = await planGetNextMeal(userId);
            break;

          case 'SPOTIFY_GET_CURRENT_TRACK':
            result = await spotifyGetCurrentTrack();
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

          case 'PLAN_UPDATE_SUPPLEMENT_TIME':
            result = await planUpdateSupplementTime(userId, p.name as string, p.newTime as string);
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

          // SYSTEM TOOLS
          case 'HANK_CLEAR_HISTORY':
            result = await hankClearHistory(userId);
            break;

          // =========================================================================
          // INVENTORY TOOLS (MOTO/AUTO/SURF)
          // =========================================================================
          case 'INVENTORY_ADD_ITEM':
            result = await inventoryAddItem(
              userId,
              p.sportCode as string,
              p.category as string,
              p.name as string,
              p.metadata as Record<string, unknown> | undefined
            );
            break;

          case 'INVENTORY_UPDATE_ITEM':
            result = await inventoryUpdateItem(
              userId,
              p.itemId as string,
              p.updates as Record<string, unknown>
            );
            break;

          case 'INVENTORY_REMOVE_ITEM':
            result = await inventoryRemoveItem(userId, p.itemId as string);
            break;

          case 'INVENTORY_LIST_ITEMS':
            result = await inventoryListItems(
              userId,
              p.sportCode as string | undefined,
              p.category as string | undefined
            );
            break;

          // =========================================================================
          // MAINTENANCE TOOLS (MOTO/AUTO)
          // =========================================================================
          case 'MAINTENANCE_LOG':
            result = await maintenanceLog(
              userId,
              p.itemId as string,
              p.maintenanceType as string,
              p.description as string | undefined,
              p.cost as number | undefined,
              p.mileageKm as number | undefined,
              p.nextDueDate as string | undefined,
              p.nextDueMileage as number | undefined
            );
            break;

          case 'MAINTENANCE_GET_HISTORY':
            result = await maintenanceGetHistory(userId, p.itemId as string | undefined);
            break;

          case 'MAINTENANCE_GET_ALERTS':
            result = await maintenanceGetAlerts(userId);
            break;

          // =========================================================================
          // EVENT TOOLS (MOTO/AUTO)
          // =========================================================================
          case 'EVENT_CREATE':
            result = await eventCreate(
              userId,
              p.sportCode as string,
              p.name as string,
              p.eventType as string,
              p.eventDate as string,
              p.location as string | undefined,
              p.notes as string | undefined
            );
            break;

          case 'EVENT_UPDATE':
            result = await eventUpdate(
              userId,
              p.eventId as string,
              p.updates as Record<string, unknown>
            );
            break;

          case 'EVENT_DELETE':
            result = await eventDelete(userId, p.eventId as string);
            break;

          case 'EVENT_LIST':
            result = await eventList(
              userId,
              p.sportCode as string | undefined,
              p.upcoming as boolean | undefined
            );
            break;

          // =========================================================================
          // SURF SESSION TOOLS
          // =========================================================================
          case 'SURF_LOG_SESSION':
            result = await surfLogSession(
              userId,
              p.spotName as string,
              p.waveSizeFt as number | undefined,
              p.wavePeriodS as number | undefined,
              p.windDirection as string | undefined,
              p.windSpeedKts as number | undefined,
              p.tide as 'HIGH' | 'MID' | 'LOW' | undefined,
              p.waterTempC as number | undefined,
              p.durationMin as number | undefined,
              p.sessionRating as number | undefined,
              p.notes as string | undefined,
              p.boardId as string | undefined
            );
            break;

          case 'SURF_GET_SESSIONS':
            result = await surfGetSessions(
              userId,
              p.spotName as string | undefined,
              p.limit as number | undefined
            );
            break;

          case 'SURF_FAVORITE_SPOT':
            result = await surfFavoriteSpot(
              userId,
              p.spotName as string,
              p.latitude as number | undefined,
              p.longitude as number | undefined
            );
            break;

          case 'SURF_GET_SPOTS':
            result = await surfGetSpots(userId);
            break;

          default:
            console.warn(`Herramienta no implementada: ${toolCall.tool}`);
            result = { success: false, message: `Herramienta "${toolCall.tool}" no reconocida.` };
        }
      } catch (e) {
        console.error('Error crítico en Hank Executor:', e);
        result = { success: false, message: 'Error interno de ejecución.' };
      } finally {
        setIsExecuting(false);
      }

      console.warn(`🤖 HANK Resultado:`, result);
      return result;
    },
    [userId, currentTrainingDay] // Agregar currentTrainingDay a las dependencias
  );

  /**
   * Ejecuta múltiples herramientas en secuencia
   */
  const executeToolChain = useCallback(
    async (toolCalls: HankToolCall[]): Promise<HankToolResult[]> => {
      const results: HankToolResult[] = [];

      for (const call of toolCalls) {
        const result = await executeTool(call);
        results.push(result);

        // Si una falla, detener la cadena
        if (!result.success) {
          console.warn('🤖 HANK: Cadena detenida por error en:', call.tool);
          break;
        }
      }

      return results;
    },
    [executeTool]
  );

  /**
   * Obtiene las definiciones de herramientas para el LLM
   * Incluye herramientas base + herramientas de deporte
   */
  const getToolDefinitions = useCallback((): ToolDefinition[] => {
    return [...TOOL_DEFINITIONS, ...SPORT_TOOL_DEFINITIONS];
  }, []);

  return {
    executeTool,
    executeToolChain,
    getToolDefinitions,
    isExecuting,
  };
};
