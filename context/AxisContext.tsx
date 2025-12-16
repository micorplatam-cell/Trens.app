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
  ReactNode,
} from 'react';
import { useAxisExecutor } from '../hooks/useAxisExecutor';
import { supabase } from '../lib/supabase';
import { callGemini, continueAfterToolExecution } from '../services/axis/gemini';
import type {
  AxisContextState,
  AxisToolResult,
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

export const AxisProvider = ({ children, userId }: AxisProviderProps) => {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Conversation History - Para que AXIS recuerde el contexto del chat
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

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
  const { executeTool, executeToolChain, getToolDefinitions, isExecuting } = useAxisExecutor({
    userId,
  });

  // -------------------------------------------------------------------------
  // CONTEXT UPDATES
  // -------------------------------------------------------------------------

  /**
   * Carga un asset activo desde Supabase
   */
  const setActiveAsset = useCallback(
    async (assetId: string | null) => {
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
   */
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
  }, []);

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
          // Agregar al historial
          const aliasMessage = aliasResults.map((r) => r.message).join(' ');
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user', parts: [{ text: userText }] },
            { role: 'model', parts: [{ text: aliasMessage }] },
          ]);
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

          // Actualizar historial de conversación
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user', parts: [{ text: userText }] },
            { role: 'model', parts: [{ text: finalResponseText || 'Listo.' }] },
          ]);

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

        return [
          {
            success: true,
            message: geminiResponse.message,
          },
        ];
      } catch (e) {
        console.error('AXIS executeCommand error:', e);
        console.warn('❌ Error completo:', JSON.stringify(e, null, 2));
        // Fallback a parseo básico si Gemini falla
        console.warn('⚠️ Gemini falló, usando parseo básico');
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
    [executeAlias, buildGeminiContext, executeTool, conversationHistory]
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

    // Patrón: "quita/elimina X"
    if (lower.includes('quita') || lower.includes('elimina')) {
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

    // Patrón: "agrega/añade X"
    if (lower.includes('agrega') || lower.includes('añade')) {
      const match = text.match(/(?:agrega|añade)\s+(.+)/i);
      if (match) {
        const result = await executeTool({
          tool: 'GYM_ADD_EXERCISE',
          parameters: {
            exerciseName: match[1].trim(),
            trainingDay: userProfile.currentTrainingDay,
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
    return `Eres AXIS, el asistente de IA de TRENS (High-Performance Fitness App).

CONTEXTO ACTUAL:
- Módulo activo: ${screenContext.module.toUpperCase()}
- Vista: ${screenContext.viewMode || 'principal'}
- Deporte: ${sportMode || 'No definido'}
- Nivel del usuario: ${userProfile.level}
- Día de entrenamiento: ${userProfile.currentTrainingDay + 1}

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
