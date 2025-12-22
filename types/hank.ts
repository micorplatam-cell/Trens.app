// ============================================================================
// HANK TYPES - Sistema completo de tipos para el Agente HANK
// ============================================================================

// ============================================================================
// TOOL NAMES - Todas las herramientas disponibles
// ============================================================================
export type HankToolName =
  // GYM Tools
  | 'GYM_ADD_EXERCISE'
  | 'GYM_REMOVE_EXERCISE'
  | 'GYM_REPLACE_EXERCISE'
  | 'GYM_MODIFY_SERIES'
  | 'GYM_GET_TODAY_ROUTINE'
  | 'GYM_LIST_EXERCISES'
  // Asset Tools (LIQUID DATA)
  | 'ASSET_UPDATE_FIELD'
  | 'ASSET_READ'
  | 'ASSET_GET_SCHEMA'
  | 'ASSET_REMOVE_SERIES'
  | 'ASSET_ADD_SERIES'
  | 'ASSET_REPLACE_SERIES'
  | 'ASSET_SET_SERIES'
  // ADN Tools
  | 'ADN_GET_PROFILE'
  | 'ADN_GET_RECORDS'
  | 'ADN_UPDATE_PROFILE'
  | 'ADN_ADD_MEASUREMENT'
  | 'ADN_REMOVE_MEASUREMENT'
  // OMNISCIENT Tools (HANK es Dios)
  | 'GET_FULL_USER_CONTEXT'
  | 'PLAN_GET_MEAL_DETAILS'
  // PLAN Tools (Nutrición y Farmacología)
  | 'PLAN_ADD_MEAL'
  | 'PLAN_EDIT_MEAL'
  | 'PLAN_DELETE_MEAL'
  | 'PLAN_REMOVE_MEAL'
  | 'PLAN_UPDATE_MEAL_TIME'
  | 'PLAN_UPDATE_INGREDIENTS'
  | 'PLAN_CALCULATE_MACROS'
  | 'PLAN_GET_MEALS'
  | 'PLAN_ADD_SUPPLEMENT'
  | 'PLAN_REMOVE_SUPPLEMENT'
  | 'PLAN_UPDATE_SUPPLEMENT_TIME'
  | 'PLAN_GET_STACK'
  | 'PLAN_ANALYZE_NUTRITION'
  // Diet Tools (Legacy)
  | 'DIET_UPDATE_MEAL'
  | 'DIET_ADD_CALORIES'
  // Logging Tools
  | 'LOG_WORKOUT_SET'
  // Context Tools
  | 'GET_USER_CONTEXT'
  // System Tools
  | 'HANK_CLEAR_HISTORY';

// ============================================================================
// TOOL PARAMETER DEFINITIONS (Para Function Calling del LLM)
// ============================================================================
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  required?: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  name: HankToolName;
  description: string;
  parameters: Record<string, ToolParameter>;
  requiredParams: string[];
}

// ============================================================================
// TOOL CALL & RESULT
// ============================================================================
export interface HankToolCall {
  tool: HankToolName;
  parameters: Record<string, unknown>;
}

export interface HankToolResult {
  success: boolean;
  message: string;
  data?: unknown;
  affectedRecords?: number;
  rollbackId?: string;
}

// ============================================================================
// CONTEXT TYPES - El cerebro de HANK
// ============================================================================
export type ScreenModule = 'nucleo' | 'gym' | 'plan' | 'pro' | 'adn';
export type SportMode = 'BODYBUILDING' | 'POWERLIFTING' | 'CROSSFIT' | 'MOTO' | 'SURF' | null;
export type UserLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'SAVAGE';

export interface ScreenContext {
  module: ScreenModule;
  viewMode: string | null;
  currentExerciseIndex: number | null;
  currentTrainingDay?: number; // Día de entrenamiento seleccionado (0-indexed)
}

export interface ActiveAsset {
  id: string;
  type: string;
  name: string;
  liquidData: Record<string, unknown>; // JSONB dinámico
  trainingDays?: number[];
  isAlternative?: boolean; // true si es una alternativa, no el ejercicio principal
  parentExerciseName?: string; // nombre del ejercicio principal si es alternativa
}

export interface UserProfile {
  level: UserLevel;
  trainingFrequency: number;
  currentTrainingDay: number;
  preferences: Record<string, unknown>;
}

// ============================================================================
// ALIAS SYSTEM - Comandos personalizados del usuario
// ============================================================================
export interface AliasAction {
  tool: HankToolName;
  parameters: Record<string, unknown>;
}

export interface UserAlias {
  id: string;
  trigger: string; // "Modo Bestia"
  description?: string;
  actions: AliasAction[];
  createdAt: Date;
}

// ============================================================================
// HANK CONTEXT STATE - Estado global del provider
// ============================================================================
export interface HankContextState {
  // Processing state
  isProcessing: boolean;
  lastAction: string | null;

  // Dynamic context for LLM
  screenContext: ScreenContext;
  activeAsset: ActiveAsset | null;
  sportMode: SportMode;
  userProfile: UserProfile | null;
  availableExercises: string[];

  // Aliases
  aliases: UserAlias[];

  // Actions
  executeCommand: (
    command: string,
    options?: { saveToHistory?: boolean }
  ) => Promise<HankToolResult[]>;
  executeTool: (toolCall: HankToolCall) => Promise<HankToolResult>;
  executeToolChain: (toolCalls: HankToolCall[]) => Promise<HankToolResult[]>;

  // Context updates
  setScreenContext: (ctx: ScreenContext) => void;
  setActiveAsset: (
    assetId: string | null,
    alternativeInfo?: { isAlternative: boolean; parentExerciseName: string }
  ) => Promise<void>;
  setSportMode: (mode: SportMode) => void;

  // Alias management
  addAlias: (alias: Omit<UserAlias, 'id' | 'createdAt'>) => void;
  removeAlias: (triggerId: string) => void;
  executeAlias: (trigger: string) => Promise<HankToolResult[] | null>;

  // Conversation management
  clearConversation: () => Promise<void>;
  saveMessageToSupabase: (role: 'user' | 'model', content: string) => Promise<void>;

  // Data refresh trigger (incrementa cuando HANK modifica datos)
  refreshTrigger: number;
  triggerRefresh: () => void;

  // Macro cache invalidation (incrementa cuando se actualizan datos del perfil)
  macroCacheInvalidate: number;
  invalidateMacroCache: () => void;

  // LLM Integration
  getToolDefinitions: () => ToolDefinition[];
  getSystemPrompt: () => string;
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================
export interface HankMessage {
  id: string;
  role: 'user' | 'hank' | 'system';
  content: string;
  toolCalls?: Array<{
    tool: HankToolName;
    params: Record<string, unknown>;
    result: HankToolResult;
  }>;
  timestamp: Date;
}
