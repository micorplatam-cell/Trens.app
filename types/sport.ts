// ============================================================================
// TRENS: TIPOS DEL SISTEMA DE DEPORTES
// ============================================================================

// ============================================================================
// DEPORTES
// ============================================================================

export type SportCode = 'GYM' | 'MOTO' | 'AUTO' | 'SURF';

export interface Sport {
  id: string;
  code: SportCode;
  name: string;
  description: string;
  icon: string;
  color_primary: string;
  color_secondary?: string;
  tab_4_name: string;
  tab_4_icon: string;
  tab_5_name: string;
  tab_5_icon: string;
  inventory_categories: InventoryCategory[];
  available_tools: SportTool[];
  profile_fields: ProfileField[];
  display_order: number;
}

// ============================================================================
// INVENTARIO
// ============================================================================

export interface InventoryCategory {
  code: string;
  name: string;
  icon: string;
  fields?: CategoryField[];
}

export interface CategoryField {
  code: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
}

export interface InventoryItem {
  id: string;
  user_id: string;
  sport_id: string;
  category_code: string;
  name: string;
  brand?: string;
  model?: string;
  year?: number;
  photo_url?: string;
  attributes: Record<string, any>;
  is_primary: boolean;
  status: 'ACTIVE' | 'SOLD' | 'BROKEN' | 'STORED';
  purchase_date?: string;
  last_service_date?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MANTENIMIENTO
// ============================================================================

export interface MaintenanceLog {
  id: string;
  user_id: string;
  item_id: string;
  type: string;
  title: string;
  description?: string;
  at_km?: number;
  at_hours?: number;
  cost?: number;
  currency: string;
  next_due_km?: number;
  next_due_hours?: number;
  next_due_date?: string;
  photo_urls?: string[];
  receipt_url?: string;
  performed_at: string;
  created_at: string;
}

// ============================================================================
// EVENTOS
// ============================================================================

export interface SportEvent {
  id: string;
  user_id: string;
  sport_id: string;
  name: string;
  location?: string;
  venue?: string;
  event_date: string;
  event_end_date?: string;
  event_type: 'COMPETITION' | 'TRACK_DAY' | 'SESSION' | 'TRAINING';
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  items_used?: string[];
  results?: {
    position?: number;
    best_lap?: string;
    notes?: string;
    [key: string]: any;
  };
  checklist?: ChecklistItem[];
  photo_urls?: string[];
  video_urls?: string[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  done: boolean;
}

// ============================================================================
// SURF ESPECÍFICO
// ============================================================================

export interface SurfSession {
  id: string;
  user_id: string;
  spot_name: string;
  spot_lat?: number;
  spot_lng?: number;
  wave_size_ft?: number;
  wave_period_s?: number;
  wind_direction?: string;
  wind_speed_kts?: number;
  tide?: 'HIGH' | 'MID' | 'LOW';
  water_temp_c?: number;
  board_id?: string;
  wetsuit_id?: string;
  started_at: string;
  ended_at?: string;
  duration_min?: number;
  wave_quality?: 1 | 2 | 3 | 4 | 5;
  session_rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  created_at: string;
}

// ============================================================================
// USER SPORT
// ============================================================================

export type PersonalizationMode = 'MANUAL' | 'AI' | 'HYBRID';

export interface UserSport {
  id: string;
  user_id: string;
  sport_id: string;
  is_active: boolean;
  is_primary: boolean;
  personalization_mode: PersonalizationMode;
  sport_profile: Record<string, any>;
  custom_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HERRAMIENTAS
// ============================================================================

export interface SportTool {
  code: string;
  name: string;
  description?: string;
}

export interface ProfileField {
  code: string;
  name: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

// ============================================================================
// CONFIGURACIÓN DE TABS POR DEPORTE
// ============================================================================

export interface TabConfig {
  tab4: {
    name: string;
    icon: string;
    route: string;
  };
  tab5: {
    name: string;
    icon: string;
    route: string;
  };
  color: string;
}

export const SPORT_TAB_CONFIGS: Record<SportCode, TabConfig> = {
  GYM: {
    tab4: { name: 'GYM', icon: 'Dumbbell', route: 'gym' },
    tab5: { name: 'PLAN', icon: 'Utensils', route: 'plan' },
    color: '#DC2626',
  },
  MOTO: {
    tab4: { name: 'GARAJE', icon: 'Warehouse', route: 'gym' },
    tab5: { name: 'RACE', icon: 'Flag', route: 'plan' },
    color: '#F97316',
  },
  AUTO: {
    tab4: { name: 'GARAJE', icon: 'Warehouse', route: 'gym' },
    tab5: { name: 'RACE', icon: 'Flag', route: 'plan' },
    color: '#EAB308',
  },
  SURF: {
    tab4: { name: 'TABLA', icon: 'Sailboat', route: 'gym' },
    tab5: { name: 'SPOT', icon: 'Waves', route: 'plan' },
    color: '#0EA5E9',
  },
};

// ============================================================================
// COLORES POR DEPORTE
// ============================================================================

export const SPORT_COLORS: Record<SportCode, { primary: string; secondary: string }> = {
  GYM: { primary: '#DC2626', secondary: '#B91C1C' },
  MOTO: { primary: '#F97316', secondary: '#EA580C' },
  AUTO: { primary: '#EAB308', secondary: '#CA8A04' },
  SURF: { primary: '#0EA5E9', secondary: '#0284C7' },
};

// ============================================================================
// ICONOS POR DEPORTE
// ============================================================================

export const SPORT_ICONS: Record<SportCode, string> = {
  GYM: 'Dumbbell',
  MOTO: 'Bike',
  AUTO: 'Car',
  SURF: 'Waves',
};
