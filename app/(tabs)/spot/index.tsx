// ============================================================================
// SPOT MODULE - Spots de Surf y Condiciones
// Spots favoritos, forecast, sesiones y condiciones
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
  Alert,
} from 'react-native';
import {
  Plus,
  Waves,
  MapPin,
  Wind,
  Thermometer,
  Clock,
  ChevronRight,
  X,
  Star,
  Navigation,
  Droplets,
  Sun,
  Moon,
  Sunrise,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../../lib/supabase';
import { useSport } from '../../../context/SportContext';
import { useUserRoleContext } from '../../../context/UserRoleContext';

// ============================================================================
// TYPES
// ============================================================================

interface SurfSession {
  id: string;
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
  wave_quality?: number;
  session_rating?: number;
  notes?: string;
}

interface FavoriteSpot {
  name: string;
  count: number;
  avgRating: number;
  lastSession?: string;
}

// ============================================================================
// SESSION CARD
// ============================================================================

const SessionCard = ({
  session,
  sportColor,
  onPress,
}: {
  session: SurfSession;
  sportColor: string;
  onPress: () => void;
}) => {
  const sessionDate = new Date(session.started_at);
  const isToday = sessionDate.toDateString() === new Date().toDateString();

  const ratingStars = session.session_rating || 0;
  const waveQuality = session.wave_quality || 0;

  const tideEmojis: Record<string, string> = {
    HIGH: '🌊',
    MID: '〰️',
    LOW: '🏖️',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-zinc-900 rounded-2xl p-4 mb-4 border ${
        isToday ? 'border-2' : 'border-zinc-800'
      }`}
      style={isToday ? { borderColor: sportColor } : undefined}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        {/* Fecha */}
        <View
          className="w-14 h-14 rounded-xl items-center justify-center mr-4"
          style={{ backgroundColor: `${sportColor}20` }}
        >
          <Text className="text-lg font-bold" style={{ color: sportColor }}>
            {sessionDate.getDate()}
          </Text>
          <Text className="text-xs uppercase" style={{ color: sportColor }}>
            {sessionDate.toLocaleDateString('es', { month: 'short' })}
          </Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <MapPin size={14} color={sportColor} />
            <Text className="text-white font-bold text-lg ml-1">{session.spot_name}</Text>
          </View>

          {/* Condiciones */}
          <View className="flex-row items-center mt-2 flex-wrap">
            {session.wave_size_ft && (
              <View className="flex-row items-center mr-3 mb-1">
                <Waves size={14} color="#A1A1AA" />
                <Text className="text-zinc-400 text-sm ml-1">{session.wave_size_ft}ft</Text>
              </View>
            )}
            {session.wave_period_s && (
              <View className="flex-row items-center mr-3 mb-1">
                <Clock size={14} color="#A1A1AA" />
                <Text className="text-zinc-400 text-sm ml-1">{session.wave_period_s}s</Text>
              </View>
            )}
            {session.tide && (
              <View className="flex-row items-center mr-3 mb-1">
                <Text className="text-sm">{tideEmojis[session.tide]}</Text>
                <Text className="text-zinc-400 text-sm ml-1">{session.tide}</Text>
              </View>
            )}
            {session.wind_direction && session.wind_speed_kts && (
              <View className="flex-row items-center mb-1">
                <Wind size={14} color="#A1A1AA" />
                <Text className="text-zinc-400 text-sm ml-1">
                  {session.wind_direction} {session.wind_speed_kts}kts
                </Text>
              </View>
            )}
          </View>

          {/* Rating */}
          {ratingStars > 0 && (
            <View className="flex-row items-center mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  color={star <= ratingStars ? '#EAB308' : '#3F3F46'}
                  fill={star <= ratingStars ? '#EAB308' : 'transparent'}
                />
              ))}
              {session.duration_min && (
                <Text className="text-zinc-500 text-sm ml-3">{session.duration_min} min</Text>
              )}
            </View>
          )}
        </View>

        <ChevronRight size={20} color="#71717A" />
      </View>

      {/* Notas */}
      {session.notes && (
        <View className="mt-3 pt-3 border-t border-zinc-800">
          <Text className="text-zinc-400 text-sm italic">"{session.notes}"</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// FAVORITE SPOT CARD
// ============================================================================

const FavoriteSpotCard = ({
  spot,
  sportColor,
  onPress,
}: {
  spot: FavoriteSpot;
  sportColor: string;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-zinc-900 rounded-xl p-4 mr-3 w-40"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center mb-2">
        <MapPin size={16} color={sportColor} />
        <Text className="text-white font-bold ml-1" numberOfLines={1}>
          {spot.name}
        </Text>
      </View>

      <View className="flex-row items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            color={star <= spot.avgRating ? '#EAB308' : '#3F3F46'}
            fill={star <= spot.avgRating ? '#EAB308' : 'transparent'}
          />
        ))}
      </View>

      <Text className="text-zinc-500 text-xs mt-2">{spot.count} sesiones</Text>
    </TouchableOpacity>
  );
};

// ============================================================================
// LOG SESSION MODAL
// ============================================================================

const LogSessionModal = ({
  visible,
  onClose,
  sportColor,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  sportColor: string;
  onSave: (data: Partial<SurfSession>) => void;
}) => {
  const [spotName, setSpotName] = useState('');
  const [waveSize, setWaveSize] = useState('');
  const [wavePeriod, setWavePeriod] = useState('');
  const [tide, setTide] = useState<'HIGH' | 'MID' | 'LOW'>('MID');
  const [rating, setRating] = useState(0);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!spotName.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del spot');
      return;
    }

    onSave({
      spot_name: spotName.trim(),
      wave_size_ft: waveSize ? parseFloat(waveSize) : undefined,
      wave_period_s: wavePeriod ? parseInt(wavePeriod) : undefined,
      tide,
      session_rating: rating > 0 ? rating : undefined,
      duration_min: duration ? parseInt(duration) : undefined,
      notes: notes.trim() || undefined,
      started_at: new Date().toISOString(),
    });

    // Reset
    setSpotName('');
    setWaveSize('');
    setWavePeriod('');
    setTide('MID');
    setRating(0);
    setDuration('');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-zinc-900 rounded-t-3xl p-6 max-h-[85%]">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-xl font-bold">Registrar Sesión 🌊</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Spot */}
            <View className="mb-4">
              <Text className="text-zinc-400 text-sm mb-2">Spot *</Text>
              <TextInput
                value={spotName}
                onChangeText={setSpotName}
                placeholder="Punta Hermosa"
                placeholderTextColor="#52525B"
                className="bg-zinc-800 text-white p-4 rounded-xl"
              />
            </View>

            {/* Condiciones */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-zinc-400 text-sm mb-2">Tamaño (ft)</Text>
                <TextInput
                  value={waveSize}
                  onChangeText={setWaveSize}
                  placeholder="4"
                  placeholderTextColor="#52525B"
                  keyboardType="decimal-pad"
                  className="bg-zinc-800 text-white p-4 rounded-xl"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-zinc-400 text-sm mb-2">Periodo (s)</Text>
                <TextInput
                  value={wavePeriod}
                  onChangeText={setWavePeriod}
                  placeholder="14"
                  placeholderTextColor="#52525B"
                  keyboardType="number-pad"
                  className="bg-zinc-800 text-white p-4 rounded-xl"
                />
              </View>
            </View>

            {/* Marea */}
            <Text className="text-zinc-400 text-sm mb-2">Marea</Text>
            <View className="flex-row mb-4">
              {[
                { value: 'LOW' as const, emoji: '🏖️', label: 'Baja' },
                { value: 'MID' as const, emoji: '〰️', label: 'Media' },
                { value: 'HIGH' as const, emoji: '🌊', label: 'Alta' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setTide(t.value)}
                  className={`flex-1 p-3 rounded-xl mr-2 items-center ${
                    tide === t.value ? 'border-2' : 'bg-zinc-800'
                  }`}
                  style={
                    tide === t.value
                      ? { borderColor: sportColor, backgroundColor: `${sportColor}20` }
                      : undefined
                  }
                >
                  <Text className="text-xl">{t.emoji}</Text>
                  <Text
                    className={`text-xs mt-1 ${tide === t.value ? 'text-white' : 'text-zinc-400'}`}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Rating */}
            <Text className="text-zinc-400 text-sm mb-2">¿Cómo estuvo?</Text>
            <View className="flex-row mb-4 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} className="p-2">
                  <Star
                    size={32}
                    color={star <= rating ? '#EAB308' : '#3F3F46'}
                    fill={star <= rating ? '#EAB308' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Duración */}
            <View className="mb-4">
              <Text className="text-zinc-400 text-sm mb-2">Duración (min)</Text>
              <TextInput
                value={duration}
                onChangeText={setDuration}
                placeholder="90"
                placeholderTextColor="#52525B"
                keyboardType="number-pad"
                className="bg-zinc-800 text-white p-4 rounded-xl"
              />
            </View>

            {/* Notas */}
            <View className="mb-6">
              <Text className="text-zinc-400 text-sm mb-2">Notas</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Buenas olas a primera hora..."
                placeholderTextColor="#52525B"
                multiline
                numberOfLines={3}
                className="bg-zinc-800 text-white p-4 rounded-xl"
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              className="p-4 rounded-xl items-center mb-6"
              style={{ backgroundColor: sportColor }}
            >
              <Text className="text-white font-bold text-lg">Guardar Sesión</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// QUICK CONDITIONS
// ============================================================================

const QuickConditions = ({ sportColor }: { sportColor: string }) => {
  // TODO: Integrar con API de forecast real
  const mockConditions = {
    waveSize: '3-5ft',
    period: '12s',
    wind: 'Offshore 8kts',
    tide: 'Subiendo',
    temp: '18°C',
    bestTime: '6:30 AM',
  };

  return (
    <View className="bg-zinc-900 rounded-2xl p-4 mb-6 border border-zinc-800">
      <View className="flex-row items-center mb-3">
        <Sun size={18} color={sportColor} />
        <Text className="text-white font-bold text-lg ml-2">Condiciones Hoy</Text>
      </View>

      <View className="flex-row flex-wrap">
        <View className="w-1/3 mb-3">
          <Text className="text-zinc-500 text-xs">Olas</Text>
          <Text className="text-white font-bold">{mockConditions.waveSize}</Text>
        </View>
        <View className="w-1/3 mb-3">
          <Text className="text-zinc-500 text-xs">Periodo</Text>
          <Text className="text-white font-bold">{mockConditions.period}</Text>
        </View>
        <View className="w-1/3 mb-3">
          <Text className="text-zinc-500 text-xs">Viento</Text>
          <Text className="text-white font-bold">{mockConditions.wind}</Text>
        </View>
        <View className="w-1/3">
          <Text className="text-zinc-500 text-xs">Marea</Text>
          <Text className="text-white font-bold">{mockConditions.tide}</Text>
        </View>
        <View className="w-1/3">
          <Text className="text-zinc-500 text-xs">Agua</Text>
          <Text className="text-white font-bold">{mockConditions.temp}</Text>
        </View>
        <View className="w-1/3">
          <View className="flex-row items-center">
            <Sunrise size={12} color="#EAB308" />
            <Text className="text-yellow-500 font-bold ml-1">{mockConditions.bestTime}</Text>
          </View>
          <Text className="text-zinc-500 text-xs">Mejor hora</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SpotScreen() {
  const { activeSport } = useSport();
  const { user } = useUserRoleContext();

  const [sessions, setSessions] = useState<SurfSession[]>([]);
  const [favoriteSpots, setFavoriteSpots] = useState<FavoriteSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  const sportCode = activeSport?.code || 'SURF';
  const sportColor = activeSport?.color_primary || '#0EA5E9';

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('surf_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setSessions(data || []);

      // Calcular spots favoritos
      const spotCounts: Record<
        string,
        { count: number; totalRating: number; lastSession: string }
      > = {};

      (data || []).forEach((session) => {
        if (!spotCounts[session.spot_name]) {
          spotCounts[session.spot_name] = {
            count: 0,
            totalRating: 0,
            lastSession: session.started_at,
          };
        }
        spotCounts[session.spot_name].count++;
        spotCounts[session.spot_name].totalRating += session.session_rating || 0;
      });

      const favorites: FavoriteSpot[] = Object.entries(spotCounts)
        .map(([name, data]) => ({
          name,
          count: data.count,
          avgRating: data.count > 0 ? Math.round(data.totalRating / data.count) : 0,
          lastSession: data.lastSession,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setFavoriteSpots(favorites);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleLogSession = async (data: Partial<SurfSession>) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from('surf_sessions').insert({
        ...data,
        user_id: user.id,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadSessions();
    } catch (error) {
      console.error('Error logging session:', error);
      Alert.alert('Error', 'No se pudo registrar la sesión');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!activeSport || sportCode !== 'SURF') {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-zinc-500">Este módulo es solo para SURF</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <LinearGradient colors={[`${sportColor}30`, 'transparent']} className="pt-16 pb-6 px-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">SPOT</Text>
            <Text className="text-zinc-400 mt-1">
              {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} registrada
              {sessions.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowLogModal(true)}
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
        {/* Condiciones actuales */}
        <QuickConditions sportColor={sportColor} />

        {/* Spots favoritos */}
        {favoriteSpots.length > 0 && (
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-3">📍 Spots Favoritos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {favoriteSpots.map((spot) => (
                <FavoriteSpotCard
                  key={spot.name}
                  spot={spot}
                  sportColor={sportColor}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Historial de sesiones */}
        <View className="mb-20">
          <Text className="text-white text-lg font-bold mb-3">🏄 Sesiones Recientes</Text>

          {sessions.length === 0 ? (
            <TouchableOpacity
              onPress={() => setShowLogModal(true)}
              className="bg-zinc-900 rounded-2xl p-8 items-center border border-dashed border-zinc-700"
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${sportColor}20` }}
              >
                <Waves size={40} color={sportColor} />
              </View>
              <Text className="text-white font-bold text-lg">Registra tu primera sesión</Text>
              <Text className="text-zinc-500 text-center mt-2">
                Lleva un registro de tus sesiones y condiciones
              </Text>
            </TouchableOpacity>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                sportColor={sportColor}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Log Session Modal */}
      <LogSessionModal
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
        sportColor={sportColor}
        onSave={handleLogSession}
      />
    </View>
  );
}
