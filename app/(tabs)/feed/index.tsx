import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  ViewToken,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Heart, MessageCircle, Share2, Music, Bookmark, Play, Unlink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../lib/supabase';
import { useUserRoleContext } from '../../../context/UserRoleContext';
import spotify from '../../../services/spotify/spotify';

// ============================================================================
// TIPOS
// ============================================================================
interface FeedVideo {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string;
  exercise_name: string | null;
  weight_kg: number | null;
  reps: number | null;
  free_text: string | null;
  spotify: {
    enabled: boolean;
    trackUri?: string;
    trackName?: string;
    artist?: string;
    positionMs?: number;
  } | null;
  created_at: string;
  // Usuario
  user_display_name: string;
  user_avatar_url: string | null;
  // Métricas
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

// ============================================================================
// DIMENSIONS
// ============================================================================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_HEIGHT - 85; // Restar tab bar

// ============================================================================
// VIDEO ITEM COMPONENT (Memoizado para performance)
// ============================================================================
const FeedVideoItem = memo(
  ({
    item,
    isActive,
    onLike,
    onComment,
    onShare,
    onSave,
    onUserPress,
    spotifyPremium,
    spotifyConnected,
    isPro,
    onSpotifyUpgrade,
    spotifySyncEnabled,
  }: {
    item: FeedVideo;
    isActive: boolean;
    onLike: (videoId: string) => void;
    onComment: (videoId: string) => void;
    onShare: (video: FeedVideo) => void;
    onSave: (videoId: string) => void;
    onUserPress: (userId: string) => void;
    spotifyPremium: boolean;
    spotifyConnected: boolean;
    isPro: boolean;
    onSpotifyUpgrade: () => void;
    spotifySyncEnabled: boolean;
  }) => {
    // Helper: Arreglar URLs de Cloudflare Stream incompletas
    const fixCloudflareUrl = (url: string): string => {
      if (!url) return url;
      // Si es una URL de Cloudflare Stream y no tiene el path HLS, agregarlo
      if (url.includes('cloudflarestream.com') && !url.includes('/manifest/')) {
        return `${url}/manifest/video.m3u8`;
      }
      return url;
    };

    const videoUrl = fixCloudflareUrl(item.video_url);

    // =====================================================================
    // 3 ESTADOS DE AUDIO (NUNCA SE MEZCLAN):
    // Estado 1: Spotify conectado + SYNC ON → Video MUTE, reproduce canción del video
    // Estado 2: Spotify conectado + SYNC OFF → Video MUTE, usuario escucha su propia música
    // Estado 3: Sin Spotify → Video con AUDIO AMBIENTE
    // =====================================================================

    // ¿Puede sincronizar canción? (tiene track + conectado + premium + pro + sync ON)
    const canSyncTrack = !!(
      item.spotify?.enabled &&
      item.spotify.trackUri &&
      spotifyConnected &&
      spotifyPremium &&
      isPro &&
      spotifySyncEnabled
    );

    // ¿Video debe estar muteado? → SI hay Spotify conectado, SIEMPRE mute
    const shouldMuteVideo = spotifyConnected;

    // Debug log
    console.log('🎵 Feed Audio State:', {
      videoId: item.id.substring(0, 8),
      state: !spotifyConnected
        ? '🔊 Estado 3: Audio Ambiente'
        : spotifySyncEnabled
          ? '🎵 Estado 1: SYNC (canción del video)'
          : '🎧 Estado 2: Tu música',
      spotifyConnected,
      spotifySyncEnabled,
      canSyncTrack,
      shouldMuteVideo,
    });

    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [videoError, setVideoError] = useState<string | null>(null);
    const hasBeenReady = useRef(false); // Una vez listo, no volver a loading

    const player = useVideoPlayer(videoUrl, (p) => {
      p.loop = true;
      // Si Spotify conectado → video SIEMPRE mute (usuario escucha Spotify)
      // Si NO hay Spotify → video con audio ambiente
      p.muted = shouldMuteVideo;
    });

    // Detectar cuando el video está listo o tiene error
    useEffect(() => {
      if (player) {
        // Listener para el estado del player
        const statusSub = player.addListener('statusChange', (statusEvent: any) => {
          const status = typeof statusEvent === 'string' ? statusEvent : statusEvent?.status;

          if (status === 'readyToPlay') {
            hasBeenReady.current = true;
            setIsVideoLoading(false);
            setVideoError(null);
          } else if (status === 'error') {
            setIsVideoLoading(false);
            setVideoError('Error al cargar video');
            console.error('🎥 FEED Player error:', item.id);
          }
          // NO volvemos a loading si ya estuvo ready
        });

        // Check inicial por duration
        if (player.duration > 0) {
          hasBeenReady.current = true;
          setIsVideoLoading(false);
        }

        return () => {
          statusSub.remove();
        };
      }
    }, [player, videoUrl]);

    // Control de reproducción basado en isActive - 3 ESTADOS CLAROS
    useEffect(() => {
      // Video mute si Spotify conectado, con audio si no
      player.muted = shouldMuteVideo;

      if (isActive) {
        player.play();

        if (spotifyConnected) {
          if (canSyncTrack) {
            // ESTADO 1: SYNC ON → Reproducir canción del video
            const positionMs = item.spotify!.positionMs || 0;
            console.log('🎵 Estado 1: Sync canción del video', item.id.substring(0, 8));
            spotify.syncWithVideo(item.spotify!.trackUri!, positionMs).catch(console.warn);
          }
          // ESTADO 2: SYNC OFF → No tocamos Spotify, usuario sigue con su música
          // (No hacemos nada, dejamos que Spotify siga reproduciendo lo que tenía)
        }
        // ESTADO 3: Sin Spotify → Video suena con audio ambiente (ya configurado arriba)
      } else {
        player.pause();
        // Solo pausar Spotify si estábamos sincronizando canción del video
        if (canSyncTrack) {
          spotify.pauseForSwipe().catch(console.warn);
        }
      }
    }, [isActive, player, item.spotify, canSyncTrack, shouldMuteVideo, spotifyConnected]);

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (hours < 1) return 'Ahora';
      if (hours < 24) return `${hours}h`;
      if (days < 7) return `${days}d`;
      return date.toLocaleDateString('es', { day: '2-digit', month: 'short' });
    };

    return (
      <View style={{ width: SCREEN_WIDTH, height: VIDEO_HEIGHT }} className="bg-black">
        {/* Video - dimensiones absolutas para asegurar que se renderice */}
        <VideoView
          player={player}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: SCREEN_WIDTH,
            height: VIDEO_HEIGHT,
          }}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Thumbnail como fondo mientras carga */}
        {item.thumbnail_url && isVideoLoading && (
          <Image
            source={{ uri: item.thumbnail_url }}
            style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }}
            contentFit="cover"
          />
        )}

        {/* Loading indicator mientras carga el video */}
        {isVideoLoading && !videoError && (
          <View
            className="absolute inset-0 justify-center items-center bg-black/50"
            style={{ zIndex: 2 }}
          >
            <ActivityIndicator size="large" color="#DC2626" />
            <Text className="text-zinc-400 text-sm mt-2">Cargando video...</Text>
          </View>
        )}

        {/* Error indicator */}
        {videoError && (
          <View
            className="absolute inset-0 justify-center items-center bg-black/80"
            style={{ zIndex: 2 }}
          >
            <Text className="text-red-500 text-lg font-bold">⚠️</Text>
            <Text className="text-zinc-400 text-sm mt-2">{videoError}</Text>
            <Text className="text-zinc-600 text-xs mt-1">URL: {videoUrl?.substring(0, 50)}...</Text>
          </View>
        )}

        {/* Gradiente inferior */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          className="absolute bottom-0 left-0 right-0 h-64"
        />

        {/* Info del usuario y video */}
        <View className="absolute bottom-4 left-4 right-20">
          {/* Usuario */}
          <TouchableOpacity
            onPress={() => onUserPress(item.user_id)}
            className="flex-row items-center mb-3"
          >
            <View className="w-10 h-10 rounded-full bg-zinc-800 mr-3 overflow-hidden">
              {item.user_avatar_url ? (
                <Image
                  source={{ uri: item.user_avatar_url }}
                  style={{ width: 40, height: 40 }}
                  contentFit="cover"
                />
              ) : (
                <View className="w-full h-full bg-savage-red items-center justify-center">
                  <Text className="text-white font-bold">{item.user_display_name.charAt(0)}</Text>
                </View>
              )}
            </View>
            <View>
              <Text className="text-white font-bold">{item.user_display_name}</Text>
              <Text className="text-zinc-500 text-xs">{formatDate(item.created_at)}</Text>
            </View>
          </TouchableOpacity>

          {/* Ejercicio y métricas */}
          {item.exercise_name && (
            <View className="mb-2">
              <Text className="text-white text-lg font-bold">{item.exercise_name}</Text>
              {item.weight_kg && item.reps && (
                <Text className="text-savage-red text-2xl font-bold font-mono">
                  {item.weight_kg}kg × {item.reps}
                </Text>
              )}
            </View>
          )}

          {/* Texto libre */}
          {item.free_text && !item.exercise_name && (
            <Text className="text-white text-base mb-2">{item.free_text}</Text>
          )}

          {/* Spotify info */}
          {item.spotify?.enabled && (
            <TouchableOpacity
              onPress={async () => {
                // PRO + Premium: Puede reproducir desde posición exacta
                if (isPro && spotifyPremium && item.spotify?.trackUri) {
                  const positionMs = item.spotify.positionMs || 0;
                  await spotify.syncWithVideo(item.spotify.trackUri, positionMs);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                  // FREE: Mostrar mensaje de upgrade
                  onSpotifyUpgrade();
                }
              }}
              className="flex-row items-center bg-black/50 rounded-full px-3 py-1.5 self-start"
            >
              <Music size={14} color="#1DB954" />
              <Text className="text-white text-xs ml-2" numberOfLines={1}>
                {item.spotify.trackName} – {item.spotify.artist}
              </Text>
              {/* Indicador de lock para FREE */}
              {!isPro && <Lock size={12} color="#71717a" className="ml-2" />}
            </TouchableOpacity>
          )}
        </View>

        {/* Acciones laterales */}
        <View className="absolute right-3 bottom-20 items-center gap-5">
          {/* Like */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onLike(item.id);
            }}
            className="items-center"
          >
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                item.is_liked ? 'bg-savage-red' : 'bg-black/50'
              }`}
            >
              <Heart
                size={24}
                color={item.is_liked ? '#FFFFFF' : '#FFFFFF'}
                fill={item.is_liked ? '#FFFFFF' : 'transparent'}
              />
            </View>
            <Text className="text-white text-xs mt-1">{item.likes_count}</Text>
          </TouchableOpacity>

          {/* Comentar */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onComment(item.id);
            }}
            className="items-center"
          >
            <View className="w-12 h-12 rounded-full bg-black/50 items-center justify-center">
              <MessageCircle size={24} color="#FFFFFF" />
            </View>
            <Text className="text-white text-xs mt-1">{item.comments_count}</Text>
          </TouchableOpacity>

          {/* Guardar */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSave(item.id);
            }}
            className="items-center"
          >
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                item.is_saved ? 'bg-white' : 'bg-black/50'
              }`}
            >
              <Bookmark
                size={24}
                color={item.is_saved ? '#000000' : '#FFFFFF'}
                fill={item.is_saved ? '#000000' : 'transparent'}
              />
            </View>
          </TouchableOpacity>

          {/* Compartir */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShare(item);
            }}
            className="items-center"
          >
            <View className="w-12 h-12 rounded-full bg-black/50 items-center justify-center">
              <Share2 size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function FeedScreen() {
  const { user, spotifyPremium, spotifyConnected, isPro } = useUserRoleContext();

  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  // Toggle para sincronizar Spotify con videos - por defecto ON si está conectado
  const [spotifySyncEnabled, setSpotifySyncEnabled] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  // -------------------------------------------------------------------------
  // TOGGLE SPOTIFY SYNC
  // -------------------------------------------------------------------------
  const handleToggleSpotifySync = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSpotifySyncEnabled((prev) => {
      const newValue = !prev;
      // Si se ACTIVA el sync, la sincronización ocurrirá en el próximo ciclo
      // Si se DESACTIVA el sync, no pausamos Spotify - el usuario sigue escuchando su música
      // (En ambos casos el video permanece muteado porque Spotify está conectado)
      console.log(
        '🎵 Spotify SYNC toggled:',
        newValue ? 'ON (auto-sync canción del video)' : 'OFF (tu música)'
      );
      return newValue;
    });
  }, []);

  // -------------------------------------------------------------------------
  // PAUSAR AL SALIR DEL FEED (Solo si estaba sincronizando)
  // -------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      // Al entrar al Feed, no hacer nada especial
      return () => {
        // Solo pausar Spotify si estaba en modo SYNC
        // Si el usuario escucha su propia música (SYNC OFF), no interrumpimos
        if (spotifyConnected && spotifySyncEnabled) {
          spotify.pauseForSwipe().catch(() => {});
        }
      };
    }, [spotifyConnected, spotifySyncEnabled])
  );

  // -------------------------------------------------------------------------
  // FETCH VIDEOS
  // -------------------------------------------------------------------------
  const fetchVideos = useCallback(async () => {
    try {
      // Obtener videos públicos de usuarios PRO
      const { data: videosData, error } = await supabase
        .from('pro_videos')
        .select(
          `
          id,
          user_id,
          video_url,
          thumbnail_url,
          exercise_name,
          weight_kg,
          reps,
          free_text,
          spotify,
          created_at,
          likes_count,
          comments_count,
          views_count
        `
        )
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Obtener info de usuarios y estado de likes/saves
      const enrichedVideos: FeedVideo[] = await Promise.all(
        (videosData || []).map(async (video) => {
          // Obtener perfil de usuario
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name, avatar_url')
            .eq('user_id', video.user_id)
            .single();

          // Verificar si el usuario actual dio like/save
          let isLiked = false;
          let isSaved = false;

          if (user) {
            const { data: likeData } = await supabase
              .from('video_likes')
              .select('id')
              .eq('user_id', user.id)
              .eq('video_id', video.id)
              .single();

            const { data: saveData } = await supabase
              .from('video_saves')
              .select('id')
              .eq('user_id', user.id)
              .eq('video_id', video.id)
              .single();

            isLiked = !!likeData;
            isSaved = !!saveData;
          }

          return {
            ...video,
            user_display_name: profile?.display_name || 'ATLETA',
            user_avatar_url: profile?.avatar_url || null,
            likes_count: video.likes_count || 0,
            comments_count: video.comments_count || 0,
            is_liked: isLiked,
            is_saved: isSaved,
          };
        })
      );

      setVideos(enrichedVideos);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVideos();
  }, [fetchVideos]);

  // -------------------------------------------------------------------------
  // VIEWABILITY CONFIG
  // -------------------------------------------------------------------------
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index ?? 0;
      setActiveIndex(index);
    }
  }).current;

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  const handleLike = useCallback(
    async (videoId: string) => {
      if (!user) {
        // Usuario no autenticado - mostrar mensaje
        return;
      }

      // Obtener estado actual
      const video = videos.find((v) => v.id === videoId);
      if (!video) return;

      const wasLiked = video.is_liked;

      // Toggle like local (optimistic update)
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? {
                ...v,
                is_liked: !v.is_liked,
                likes_count: v.is_liked ? v.likes_count - 1 : v.likes_count + 1,
              }
            : v
        )
      );

      try {
        if (wasLiked) {
          // Quitar like
          await supabase
            .from('video_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('video_id', videoId);
        } else {
          // Agregar like
          await supabase.from('video_likes').insert({ user_id: user.id, video_id: videoId });
        }
      } catch (err) {
        console.error('Error toggling like:', err);
        // Revertir en caso de error
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  is_liked: wasLiked,
                  likes_count: wasLiked ? v.likes_count + 1 : v.likes_count - 1,
                }
              : v
          )
        );
      }
    },
    [user, videos]
  );

  const handleComment = useCallback((videoId: string) => {
    // TODO: Abrir modal de comentarios
    console.warn('Comment not implemented:', videoId);
  }, []);

  const handleShare = useCallback(async (video: FeedVideo) => {
    const { Share } = await import('react-native');
    await Share.share({
      message: video.exercise_name
        ? `🏋️ ${video.exercise_name} ${video.weight_kg}kg × ${video.reps}\n#TRENS`
        : `💪 ${video.free_text || 'Check de entreno'}\n#TRENS`,
      url: video.video_url,
    });
  }, []);

  const handleSave = useCallback(
    async (videoId: string) => {
      if (!user) {
        // Usuario no autenticado
        return;
      }

      // Obtener estado actual
      const video = videos.find((v) => v.id === videoId);
      if (!video) return;

      const wasSaved = video.is_saved;

      // Toggle save local (optimistic update)
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, is_saved: !v.is_saved } : v))
      );

      try {
        if (wasSaved) {
          // Quitar guardado
          await supabase
            .from('video_saves')
            .delete()
            .eq('user_id', user.id)
            .eq('video_id', videoId);
        } else {
          // Guardar video
          await supabase.from('video_saves').insert({ user_id: user.id, video_id: videoId });
        }
      } catch (err) {
        console.error('Error toggling save:', err);
        // Revertir en caso de error
        setVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, is_saved: wasSaved } : v)));
      }
    },
    [user, videos]
  );

  const handleUserPress = useCallback((userId: string) => {
    // TODO: Navegar al perfil del usuario
    console.warn('User profile not implemented:', userId);
  }, []);

  // -------------------------------------------------------------------------
  // SPOTIFY UPGRADE HANDLER - FREE usuarios
  // -------------------------------------------------------------------------
  const handleSpotifyUpgrade = useCallback(() => {
    Alert.alert(
      '⭐ TRENS PRO',
      'Desbloquea TRENS PRO para escuchar la música con la que se grabó este levantamiento.\n\nCon PRO puedes:\n• Auto-reproducir la canción exacta\n• Controlar Spotify\n• Grabar tus propios videos',
      [{ text: 'ENTENDIDO', style: 'default' }]
    );
  }, []);

  // -------------------------------------------------------------------------
  // RENDER KEY EXTRACTOR
  // -------------------------------------------------------------------------
  const keyExtractor = useCallback((item: FeedVideo) => item.id, []);

  // -------------------------------------------------------------------------
  // RENDER ITEM
  // -------------------------------------------------------------------------
  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => (
      <FeedVideoItem
        item={item}
        isActive={index === activeIndex}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onSave={handleSave}
        onUserPress={handleUserPress}
        spotifyPremium={spotifyPremium}
        spotifyConnected={spotifyConnected ?? false}
        isPro={isPro}
        onSpotifyUpgrade={handleSpotifyUpgrade}
        spotifySyncEnabled={spotifySyncEnabled}
      />
    ),
    [
      activeIndex,
      handleLike,
      handleComment,
      handleShare,
      handleSave,
      handleUserPress,
      spotifyPremium,
      spotifyConnected,
      isPro,
      handleSpotifyUpgrade,
      spotifySyncEnabled,
    ]
  );

  // -------------------------------------------------------------------------
  // RENDER: Loading
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#DC2626" />
        <Text className="text-zinc-500 mt-4">Cargando feed...</Text>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: Empty
  // -------------------------------------------------------------------------
  if (videos.length === 0) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Play size={64} color="#27272a" />
        <Text className="text-white text-xl font-bold mt-6 mb-2">Feed vacío</Text>
        <Text className="text-zinc-500 text-center">
          Sé el primero en compartir tu entrenamiento con la comunidad TRENS
        </Text>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: Main Feed
  // -------------------------------------------------------------------------
  return (
    <View className="flex-1 bg-black">
      {/* Header flotante */}
      <View className="absolute top-0 left-0 right-0 z-10 pt-14 px-4 pb-2">
        <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} className="absolute inset-0" />
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-bold tracking-wider">TRENS</Text>
          <View className="flex-row items-center gap-2">
            {/* Toggle de Spotify Sync - Solo mostrar si está conectado */}
            {spotifyConnected && (
              <TouchableOpacity
                onPress={handleToggleSpotifySync}
                className={`px-3 py-1.5 rounded-full flex-row items-center ${
                  spotifySyncEnabled ? 'bg-green-500/20' : 'bg-black/50'
                }`}
              >
                {spotifySyncEnabled ? (
                  <Music size={14} color="#1DB954" />
                ) : (
                  <Unlink size={14} color="#71717a" />
                )}
                <Text
                  className={`ml-1.5 text-xs font-bold ${
                    spotifySyncEnabled ? 'text-green-500' : 'text-zinc-500'
                  }`}
                >
                  {spotifySyncEnabled ? 'SYNC' : 'OFF'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Feed vertical */}
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={VIDEO_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
        }
        getItemLayout={(_, index) => ({
          length: VIDEO_HEIGHT,
          offset: VIDEO_HEIGHT * index,
          index,
        })}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />
    </View>
  );
}
