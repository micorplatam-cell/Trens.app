// ============================================================================
// RACE MODULE - Eventos, Carreras y Track Days (MOTO/AUTO)
// Calendario de eventos, tiempos, checklist pre-carrera
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Alert } from '../../../lib/alert';
import {
  Plus,
  Flag,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  X,
  Trophy,
  Timer,
  CheckSquare,
  Square,
  Target,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../../lib/supabase';
import { useSport } from '../../../context/SportContext';
import { useUserRoleContext } from '../../../context/UserRoleContext';

// ============================================================================
// TYPES
// ============================================================================

interface SportEvent {
  id: string;
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
  };
  checklist?: { item: string; done: boolean }[];
}

interface InventoryItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
}

// ============================================================================
// EVENT CARD
// ============================================================================

const EventCard = ({
  event,
  sportColor,
  onPress,
}: {
  event: SportEvent;
  sportColor: string;
  onPress: () => void;
}) => {
  const eventDate = new Date(event.event_date);
  const isToday = eventDate.toDateString() === new Date().toDateString();
  const isPast = eventDate < new Date() && !isToday;
  const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const typeLabels: Record<string, { emoji: string; label: string }> = {
    COMPETITION: { emoji: '🏆', label: 'Competencia' },
    TRACK_DAY: { emoji: '🏁', label: 'Track Day' },
    SESSION: { emoji: '🏍️', label: 'Sesión' },
    TRAINING: { emoji: '💪', label: 'Entrenamiento' },
  };

  const typeInfo = typeLabels[event.event_type] || typeLabels.SESSION;

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-2xl p-4 mb-4 border ${
        isToday
          ? 'border-2'
          : isPast
            ? 'bg-zinc-900/50 border-zinc-800'
            : 'bg-zinc-900 border-zinc-800'
      }`}
      style={isToday ? { borderColor: sportColor, backgroundColor: `${sportColor}10` } : undefined}
      activeOpacity={0.7}
    >
      <View className="flex-row">
        {/* Fecha */}
        <View
          className="w-16 h-16 rounded-xl items-center justify-center mr-4"
          style={{ backgroundColor: isPast ? '#27272A' : `${sportColor}20` }}
        >
          <Text className="text-2xl font-bold" style={{ color: isPast ? '#71717A' : sportColor }}>
            {eventDate.getDate()}
          </Text>
          <Text className="text-xs uppercase" style={{ color: isPast ? '#71717A' : sportColor }}>
            {eventDate.toLocaleDateString('es', { month: 'short' })}
          </Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-lg mr-2">{typeInfo.emoji}</Text>
            <Text className={`font-bold text-lg ${isPast ? 'text-zinc-500' : 'text-white'}`}>
              {event.name}
            </Text>
          </View>

          {event.venue && (
            <View className="flex-row items-center mt-1">
              <MapPin size={14} color="#71717A" />
              <Text className="text-zinc-500 text-sm ml-1">{event.venue}</Text>
            </View>
          )}

          <View className="flex-row items-center mt-2">
            <View
              className="px-2 py-0.5 rounded-full mr-2"
              style={{ backgroundColor: `${sportColor}30` }}
            >
              <Text className="text-xs" style={{ color: sportColor }}>
                {typeInfo.label}
              </Text>
            </View>

            {!isPast && daysUntil >= 0 && (
              <Text className="text-zinc-400 text-sm">
                {isToday ? '¡HOY!' : daysUntil === 1 ? 'Mañana' : `En ${daysUntil} días`}
              </Text>
            )}

            {isPast && event.results?.position && (
              <View className="flex-row items-center">
                <Trophy size={14} color="#EAB308" />
                <Text className="text-yellow-500 text-sm ml-1">P{event.results.position}</Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={20} color="#71717A" />
      </View>

      {/* Resultados si completado */}
      {isPast && event.results?.best_lap && (
        <View className="mt-3 pt-3 border-t border-zinc-800 flex-row items-center">
          <Timer size={16} color="#A1A1AA" />
          <Text className="text-zinc-400 text-sm ml-2">
            Mejor vuelta: <Text className="text-white font-mono">{event.results.best_lap}</Text>
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// ADD EVENT MODAL
// ============================================================================

const AddEventModal = ({
  visible,
  onClose,
  sportCode,
  sportColor,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  sportCode: string;
  sportColor: string;
  onSave: (data: Partial<SportEvent>) => void;
}) => {
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [eventType, setEventType] = useState<SportEvent['event_type']>('TRACK_DAY');

  const eventTypes: { type: SportEvent['event_type']; emoji: string; label: string }[] = [
    { type: 'COMPETITION', emoji: '🏆', label: 'Competencia' },
    { type: 'TRACK_DAY', emoji: '🏁', label: 'Track Day' },
    { type: 'SESSION', emoji: '🏍️', label: 'Sesión' },
    { type: 'TRAINING', emoji: '💪', label: 'Entrenamiento' },
  ];

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para el evento');
      return;
    }
    if (!date) {
      Alert.alert('Error', 'Selecciona una fecha');
      return;
    }

    onSave({
      name: name.trim(),
      venue: venue.trim() || undefined,
      event_date: date,
      event_type: eventType,
      status: 'UPCOMING',
      checklist: [
        { item: 'Revisar nivel de aceite', done: false },
        { item: 'Revisar frenos', done: false },
        { item: 'Revisar neumáticos', done: false },
        { item: 'Cargar herramientas', done: false },
        { item: 'Equipamiento completo', done: false },
      ],
    });

    setName('');
    setVenue('');
    setDate('');
    setEventType('TRACK_DAY');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-zinc-900 rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-xl font-bold">Nuevo Evento</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Tipo de evento */}
          <Text className="text-zinc-400 text-sm mb-2">Tipo de Evento</Text>
          <View className="flex-row mb-4">
            {eventTypes.map((et) => (
              <TouchableOpacity
                key={et.type}
                onPress={() => setEventType(et.type)}
                className={`flex-1 p-3 rounded-xl mr-2 items-center ${
                  eventType === et.type ? 'border-2' : 'bg-zinc-800'
                }`}
                style={
                  eventType === et.type
                    ? { borderColor: sportColor, backgroundColor: `${sportColor}20` }
                    : undefined
                }
              >
                <Text className="text-xl">{et.emoji}</Text>
                <Text
                  className={`text-xs mt-1 ${eventType === et.type ? 'text-white' : 'text-zinc-400'}`}
                >
                  {et.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nombre */}
          <View className="mb-4">
            <Text className="text-zinc-400 text-sm mb-2">Nombre *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enduro de Canta 2025"
              placeholderTextColor="#52525B"
              className="bg-zinc-800 text-white p-4 rounded-xl"
            />
          </View>

          {/* Lugar */}
          <View className="mb-4">
            <Text className="text-zinc-400 text-sm mb-2">Lugar / Circuito</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="Circuito La Chutana"
              placeholderTextColor="#52525B"
              className="bg-zinc-800 text-white p-4 rounded-xl"
            />
          </View>

          {/* Fecha */}
          <View className="mb-6">
            <Text className="text-zinc-400 text-sm mb-2">Fecha *</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2025-01-15"
              placeholderTextColor="#52525B"
              className="bg-zinc-800 text-white p-4 rounded-xl font-mono"
            />
            <Text className="text-zinc-600 text-xs mt-1">Formato: YYYY-MM-DD</Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            className="p-4 rounded-xl items-center"
            style={{ backgroundColor: sportColor }}
          >
            <Text className="text-white font-bold text-lg">Crear Evento</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// QUICK STATS CARD
// ============================================================================

const QuickStats = ({ events, sportColor }: { events: SportEvent[]; sportColor: string }) => {
  const completedEvents = events.filter((e) => e.status === 'COMPLETED');
  const upcomingEvents = events.filter((e) => e.status === 'UPCOMING');
  const podiums = completedEvents.filter(
    (e) => e.results?.position && e.results.position <= 3
  ).length;

  return (
    <View className="flex-row mb-6">
      <View className="flex-1 bg-zinc-900 rounded-xl p-4 mr-2 items-center">
        <Text className="text-3xl font-bold text-white">{completedEvents.length}</Text>
        <Text className="text-zinc-500 text-xs mt-1">Completados</Text>
      </View>
      <View className="flex-1 bg-zinc-900 rounded-xl p-4 mx-1 items-center">
        <Text className="text-3xl font-bold" style={{ color: sportColor }}>
          {upcomingEvents.length}
        </Text>
        <Text className="text-zinc-500 text-xs mt-1">Próximos</Text>
      </View>
      <View className="flex-1 bg-zinc-900 rounded-xl p-4 ml-2 items-center">
        <Text className="text-3xl font-bold text-yellow-500">{podiums}</Text>
        <Text className="text-zinc-500 text-xs mt-1">Podios</Text>
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RaceScreen() {
  const { activeSport } = useSport();
  const { user } = useUserRoleContext();

  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const sportCode = activeSport?.code || 'MOTO';
  const sportColor = activeSport?.color_primary || '#F97316';

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  const loadEvents = useCallback(async () => {
    if (!user?.id || !activeSport?.id) return;

    try {
      const { data, error } = await supabase
        .from('sport_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_id', activeSport.id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, activeSport?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddEvent = async (data: Partial<SportEvent>) => {
    if (!user?.id || !activeSport?.id) return;

    try {
      const { error } = await supabase.from('sport_events').insert({
        ...data,
        user_id: user.id,
        sport_id: activeSport.id,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'No se pudo crear el evento');
    }
  };

  // Separar eventos
  const upcomingEvents = events.filter((e) => e.status === 'UPCOMING');
  const pastEvents = events.filter((e) => e.status === 'COMPLETED');

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!activeSport || (sportCode !== 'MOTO' && sportCode !== 'AUTO')) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-zinc-500">Este módulo es solo para MOTO o AUTO</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <LinearGradient colors={[`${sportColor}30`, 'transparent']} className="pt-16 pb-6 px-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">RACE</Text>
            <Text className="text-zinc-400 mt-1">
              {upcomingEvents.length} evento{upcomingEvents.length !== 1 ? 's' : ''} próximo
              {upcomingEvents.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: sportColor }}
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={sportColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <QuickStats events={events} sportColor={sportColor} />

        {/* Próximos eventos */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">🏁 Próximos Eventos</Text>

          {upcomingEvents.length === 0 ? (
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="bg-zinc-900 rounded-2xl p-8 items-center border border-dashed border-zinc-700"
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${sportColor}20` }}
              >
                <Calendar size={32} color={sportColor} />
              </View>
              <Text className="text-white font-bold text-lg">Programa tu próximo evento</Text>
              <Text className="text-zinc-500 text-center mt-2">
                Track days, carreras, sesiones de entrenamiento
              </Text>
            </TouchableOpacity>
          ) : (
            upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                sportColor={sportColor}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // TODO: Navegar al detalle del evento
                }}
              />
            ))
          )}
        </View>

        {/* Historial */}
        {pastEvents.length > 0 && (
          <View className="mb-20">
            <Text className="text-white text-lg font-bold mb-3">📊 Historial</Text>
            {pastEvents.slice(0, 5).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                sportColor={sportColor}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <AddEventModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        sportCode={sportCode}
        sportColor={sportColor}
        onSave={handleAddEvent}
      />
    </View>
  );
}
