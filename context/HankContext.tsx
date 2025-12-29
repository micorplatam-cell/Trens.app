// ============================================================================
// HANK CONTEXT - Proveedor global completo para el Agente HANK
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
import { useHankExecutor } from '../hooks/useHankExecutor';
import { supabase } from '../lib/supabase';
import { callGemini, continueAfterToolExecution } from '../services/hank/gemini';
import { useSport } from './SportContext';
import { hankLogger, syncLogger } from '../lib/logger';
import type {
  HankContextState,
  HankToolResult,
  HankToolCall,
  ScreenContext,
  ActiveAsset,
  SportMode,
  UserProfile,
  UserAlias,
  HankTarget,
  HankAnimationPhase,
  HankTargetState,
} from '../types/hank';

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
const HankContext = createContext<HankContextState | undefined>(undefined);

// ============================================================================
// PROVIDER PROPS
// ============================================================================
interface HankProviderProps {
  children: ReactNode;
  userId: string | null;
}

// ============================================================================
// HANK PROVIDER
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

// Helper para validar UUID (evita enviar "visitor" a la DB)
const isValidUUID = (str: string | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const HankProvider = ({ children, userId }: HankProviderProps) => {
  // Verificar si el userId es válido para operaciones de DB
  const isValidUser = isValidUUID(userId);

  // Obtener deporte activo del SportContext
  const sportContext = useSport();
  const activeSportCode = sportContext?.activeSport?.code || 'GYM';

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Conversation History - Para que HANK recuerde el contexto del chat (máximo 24h)
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  // Flag para indicar si ya se cargó/verificó el historial
  const historyInitialized = useRef(false);

  // Refresh Trigger - Se incrementa cuando HANK modifica datos para que las pantallas recarguen
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Método para disparar refresh desde otros módulos
  const triggerRefresh = useCallback(() => {
    syncLogger.debug('triggerRefresh llamado externamente');
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Macro Cache Invalidation - Se incrementa cuando se actualizan datos del perfil
  const [macroCacheInvalidate, setMacroCacheInvalidate] = useState(0);

  // -------------------------------------------------------------------------
  // TARGETING SYSTEM - Para animaciones visuales de Hank
  // -------------------------------------------------------------------------
  const [currentTarget, setCurrentTarget] = useState<HankTarget | null>(null);
  const [animationPhase, setAnimationPhase] = useState<HankAnimationPhase>('idle');
  const registeredTargets = useRef<Map<string, HankTarget>>(new Map());

  const registerTarget = useCallback((id: string, target: Omit<HankTarget, 'id'>) => {
    registeredTargets.current.set(id, { ...target, id });
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    registeredTargets.current.delete(id);
  }, []);

  const startTargetAnimation = useCallback((target: HankTarget) => {
    console.warn('🎯 HANK: Iniciando animación hacia', target.label);
    setCurrentTarget(target);
    setAnimationPhase('flying');

    // Después de volar (800ms), cambiar a working
    setTimeout(() => {
      setAnimationPhase('working');
    }, 800);
  }, []);

  const completeTargetAnimation = useCallback((success: boolean) => {
    console.warn('✨ HANK: Completando animación', success ? 'con éxito' : 'con error');
    setAnimationPhase(success ? 'success' : 'idle');

    // Flash de éxito y luego regresar
    setTimeout(() => {
      setAnimationPhase('returning');
      setTimeout(() => {
        setAnimationPhase('idle');
        setCurrentTarget(null);
      }, 600);
    }, 400);
  }, []);

  // Dynamic Context
  const [screenContext, setScreenContext] = useState<ScreenContext>(defaultScreenContext);
  const [activeAsset, setActiveAssetState] = useState<ActiveAsset | null>(null);
  const [sportMode, setSportMode] = useState<SportMode>(activeSportCode as SportMode);
  const [userProfile] = useState<UserProfile>(defaultUserProfile);

  // Sincronizar sportMode con el deporte activo del SportContext
  useEffect(() => {
    if (activeSportCode) {
      setSportMode(activeSportCode as SportMode);
    }
  }, [activeSportCode]);

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
  } = useHankExecutor({
    userId,
    currentTrainingDay: screenContext.currentTrainingDay ?? 0, // Pasar día actual de la pantalla
  });

  // Wrapper para executeTool que incrementa refreshTrigger si exitoso
  // También dispara animación visual si hay target registrado
  const executeTool = useCallback(
    async (toolCall: HankToolCall): Promise<HankToolResult> => {
      // Buscar target registrado que coincida con el contexto
      const registeredTarget = registeredTargets.current.values().next().value;

      // Si hay target, iniciar animación
      if (registeredTarget) {
        startTargetAnimation(registeredTarget);
      }

      const result = await executeToolRaw(toolCall);

      // Completar animación según resultado
      if (registeredTarget) {
        completeTargetAnimation(result.success);
      }

      if (result.success) {
        console.warn('🔄 executeTool exitoso, incrementando refreshTrigger');
        setRefreshTrigger((prev) => prev + 1);
      }
      return result;
    },
    [executeToolRaw, startTargetAnimation, completeTargetAnimation]
  );

  // Wrapper para executeToolChain que incrementa refreshTrigger si alguno exitoso
  // También dispara animación visual si hay target registrado
  const executeToolChain = useCallback(
    async (toolCalls: HankToolCall[]): Promise<HankToolResult[]> => {
      // Buscar target registrado que coincida con el contexto
      const registeredTarget = registeredTargets.current.values().next().value;

      // Si hay target, iniciar animación
      if (registeredTarget) {
        startTargetAnimation(registeredTarget);
      }

      const results = await executeToolChainRaw(toolCalls);
      const hasSuccess = results.some((r) => r.success);

      // Completar animación según resultado
      if (registeredTarget) {
        completeTargetAnimation(hasSuccess);
      }

      if (hasSuccess) {
        console.warn('🔄 executeToolChain exitoso, incrementando refreshTrigger');
        setRefreshTrigger((prev) => prev + 1);
      }
      return results;
    },
    [executeToolChainRaw, startTargetAnimation, completeTargetAnimation]
  );

  // -------------------------------------------------------------------------
  // CHAT MEMORY MANAGEMENT - Sistema de 24 horas con Supabase
  // -------------------------------------------------------------------------

  /**
   * Cargar historial desde Supabase y limpiar mensajes antiguos (medianoche)
   * Solo para usuarios autenticados con UUID válido
   */
  useEffect(() => {
    const initializeChatHistory = async () => {
      // Solo cargar historial para usuarios con UUID válido (no "visitor")
      if (historyInitialized.current || !isValidUser) return;
      historyInitialized.current = true;

      try {
        // Primero, limpiar mensajes anteriores a medianoche usando la función de DB
        const { data: cleanedCount, error: cleanError } = await supabase.rpc(
          'clean_old_hank_messages',
          { p_user_id: userId }
        );

        if (cleanError) {
          console.warn('⚠️ HANK: Error limpiando mensajes antiguos:', cleanError.message);
        } else if (cleanedCount && cleanedCount > 0) {
          console.warn(`🧹 HANK: Limpiados ${cleanedCount} mensajes de días anteriores`);
        }

        // Cargar mensajes del día de hoy
        const { data: messages, error } = await supabase
          .from('hank_chat_messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('⚠️ HANK: Error cargando historial:', error.message);
          return;
        }

        if (messages && messages.length > 0) {
          // Convertir de DB format a Gemini format
          const history: ChatMessage[] = messages.map((msg: DBChatMessage) => ({
            role: msg.role,
            parts: [{ text: msg.content }],
          }));
          console.warn(`🧠 HANK: Cargando ${history.length} mensajes del historial`);
          setConversationHistory(history);
        }
      } catch (error) {
        console.warn('⚠️ HANK: Error inicializando historial:', error);
      }
    };

    initializeChatHistory();
  }, [userId, isValidUser]);

  /**
   * Guardar un mensaje en Supabase
   * Solo para usuarios autenticados con UUID válido
   */
  const saveMessageToSupabase = useCallback(
    async (role: 'user' | 'model', content: string) => {
      // No guardar para visitantes
      if (!isValidUser) {
        return;
      }

      console.warn('💾 HANK: Intentando guardar mensaje:', {
        role,
        userId,
        contentLength: content.length,
      });

      try {
        const { data, error } = await supabase
          .from('hank_chat_messages')
          .insert({
            user_id: userId,
            role,
            content,
          })
          .select();

        if (error) {
          console.warn(
            '⚠️ HANK: Error guardando mensaje:',
            error.message,
            error.details,
            error.hint
          );
        } else {
          console.warn('✅ HANK: Mensaje guardado exitosamente:', data);
        }
      } catch (error) {
        console.warn('⚠️ HANK: Error guardando mensaje:', error);
      }
    },
    [userId, isValidUser]
  );

  /**
   * Verificar medianoche periódicamente (cada minuto)
   * Esto asegura que si el usuario tiene la app abierta a medianoche, se limpie
   * Solo para usuarios autenticados
   */
  useEffect(() => {
    if (!isValidUser) return;

    const checkMidnight = async () => {
      // Llamar a la función de limpieza de DB
      const { data: cleanedCount, error } = await supabase.rpc('clean_old_hank_messages', {
        p_user_id: userId,
      });

      if (!error && cleanedCount && cleanedCount > 0) {
        console.warn(`🧹 HANK: ¡Medianoche! Limpiados ${cleanedCount} mensajes automáticamente`);
        setConversationHistory([]);
      }
    };

    // Verificar cada minuto (60000 ms)
    const interval = setInterval(checkMidnight, 60000);

    return () => clearInterval(interval);
  }, [userId, isValidUser]);

  // -------------------------------------------------------------------------
  // CONTEXT UPDATES
  // -------------------------------------------------------------------------

  /**
   * Carga un asset activo desde Supabase
   * @param assetId - ID del asset (user_exercise_config.id)
   * @param alternativeInfo - Info si es una alternativa
   */
  const setActiveAsset = useCallback(
    async (
      assetId: string | null,
      alternativeInfo?: { isAlternative: boolean; parentExerciseName: string }
    ) => {
      // Visitantes no tienen assets en DB
      if (!assetId || !isValidUser) {
        setActiveAssetState(null);
        return;
      }

      try {
        // Helper para cargar notas e historial de videos
        const loadNotesAndHistory = async (exerciseId: string, exerciseName: string) => {
          console.warn(
            `🔍 loadNotesAndHistory: ejercicio="${exerciseName}", exercise_id="${exerciseId}"`
          );

          // Fecha de hoy
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];

          // 1. Cargar notas de user_exercise_config
          const { data: configData, error: configError } = await supabase
            .from('user_exercise_config')
            .select('metadata')
            .eq('user_id', userId)
            .eq('exercise_id', exerciseId)
            .single();

          console.warn(
            `🔍 user_exercise_config: ${configData ? 'ENCONTRADO' : 'NO'}, error: ${configError?.message || 'ninguno'}`
          );

          let currentNotes = configData?.metadata?.notes || '';
          let currentTags = configData?.metadata?.tags || [];

          // 2. Cargar historial de videos/notas - primero por exercise_id, luego fallback por nombre
          let { data: videoHistory, error: videoError } = await supabase
            .from('pro_videos')
            .select(
              'id, weight_kg, reps, notes, exercise_notes, tags, created_at, exercise_id, exercise_name'
            )
            .eq('user_id', userId)
            .eq('exercise_id', exerciseId)
            .order('created_at', { ascending: false })
            .limit(10);

          // Fallback: si no hay videos por ID, buscar por nombre (case-insensitive)
          if ((!videoHistory || videoHistory.length === 0) && exerciseName) {
            const { data: videosByName } = await supabase
              .from('pro_videos')
              .select(
                'id, weight_kg, reps, notes, exercise_notes, tags, created_at, exercise_id, exercise_name'
              )
              .eq('user_id', userId)
              .ilike('exercise_name', exerciseName)
              .order('created_at', { ascending: false })
              .limit(10);

            if (videosByName && videosByName.length > 0) {
              videoHistory = videosByName;
              console.warn(
                `🔍 pro_videos: fallback por nombre encontró ${videosByName.length} registros`
              );
            } else {
              // Debug: ver qué hay en pro_videos para este usuario
              const { data: allVideos } = await supabase
                .from('pro_videos')
                .select('exercise_name, notes, exercise_notes')
                .eq('user_id', userId)
                .not('notes', 'is', null)
                .limit(5);
              console.warn(
                `🔍 DEBUG: Videos con notas del usuario:`,
                allVideos?.map((v) => ({
                  name: v.exercise_name,
                  notes: v.notes?.substring(0, 30),
                })) || 'NINGUNO'
              );
            }
          }

          console.warn(
            `🔍 pro_videos: ${videoHistory?.length || 0} videos, error: ${videoError?.message || 'ninguno'}`
          );

          const history: Array<{
            date: string;
            isToday: boolean;
            weightKg: number | null;
            reps: number | null;
            notes: string | null;
            tags: string[] | null;
          }> = [];

          let todayNotes: string | null = null;
          let todayTags: string[] | null = null;

          videoHistory?.forEach((v: any) => {
            const date = new Date(v.created_at);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const noteContent = v.notes || v.exercise_notes;

            if (isToday && noteContent && !todayNotes) {
              todayNotes = noteContent;
              todayTags = v.tags;
            }

            history.push({
              date: date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
              }),
              isToday,
              weightKg: v.weight_kg,
              reps: v.reps,
              notes: noteContent,
              tags: v.tags,
            });
          });

          // Si no hay notas en config pero sí en videos, usar las de video
          if (!currentNotes && videoHistory && videoHistory.length > 0) {
            const mostRecentWithNotes = videoHistory.find((v: any) => v.notes || v.exercise_notes);
            if (mostRecentWithNotes) {
              currentNotes = mostRecentWithNotes.notes || mostRecentWithNotes.exercise_notes;
              currentTags = mostRecentWithNotes.tags || [];
            }
          }

          return {
            currentNotes,
            currentTags,
            todayNotes,
            todayTags,
            videoHistory: history,
          };
        };

        // 🔧 FIX: Si es alternativa, cargar desde la tabla exercises directamente
        if (alternativeInfo?.isAlternative) {
          console.log('🔄 setActiveAsset: Cargando ALTERNATIVA:', assetId);

          const { data: altData, error: altError } = await supabase
            .from('exercises')
            .select('id, name, muscle_group, equipment, difficulty')
            .eq('id', assetId)
            .single();

          if (altError || !altData) {
            console.warn('⚠️ setActiveAsset: No se encontró la alternativa:', assetId);
            setActiveAssetState(null);
            return;
          }

          console.log(
            '✅ setActiveAsset: Alternativa cargada:',
            altData.name,
            '(de',
            alternativeInfo.parentExerciseName,
            ')'
          );

          // Cargar notas e historial para la alternativa
          const notesData = await loadNotesAndHistory(altData.id, altData.name);

          setActiveAssetState({
            id: altData.id,
            type: 'exercise',
            name: altData.name,
            liquidData: {
              notes: notesData.currentNotes,
              tags: notesData.currentTags,
              todayNotes: notesData.todayNotes,
              todayTags: notesData.todayTags,
              videoHistory: notesData.videoHistory,
            },
            trainingDays: [],
            isAlternative: true,
            parentExerciseName: alternativeInfo.parentExerciseName,
          });
          return;
        }

        // Cargar desde user_exercise_config (nueva arquitectura) - EJERCICIO PRINCIPAL
        // assetId puede ser exercise_id (de tabla exercises) o user_exercise_config.id
        // Intentar primero por exercise_id, luego por id
        let data: any = null;
        let error: any = null;

        // Primero intentar buscar por exercise_id
        const { data: dataByExerciseId, error: errorByExerciseId } = await supabase
          .from('user_exercise_config')
          .select(
            `
            id,
            exercise_id,
            training_days,
            display_order,
            config,
            metadata,
            exercises (
              name,
              muscle_group,
              equipment,
              difficulty
            )
          `
          )
          .eq('exercise_id', assetId)
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (dataByExerciseId) {
          data = dataByExerciseId;
          error = null;
        } else {
          // Fallback: buscar por id (user_exercise_config.id)
          const { data: dataById, error: errorById } = await supabase
            .from('user_exercise_config')
            .select(
              `
            id,
            exercise_id,
            training_days,
            display_order,
            config,
            metadata,
            exercises (
              name,
              muscle_group,
              equipment,
              difficulty
            )
          `
            )
            .eq('id', assetId)
            .eq('user_id', userId)
            .single();

          data = dataById;
          error = errorById;
        }

        if (error || !data) {
          console.warn('⚠️ setActiveAsset: No se encontró el ejercicio:', assetId, error?.message);
          setActiveAssetState(null);
          return;
        }

        const exerciseData = data as unknown as {
          id: string;
          exercise_id: string;
          training_days: number[];
          display_order: number;
          config: Record<string, unknown>;
          metadata: { notes?: string; tags?: string[] } | null;
          exercises: {
            name: string;
            muscle_group: string;
            equipment: string[];
            difficulty: string;
          } | null;
        };

        console.log('✅ setActiveAsset: Ejercicio cargado:', exerciseData.exercises?.name);

        // Cargar notas e historial para el ejercicio principal
        const notesData = await loadNotesAndHistory(
          exerciseData.exercise_id,
          exerciseData.exercises?.name || ''
        );

        setActiveAssetState({
          id: exerciseData.id,
          type: 'exercise',
          name: exerciseData.exercises?.name || 'Sin nombre',
          liquidData: {
            ...exerciseData.config,
            notes: notesData.currentNotes,
            tags: notesData.currentTags,
            todayNotes: notesData.todayNotes,
            todayTags: notesData.todayTags,
            videoHistory: notesData.videoHistory,
          },
          trainingDays: exerciseData.training_days,
          isAlternative: false,
          parentExerciseName: undefined,
        });
      } catch (e) {
        console.error('Error loading active asset:', e);
        setActiveAssetState(null);
      }
    },
    [userId, isValidUser]
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
    async (trigger: string): Promise<HankToolResult[] | null> => {
      const alias = aliases.find((a) => a.trigger.toLowerCase() === trigger.toLowerCase());

      if (!alias) return null;

      console.warn(`🤖 HANK: Ejecutando alias "${alias.trigger}"`);
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
    // 🐛 FIX: Usar screenContext.currentTrainingDay (real) en lugar de userProfile.currentTrainingDay (siempre 0)
    const realTrainingDay = screenContext.currentTrainingDay ?? 0;
    console.warn(
      `📝 buildGeminiContext: día=${realTrainingDay}, ejercicio=${activeAsset?.name || 'NINGUNO'}`
    );

    return {
      screenModule: screenContext.module,
      sportMode: sportMode,
      userLevel: userProfile.level,
      currentTrainingDay: realTrainingDay,
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
   * Elimina todos los mensajes del usuario en Supabase (solo usuarios autenticados)
   */
  const clearConversation = useCallback(async () => {
    setConversationHistory([]);
    // Solo limpiar en DB para usuarios autenticados
    if (!isValidUser) return;

    try {
      const { error } = await supabase.from('hank_chat_messages').delete().eq('user_id', userId);

      if (error) {
        console.warn('⚠️ HANK: Error limpiando historial:', error.message);
      } else {
        console.warn('🧹 HANK: Historial del chat limpiado manualmente');
      }
    } catch (error) {
      console.warn('⚠️ HANK: Error limpiando historial:', error);
    }
  }, [userId, isValidUser]);

  /**
   * Procesa un comando de texto del usuario usando Gemini AI
   * @param userText - El comando a procesar
   * @param options - Opciones adicionales
   * @param options.saveToHistory - Si es false, no guarda en historial ni Supabase (default: true)
   */
  const executeCommand = useCallback(
    async (userText: string, options?: { saveToHistory?: boolean }): Promise<HankToolResult[]> => {
      const saveToHistory = options?.saveToHistory !== false; // default true
      setIsProcessing(true);
      setLastAction(userText);
      console.warn('🧠 HANK recibió comando:', userText);
      console.warn('🧠 HANK saveToHistory:', saveToHistory);
      console.warn('🎯 HANK activeAsset:', activeAsset ? activeAsset.name : 'NINGUNO');

      try {
        // 1. Verificar si es un alias
        const aliasResults = await executeAlias(userText);
        if (aliasResults) {
          // Agregar al historial y guardar en DB solo si saveToHistory es true
          if (saveToHistory) {
            const aliasMessage = aliasResults.map((r) => r.message).join(' ');
            setConversationHistory((prev) => [
              ...prev,
              { role: 'user', parts: [{ text: userText }] },
              { role: 'model', parts: [{ text: aliasMessage }] },
            ]);
            // Guardar en Supabase
            await saveMessageToSupabase('user', userText);
            await saveMessageToSupabase('model', aliasMessage);
          }
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
        console.warn('📜 Historial de conversación:', conversationHistory.length, 'mensajes');

        // 🔧 FIX: Limitar historial a últimos 10 mensajes para evitar confusión
        const recentHistory = conversationHistory.slice(-10);

        const geminiResponse = await callGemini(
          userText,
          geminiContext,
          GEMINI_API_KEY,
          recentHistory
        );

        console.warn('🤖 Gemini respondió:', geminiResponse.message?.substring(0, 100));
        console.warn('🔧 Tool calls:', geminiResponse.toolCalls.length);
        if (geminiResponse.toolCalls.length > 0) {
          console.warn(
            '🔧 Tools:',
            geminiResponse.toolCalls
              .map((tc) => `${tc.tool}(${JSON.stringify(tc.parameters)})`)
              .join(', ')
          );
        } else {
          console.warn('⚠️ GEMINI NO LLAMÓ NINGUNA HERRAMIENTA - solo texto');
        }

        // Variable para almacenar la respuesta final
        let finalResponseText = geminiResponse.message;

        // 4. Si Gemini devuelve tool calls, ejecutarlas
        if (geminiResponse.toolCalls.length > 0) {
          const results: HankToolResult[] = [];
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

          // Actualizar historial de conversación y guardar en DB solo si saveToHistory es true
          if (saveToHistory) {
            setConversationHistory((prev) => [
              ...prev,
              { role: 'user', parts: [{ text: userText }] },
              { role: 'model', parts: [{ text: finalResponseText || 'Listo.' }] },
            ]);
            await saveMessageToSupabase('user', userText);
            await saveMessageToSupabase('model', finalResponseText || 'Listo.');
          }

          // Trigger refresh si alguna operación fue exitosa
          if (results.some((r) => r.success)) {
            console.warn('🔄 HANK: Operación exitosa, incrementando refreshTrigger');
            setRefreshTrigger((prev) => {
              console.warn('🔄 HANK: refreshTrigger ahora será:', prev + 1);
              return prev + 1;
            });
          }

          return results;
        }

        // 6. Si no hay tool calls, devolver el mensaje de texto y actualizar historial
        if (saveToHistory) {
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user', parts: [{ text: userText }] },
            { role: 'model', parts: [{ text: geminiResponse.message }] },
          ]);
          await saveMessageToSupabase('user', userText);
          await saveMessageToSupabase('model', geminiResponse.message);
        }

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
  const parseAndExecuteBasic = async (text: string): Promise<HankToolResult[]> => {
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
      let seriesType: 'CALENTAMIENTO' | 'APROXIMACION' | 'EFECTIVA' | 'FALLO' = 'EFECTIVA';
      if (lower.includes('calentamiento') || lower.includes('warmup')) {
        seriesType = 'CALENTAMIENTO';
      } else if (
        lower.includes('fallo') ||
        lower.includes('failure') ||
        lower.includes('intensidad')
      ) {
        seriesType = 'FALLO';
      } else if (
        lower.includes('aproximación') ||
        lower.includes('approach') ||
        lower.includes('aproximacion')
      ) {
        seriesType = 'APROXIMACION';
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
   * Genera instrucciones específicas por deporte
   */
  const getSportInstructions = useCallback((sport: SportMode): string => {
    switch (sport) {
      case 'GYM':
        return `MODO GYM:
- Puedes gestionar ejercicios, series, repeticiones y pesos
- Herramientas: GYM_ADD_EXERCISE, GYM_REMOVE_EXERCISE, GYM_MODIFY_SERIES, GYM_REPLACE_EXERCISE
- Ayuda con técnica, nutrición (PLAN), y progresión de cargas
- Vocabulario: ejercicios, series, reps, PR, fallo muscular, descanso`;

      case 'MOTO':
        return `MODO MOTO:
- Gestiona vehículos, mantenimientos y eventos/carreras
- Herramientas: INVENTORY_ADD, INVENTORY_UPDATE, EVENT_CREATE, MAINTENANCE_LOG
- Ayuda con setup de moto, telemetría, y preparación pre-carrera
- Vocabulario: circuito, vuelta rápida, presión neumáticos, suspensión, frenada`;

      case 'AUTO':
        return `MODO AUTO:
- Similar a MOTO pero para automóviles
- Gestiona vehículos, mantenimientos y eventos/track days
- Herramientas: INVENTORY_ADD, INVENTORY_UPDATE, EVENT_CREATE, MAINTENANCE_LOG
- Vocabulario: track day, stint, pit stop, setup, telemetría`;

      case 'SURF':
        return `MODO SURF:
- Gestiona tablas (quiver), gear y sesiones de surf
- Herramientas: INVENTORY_ADD, SESSION_LOG, SPOT_FAVORITE
- Ayuda con condiciones, forecast, y elección de tabla
- Vocabulario: swell, periodo, marea, offshore, quiver, spot`;

      default:
        return 'Deporte no especificado. Pregunta al usuario qué tipo de actividad realiza.';
    }
  }, []);

  /**
   * Genera el System Prompt con contexto actual
   */
  const getSystemPrompt = useCallback((): string => {
    // Usar el día del contexto de pantalla (UI) si está disponible, sino el del perfil
    const currentDay = screenContext.currentTrainingDay ?? userProfile.currentTrainingDay;
    const sportName = sportContext?.activeSport?.name || 'No definido';

    // Debug: ver qué contexto tiene HANK
    console.warn('🧠 HANK getSystemPrompt - activeAsset:', activeAsset?.name || 'NINGUNO');
    console.warn('🧠 HANK liquidData:', JSON.stringify(activeAsset?.liquidData || {}, null, 2));

    return `Eres HANK, el asistente de IA de TRENS (High-Performance Multi-Sport App).

CONTEXTO ACTUAL:
- Módulo activo: ${screenContext.module.toUpperCase()}
- Vista: ${screenContext.viewMode || 'principal'}
- Deporte activo: ${sportMode} (${sportName})
- Nivel del usuario: ${userProfile.level}
${sportMode === 'GYM' ? `- Día de entrenamiento: ${currentDay + 1} (índice: ${currentDay})` : ''}

${getSportInstructions(sportMode)}

${sportMode === 'GYM' ? `IMPORTANTE: Cuando el usuario pida modificar series de un ejercicio, usa trainingDay: ${currentDay}` : ''}

${
  activeAsset
    ? `
EJERCICIO ACTIVO: ${activeAsset.name}
${
  activeAsset.liquidData?.notes
    ? `📝 NOTAS DEL USUARIO: "${activeAsset.liquidData.notes}"`
    : '(Sin notas)'
}
${
  (
    activeAsset.liquidData?.videoHistory as
      | Array<{
          date: string;
          isToday: boolean;
          weightKg: number | null;
          reps: number | null;
          notes: string | null;
        }>
      | undefined
  )?.length
    ? `
📊 HISTORIAL DE VIDEOS (últimos entrenos):
${(
  activeAsset.liquidData.videoHistory as Array<{
    date: string;
    isToday: boolean;
    weightKg: number | null;
    reps: number | null;
    notes: string | null;
  }>
)
  .slice(0, 5)
  .map(
    (v) =>
      `- ${v.isToday ? '🔥 HOY' : v.date}: ${v.weightKg ? `${v.weightKg}kg` : ''}${v.weightKg && v.reps ? ' x ' : ''}${v.reps ? `${v.reps} reps` : ''}${v.notes ? ` | "${v.notes}"` : ''}`
  )
  .join('\n')}`
    : ''
}
${activeAsset.liquidData?.todayNotes ? `\n⚡ NOTA DE HOY: "${activeAsset.liquidData.todayNotes}"` : ''}
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

PERSONALIDAD:
1. Eres directo, conciso y motivador. Estilo "savage", sin rodeos.
2. Adapta tu vocabulario al deporte activo.
3. Si el usuario pide cambiar algo, USA las herramientas disponibles.
4. Confirma SIEMPRE después de ejecutar una acción.
5. Si no entiendes algo, pregunta claramente.
6. SIEMPRE revisa las NOTAS e HISTORIAL del ejercicio activo antes de responder preguntas sobre el rendimiento del usuario.
7. Cuando el usuario pregunte sobre su levantamiento/entrenamiento, USA los datos del historial de videos (peso, reps, notas).

IMPORTANTE: Puedes ejecutar múltiples herramientas si la solicitud lo requiere.`;
  }, [
    screenContext,
    sportMode,
    sportContext?.activeSport?.name,
    userProfile,
    activeAsset,
    aliases,
    getSportInstructions,
  ]);

  // -------------------------------------------------------------------------
  // CONTEXT VALUE
  /**
   * Invalidar caché de macros - Llamar cuando se actualicen datos del perfil
   */
  const invalidateMacroCache = useCallback(() => {
    console.warn('🔄 HANK: Invalidando caché de macros');
    setMacroCacheInvalidate((prev) => prev + 1);
  }, []);

  // -------------------------------------------------------------------------
  const value = useMemo<HankContextState>(
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
      saveMessageToSupabase,

      // Data refresh trigger
      refreshTrigger,
      triggerRefresh,

      // Macro cache invalidation
      macroCacheInvalidate,
      invalidateMacroCache,

      // LLM Integration
      getToolDefinitions,
      getSystemPrompt,

      // Targeting System
      targetState: {
        currentTarget,
        animationPhase,
        setTarget: setCurrentTarget,
        startAnimation: startTargetAnimation,
        completeAnimation: completeTargetAnimation,
        registerTarget,
        unregisterTarget,
      },
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
      saveMessageToSupabase,
      refreshTrigger,
      triggerRefresh,
      macroCacheInvalidate,
      invalidateMacroCache,
      getToolDefinitions,
      getSystemPrompt,
      currentTarget,
      animationPhase,
      startTargetAnimation,
      completeTargetAnimation,
      registerTarget,
      unregisterTarget,
    ]
  );

  return <HankContext.Provider value={value}>{children}</HankContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================
// Valores por defecto cuando no hay HankProvider (evita crashes en hot reload)
const defaultHankState: HankContextState = {
  isProcessing: false,
  lastAction: null,
  screenContext: defaultScreenContext,
  activeAsset: null,
  sportMode: null,
  userProfile: null,
  availableExercises: [],
  aliases: [],
  executeCommand: async () => [],
  executeTool: async () => ({ success: false, message: 'HankProvider no disponible' }),
  executeToolChain: async () => [],
  setScreenContext: () => {},
  setActiveAsset: async () => {},
  setSportMode: () => {},
  addAlias: () => {},
  removeAlias: () => {},
  executeAlias: async () => null,
  clearConversation: async () => {},
  saveMessageToSupabase: async () => {},
  refreshTrigger: 0,
  triggerRefresh: () => {},
  macroCacheInvalidate: 0,
  invalidateMacroCache: () => {},
  getToolDefinitions: () => [],
  getSystemPrompt: () => '',
  targetState: {
    currentTarget: null,
    animationPhase: 'idle',
    setTarget: () => {},
    startAnimation: () => {},
    completeAnimation: () => {},
    registerTarget: () => {},
    unregisterTarget: () => {},
  },
};

export const useHank = (): HankContextState => {
  const context = useContext(HankContext);
  if (!context) {
    // Retornar valores por defecto en lugar de crash (hot reload safety)
    console.warn('useHank: HankProvider no disponible, usando valores por defecto');
    return defaultHankState;
  }
  return context;
};
