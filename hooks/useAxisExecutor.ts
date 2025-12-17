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
  TOOL_DEFINITIONS,
} from '../services/axis/tools';
import type { AxisToolCall, AxisToolResult, ToolDefinition } from '../types/axis';

interface UseAxisExecutorProps {
  userId: string | null;
  currentTrainingDay?: number; // Día de entrenamiento desde el contexto de pantalla
}

export const useAxisExecutor = ({ userId, currentTrainingDay = 0 }: UseAxisExecutorProps = { userId: null, currentTrainingDay: 0 }) => {
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
            const formattedSeries = (seriesArray as Array<{
              id?: string;
              reps: number;
              weight: number;
              type: 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE';
              note?: string;
            }>).map((s, i) => ({
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
