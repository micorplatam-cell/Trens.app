import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Grid,
  Lock,
  Plus,
  Play,
  Eye,
  EyeOff,
  X,
  Music,
  Trash2,
  Share2,
  MoreVertical,
  Volume2,
  LogOut,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../../../lib/supabase';
import cloudflareStream from '../../../services/cloudflare/stream';
import { useUserRoleContext } from '../../../context/UserRoleContext';
import { useHank } from '../../../context/HankContext';
import { useSaveGuard } from '../../_layout';
import spotify from '../../../services/spotify/spotify';
import TrensID from '../../../components/adn/TrensID';
import RecordCard from '../../../components/adn/RecordCard';
import AddRecordModal from '../../../components/adn/AddRecordModal';
import { SportSwitcher } from '../../../components/adn/SportSwitcher';
import { ProUpgradeModal } from '../../../components/pro/ProUpgradeModal';
import { ShareModal } from '../../../components/share/ShareModal';

// ============================================================================
// TIPOS
// ============================================================================
interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  height: string;
  weight: string;
  goal: string;
  injuries: string;
  allergies: string;
  // Campos de ultra personalización
  age?: number;
  sex?: string;
  body_fat_percentage?: number;
  muscle_mass?: number;
  activity_level?: string;
  training_experience?: string;
  metabolic_rate?: string;
  training_days_per_week?: number;
  // Campos CALCULADOS (vienen de GYM y PLAN)
  training_frequency?: number;
  meal_count?: number;
}

interface Measurement {
  id: string;
  name: string;
  value: string;
  is_dominant: boolean;
}

interface PersonalRecord {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_icon: string;
  weight: number;
  reps: number;
  video_id?: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url?: string;
  cloudflare_video_id?: string;
  is_public: boolean;
  views?: number;
  created_at: string;
  source: 'asset' | 'pro';
  exercise_name?: string;
  weight_kg?: number;
  reps?: number;
  free_text?: string;
  spotify?: {
    enabled: boolean;
    trackUri?: string;
    trackName?: string;
    artist?: string;
    positionMs?: number;
  };
}

// ============================================================================
// VIDEO THUMBNAIL
// ============================================================================
const VideoThumbnail = ({ videoUrl, size }: { videoUrl: string; size: number }) => {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = true;
    p.pause();
  });

  return (
    <VideoView
      player={player}
      style={{ width: size, height: size * (16 / 9) }}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AdnScreen() {
  const { user, isPro, isAuthenticated, spotifyPremium } = useUserRoleContext();
  const { refreshTrigger, setScreenContext } = useHank();
  const { canSave } = useSaveGuard();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'legacy' | 'vault'>('legacy');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Video viewer state
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [isVideoManuallyPaused, setIsVideoManuallyPaused] = useState(false);
  const { width: screenWidth } = Dimensions.get('window');
  const videoTileSize = screenWidth / 3;

  // Video options modal
  const [videoOptionsVisible, setVideoOptionsVisible] = useState(false);
  const [selectedVideoForEdit, setSelectedVideoForEdit] = useState<Video | null>(null);

  // Share modal state
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Sincronizar contexto con HANK
  useFocusEffect(
    useCallback(() => {
      setScreenContext({
        module: 'adn',
        viewMode: activeTab,
        currentExerciseIndex: null,
        currentTrainingDay: 0,
      });
    }, [activeTab, setScreenContext])
  );

  // Video player para el viewer
  const videoSource = selectedVideo?.video_url || '';
  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    // Volumen se controla dinámicamente en el useEffect según Spotify
  });

  // Ref para rastrear si Spotify ya se sincronizó (evita re-sync al reanudar de pausa)
  const spotifySyncedRef = useRef(false);

  // Control de reproducción + Spotify sync (solo al ABRIR el modal)
  useEffect(() => {
    if (videoViewerVisible && videoPlayer) {
      // Determinar si hay Spotify para este video
      const hasSpotify = !!(selectedVideo?.spotify?.enabled && isPro && spotifyPremium);
      const trackUri = hasSpotify ? (selectedVideo?.spotify as any)?.trackUri : null;

      // MUTEAR el video si hay Spotify - solo se escuchará Spotify
      videoPlayer.volume = hasSpotify && trackUri ? 0 : 1;

      // Reproducir video si no está pausado manualmente
      if (!isVideoManuallyPaused) {
        videoPlayer.play();
      }

      // Solo sincronizar Spotify la PRIMERA vez que se abre el modal
      if (!spotifySyncedRef.current && hasSpotify && trackUri) {
        spotifySyncedRef.current = true;
        const positionMs = (selectedVideo?.spotify as any)?.positionMs || 0;
        console.log('🎵 ADN: Sincronizando Spotify (video muted)', trackUri, positionMs);
        spotify.syncWithVideo(trackUri, positionMs).catch(console.warn);
      } else if (!hasSpotify) {
        console.log('🔊 ADN: Reproduciendo audio ambiente del video');
      }
    } else if (videoPlayer && !videoViewerVisible) {
      videoPlayer.pause();
      setIsVideoManuallyPaused(false); // Reset al cerrar
      spotifySyncedRef.current = false; // Reset para próxima apertura
      // Pausar Spotify al cerrar el viewer
      if (selectedVideo?.spotify?.enabled && isPro && spotifyPremium) {
        spotify.pauseForSwipe().catch(console.warn);
      }
    }
  }, [videoViewerVisible, videoPlayer, selectedVideo, isPro, spotifyPremium]);

  // Handler para tap en el video (pausar/reanudar solo video, NO Spotify)
  const handleVideoTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsVideoManuallyPaused((prev) => {
      const newPaused = !prev;
      if (newPaused) {
        videoPlayer.pause();
      } else {
        videoPlayer.play();
      }
      return newPaused;
    });
  }, [videoPlayer]);

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [followersCount, setFollowersCount] = useState(0);

  const isOwner = true; // Para perfiles de otros usuarios, esto cambiaría

  // -------------------------------------------------------------------------
  // FETCH DATA
  // -------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profile (desde user_profiles)
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch training_frequency desde profiles (calculado desde GYM)
      const { data: authProfile } = await supabase
        .from('profiles')
        .select('training_frequency')
        .eq('id', user.id)
        .single();

      // Fetch meal count desde meals (calculado desde PLAN)
      const { count: mealCount } = await supabase
        .from('meals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Si no existe perfil, crear uno
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: user.email?.split('@')[0]?.toUpperCase() || 'ATLETA',
          })
          .select()
          .single();

        if (!createError) {
          // Agregar campos calculados
          setProfile({
            ...newProfile,
            training_frequency: authProfile?.training_frequency || 0,
            meal_count: mealCount || 0,
          });
        }
      } else {
        // Agregar campos calculados desde GYM y PLAN
        setProfile({
          ...profileData,
          training_frequency: authProfile?.training_frequency || 0,
          meal_count: mealCount || 0,
        });
      }

      // Fetch measurements
      const { data: measurementsData } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setMeasurements(measurementsData || []);

      // Fetch records - SOLO de videos públicos según MASTER
      const { data: recordsData } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setRecords(recordsData || []);

      // Fetch followers count
      const { count } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      setFollowersCount(count || 0);

      // Fetch videos from user_assets (legacy)
      const { data: assetsData } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Fetch videos from pro_videos
      const { data: proVideosData } = await supabase
        .from('pro_videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Map user_assets to videos format
      const assetVideos: Video[] = (assetsData || []).map((asset: any) => ({
        id: asset.id,
        title: asset.name || 'Sin título',
        thumbnail_url: asset.thumbnail_url || asset.uri,
        is_public: asset.is_public || false,
        created_at: asset.created_at,
        source: 'asset' as const,
      }));

      // Map pro_videos to videos format
      const proVideos: Video[] = (proVideosData || []).map((video: any) => ({
        id: video.id,
        title: video.exercise_name || video.free_text || 'Video PRO',
        thumbnail_url: video.thumbnail_url || video.video_url,
        video_url: video.video_url,
        cloudflare_video_id: video.cloudflare_video_id,
        is_public: video.is_public,
        created_at: video.created_at,
        source: 'pro' as const,
        exercise_name: video.exercise_name,
        weight_kg: video.weight_kg,
        reps: video.reps,
        free_text: video.free_text,
        spotify: video.spotify,
      }));

      // Combinar y ordenar por fecha
      const allVideos = [...assetVideos, ...proVideos].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setVideos(allVideos);
    } catch (err) {
      console.error('Error fetching ADN data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refrescar cuando HANK modifica datos
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchData();
    }
  }, [refreshTrigger, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // VIDEO VISIBILITY TOGGLE - Público ↔ Privado según MASTER
  // -------------------------------------------------------------------------
  const toggleVideoVisibility = async (video: Video) => {
    if (!user || !isPro) {
      setShowUpgradeModal(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newIsPublic = !video.is_public;

      if (video.source === 'pro') {
        const { error } = await supabase
          .from('pro_videos')
          .update({ is_public: newIsPublic })
          .eq('id', video.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_assets')
          .update({ is_public: newIsPublic })
          .eq('id', video.id);

        if (error) throw error;
      }

      // Si el video sale de público, eliminar del Top 3 según MASTER
      if (!newIsPublic) {
        // Eliminar de personal_records si está vinculado
        await supabase.from('personal_records').delete().eq('video_id', video.id);
      }

      // Actualizar estado local
      setVideos((prev) =>
        prev.map((v) => (v.id === video.id ? { ...v, is_public: newIsPublic } : v))
      );

      setVideoOptionsVisible(false);
      setSelectedVideoForEdit(null);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // -------------------------------------------------------------------------
  // DELETE VIDEO
  // -------------------------------------------------------------------------
  const deleteVideo = async (video: Video) => {
    if (!user) return;

    Alert.alert(
      'Eliminar video',
      '¿Estás seguro de que quieres eliminar este video? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            try {
              // 1. Eliminar de Cloudflare Stream si existe
              if (video.cloudflare_video_id) {
                console.warn(
                  '🗑️ Eliminando video de Cloudflare Stream:',
                  video.cloudflare_video_id
                );
                const deleted = await cloudflareStream.deleteVideo(video.cloudflare_video_id);
                if (deleted) {
                  console.warn('✅ Video eliminado de Cloudflare Stream');
                } else {
                  console.warn('⚠️ No se pudo eliminar de Cloudflare Stream');
                }
              }

              // 2. Eliminar de la base de datos
              if (video.source === 'pro') {
                const { error } = await supabase.from('pro_videos').delete().eq('id', video.id);

                if (error) throw error;
              } else {
                // Soft delete para assets
                const { error } = await supabase
                  .from('user_assets')
                  .update({ deleted_at: new Date().toISOString() })
                  .eq('id', video.id);

                if (error) throw error;
              }

              // 3. Eliminar de personal_records si está vinculado
              await supabase.from('personal_records').delete().eq('video_id', video.id);

              setVideos((prev) => prev.filter((v) => v.id !== video.id));
              setVideoOptionsVisible(false);
              setSelectedVideoForEdit(null);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting video:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------------------
  // ADD RECORD - Solo desde videos públicos según MASTER
  // -------------------------------------------------------------------------
  const handleAddRecord = async (recordData: {
    exercise_id: string;
    exercise_name: string;
    exercise_icon: string;
    weight: number;
    reps: number;
    video_id?: string;
  }) => {
    // Guard: Verificar si puede guardar
    if (!canSave('save_record')) return;

    if (!user) return;

    // Verificar que el video sea público si se proporciona
    if (recordData.video_id) {
      const video = videos.find((v) => v.id === recordData.video_id);
      if (video && !video.is_public) {
        Alert.alert(
          'Video privado',
          'Solo puedes agregar récords desde videos públicos. Primero hazlo público desde la Bóveda.'
        );
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('personal_records')
        .insert({
          user_id: user.id,
          ...recordData,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('Maximum of 3')) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Límite alcanzado', 'Máximo 3 récords permitidos');
        }
        throw error;
      }

      setRecords((prev) => [...prev, data]);
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding record:', err);
    }
  };

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------
  const formatFollowers = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Videos públicos para el tab "Legado" (perfil público)
  const publicVideos = videos.filter((v) => v.is_public);

  // Videos privados para la "Bóveda"
  const vaultVideos = videos.filter((v) => !v.is_public);

  // -------------------------------------------------------------------------
  // RENDER: Loading (solo si hay usuario y está cargando)
  // -------------------------------------------------------------------------
  if (loading && isAuthenticated) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: Main (con datos reales o placeholders para visitantes)
  // -------------------------------------------------------------------------
  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
        }
      >
        {/* HEADER (PÚBLICO) - ED HARDY FIRE STYLE */}
        <View className="relative pt-16 pb-20 px-6 items-center">
          {/* Fire Gradient Background */}
          <LinearGradient
            colors={['#1a0a0a', '#0a0000', '#000000']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            className="absolute inset-0"
          />

          {/* Subtle fire glow at top */}
          <View
            className="absolute top-0 left-0 right-0 h-32"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 30,
            }}
          />

          {/* Avatar con Fire Ring */}
          <View
            className="w-28 h-28 rounded-full mb-4 items-center justify-center"
            style={{
              borderWidth: 3,
              borderColor: '#F97316',
              shadowColor: '#F97316',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 15,
              elevation: 10,
            }}
          >
            <View className="w-24 h-24 rounded-full bg-zinc-900 overflow-hidden">
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#DC2626', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-full h-full items-center justify-center"
                >
                  <Text className="text-white text-4xl font-black">
                    {profile?.display_name?.charAt(0) || 'A'}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </View>

          {/* Nombre con Fire Glow */}
          <Text
            className="text-3xl font-black text-white uppercase tracking-tight mb-1"
            style={{
              textShadowColor: '#F97316',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 10,
            }}
          >
            {profile?.display_name || 'ATLETA'}
          </Text>

          {/* Seguidores */}
          <Text className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            SEGUIDORES:{' '}
            <Text className="text-fire-orange font-mono">{formatFollowers(followersCount)}</Text>
          </Text>

          {/* Badge PRO/FREE con Fire Style */}
          <View
            className={`mt-3 px-4 py-1.5 rounded-full ${isPro ? '' : 'bg-zinc-800'}`}
            style={
              isPro
                ? {
                    backgroundColor: '#0a0000',
                    borderWidth: 2,
                    borderColor: '#F97316',
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 10,
                  }
                : {}
            }
          >
            <Text className={`text-xs font-bold ${isPro ? 'text-fire-orange' : 'text-zinc-500'}`}>
              {isPro ? '🔥 PRO' : '🔒 FREE'}
            </Text>
          </View>

          {/* Sport Switcher */}
          <View className="mt-4">
            <SportSwitcher />
          </View>
        </View>

        {/* TRENS ID (Solo visible para el dueño) */}
        <View className="px-4 -mt-10">
          {isOwner && (
            <TrensID
              userId={user?.id || 'guest'}
              profileData={
                profile
                  ? {
                      goal: profile.goal,
                      weight: profile.weight,
                      height: profile.height,
                      injuries: profile.injuries,
                      allergies: profile.allergies,
                      // Biometría avanzada
                      age: profile.age,
                      sex: profile.sex,
                      body_fat_percentage: profile.body_fat_percentage,
                      muscle_mass: profile.muscle_mass,
                      activity_level: profile.activity_level,
                      training_experience: profile.training_experience,
                      metabolic_rate: profile.metabolic_rate,
                      training_days_per_week: profile.training_days_per_week,
                      // Campos CALCULADOS (no editables, vienen de GYM y PLAN)
                      training_frequency: profile.training_frequency,
                      meal_count: profile.meal_count,
                    }
                  : {
                      // Placeholder data para visitantes
                      goal: 'TU OBJETIVO',
                      weight: '0',
                      height: '0',
                      injuries: '',
                      allergies: '',
                      age: undefined,
                      sex: undefined,
                      body_fat_percentage: undefined,
                      muscle_mass: undefined,
                      activity_level: undefined,
                      training_experience: undefined,
                      metabolic_rate: undefined,
                      training_days_per_week: undefined,
                      training_frequency: undefined,
                      meal_count: undefined,
                    }
              }
              measurements={measurements}
              onUpdate={fetchData}
            />
          )}
        </View>

        {/* RECORDS (PÚBLICO) - ED HARDY FIRE STYLE */}
        <View className={`px-4 ${!isOwner ? 'mt-8' : ''}`}>
          <View className="flex-row justify-between items-center mb-3 border-b border-fire-red/30 pb-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-fire-orange text-sm">🔥</Text>
              <Text
                className="text-fire-orange font-bold uppercase tracking-widest text-xs"
                style={{
                  textShadowColor: '#F97316',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 5,
                }}
              >
                Top 3 Récords
              </Text>
            </View>
            <Text className="text-zinc-600 text-xs font-mono">VIDEOS PÚBLICOS</Text>
          </View>

          <View className="flex-row gap-2">
            {records.slice(0, 3).map((rec) => (
              <View key={rec.id} className="flex-1">
                <RecordCard record={rec} />
              </View>
            ))}

            {/* Botón añadir (solo dueño y si hay espacio) - NO manual según MASTER */}
            {/* Los récords solo se eligen desde videos públicos, no ingreso manual */}
            {isOwner && records.length < 3 && publicVideos.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  if (!isPro) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowAddModal(true);
                }}
                className="flex-1 min-h-[160px] rounded items-center justify-center"
                style={{
                  borderWidth: 1,
                  borderColor: '#F97316',
                  borderStyle: 'dashed',
                  backgroundColor: '#0a0500',
                }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mb-2"
                  style={{
                    backgroundColor: '#1a0a00',
                    borderWidth: 1,
                    borderColor: '#F97316',
                  }}
                >
                  <Plus size={18} color="#F97316" />
                </View>
                <Text className="text-[10px] font-bold text-fire-orange uppercase tracking-widest">
                  Elegir
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* TABS - ED HARDY FIRE STYLE */}
        <View className="mt-12 border-t border-fire-red/20">
          <View className="flex-row">
            {/* LEGADO (Videos públicos) */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('legacy');
              }}
              className={`flex-1 py-4 flex-row items-center justify-center gap-2 ${
                activeTab === 'legacy' ? 'border-t-2 border-fire-orange' : ''
              }`}
              style={
                activeTab === 'legacy'
                  ? {
                      backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    }
                  : {}
              }
            >
              <Grid size={14} color={activeTab === 'legacy' ? '#F97316' : '#52525b'} />
              <Text
                className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                  activeTab === 'legacy' ? 'text-fire-orange' : 'text-zinc-600'
                }`}
              >
                Legado
              </Text>
              <View
                className={`px-1.5 py-0.5 rounded ${activeTab === 'legacy' ? 'bg-fire-red/30' : 'bg-zinc-800'}`}
              >
                <Text
                  className={`text-[9px] font-bold font-mono ${activeTab === 'legacy' ? 'text-fire-orange' : 'text-zinc-500'}`}
                >
                  {publicVideos.length}
                </Text>
              </View>
            </TouchableOpacity>

            {/* BÓVEDA (Todos los videos, para gestión) - Solo dueño */}
            {isOwner && (
              <TouchableOpacity
                onPress={() => {
                  if (!isPro) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab('vault');
                }}
                className={`flex-1 py-4 flex-row items-center justify-center gap-2 ${
                  activeTab === 'vault' ? 'border-t-2 border-fire-red' : ''
                }`}
                style={
                  activeTab === 'vault'
                    ? {
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                      }
                    : {}
                }
              >
                <Lock size={14} color={activeTab === 'vault' ? '#DC2626' : '#52525b'} />
                <Text
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    activeTab === 'vault' ? 'text-fire-red' : 'text-zinc-600'
                  }`}
                >
                  Bóveda
                </Text>
                <View
                  className={`px-1.5 py-0.5 rounded ${activeTab === 'vault' ? 'bg-fire-red/30' : 'bg-zinc-800'}`}
                >
                  <Text
                    className={`text-[9px] font-bold font-mono ${activeTab === 'vault' ? 'text-fire-red' : 'text-zinc-500'}`}
                  >
                    {vaultVideos.length}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* CONTENIDO TABS */}
          <View className="bg-[#030000] min-h-[300px]">
            {/* LEGADO - Grid de videos públicos */}
            {activeTab === 'legacy' && (
              <View className="flex-row flex-wrap">
                {publicVideos.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-20">
                    <Grid size={40} color="#27272a" />
                    <Text className="text-zinc-600 text-xs uppercase tracking-widest mt-4">
                      Sin contenido público
                    </Text>
                    <Text className="text-zinc-700 text-xs text-center mt-2 px-8">
                      Graba videos y hazlos públicos para mostrar tu legado
                    </Text>
                  </View>
                ) : (
                  publicVideos.map((vid) => (
                    <TouchableOpacity
                      key={vid.id}
                      className="w-1/3 aspect-[9/16] bg-zinc-900 relative overflow-hidden"
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (vid.video_url) {
                          setSelectedVideo(vid);
                          setVideoViewerVisible(true);
                        }
                      }}
                    >
                      {vid.video_url ? (
                        <View className="w-full h-full opacity-80">
                          <VideoThumbnail videoUrl={vid.video_url} size={videoTileSize} />
                        </View>
                      ) : (
                        <Image
                          source={{ uri: vid.thumbnail_url }}
                          className="w-full h-full opacity-80"
                          resizeMode="cover"
                        />
                      )}
                      <View className="absolute inset-0 items-center justify-center bg-black/20">
                        <View className="w-8 h-8 rounded-full bg-black/50 items-center justify-center">
                          <Play size={14} color="#fff" fill="#fff" />
                        </View>
                      </View>
                      {vid.spotify?.enabled && (
                        <View className="absolute top-1 right-1">
                          <Music size={10} color="#1DB954" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* BÓVEDA - Lista de todos los videos con gestión */}
            {activeTab === 'vault' && isOwner && (
              <View className="p-2">
                {/* Info box */}
                <View className="p-3 bg-zinc-900/30 border border-zinc-800 rounded flex-row gap-3 mb-4">
                  <Lock size={16} color="#DC2626" />
                  <View className="flex-1">
                    <Text className="text-white text-xs font-bold mb-1">BÓVEDA PRIVADA</Text>
                    <Text className="text-zinc-400 text-[10px] leading-relaxed">
                      Gestiona la visibilidad de tu contenido. Los videos privados solo tú puedes
                      verlos.
                    </Text>
                  </View>
                </View>

                {videos.length === 0 ? (
                  <View className="items-center justify-center py-16">
                    <Lock size={40} color="#27272a" />
                    <Text className="text-zinc-600 text-xs uppercase tracking-widest mt-4">
                      Bóveda vacía
                    </Text>
                    <Text className="text-zinc-700 text-xs text-center mt-2 px-8">
                      Graba tu primer video con el botón PRO
                    </Text>
                  </View>
                ) : (
                  videos.map((vid) => (
                    <View
                      key={vid.id}
                      className="flex-row gap-3 p-3 bg-[#0a0a0a] border border-zinc-900 rounded-xl mb-2"
                    >
                      {/* Thumbnail */}
                      <TouchableOpacity
                        onPress={() => {
                          if (vid.video_url) {
                            setSelectedVideo(vid);
                            setVideoViewerVisible(true);
                          }
                        }}
                        className="w-20 h-28 bg-zinc-800 rounded-lg overflow-hidden"
                      >
                        {vid.video_url ? (
                          <VideoThumbnail videoUrl={vid.video_url} size={80} />
                        ) : (
                          <Image
                            source={{ uri: vid.thumbnail_url }}
                            className="w-full h-full opacity-60"
                            resizeMode="cover"
                          />
                        )}
                        <View className="absolute inset-0 items-center justify-center">
                          <Play size={16} color="#fff" fill="#fff" />
                        </View>
                      </TouchableOpacity>

                      {/* Info */}
                      <View className="flex-1 justify-center">
                        <Text className="text-sm font-bold text-white mb-1" numberOfLines={1}>
                          {vid.title}
                        </Text>

                        {/* Caption si existe */}
                        {vid.free_text && (
                          <Text className="text-zinc-400 text-xs italic mb-1" numberOfLines={1}>
                            {vid.free_text}
                          </Text>
                        )}

                        {/* Métricas si existen */}
                        {(vid.weight_kg || vid.reps) && (
                          <Text className="text-savage-red text-xs font-mono mb-1">
                            {vid.weight_kg && vid.reps
                              ? `${vid.weight_kg}kg × ${vid.reps} reps`
                              : vid.weight_kg
                                ? `${vid.weight_kg}kg`
                                : `${vid.reps} reps`}
                          </Text>
                        )}

                        {/* Estado + Fecha */}
                        <View className="flex-row items-center gap-2">
                          {vid.is_public ? (
                            <View className="flex-row items-center gap-1 border border-green-900 bg-green-900/10 px-2 py-0.5 rounded-full">
                              <Eye size={10} color="#22c55e" />
                              <Text className="text-[10px] text-green-500 font-bold uppercase">
                                Público
                              </Text>
                            </View>
                          ) : (
                            <View className="flex-row items-center gap-1 border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 rounded-full">
                              <Lock size={10} color="#71717a" />
                              <Text className="text-[10px] text-zinc-500 font-bold uppercase">
                                Bóveda
                              </Text>
                            </View>
                          )}
                          <Text className="text-[10px] text-zinc-600">
                            {new Date(vid.created_at).toLocaleDateString('es', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </Text>
                        </View>

                        {/* Spotify */}
                        {vid.spotify?.enabled && (
                          <View className="flex-row items-center gap-1 mt-1">
                            <Music size={10} color="#1DB954" />
                            <Text className="text-[10px] text-zinc-500" numberOfLines={1}>
                              {vid.spotify.trackName}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Acciones */}
                      <View className="justify-center gap-2">
                        {/* Toggle visibilidad */}
                        <TouchableOpacity
                          onPress={() => toggleVideoVisibility(vid)}
                          className={`w-10 h-10 rounded-full items-center justify-center ${
                            vid.is_public ? 'bg-green-900/20' : 'bg-zinc-800'
                          }`}
                        >
                          {vid.is_public ? (
                            <Eye size={16} color="#22c55e" />
                          ) : (
                            <EyeOff size={16} color="#71717a" />
                          )}
                        </TouchableOpacity>

                        {/* Más opciones */}
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedVideoForEdit(vid);
                            setVideoOptionsVisible(true);
                          }}
                          className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center"
                        >
                          <MoreVertical size={16} color="#71717a" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </View>

        {/* Botón discreto de cerrar sesión */}
        {user && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas cerrar sesión?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Cerrar Sesión',
                  style: 'destructive',
                  onPress: async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    await supabase.auth.signOut();
                  },
                },
              ]);
            }}
            className="flex-row items-center justify-center gap-2 py-4 mt-4 mb-2"
          >
            <LogOut size={16} color="#52525B" />
            <Text className="text-zinc-600 text-sm">Cerrar Sesión</Text>
          </TouchableOpacity>
        )}

        {/* Espaciado inferior */}
        <View className="h-20" />
      </ScrollView>

      {/* Modal Añadir Récord */}
      <AddRecordModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddRecord}
      />

      {/* Modal Video Viewer */}
      <Modal
        visible={videoViewerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setVideoViewerVisible(false);
          setSelectedVideo(null);
          // Pausar Spotify al cerrar el visor
          spotify.pauseForSwipe().catch(() => {});
        }}
      >
        <View className="flex-1 bg-black">
          {/* Header */}
          <View className="absolute top-0 left-0 right-0 z-10 pt-14 px-4 pb-4 bg-gradient-to-b from-black/80 to-transparent">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setVideoViewerVisible(false);
                  setSelectedVideo(null);
                  // Pausar Spotify al cerrar el visor
                  spotify.pauseForSwipe().catch(() => {});
                }}
                className="w-10 h-10 rounded-full bg-zinc-900/80 items-center justify-center"
              >
                <X size={20} color="#fff" />
              </TouchableOpacity>
              <View className="flex-1 mx-4">
                <Text className="text-white font-bold text-sm text-center" numberOfLines={1}>
                  {selectedVideo?.title || 'Video'}
                </Text>
                {selectedVideo?.free_text && (
                  <Text className="text-zinc-400 text-xs text-center italic" numberOfLines={1}>
                    {selectedVideo.free_text}
                  </Text>
                )}
                {(selectedVideo?.weight_kg || selectedVideo?.reps) && (
                  <Text className="text-savage-red text-xs text-center font-mono mt-0.5">
                    {selectedVideo.weight_kg && selectedVideo.reps
                      ? `${selectedVideo.weight_kg}kg × ${selectedVideo.reps}`
                      : selectedVideo.weight_kg
                        ? `${selectedVideo.weight_kg}kg`
                        : `${selectedVideo.reps} reps`}
                  </Text>
                )}
              </View>
              <View className="w-10" />
            </View>
          </View>

          {/* Video Player */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleVideoTap}
            className="flex-1 items-center justify-center"
          >
            {selectedVideo?.video_url && (
              <VideoView
                player={videoPlayer}
                style={{ width: screenWidth, height: screenWidth * (16 / 9) }}
                contentFit="contain"
                nativeControls={false}
              />
            )}
            {/* Icono de Play cuando está pausado manualmente */}
            {isVideoManuallyPaused && (
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-20 h-20 rounded-full bg-black/50 items-center justify-center">
                  <Play size={40} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Footer con info de Spotify */}
          {selectedVideo?.spotify?.enabled && (
            <View className="absolute bottom-0 left-0 right-0 pb-10 px-4 pt-4 bg-gradient-to-t from-black/80 to-transparent">
              <TouchableOpacity
                onPress={async () => {
                  // PRO + Premium: Puede reproducir desde posición exacta
                  if (isPro && spotifyPremium) {
                    const trackUri = (selectedVideo.spotify as any).trackUri;
                    const positionMs = (selectedVideo.spotify as any).positionMs || 0;
                    if (trackUri) {
                      await spotify.syncWithVideo(trackUri, positionMs);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  } else {
                    // FREE: Mostrar mensaje de upgrade
                    Alert.alert(
                      '⭐ TRENS PRO',
                      'Desbloquea TRENS PRO para escuchar la música con la que se grabó este levantamiento.\n\nCon PRO puedes:\n• Auto-reproducir la canción exacta\n• Controlar Spotify\n• Grabar tus propios videos',
                      [{ text: 'ENTENDIDO', style: 'default' }]
                    );
                  }
                }}
                className="flex-row items-center gap-2 bg-zinc-900/80 rounded-lg px-3 py-2"
              >
                <Music size={16} color="#1DB954" />
                <View className="flex-1">
                  <Text className="text-white text-xs font-bold" numberOfLines={1}>
                    {selectedVideo.spotify.trackName}
                  </Text>
                  <Text className="text-zinc-400 text-[10px]" numberOfLines={1}>
                    {selectedVideo.spotify.artist}
                  </Text>
                </View>
                {/* Indicador de play o lock */}
                {isPro && spotifyPremium ? (
                  <Volume2 size={16} color="#1DB954" />
                ) : (
                  <Lock size={14} color="#71717a" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal Video Options */}
      <Modal
        visible={videoOptionsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setVideoOptionsVisible(false);
          setSelectedVideoForEdit(null);
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setVideoOptionsVisible(false);
            setSelectedVideoForEdit(null);
          }}
          className="flex-1 bg-black/80 justify-end"
        >
          <View className="bg-zinc-950 rounded-t-3xl p-6 pb-10">
            <View className="w-12 h-1 bg-zinc-700 rounded-full self-center mb-6" />

            <Text className="text-white text-lg font-bold mb-4">{selectedVideoForEdit?.title}</Text>

            {/* Toggle Visibilidad */}
            <TouchableOpacity
              onPress={() => selectedVideoForEdit && toggleVideoVisibility(selectedVideoForEdit)}
              className="flex-row items-center p-4 bg-zinc-900 rounded-xl mb-3"
            >
              {selectedVideoForEdit?.is_public ? (
                <>
                  <Lock size={20} color="#71717a" />
                  <Text className="text-white ml-3 flex-1">Mover a la Bóveda</Text>
                  <Text className="text-zinc-500 text-xs">Privado</Text>
                </>
              ) : (
                <>
                  <Eye size={20} color="#22c55e" />
                  <Text className="text-white ml-3 flex-1">Hacer Público</Text>
                  <Text className="text-green-500 text-xs">Feed</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Compartir */}
            <TouchableOpacity
              onPress={() => {
                setVideoOptionsVisible(false);
                setTimeout(() => setShareModalVisible(true), 300);
              }}
              className="flex-row items-center p-4 bg-zinc-900 rounded-xl mb-3"
            >
              <Share2 size={20} color="#DC2626" />
              <Text className="text-white ml-3 flex-1">Compartir</Text>
              <Text className="text-zinc-500 text-xs">🔗 Link</Text>
            </TouchableOpacity>

            {/* Eliminar */}
            <TouchableOpacity
              onPress={() => selectedVideoForEdit && deleteVideo(selectedVideoForEdit)}
              className="flex-row items-center p-4 bg-red-900/20 border border-red-900/30 rounded-xl"
            >
              <Trash2 size={20} color="#EF4444" />
              <Text className="text-red-400 ml-3 flex-1">Eliminar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PRO Upgrade Modal */}
      <ProUpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="vault"
      />

      {/* Share Modal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        videoId={selectedVideoForEdit?.id || ''}
        title={selectedVideoForEdit?.title}
        exerciseName={selectedVideoForEdit?.exercise_name}
        weightKg={selectedVideoForEdit?.weight_kg}
        reps={selectedVideoForEdit?.reps}
        thumbnailUrl={selectedVideoForEdit?.thumbnail_url}
      />
    </View>
  );
}
