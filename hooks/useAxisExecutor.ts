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
  dietAddCalories,
  logWorkoutSet,
  TOOL_DEFINITIONS,
} from '../services/axis/tools';
import type { AxisToolCall, AxisToolResult, ToolDefinition } from '../types/axis';

interface UseAxisExecutorProps {
  userId: string | null;
}

export const useAxisExecutor = ({ userId }: UseAxisExecutorProps = { userId: null }) => {
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Ejecuta una herramienta específica
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
    [userId]
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
