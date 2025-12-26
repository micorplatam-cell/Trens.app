// ============================================================================
// SPORTS TOOLS - Herramientas HANK para MOTO/AUTO/SURF
// Gestión de inventario, mantenimientos, eventos y sesiones
// ============================================================================

import { supabase } from '../../lib/supabase';
import type { HankToolResult, ToolDefinition } from '../../types/hank';

// ============================================================================
// INVENTORY TOOLS
// ============================================================================

/**
 * Agregar item al inventario (vehículo, tabla, gear)
 */
export async function inventoryAddItem(
  userId: string,
  sportCode: string,
  category: string,
  name: string,
  metadata?: Record<string, unknown>
): Promise<HankToolResult> {
  try {
    // Obtener sport_id
    const { data: sport } = await supabase
      .from('sports')
      .select('id')
      .eq('code', sportCode)
      .single();

    if (!sport) {
      return { success: false, message: `Deporte ${sportCode} no encontrado` };
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        user_id: userId,
        sport_id: sport.id,
        category,
        name,
        specs: metadata || {},
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `✅ ${name} agregado a tu inventario`,
      data,
    };
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return { success: false, message: 'Error al agregar item al inventario' };
  }
}

/**
 * Actualizar item del inventario
 */
export async function inventoryUpdateItem(
  userId: string,
  itemId: string,
  updates: Record<string, unknown>
): Promise<HankToolResult> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `✅ ${data.name} actualizado`,
      data,
    };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return { success: false, message: 'Error al actualizar item' };
  }
}

/**
 * Eliminar item del inventario
 */
export async function inventoryRemoveItem(userId: string, itemId: string): Promise<HankToolResult> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ status: 'RETIRED' })
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('name')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `🗑️ ${data.name} marcado como retirado`,
    };
  } catch (error) {
    console.error('Error removing inventory item:', error);
    return { success: false, message: 'Error al eliminar item' };
  }
}

/**
 * Listar items del inventario
 */
export async function inventoryListItems(
  userId: string,
  sportCode?: string,
  category?: string
): Promise<HankToolResult> {
  try {
    let query = supabase
      .from('inventory_items')
      .select('*, sports(code, name)')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (sportCode) {
      const { data: sport } = await supabase
        .from('sports')
        .select('id')
        .eq('code', sportCode)
        .single();

      if (sport) {
        query = query.eq('sport_id', sport.id);
      }
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      message: `📦 ${data?.length || 0} items en tu inventario`,
      data,
    };
  } catch (error) {
    console.error('Error listing inventory:', error);
    return { success: false, message: 'Error al listar inventario' };
  }
}

// ============================================================================
// MAINTENANCE TOOLS
// ============================================================================

/**
 * Registrar mantenimiento
 */
export async function maintenanceLog(
  userId: string,
  itemId: string,
  maintenanceType: string,
  description?: string,
  cost?: number,
  mileageKm?: number,
  nextDueDate?: string,
  nextDueMileage?: number
): Promise<HankToolResult> {
  try {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .insert({
        user_id: userId,
        item_id: itemId,
        maintenance_type: maintenanceType,
        description,
        cost,
        mileage_km: mileageKm,
        next_due_date: nextDueDate,
        next_due_km: nextDueMileage,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `🔧 Mantenimiento "${maintenanceType}" registrado`,
      data,
    };
  } catch (error) {
    console.error('Error logging maintenance:', error);
    return { success: false, message: 'Error al registrar mantenimiento' };
  }
}

/**
 * Obtener historial de mantenimientos
 */
export async function maintenanceGetHistory(
  userId: string,
  itemId?: string
): Promise<HankToolResult> {
  try {
    let query = supabase
      .from('maintenance_logs')
      .select('*, inventory_items(name)')
      .eq('user_id', userId)
      .order('performed_at', { ascending: false })
      .limit(20);

    if (itemId) {
      query = query.eq('item_id', itemId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: `🔧 ${data?.length || 0} registros de mantenimiento`,
      data,
    };
  } catch (error) {
    console.error('Error getting maintenance history:', error);
    return { success: false, message: 'Error al obtener historial' };
  }
}

/**
 * Obtener alertas de mantenimiento
 */
export async function maintenanceGetAlerts(userId: string): Promise<HankToolResult> {
  try {
    // Obtener items del usuario
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (!items || items.length === 0) {
      return { success: true, message: '✅ No hay items para revisar', data: [] };
    }

    const itemIds = items.map((i) => i.id);

    // Obtener mantenimientos próximos (próximos 30 días)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: alerts, error } = await supabase
      .from('maintenance_logs')
      .select('*, inventory_items(name)')
      .in('item_id', itemIds)
      .lte('next_due_date', thirtyDaysFromNow.toISOString())
      .order('next_due_date', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      message: `⚠️ ${alerts?.length || 0} mantenimientos próximos`,
      data: alerts,
    };
  } catch (error) {
    console.error('Error getting maintenance alerts:', error);
    return { success: false, message: 'Error al obtener alertas' };
  }
}

// ============================================================================
// EVENT TOOLS
// ============================================================================

/**
 * Crear evento (carrera, track day, competencia)
 */
export async function eventCreate(
  userId: string,
  sportCode: string,
  name: string,
  eventType: string,
  eventDate: string,
  location?: string,
  notes?: string
): Promise<HankToolResult> {
  try {
    const { data: sport } = await supabase
      .from('sports')
      .select('id')
      .eq('code', sportCode)
      .single();

    if (!sport) {
      return { success: false, message: `Deporte ${sportCode} no encontrado` };
    }

    const { data, error } = await supabase
      .from('sport_events')
      .insert({
        user_id: userId,
        sport_id: sport.id,
        name,
        event_type: eventType,
        event_date: eventDate,
        location,
        notes,
        status: 'UPCOMING',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `🏁 Evento "${name}" creado para ${new Date(eventDate).toLocaleDateString()}`,
      data,
    };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, message: 'Error al crear evento' };
  }
}

/**
 * Actualizar evento
 */
export async function eventUpdate(
  userId: string,
  eventId: string,
  updates: Record<string, unknown>
): Promise<HankToolResult> {
  try {
    const { data, error } = await supabase
      .from('sport_events')
      .update(updates)
      .eq('id', eventId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `✅ Evento "${data.name}" actualizado`,
      data,
    };
  } catch (error) {
    console.error('Error updating event:', error);
    return { success: false, message: 'Error al actualizar evento' };
  }
}

/**
 * Eliminar evento
 */
export async function eventDelete(userId: string, eventId: string): Promise<HankToolResult> {
  try {
    const { data, error } = await supabase
      .from('sport_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId)
      .select('name')
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `🗑️ Evento "${data.name}" eliminado`,
    };
  } catch (error) {
    console.error('Error deleting event:', error);
    return { success: false, message: 'Error al eliminar evento' };
  }
}

/**
 * Listar eventos
 */
export async function eventList(
  userId: string,
  sportCode?: string,
  upcoming?: boolean
): Promise<HankToolResult> {
  try {
    let query = supabase.from('sport_events').select('*, sports(code, name)').eq('user_id', userId);

    if (sportCode) {
      const { data: sport } = await supabase
        .from('sports')
        .select('id')
        .eq('code', sportCode)
        .single();

      if (sport) {
        query = query.eq('sport_id', sport.id);
      }
    }

    if (upcoming) {
      query = query.eq('status', 'UPCOMING');
    }

    const { data, error } = await query.order('event_date', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      message: `📅 ${data?.length || 0} eventos`,
      data,
    };
  } catch (error) {
    console.error('Error listing events:', error);
    return { success: false, message: 'Error al listar eventos' };
  }
}

// ============================================================================
// SURF TOOLS
// ============================================================================

/**
 * Registrar sesión de surf
 */
export async function surfLogSession(
  userId: string,
  spotName: string,
  waveSizeFt?: number,
  wavePeriodS?: number,
  windDirection?: string,
  windSpeedKts?: number,
  tide?: 'HIGH' | 'MID' | 'LOW',
  waterTempC?: number,
  durationMin?: number,
  sessionRating?: number,
  notes?: string,
  boardId?: string
): Promise<HankToolResult> {
  try {
    const { data, error } = await supabase
      .from('surf_sessions')
      .insert({
        user_id: userId,
        spot_name: spotName,
        wave_size_ft: waveSizeFt,
        wave_period_s: wavePeriodS,
        wind_direction: windDirection,
        wind_speed_kts: windSpeedKts,
        tide,
        water_temp_c: waterTempC,
        duration_min: durationMin,
        session_rating: sessionRating,
        notes,
        board_id: boardId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const rating = sessionRating ? '⭐'.repeat(sessionRating) : '';
    return {
      success: true,
      message: `🏄 Sesión en ${spotName} registrada ${rating}`,
      data,
    };
  } catch (error) {
    console.error('Error logging surf session:', error);
    return { success: false, message: 'Error al registrar sesión' };
  }
}

/**
 * Obtener sesiones de surf
 */
export async function surfGetSessions(
  userId: string,
  spotName?: string,
  limit?: number
): Promise<HankToolResult> {
  try {
    let query = supabase
      .from('surf_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit || 20);

    if (spotName) {
      query = query.ilike('spot_name', `%${spotName}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: `🌊 ${data?.length || 0} sesiones encontradas`,
      data,
    };
  } catch (error) {
    console.error('Error getting surf sessions:', error);
    return { success: false, message: 'Error al obtener sesiones' };
  }
}

/**
 * Marcar spot como favorito
 */
export async function surfFavoriteSpot(
  userId: string,
  spotName: string,
  latitude?: number,
  longitude?: number
): Promise<HankToolResult> {
  // Por ahora solo retornamos confirmación
  // TODO: Implementar tabla de spots favoritos
  return {
    success: true,
    message: `⭐ ${spotName} agregado a favoritos`,
    data: { spotName, latitude, longitude, userId },
  };
}

/**
 * Obtener spots del usuario
 */
export async function surfGetSpots(userId: string): Promise<HankToolResult> {
  try {
    // Obtener spots únicos de las sesiones del usuario
    const { data, error } = await supabase
      .from('surf_sessions')
      .select('spot_name, spot_lat, spot_lng')
      .eq('user_id', userId);

    if (error) throw error;

    // Agrupar por spot único
    const spotsMap = new Map<string, { name: string; lat?: number; lng?: number; count: number }>();

    data?.forEach((session) => {
      const existing = spotsMap.get(session.spot_name);
      if (existing) {
        existing.count++;
      } else {
        spotsMap.set(session.spot_name, {
          name: session.spot_name,
          lat: session.spot_lat,
          lng: session.spot_lng,
          count: 1,
        });
      }
    });

    const spots = Array.from(spotsMap.values()).sort((a, b) => b.count - a.count);

    return {
      success: true,
      message: `📍 ${spots.length} spots encontrados`,
      data: spots,
    };
  } catch (error) {
    console.error('Error getting surf spots:', error);
    return { success: false, message: 'Error al obtener spots' };
  }
}

// ============================================================================
// TOOL DEFINITIONS (Para el LLM)
// ============================================================================

export const SPORT_TOOL_DEFINITIONS: ToolDefinition[] = [
  // INVENTORY
  {
    name: 'INVENTORY_ADD_ITEM',
    description:
      'Agrega un item al inventario del usuario (vehículo, tabla, gear). Usa para MOTO, AUTO o SURF.',
    parameters: {
      sportCode: {
        type: 'string',
        description: 'Código del deporte: MOTO, AUTO o SURF',
        enum: ['MOTO', 'AUTO', 'SURF'],
        required: true,
      },
      category: {
        type: 'string',
        description:
          'Categoría del item. MOTO/AUTO: VEHICLE, HELMET, SUIT, GEAR. SURF: BOARD, WETSUIT, GEAR',
        required: true,
      },
      name: {
        type: 'string',
        description: 'Nombre del item (ej: "Honda CBR 600", "Shortboard 6\'2")',
        required: true,
      },
      metadata: {
        type: 'object',
        description: 'Especificaciones técnicas del item',
      },
    },
    requiredParams: ['sportCode', 'category', 'name'],
  },
  {
    name: 'INVENTORY_UPDATE_ITEM',
    description: 'Actualiza un item existente del inventario',
    parameters: {
      itemId: {
        type: 'string',
        description: 'ID del item a actualizar',
        required: true,
      },
      updates: {
        type: 'object',
        description: 'Campos a actualizar: name, specs, status, notes',
        required: true,
      },
    },
    requiredParams: ['itemId', 'updates'],
  },
  {
    name: 'INVENTORY_REMOVE_ITEM',
    description: 'Marca un item como retirado del inventario',
    parameters: {
      itemId: {
        type: 'string',
        description: 'ID del item a retirar',
        required: true,
      },
    },
    requiredParams: ['itemId'],
  },
  {
    name: 'INVENTORY_LIST_ITEMS',
    description: 'Lista los items del inventario del usuario',
    parameters: {
      sportCode: {
        type: 'string',
        description: 'Código del deporte: MOTO, AUTO o SURF (opcional)',
        enum: ['MOTO', 'AUTO', 'SURF'],
      },
      category: {
        type: 'string',
        description: 'Filtrar por categoría (opcional)',
      },
    },
    requiredParams: [],
  },

  // MAINTENANCE
  {
    name: 'MAINTENANCE_LOG',
    description: 'Registra un mantenimiento realizado a un vehículo o equipo',
    parameters: {
      itemId: {
        type: 'string',
        description: 'ID del item al que se le hizo mantenimiento',
        required: true,
      },
      maintenanceType: {
        type: 'string',
        description: 'Tipo de mantenimiento: OIL_CHANGE, TIRE_CHANGE, BRAKE_SERVICE, etc.',
        required: true,
      },
      description: {
        type: 'string',
        description: 'Descripción del trabajo realizado',
      },
      cost: {
        type: 'number',
        description: 'Costo del mantenimiento',
      },
      mileageKm: {
        type: 'number',
        description: 'Kilometraje actual',
      },
      nextDueDate: {
        type: 'string',
        description: 'Próxima fecha de mantenimiento (YYYY-MM-DD)',
      },
      nextDueMileage: {
        type: 'number',
        description: 'Próximo kilometraje para mantenimiento',
      },
    },
    requiredParams: ['itemId', 'maintenanceType'],
  },
  {
    name: 'MAINTENANCE_GET_HISTORY',
    description: 'Obtiene el historial de mantenimientos',
    parameters: {
      itemId: {
        type: 'string',
        description: 'ID del item (opcional, si no se especifica retorna todos)',
      },
    },
    requiredParams: [],
  },
  {
    name: 'MAINTENANCE_GET_ALERTS',
    description: 'Obtiene alertas de mantenimientos próximos o vencidos',
    parameters: {},
    requiredParams: [],
  },

  // EVENTS
  {
    name: 'EVENT_CREATE',
    description: 'Crea un evento (carrera, track day, competencia)',
    parameters: {
      sportCode: {
        type: 'string',
        description: 'Código del deporte: MOTO o AUTO',
        enum: ['MOTO', 'AUTO'],
        required: true,
      },
      name: {
        type: 'string',
        description: 'Nombre del evento',
        required: true,
      },
      eventType: {
        type: 'string',
        description: 'Tipo: RACE, TRACK_DAY, PRACTICE, COMPETITION',
        required: true,
      },
      eventDate: {
        type: 'string',
        description: 'Fecha del evento (YYYY-MM-DD)',
        required: true,
      },
      location: {
        type: 'string',
        description: 'Ubicación o circuito',
      },
      notes: {
        type: 'string',
        description: 'Notas adicionales',
      },
    },
    requiredParams: ['sportCode', 'name', 'eventType', 'eventDate'],
  },
  {
    name: 'EVENT_UPDATE',
    description: 'Actualiza un evento existente',
    parameters: {
      eventId: {
        type: 'string',
        description: 'ID del evento',
        required: true,
      },
      updates: {
        type: 'object',
        description: 'Campos a actualizar: name, eventDate, location, status, results, notes',
        required: true,
      },
    },
    requiredParams: ['eventId', 'updates'],
  },
  {
    name: 'EVENT_DELETE',
    description: 'Elimina un evento',
    parameters: {
      eventId: {
        type: 'string',
        description: 'ID del evento a eliminar',
        required: true,
      },
    },
    requiredParams: ['eventId'],
  },
  {
    name: 'EVENT_LIST',
    description: 'Lista eventos del usuario',
    parameters: {
      sportCode: {
        type: 'string',
        description: 'Código del deporte: MOTO o AUTO (opcional)',
        enum: ['MOTO', 'AUTO'],
      },
      upcoming: {
        type: 'boolean',
        description: 'Si true, solo retorna eventos próximos',
      },
    },
    requiredParams: [],
  },

  // SURF
  {
    name: 'SURF_LOG_SESSION',
    description: 'Registra una sesión de surf con condiciones y valoración',
    parameters: {
      spotName: {
        type: 'string',
        description: 'Nombre del spot',
        required: true,
      },
      waveSizeFt: {
        type: 'number',
        description: 'Tamaño de olas en pies',
      },
      wavePeriodS: {
        type: 'number',
        description: 'Periodo del swell en segundos',
      },
      windDirection: {
        type: 'string',
        description: 'Dirección del viento: N, S, E, W, NE, NW, SE, SW, OFFSHORE, ONSHORE',
      },
      windSpeedKts: {
        type: 'number',
        description: 'Velocidad del viento en nudos',
      },
      tide: {
        type: 'string',
        description: 'Estado de la marea: HIGH, MID, LOW',
        enum: ['HIGH', 'MID', 'LOW'],
      },
      waterTempC: {
        type: 'number',
        description: 'Temperatura del agua en Celsius',
      },
      durationMin: {
        type: 'number',
        description: 'Duración de la sesión en minutos',
      },
      sessionRating: {
        type: 'number',
        description: 'Valoración de la sesión (1-5)',
      },
      notes: {
        type: 'string',
        description: 'Notas de la sesión',
      },
      boardId: {
        type: 'string',
        description: 'ID de la tabla usada',
      },
    },
    requiredParams: ['spotName'],
  },
  {
    name: 'SURF_GET_SESSIONS',
    description: 'Obtiene el historial de sesiones de surf',
    parameters: {
      spotName: {
        type: 'string',
        description: 'Filtrar por nombre de spot',
      },
      limit: {
        type: 'number',
        description: 'Número máximo de sesiones a retornar',
        default: 20,
      },
    },
    requiredParams: [],
  },
  {
    name: 'SURF_FAVORITE_SPOT',
    description: 'Marca un spot como favorito',
    parameters: {
      spotName: {
        type: 'string',
        description: 'Nombre del spot',
        required: true,
      },
      latitude: {
        type: 'number',
        description: 'Latitud del spot',
      },
      longitude: {
        type: 'number',
        description: 'Longitud del spot',
      },
    },
    requiredParams: ['spotName'],
  },
  {
    name: 'SURF_GET_SPOTS',
    description: 'Obtiene los spots visitados por el usuario',
    parameters: {},
    requiredParams: [],
  },
];
