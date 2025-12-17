// ============================================================================
// AXIS TYPES - Sistema completo de tipos para el Agente AXIS
// ============================================================================

// ============================================================================
// TOOL NAMES - Todas las herramientas disponibles
// ============================================================================
export type AxisToolName =
  // GYM Tools
  | 'GYM_ADD_EXERCISE'
  | 'GYM_REMOVE_EXERCISE'
  | 'GYM_REPLACE_EXERCISE'
  | 'GYM_MODIFY_SERIES'
  | 'GYM_LIST_EXERCISES'
  // Asset Tools (LIQUID DATA)
  | 'ASSET_UPDATE_FIELD'
  | 'ASSET_READ'
  | 'ASSET_GET_SCHEMA'
  | 'ASSET_REMOVE_SERIES'
  | 'ASSET_ADD_SERIES'
  | 'ASSET_REPLACE_SERIES'
  | 'ASSET_SET_SERIES'
  // Diet Tools
  | 'DIET_UPDATE_MEAL'
  | 'DIET_ADD_CALORIES'
  // Logging Tools
  | 'LOG_WORKOUT_SET'
  // Context Tools
  | 'GET_USER_CONTEXT';

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
  name: AxisToolName;
  description: string;
  parameters: Record<string, ToolParameter>;
  requiredParams: string[];
}

// ============================================================================
// TOOL CALL & RESULT
// ============================================================================
export interface AxisToolCall {
  tool: AxisToolName;
  parameters: Record<string, unknown>;
}

export interface AxisToolResult {
  success: boolean;
  message: string;
  data?: unknown;
  affectedRecords?: number;
  rollbackId?: string;
}

// ============================================================================
// CONTEXT TYPES - El cerebro de AXIS
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
  tool: AxisToolName;
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
// AXIS CONTEXT STATE - Estado global del provider
// ============================================================================
export interface AxisContextState {
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
  executeCommand: (command: string) => Promise<AxisToolResult[]>;
  executeTool: (toolCall: AxisToolCall) => Promise<AxisToolResult>;
  executeToolChain: (toolCalls: AxisToolCall[]) => Promise<AxisToolResult[]>;

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
  executeAlias: (trigger: string) => Promise<AxisToolResult[] | null>;

  // Conversation management
  clearConversation: () => void;

  // Data refresh trigger (incrementa cuando AXIS modifica datos)
  refreshTrigger: number;

  // LLM Integration
  getToolDefinitions: () => ToolDefinition[];
  getSystemPrompt: () => string;
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================
export interface AxisMessage {
  id: string;
  role: 'user' | 'axis' | 'system';
  content: string;
  toolCalls?: Array<{
    tool: AxisToolName;
    params: Record<string, unknown>;
    result: AxisToolResult;
  }>;
  timestamp: Date;
}
