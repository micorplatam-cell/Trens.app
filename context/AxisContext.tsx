// ============================================================================
// AXIS CONTEXT - Proveedor global completo para el Agente AXIS
// Incluye: Contexto dinámico, Sistema de Aliases, Integración LLM
// ============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useAxisExecutor } from '../hooks/useAxisExecutor';
import { supabase } from '../lib/supabase';
import { callGemini, continueAfterToolExecution } from '../services/axis/gemini';
import type {
  AxisContextState,
  AxisToolResult,
  AxisToolCall,
  ScreenContext,
  ActiveAsset,
  SportMode,
  UserProfile,
  UserAlias,
} from '../types/axis';

// ============================================================================
// GEMINI API KEY - Configura tu clave aquí o usa variable de entorno
// ============================================================================
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

// ============================================================================
// DEFAULT VALUES
// ============================================================================
const defaultScreenContext: ScreenContext = {
  module: 'nucleo',
  viewMode: null,
  currentExerciseIndex: null,
  currentTrainingDay: 0,
};

const defaultUserProfile: UserProfile = {
  level: 'INTERMEDIATE',
  trainingFrequency: 3,
  currentTrainingDay: 0,
  preferences: {},
};

// ============================================================================
// PRESET ALIASES - Comandos predefinidos
// ============================================================================
const PRESET_ALIASES: Omit<UserAlias, 'id' | 'createdAt'>[] = [
  {
    trigger: 'Modo Bestia',
    description: 'Agrega una serie al fallo a todos los ejercicios del día',
    actions: [
      {
        tool: 'ASSET_UPDATE_FIELD',
        parameters: {
          assetType: 'gym_exercise',
          fieldPath: 'intensity_modifier',
          newValue: 1.2,
          operation: 'set',
        },
      },
    ],
  },
  {
    trigger: 'Día Ligero',
    description: 'Reduce la intensidad al 70%',
    actions: [
      {
        tool: 'ASSET_UPDATE_FIELD',
        parameters: {
          assetType: 'gym_exercise',
          fieldPath: 'intensity_modifier',
          newValue: 0.7,
          operation: 'set',
        },
      },
    ],
  },
];

// ============================================================================
// CONTEXT CREATION
// ============================================================================
const AxisContext = createContext<AxisContextState | undefined>(undefined);

// ============================================================================
// PROVIDER PROPS
// ============================================================================
interface AxisProviderProps {
  children: ReactNode;
  userId: string | null;
}

// ============================================================================
// AXIS PROVIDER
// ============================================================================

// Tipo para mensajes del historial (compatible con Gemini)
interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

// Tipo para mensajes de la base de datos
interface DBChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

export const AxisProvider = ({ children, userId }: AxisProviderProps) => {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Conversation History - Para que AXIS recuerde el contexto del chat (máximo 24h)
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  // Flag para indicar si ya se cargó/verificó el historial
  const historyInitialized = useRef(false);

  // Refresh Trigger - Se incrementa cuando AXIS modifica datos para que las pantallas recarguen
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Dynamic Context
  const [screenContext, setScreenContext] = useState<ScreenContext>(defaultScreenContext);
  const [activeAsset, setActiveAssetState] = useState<ActiveAsset | null>(null);
  const [sportMode, setSportMode] = useState<SportMode>('BODYBUILDING');
  const [userProfile] = useState<UserProfile>(defaultUserProfile);

  // Aliases
  const [aliases, setAliases] = useState<UserAlias[]>(
    PRESET_ALIASES.map((a, i) => ({
      ...a,
      id: `preset-${i}`,
      createdAt: new Date(),
    }))
  );

  // Executor Hook
  const {
    executeTool: executeToolRaw,
    executeToolChain: executeToolChainRaw,
    getToolDefinitions,
    isExecuting,
  } = useAxisExecutor({
    userId,
    currentTrainingDay: screenContext.currentTrainingDay ?? 0, // Pasar día actual de la pantalla
  });

  // Wrapper para executeTool que incrementa refreshTrigger si exitoso
  const executeTool = useCallback(
    async (toolCall: AxisToolCall): Promise<AxisToolResult> => {
      const result = await executeToolRaw(toolCall);
      if (result.success) {
        console.warn('🔄 executeTool exitoso, incrementando refreshTrigger');
        setRefreshTrigger((prev) => prev + 1);
      }
      return result;
    },
    [executeToolRaw]
  );

  // Wrapper para executeToolChain que incrementa refreshTrigger si alguno exitoso
  const executeToolChain = useCallback(
    async (toolCalls: AxisToolCall[]): Promise<AxisToolResult[]> => {
      const results = await executeToolChainRaw(toolCalls);
      if (results.some((r) => r.success)) {
        console.warn('🔄 executeToolChain exitoso, incrementando refreshTrigger');
        setRefreshTrigger((prev) => prev + 1);
      }
      return results;
    },
    [executeToolChainRaw]
  );

  // -------------------------------------------------------------------------
  // CHAT MEMORY MANAGEMENT - Sistema de 24 horas con Supabase
  // -------------------------------------------------------------------------

  /**
   * Cargar historial desde Supabase y limpiar mensajes antiguos (medianoche)
   */
  useEffect(() => {
    const initializeChatHistory = async () => {
      if (historyInitialized.current || !userId) return;
      historyInitialized.current = true;

      try {
        // Primero, limpiar mensajes anteriores a medianoche usando la función de DB
        const { data: cleanedCount, error: cleanError } = await supabase.rpc(
          'clean_old_axis_messages',
          { p_user_id: userId }
        );

        if (cleanError) {
          console.warn('⚠️ AXIS: Error limpiando mensajes antiguos:', cleanError.message);
        } else if (cleanedCount && cleanedCount > 0) {
          console.warn(`🧹 AXIS: Limpiados ${cleanedCount} mensajes de días anteriores`);
        }

        // Cargar mensajes del día de hoy
        const { data: messages, error } = await supabase
          .from('axis_chat_messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('⚠️ AXIS: Error cargando historial:', error.message);
          return;
        }

        if (messages && messages.length > 0) {
          // Convertir de DB format a Gemini format
          const history: ChatMessage[] = messages.map((msg: DBChatMessage) => ({
            role: msg.role,
            parts: [{ text: msg.content }],
          }));
          console.warn(`🧠 AXIS: Cargando ${history.length} mensajes del historial`);
          setConversationHistory(history);
        }
      } catch (error) {
        console.warn('⚠️ AXIS: Error inicializando historial:', error);
      }
    };

    initializeChatHistory();
  }, [userId]);

  /**
   * Guardar un mensaje en Supabase
   */
  const saveMessageToSupabase = useCallback(
    async (role: 'user' | 'model', content: string) => {
      console.warn('💾 AXIS: Intentando guardar mensaje:', {
        role,
        userId,
        contentLength: content.length,
      });

      if (!userId) {
        console.warn('❌ AXIS: No se puede guardar - userId es null');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('axis_chat_messages')
          .insert({
            user_id: userId,
            role,
            content,
          })
          .select();

        if (error) {
          console.warn(
            '⚠️ AXIS: Error guardando mensaje:',
            error.message,
            error.details,
            error.hint
          );
        } else {
          console.warn('✅ AXIS: Mensaje guardado exitosamente:', data);
        }
      } catch (error) {
        console.warn('⚠️ AXIS: Error guardando mensaje:', error);
      }
    },
    [userId]
  );

  /**
   * Verificar medianoche periódicamente (cada minuto)
   * Esto asegura que si el usuario tiene la app abierta a medianoche, se limpie
   */
  useEffect(() => {
    if (!userId) return;

    const checkMidnight = async () => {
      // Llamar a la función de limpieza de DB
      const { data: cleanedCount, error } = await supabase.rpc('clean_old_axis_messages', {
        p_user_id: userId,
      });

      if (!error && cleanedCount && cleanedCount > 0) {
        console.warn(`🧹 AXIS: ¡Medianoche! Limpiados ${cleanedCount} mensajes automáticamente`);
        setConversationHistory([]);
      }
    };

    // Verificar cada minuto (60000 ms)
    const interval = setInterval(checkMidnight, 60000);

    return () => clearInterval(interval);
  }, [userId]);

  // -------------------------------------------------------------------------
  // CONTEXT UPDATES
  // -------------------------------------------------------------------------

  /**
   * Carga un asset activo desde Supabase
   * @param assetId - ID del asset
   * @param alternativeInfo - Info si es una alternativa
   */
  const setActiveAsset = useCallback(
    async (
      assetId: string | null,
      alternativeInfo?: { isAlternative: boolean; parentExerciseName: string }
    ) => {
      if (!assetId || !userId) {
        setActiveAssetState(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_assets')
          .select('*')
          .eq('id', assetId)
          .eq('user_id', userId)
          .single();

        if (error || !data) {
          setActiveAssetState(null);
          return;
        }

        setActiveAssetState({
          id: data.id as string,
          type: data.asset_type as string,
          name: data.name as string,
          liquidData: (data.metadata || {}) as Record<string, unknown>,
          trainingDays: data.training_days as number[] | undefined,
          isAlternative: alternativeInfo?.isAlternative || false,
          parentExerciseName: alternativeInfo?.parentExerciseName,
        });
      } catch (e) {
        console.error('Error loading active asset:', e);
        setActiveAssetState(null);
      }
    },
    [userId]
  );

  // -------------------------------------------------------------------------
  // ALIAS MANAGEMENT
  // -------------------------------------------------------------------------

  const addAlias = useCallback((alias: Omit<UserAlias, 'id' | 'createdAt'>) => {
    const newAlias: UserAlias = {
      ...alias,
      id: `custom-${Date.now()}`,
      createdAt: new Date(),
    };
    setAliases((prev) => [...prev, newAlias]);
  }, []);

  const removeAlias = useCallback((triggerId: string) => {
    setAliases((prev) => prev.filter((a) => a.id !== triggerId));
  }, []);

  /**
   * Ejecuta un alias si el trigger coincide
   */
  const executeAlias = useCallback(
    async (trigger: string): Promise<AxisToolResult[] | null> => {
      const alias = aliases.find((a) => a.trigger.toLowerCase() === trigger.toLowerCase());

      if (!alias) return null;

      console.warn(`🤖 AXIS: Ejecutando alias "${alias.trigger}"`);
      const results = await executeToolChain(alias.actions);
      return results;
    },
    [aliases, executeToolChain]
  );

  // -------------------------------------------------------------------------
  // LOAD AVAILABLE EXERCISES FROM CATALOG
  // -------------------------------------------------------------------------
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);

  useEffect(() => {
    const loadExerciseCatalog = async () => {
      try {
        const { data, error } = await supabase
          .from('asset_templates')
          .select('name')
          .eq('asset_type', 'gym_exercise')
          .order('name');

        if (!error && data) {
          const exercises = data.map((t) => t.name as string);
          setAvailableExercises(exercises);
          console.warn('📋 CATÁLOGO DE EJERCICIOS:', exercises);
        }
      } catch (e) {
        console.warn('Error loading exercise catalog:', e);
      }
    };
    loadExerciseCatalog();
  }, []);

  // -------------------------------------------------------------------------
  // BUILD GEMINI CONTEXT
  // -------------------------------------------------------------------------
  const buildGeminiContext = useCallback(() => {
    return {
      screenModule: screenContext.module,
      sportMode: sportMode,
      userLevel: userProfile.level,
      currentTrainingDay: userProfile.currentTrainingDay,
      activeAsset: activeAsset
        ? {
            name: activeAsset.name,
            type: activeAsset.type,
            liquidData: activeAsset.liquidData,
            isAlternative: activeAsset.isAlternative || false,
            parentExerciseName: activeAsset.parentExerciseName,
          }
        : null,
      customAliases: aliases.map((a) => ({
        trigger: a.trigger,
        description: a.description,
      })),
      availableExercises: availableExercises,
    };
  }, [screenContext, sportMode, userProfile, activeAsset, aliases, availableExercises]);

  // -------------------------------------------------------------------------
  // MAIN COMMAND EXECUTION
  // -------------------------------------------------------------------------

  /**
   * Limpia el historial de conversación (para nuevo chat)
   * Elimina todos los mensajes del usuario en Supabase
   */
  const clearConversation = useCallback(async () => {
    setConversationHistory([]);
    if (!userId) return;

    try {
      const { error } = await supabase.from('axis_chat_messages').delete().eq('user_id', userId);

      if (error) {
        console.warn('⚠️ AXIS: Error limpiando historial:', error.message);
      } else {
        console.warn('🧹 AXIS: Historial del chat limpiado manualmente');
      }
    } catch (error) {
      console.warn('⚠️ AXIS: Error limpiando historial:', error);
    }
  }, [userId]);

  /**
   * Procesa un comando de texto del usuario usando Gemini AI
   */
  const executeCommand = useCallback(
    async (userText: string): Promise<AxisToolResult[]> => {
      setIsProcessing(true);
      setLastAction(userText);
      console.warn('🧠 AXIS recibió comando:', userText);
      console.warn('🎯 AXIS activeAsset:', activeAsset ? activeAsset.name : 'NINGUNO');

      try {
        // 1. Verificar si es un alias
        const aliasResults = await executeAlias(userText);
        if (aliasResults) {
          // Agregar al historial y guardar en DB
          const aliasMessage = aliasResults.map((r) => r.message).join(' ');
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user', parts: [{ text: userText }] },
            { role: 'model', parts: [{ text: aliasMessage }] },
          ]);
          // Guardar en Supabase
          await saveMessageToSupabase('user', userText);
          await saveMessageToSupabase('model', aliasMessage);
          return aliasResults;
        }

        // 2. Si no hay API key, usar parseo básico
        if (!GEMINI_API_KEY) {
          console.warn('⚠️ GEMINI_API_KEY no configurada, usando parseo básico');
          const results = await parseAndExecuteBasic(userText);
          return results;
        }

        // 3. Llamar a Gemini con Function Calling (con historial de conversación)
        const geminiContext = buildGeminiContext();
        console.warn('🤖 Llamando a Gemini...');
        console.warn('📝 Contexto activeAsset:', geminiContext.activeAsset?.name || 'NINGUNO');

        const geminiResponse = await callGemini(
          userText,
          geminiContext,
          GEMINI_API_KEY,
          conversationHistory
        );

        console.warn('🤖 Gemini respondió:', geminiResponse.message);
        console.warn('🔧 Tool calls:', geminiResponse.toolCalls.length);

        // Variable para almacenar la respuesta final
        let finalResponseText = geminiResponse.message;

        // 4. Si Gemini devuelve tool calls, ejecutarlas
        if (geminiResponse.toolCalls.length > 0) {
          const results: AxisToolResult[] = [];
          const toolResults: Array<{ toolName: string; result: Record<string, unknown> }> = [];

          for (const toolCall of geminiResponse.toolCalls) {
            console.warn(`🔧 Ejecutando herramienta: ${toolCall.tool}`);
            const result = await executeTool(toolCall);
            results.push(result);
            toolResults.push({
              toolName: toolCall.tool,
              result: { success: result.success, message: result.message },
            });
          }

          // 5. Obtener respuesta final de Gemini después de ejecutar herramientas
          const finalMessage = await continueAfterToolExecution(
            userText,
            toolResults,
            geminiContext,
            GEMINI_API_KEY
          );

          // Agregar el mensaje final como resultado
          if (finalMessage && results.length > 0) {
            results[results.length - 1].message = finalMessage;
            finalResponseText = finalMessage;
          }

          // Actualizar historial de conversación y guardar en DB
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user', parts: [{ text: userText }] },
            { role: 'model', parts: [{ text: finalResponseText || 'Listo.' }] },
          ]);
          await saveMessageToSupabase('user', userText);
          await saveMessageToSupabase('model', finalResponseText || 'Listo.');

          // Trigger refresh si alguna operación fue exitosa
          if (results.some((r) => r.success)) {
            console.warn('🔄 AXIS: Operación exitosa, incrementando refreshTrigger');
            setRefreshTrigger((prev) => {
              console.warn('🔄 AXIS: refreshTrigger ahora será:', prev + 1);
              return prev + 1;
            });
          }

          return results;
        }

        // 6. Si no hay tool calls, devolver el mensaje de texto y actualizar historial
        setConversationHistory((prev) => [
          ...prev,
          { role: 'user', parts: [{ text: userText }] },
          { role: 'model', parts: [{ text: geminiResponse.message }] },
        ]);
        await saveMessageToSupabase('user', userText);
        await saveMessageToSupabase('model', geminiResponse.message);

        return [
          {
            success: true,
            message: geminiResponse.message,
          },
        ];
      } catch (e) {
        // Solo log de warning, no error (el fallback manejará esto)
        const errorName = (e as Error)?.name || 'Unknown';
        const isTimeout = errorName === 'AbortError';

        if (isTimeout) {
          console.warn('⏱️ Gemini timeout, usando parseo básico...');
        } else {
          console.warn('⚠️ Gemini falló:', (e as Error)?.message || 'Error desconocido');
        }

        // Fallback a parseo básico si Gemini falla
        const results = await parseAndExecuteBasic(userText);
        // Trigger refresh si alguna operación fue exitosa
        if (results.some((r) => r.success)) {
          setRefreshTrigger((prev) => prev + 1);
        }
        return results;
      } finally {
        setIsProcessing(false);
      }
    },
    [executeAlias, buildGeminiContext, executeTool, conversationHistory, saveMessageToSupabase]
  );

  /**
   * Parseo básico de patrones comunes (placeholder para LLM)
   */
  const parseAndExecuteBasic = async (text: string): Promise<AxisToolResult[]> => {
    const lower = text.toLowerCase();

    // Helper: Resolver "este ejercicio", "el actual", etc. al activeAsset
    const resolveExerciseName = (name: string): string => {
      const contextualPhrases = [
        'este ejercicio',
        'este',
        'el actual',
        'el que estoy viendo',
        'el de ahora',
        'este de aquí',
        'el ejercicio actual',
        'éste',
      ];
      const lowerName = name.toLowerCase().trim();
      if (contextualPhrases.some((phrase) => lowerName.includes(phrase)) && activeAsset) {
        return activeAsset.name;
      }
      return name.trim();
    };

    // Helper: Convertir ordinales a números
    const ordinalToNumber = (text: string): number | null => {
      const ordinals: Record<string, number> = {
        primera: 0,
        first: 0,
        '1ra': 0,
        '1ª': 0,
        segunda: 1,
        second: 1,
        '2da': 1,
        '2ª': 1,
        tercera: 2,
        third: 2,
        '3ra': 2,
        '3ª': 2,
        cuarta: 3,
        fourth: 3,
        '4ta': 3,
        '4ª': 3,
        quinta: 4,
        fifth: 4,
        '5ta': 4,
        '5ª': 4,
        sexta: 5,
        sixth: 5,
        '6ta': 5,
        '6ª': 5,
        séptima: 6,
        septima: 6,
        seventh: 6,
        '7ma': 6,
        '7ª': 6,
        octava: 7,
        eighth: 7,
        '8va': 7,
        '8ª': 7,
        novena: 8,
        ninth: 8,
        '9na': 8,
        '9ª': 8,
        décima: 9,
        decima: 9,
        tenth: 9,
        '10ma': 9,
        '10ª': 9,
      };
      for (const [ordinal, idx] of Object.entries(ordinals)) {
        if (text.includes(ordinal)) return idx;
      }
      return null;
    };

    // ⚠️ IMPORTANTE: Patrones de SERIES deben ir ANTES de patrones de EJERCICIOS

    // Patrón: "quita/elimina la última/primera/segunda serie"
    if ((lower.includes('quita') || lower.includes('elimina')) && lower.includes('serie')) {
      let seriesIndex: 'last' | 'first' | number = 'last';

      // Primero buscar ordinales
      const ordinalIdx = ordinalToNumber(lower);
      if (ordinalIdx !== null) {
        seriesIndex = ordinalIdx;
      } else if (lower.includes('última') || lower.includes('ultima') || lower.includes('last')) {
        seriesIndex = 'last';
      } else {
        // Buscar número específico "serie 3"
        const numMatch = lower.match(/serie\s*(\d+)/);
        if (numMatch) {
          seriesIndex = parseInt(numMatch[1], 10) - 1; // Convertir a 0-indexed
        }
      }

      if (activeAsset) {
        const result = await executeTool({
          tool: 'ASSET_REMOVE_SERIES',
          parameters: {
            assetName: activeAsset.name,
            seriesIndex: seriesIndex,
          },
        });
        return [result];
      }
    }

    // Patrón: "agrega/añade una serie"
    if ((lower.includes('agrega') || lower.includes('añade')) && lower.includes('serie')) {
      // Extraer reps si se especifican (soporta: "10 reps", "1 repetición", "12 repeticiones")
      let reps = 10;
      const repsMatch = lower.match(/(\d+)\s*(?:reps?|repetici[oó]n(?:es)?)/);
      if (repsMatch) {
        reps = parseInt(repsMatch[1], 10);
      }

      // Extraer peso si se especifica
      let weight = 0;
      const weightMatch = lower.match(/(\d+)\s*(?:kg|kilos?)/);
      if (weightMatch) {
        weight = parseInt(weightMatch[1], 10);
      }

      // Extraer tipo
      let seriesType: 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE' = 'EFFECTIVE';
      if (lower.includes('calentamiento') || lower.includes('warmup')) {
        seriesType = 'WARMUP';
      } else if (lower.includes('fallo') || lower.includes('failure')) {
        seriesType = 'FAILURE';
      } else if (
        lower.includes('aproximación') ||
        lower.includes('approach') ||
        lower.includes('aproximacion')
      ) {
        seriesType = 'APPROACH';
      }

      if (activeAsset) {
        const result = await executeTool({
          tool: 'ASSET_ADD_SERIES',
          parameters: {
            assetName: activeAsset.name,
            reps,
            weight,
            seriesType,
          },
        });
        return [result];
      }
    }

    // Patrón: "quita/elimina X" (EJERCICIO - solo si NO menciona "serie")
    if ((lower.includes('quita') || lower.includes('elimina')) && !lower.includes('serie')) {
      const match = text.match(/(?:quita|elimina)\s+(?:la\s+)?(.+)/i);
      if (match) {
        const exerciseName = resolveExerciseName(match[1]);
        const result = await executeTool({
          tool: 'GYM_REMOVE_EXERCISE',
          parameters: { exerciseName },
        });
        return [result];
      }
    }

    // Patrón: "cambia X por Y" o "reemplaza X por Y"
    if (lower.includes('cambia') || lower.includes('reemplaza') || lower.includes('pon')) {
      // Patrón con "por"
      const matchWithPor = text.match(
        /(?:cambia|reemplaza|pon)\s+(.+?)\s+(?:por|en lugar de)\s+(.+)/i
      );
      if (matchWithPor) {
        const oldExerciseName = resolveExerciseName(matchWithPor[1]);
        const newExerciseName = matchWithPor[2].trim();
        const result = await executeTool({
          tool: 'GYM_REPLACE_EXERCISE',
          parameters: { oldExerciseName, newExerciseName },
        });
        return [result];
      }

      // Patrón sin especificar nuevo: "cambia este ejercicio" (usa activeAsset)
      if (activeAsset && (lower.includes('este') || lower.includes('actual'))) {
        // Si dice "por otro" sin especificar, sugerir alternativas DEL CATÁLOGO REAL
        if (
          lower.includes('por otro') ||
          lower.includes('tu decide') ||
          lower.includes('tú decide') ||
          lower.includes('escoge') ||
          lower.includes('elige')
        ) {
          // Filtrar ejercicios disponibles excluyendo el actual
          const suggestions = availableExercises
            .filter((ex) => ex !== activeAsset.name)
            .slice(0, 5);

          return [
            {
              success: false,
              message: `🏋️ Estás en **${activeAsset.name}**. ¿Por cuál quieres cambiarlo?\n\nEjercicios disponibles:\n${suggestions.map((s) => `• ${s}`).join('\n')}\n\nDime el nombre exacto.`,
            },
          ];
        }
      }
    }

    // Patrón: "agrega/añade X" (ejercicio - solo si NO menciona "serie")
    if ((lower.includes('agrega') || lower.includes('añade')) && !lower.includes('serie')) {
      const match = text.match(/(?:agrega|añade)\s+(.+)/i);
      if (match) {
        // Usar el día del contexto de pantalla (UI) si está disponible
        const currentDay = screenContext.currentTrainingDay ?? userProfile.currentTrainingDay;
        const result = await executeTool({
          tool: 'GYM_ADD_EXERCISE',
          parameters: {
            exerciseName: match[1].trim(),
            trainingDay: currentDay,
          },
        });
        return [result];
      }
    }

    // Patrón: "súbele/bájale X calorías a Y"
    const calorieMatch = text.match(
      /(súbele|bájale|sube|baja)\s+(\d+)\s*(?:cal|calorías?)?\s*(?:a\s+)?(?:la\s+)?(.+)/i
    );
    if (calorieMatch) {
      const isAdd =
        calorieMatch[1].toLowerCase().startsWith('súb') ||
        calorieMatch[1].toLowerCase().startsWith('sub');
      const amount = parseInt(calorieMatch[2], 10);
      const result = await executeTool({
        tool: 'DIET_ADD_CALORIES',
        parameters: {
          mealName: calorieMatch[3].trim(),
          caloriesChange: isAdd ? amount : -amount,
        },
      });
      return [result];
    }

    // Patrón: "mi rutina" o "qué tengo"
    if (lower.includes('mi rutina') || lower.includes('qué tengo') || lower.includes('que tengo')) {
      const result = await executeTool({
        tool: 'GYM_LIST_EXERCISES',
        parameters: {},
      });
      return [result];
    }

    // No se pudo parsear
    return [
      {
        success: false,
        message:
          '🤔 No entendí el comando. Prueba con:\n• "quita la Prensa"\n• "cambia Prensa por Sentadilla Hack"\n• "súbele 200 calorías a la cena"',
      },
    ];
  };

  // -------------------------------------------------------------------------
  // LLM INTEGRATION HELPERS
  // -------------------------------------------------------------------------

  /**
   * Genera el System Prompt con contexto actual
   */
  const getSystemPrompt = useCallback((): string => {
    // Usar el día del contexto de pantalla (UI) si está disponible, sino el del perfil
    const currentDay = screenContext.currentTrainingDay ?? userProfile.currentTrainingDay;

    return `Eres AXIS, el asistente de IA de TRENS (High-Performance Fitness App).

CONTEXTO ACTUAL:
- Módulo activo: ${screenContext.module.toUpperCase()}
- Vista: ${screenContext.viewMode || 'principal'}
- Deporte: ${sportMode || 'No definido'}
- Nivel del usuario: ${userProfile.level}
- Día de entrenamiento actual: ${currentDay + 1} (índice: ${currentDay})

IMPORTANTE: Cuando el usuario pida modificar series de un ejercicio, usa trainingDay: ${currentDay}

${
  activeAsset
    ? `
ASSET ACTIVO:
- Nombre: ${activeAsset.name}
- Tipo: ${activeAsset.type}
- Datos: ${JSON.stringify(activeAsset.liquidData, null, 2)}
`
    : ''
}

${
  aliases.length > 0
    ? `
ALIAS DEL USUARIO:
${aliases.map((a) => `- "${a.trigger}": ${a.description || a.actions.map((ac) => ac.tool).join(', ')}`).join('\n')}
`
    : ''
}

INSTRUCCIONES:
1. Responde de forma concisa y directa. Estilo "savage", sin rodeos.
2. Si el usuario pide cambiar algo, USA las herramientas disponibles.
3. Confirma SIEMPRE después de ejecutar una acción.
4. Si no entiendes algo, pregunta claramente.
5. Respeta el RLS: solo puedes modificar datos del usuario actual.

IMPORTANTE: Puedes ejecutar múltiples herramientas si la solicitud lo requiere.`;
  }, [screenContext, sportMode, userProfile, activeAsset, aliases]);

  // -------------------------------------------------------------------------
  // CONTEXT VALUE
  // -------------------------------------------------------------------------
  const value = useMemo<AxisContextState>(
    () => ({
      // State
      isProcessing: isProcessing || isExecuting,
      lastAction,

      // Dynamic context
      screenContext,
      activeAsset,
      sportMode,
      userProfile,
      availableExercises,

      // Aliases
      aliases,

      // Actions
      executeCommand,
      executeTool,
      executeToolChain,

      // Context updates
      setScreenContext,
      setActiveAsset,
      setSportMode,

      // Alias management
      addAlias,
      removeAlias,
      executeAlias,

      // Conversation management
      clearConversation,

      // Data refresh trigger
      refreshTrigger,

      // LLM Integration
      getToolDefinitions,
      getSystemPrompt,
    }),
    [
      isProcessing,
      isExecuting,
      lastAction,
      screenContext,
      activeAsset,
      sportMode,
      userProfile,
      availableExercises,
      aliases,
      executeCommand,
      executeTool,
      executeToolChain,
      setActiveAsset,
      addAlias,
      removeAlias,
      executeAlias,
      clearConversation,
      refreshTrigger,
      getToolDefinitions,
      getSystemPrompt,
    ]
  );

  return <AxisContext.Provider value={value}>{children}</AxisContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================
export const useAxis = (): AxisContextState => {
  const context = useContext(AxisContext);
  if (!context) {
    throw new Error('useAxis debe usarse dentro de un AxisProvider');
  }
  return context;
};
