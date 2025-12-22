import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import {
  Search,
  ChevronLeft,
  Music,
  Play,
  Pause,
  Heart,
  ListMusic,
  SkipBack,
  SkipForward,
  Wifi,
  ChevronDown,
  Disc3,
  Library,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import spotify, {
  SpotifyPlaylist,
  SpotifyPlaylistTrack,
  SpotifyTrack,
  SpotifyPlaybackState,
} from '../../services/spotify/spotify';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================================================
// TIPOS
// ============================================================================
interface SpotifyModalProps {
  visible: boolean;
  onClose: () => void;
  isPro: boolean;
  onSpotifyConnect: () => void;
  onSpotifyDisconnect: () => void;
  spotifyConnected: boolean;
  spotifyLoading: boolean;
  currentTrack: SpotifyTrack | null;
  playbackState: SpotifyPlaybackState | null;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTrackChange: (track: SpotifyTrack) => void;
}

type TabType = 'now-playing' | 'playlists' | 'liked' | 'search';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// FORMATEAR DURACIÓN (helper function)
// ============================================================================
const formatDurationHelper = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// ============================================================================
// TRACK ITEM COMPONENT (Memoizado para rendimiento)
// ============================================================================
interface TrackItemProps {
  item: SpotifyPlaylistTrack;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  onPress: () => void;
}

const TrackItem = React.memo(
  ({ item, index, isCurrentTrack, isPlaying, onPress }: TrackItemProps) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center p-3 mb-1 rounded-xl ${
        isCurrentTrack ? 'bg-[#1DB954]/20' : 'bg-transparent active:bg-zinc-800/50'
      }`}
    >
      {/* Index o Playing Indicator */}
      <View className="w-8 items-center">
        {isCurrentTrack && isPlaying ? (
          <View className="flex-row items-end gap-0.5">
            <View className="w-1 h-3 bg-[#1DB954] rounded-full" />
            <View className="w-1 h-4 bg-[#1DB954] rounded-full" />
            <View className="w-1 h-2 bg-[#1DB954] rounded-full" />
          </View>
        ) : (
          <Text
            className={`text-sm font-mono ${isCurrentTrack ? 'text-[#1DB954]' : 'text-zinc-600'}`}
          >
            {index + 1}
          </Text>
        )}
      </View>

      {/* Album Art - OPTIMIZADO con cache */}
      {item.albumArt ? (
        <Image
          source={{ uri: item.albumArt }}
          style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: '#27272a' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          transition={100}
        />
      ) : (
        <View className="w-11 h-11 bg-zinc-800 rounded-md items-center justify-center">
          <Music size={18} color="#71717A" />
        </View>
      )}

      {/* Track Info */}
      <View className="flex-1 ml-3">
        <Text
          className={`font-bold text-sm ${isCurrentTrack ? 'text-[#1DB954]' : 'text-white'}`}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text className="text-zinc-500 text-xs mt-0.5" numberOfLines={1}>
          {item.artist}
        </Text>
      </View>

      {/* Duration */}
      <Text className="text-zinc-600 text-xs font-mono ml-2">
        {formatDurationHelper(item.durationMs)}
      </Text>
    </TouchableOpacity>
  )
);

// ============================================================================
// MINI REPRODUCTOR (Siempre visible en la parte inferior)
// ============================================================================
const MiniPlayer = ({
  currentTrack,
  isPlaying,
  onPlayPause,
  onExpand,
  isPro,
}: {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onExpand: () => void;
  isPro: boolean;
}) => {
  if (!currentTrack) return null;

  return (
    <TouchableOpacity
      onPress={onExpand}
      activeOpacity={0.9}
      className="absolute bottom-0 left-0 right-0"
    >
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} className="pt-8 pb-6 px-4">
        <View className="flex-row items-center bg-zinc-900/90 rounded-2xl p-3 border border-zinc-800">
          {/* Album Art */}
          {currentTrack.albumArt ? (
            <Image
              source={{ uri: currentTrack.albumArt }}
              style={{ width: 48, height: 48, borderRadius: 8 }}
              contentFit="cover"
            />
          ) : (
            <View className="w-12 h-12 bg-zinc-800 rounded-lg items-center justify-center">
              <Music color="#1DB954" size={20} />
            </View>
          )}

          {/* Track Info */}
          <View className="flex-1 ml-3">
            <Text className="text-white font-bold text-sm" numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text className="text-zinc-400 text-xs" numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          {/* Play/Pause */}
          {isPro && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPlayPause();
              }}
              className="w-10 h-10 bg-[#1DB954] rounded-full items-center justify-center"
            >
              {isPlaying ? (
                <Pause color="#000" size={18} fill="#000" />
              ) : (
                <Play color="#000" size={18} fill="#000" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ============================================================================
// ANIMATED ALBUM BACKGROUND - Fondo animado con carátula
// ============================================================================
const AnimatedAlbumBackground = ({
  albumArt,
  isPlaying,
}: {
  albumArt: string | null | undefined;
  isPlaying: boolean;
}) => {
  // Animaciones de pulso/ritmo
  const scaleAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);
  const translateXAnim = useSharedValue(0);
  const translateYAnim = useSharedValue(0);

  useEffect(() => {
    if (isPlaying) {
      // Pulso más pronunciado - escala grande para efecto visual
      scaleAnim.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1.08, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.18, { duration: 550, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 550, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      // Rotación más visible
      rotateAnim.value = withRepeat(
        withSequence(
          withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      // Traslación horizontal grande (respira)
      translateXAnim.value = withRepeat(
        withSequence(
          withTiming(40, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-40, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      // Traslación vertical grande (respira)
      translateYAnim.value = withRepeat(
        withSequence(
          withTiming(-30, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(30, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      // Detener animaciones suavemente
      scaleAnim.value = withTiming(1, { duration: 400 });
      rotateAnim.value = withTiming(0, { duration: 400 });
      translateXAnim.value = withTiming(0, { duration: 400 });
      translateYAnim.value = withTiming(0, { duration: 400 });
    }
  }, [isPlaying, scaleAnim, rotateAnim, translateXAnim, translateYAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnim.value },
      { rotate: `${rotateAnim.value}deg` },
      { translateX: translateXAnim.value },
      { translateY: translateYAnim.value },
    ],
  }));

  if (!albumArt) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      {/* Carátula animada de fondo - reducida para ver movimiento */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -80,
            left: -80,
            right: -80,
            bottom: -80,
          },
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: albumArt }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          blurRadius={15}
        />
      </Animated.View>

      {/* Overlay oscuro para contraste */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
        }}
      />

      {/* Glassmorphism overlay */}
      <BlurView
        intensity={20}
        tint="dark"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Gradiente superior e inferior para header/footer */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          backgroundColor: 'transparent',
        }}
      >
        <LinearGradient colors={['rgba(0,0,0,0.9)', 'transparent']} style={{ flex: 1 }} />
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 150,
          backgroundColor: 'transparent',
        }}
      >
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

// ============================================================================
// ESTADO PERSISTENTE A NIVEL DE MÓDULO (sobrevive desmontajes del Modal)
// ============================================================================
let persistedTab: TabType = 'now-playing';
let persistedShowTracks = false;

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function SpotifyModal({
  visible,
  onClose,
  isPro,
  onSpotifyConnect,
  onSpotifyDisconnect,
  spotifyConnected,
  spotifyLoading,
  currentTrack,
  playbackState,
  onPlayPause,
  onNext,
  onPrevious,
  onTrackChange,
}: SpotifyModalProps) {
  // Inicializar estado desde variables persistentes
  const [activeTab, setActiveTab] = useState<TabType>(persistedTab);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [tracks, setTracks] = useState<SpotifyPlaylistTrack[]>([]);
  const [likedSongs, setLikedSongs] = useState<SpotifyPlaylistTrack[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyPlaylistTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPlaylistTracks, setShowPlaylistTracks] = useState(persistedShowTracks);

  // Guardar estado en variables de módulo cuando cambia
  useEffect(() => {
    persistedTab = activeTab;
  }, [activeTab]);

  useEffect(() => {
    persistedShowTracks = showPlaylistTracks;
  }, [showPlaylistTracks]);

  // Paginación
  const [tracksOffset, setTracksOffset] = useState(0);
  const [likedOffset, setLikedOffset] = useState(0);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);
  const [hasMoreLiked, setHasMoreLiked] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false); // Ref para evitar llamadas dobles
  const likedOffsetRef = useRef(0); // Ref para offset sincronizado
  const tracksOffsetRef = useRef(0); // Ref para offset sincronizado

  // Progreso de reproducción
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Contexto de playlist actual (para next/prev)
  const [currentPlaylistTracks, setCurrentPlaylistTracks] = useState<SpotifyPlaylistTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [playlistContext, setPlaylistContext] = useState<'playlist' | 'liked' | 'search' | null>(
    null
  );

  // -------------------------------------------------------------------------
  // POLLING DE POSICIÓN DE REPRODUCCIÓN
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (visible && spotifyConnected && playbackState?.isPlaying && !isSeeking) {
      // Iniciar polling cada segundo
      positionInterval.current = setInterval(async () => {
        try {
          const state = await spotify.getPlaybackState();
          if (state?.track) {
            setCurrentPosition(state.track.positionMs);
          }
        } catch {
          // Silenciar errores
        }
      }, 1000);
    }

    return () => {
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    };
  }, [visible, spotifyConnected, playbackState?.isPlaying, isSeeking]);

  // Actualizar posición cuando cambia la canción
  useEffect(() => {
    if (currentTrack) {
      setCurrentPosition(currentTrack.positionMs || 0);
    }
  }, [currentTrack?.uri]);

  // -------------------------------------------------------------------------
  // SINCRONIZAR POSICIÓN AL ABRIR EL MODAL
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (visible && spotifyConnected) {
      // Obtener la posición actual inmediatamente al abrir
      const fetchCurrentPosition = async () => {
        try {
          const state = await spotify.getPlaybackState();
          if (state?.track) {
            setCurrentPosition(state.track.positionMs);
          }
        } catch {
          // Silenciar errores
        }
      };
      fetchCurrentPosition();
    }
  }, [visible, spotifyConnected]);

  // -------------------------------------------------------------------------
  // CARGAR PLAYLISTS
  // -------------------------------------------------------------------------
  const loadPlaylists = useCallback(async () => {
    if (playlists.length > 0) return; // Ya cargadas
    setLoading(true);
    try {
      const data = await spotify.getMyPlaylists(50, 0);
      setPlaylists(data);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  }, [playlists.length]);

  // -------------------------------------------------------------------------
  // CARGAR LIKED SONGS (con paginación)
  // -------------------------------------------------------------------------
  const loadLikedSongs = useCallback(
    async (reset = false) => {
      if (!reset && likedSongs.length > 0) return; // Ya cargadas

      setLoading(true);
      setLikedOffset(0);
      likedOffsetRef.current = 0;
      setHasMoreLiked(true);

      try {
        const data = await spotify.getLikedSongs(20, 0);
        setLikedSongs(data);
        setHasMoreLiked(data.length === 20);
        setLikedOffset(20);
        likedOffsetRef.current = 20;
      } catch (error) {
        console.error('Error loading liked songs:', error);
      } finally {
        setLoading(false);
      }
    },
    [likedSongs.length]
  );

  const loadMoreLikedSongs = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreLiked) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);

    const currentOffset = likedOffsetRef.current;
    try {
      const data = await spotify.getLikedSongs(20, currentOffset);
      if (data.length > 0) {
        // Filtrar duplicados por URI
        setLikedSongs((prev) => {
          const existingUris = new Set(prev.map((t) => t.uri));
          const newTracks = data.filter((t) => !existingUris.has(t.uri));
          return [...prev, ...newTracks];
        });
        const newOffset = currentOffset + 20;
        setLikedOffset(newOffset);
        likedOffsetRef.current = newOffset;
        setHasMoreLiked(data.length === 20);
      } else {
        setHasMoreLiked(false);
      }
    } catch (error) {
      console.error('Error loading more liked songs:', error);
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [hasMoreLiked]);

  // -------------------------------------------------------------------------
  // CARGAR TRACKS DE PLAYLIST (con paginación)
  // -------------------------------------------------------------------------
  const loadPlaylistTracks = useCallback(async (playlist: SpotifyPlaylist) => {
    setLoading(true);
    setSelectedPlaylist(playlist);
    setShowPlaylistTracks(true);
    setTracksOffset(0);
    tracksOffsetRef.current = 0;
    setHasMoreTracks(true);

    try {
      const data = await spotify.getPlaylistTracks(playlist.id, 20, 0);
      setTracks(data);
      setHasMoreTracks(data.length === 20);
      setTracksOffset(20);
      tracksOffsetRef.current = 20;
    } catch (error) {
      console.error('Error loading playlist tracks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePlaylistTracks = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreTracks || !selectedPlaylist) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);

    const currentOffset = tracksOffsetRef.current;
    try {
      const data = await spotify.getPlaylistTracks(selectedPlaylist.id, 20, currentOffset);
      if (data.length > 0) {
        // Filtrar duplicados por URI
        setTracks((prev) => {
          const existingUris = new Set(prev.map((t) => t.uri));
          const newTracks = data.filter((t) => !existingUris.has(t.uri));
          return [...prev, ...newTracks];
        });
        const newOffset = currentOffset + 20;
        setTracksOffset(newOffset);
        tracksOffsetRef.current = newOffset;
        setHasMoreTracks(data.length === 20);
      } else {
        setHasMoreTracks(false);
      }
    } catch (error) {
      console.error('Error loading more playlist tracks:', error);
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [hasMoreTracks, selectedPlaylist]);

  // -------------------------------------------------------------------------
  // BUSCAR
  // -------------------------------------------------------------------------
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await spotify.searchTracks(searchQuery, 30);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // -------------------------------------------------------------------------
  // REPRODUCIR TRACK (con contexto de playlist)
  // -------------------------------------------------------------------------
  const handlePlayTrack = useCallback(
    async (
      track: SpotifyPlaylistTrack,
      trackList?: SpotifyPlaylistTrack[],
      index?: number,
      context?: 'playlist' | 'liked' | 'search'
    ) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        // Si tenemos lista de tracks, reproducir con contexto para que next/prev funcione
        if (trackList && trackList.length > 0) {
          const allUris = trackList.map((t) => t.uri);
          await spotify.playWithContext(track.uri, allUris, 0);
        } else {
          await spotify.playTrack(track.uri);
        }

        // Convertir a SpotifyTrack para actualizar el reproductor
        const spotifyTrack: SpotifyTrack = {
          uri: track.uri,
          name: track.name,
          artist: track.artist,
          artistId: '', // No disponible en SpotifyPlaylistTrack, se obtiene del playback
          album: track.album,
          albumArt: track.albumArt || '',
          durationMs: track.durationMs,
          positionMs: 0,
        };
        onTrackChange(spotifyTrack);
        setCurrentPosition(0);

        // Guardar contexto de playlist para next/prev
        if (trackList && index !== undefined && context) {
          setCurrentPlaylistTracks(trackList);
          setCurrentTrackIndex(index);
          setPlaylistContext(context);
        }
      } catch (error) {
        console.error('Error playing track:', error);
      }
    },
    [onTrackChange]
  );

  // -------------------------------------------------------------------------
  // SIGUIENTE Y ANTERIOR EN CONTEXTO DE PLAYLIST
  // -------------------------------------------------------------------------
  const handleNextInPlaylist = useCallback(async () => {
    if (currentPlaylistTracks.length === 0 || currentTrackIndex === -1) {
      // Sin contexto, usar skip normal de Spotify
      onNext();
      return;
    }

    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < currentPlaylistTracks.length) {
      const nextTrack = currentPlaylistTracks[nextIndex];
      await handlePlayTrack(nextTrack, currentPlaylistTracks, nextIndex, playlistContext!);
    } else if (currentPlaylistTracks.length > 0) {
      // Volver al inicio (loop)
      const firstTrack = currentPlaylistTracks[0];
      await handlePlayTrack(firstTrack, currentPlaylistTracks, 0, playlistContext!);
    }
  }, [currentPlaylistTracks, currentTrackIndex, playlistContext, handlePlayTrack, onNext]);

  const handlePrevInPlaylist = useCallback(async () => {
    if (currentPlaylistTracks.length === 0 || currentTrackIndex === -1) {
      // Sin contexto, usar skip normal de Spotify
      onPrevious();
      return;
    }

    const prevIndex = currentTrackIndex - 1;
    if (prevIndex >= 0) {
      const prevTrack = currentPlaylistTracks[prevIndex];
      await handlePlayTrack(prevTrack, currentPlaylistTracks, prevIndex, playlistContext!);
    } else {
      // Ir al final (loop)
      const lastIndex = currentPlaylistTracks.length - 1;
      const lastTrack = currentPlaylistTracks[lastIndex];
      await handlePlayTrack(lastTrack, currentPlaylistTracks, lastIndex, playlistContext!);
    }
  }, [currentPlaylistTracks, currentTrackIndex, playlistContext, handlePlayTrack, onPrevious]);

  // -------------------------------------------------------------------------
  // SEEK (mover posición de reproducción)
  // -------------------------------------------------------------------------
  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekComplete = useCallback(async (value: number) => {
    const positionMs = Math.floor(value);
    try {
      await spotify.seek(positionMs);
      setCurrentPosition(positionMs);
    } catch (error) {
      console.error('Error seeking:', error);
    } finally {
      setIsSeeking(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // EFECTOS
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (visible && spotifyConnected) {
      if (activeTab === 'playlists') {
        loadPlaylists();
      } else if (activeTab === 'liked') {
        loadLikedSongs();
      }
    }
  }, [visible, spotifyConnected, activeTab, loadPlaylists, loadLikedSongs]);

  // NO reseteamos el estado al cerrar para mantener la navegación
  // El usuario verá exactamente donde se quedó cuando vuelva a abrir el modal

  // -------------------------------------------------------------------------
  // FORMATEAR DURACIÓN
  // -------------------------------------------------------------------------
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------------------
  // RENDER TAB BUTTON
  // -------------------------------------------------------------------------
  const TabButton = ({ tab, icon: Icon, label }: { tab: TabType; icon: any; label: string }) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab(tab);
          setShowPlaylistTracks(false);
        }}
        className={`flex-1 items-center py-3 rounded-xl ${
          isActive ? 'bg-[#1DB954]' : 'bg-transparent'
        }`}
      >
        <Icon size={18} color={isActive ? '#000' : '#71717A'} />
        <Text className={`text-xs mt-1 font-bold ${isActive ? 'text-black' : 'text-zinc-500'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------------
  // RENDER PLAYLIST ITEM
  // -------------------------------------------------------------------------
  const renderPlaylistItem = ({ item }: { item: SpotifyPlaylist }) => (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        loadPlaylistTracks(item);
      }}
      className="flex-row items-center p-3 mb-2 bg-zinc-900/50 rounded-xl active:bg-zinc-800"
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: 56, height: 56, borderRadius: 8 }}
          contentFit="cover"
        />
      ) : (
        <View className="w-14 h-14 bg-zinc-800 rounded-lg items-center justify-center">
          <ListMusic size={24} color="#1DB954" />
        </View>
      )}
      <View className="flex-1 ml-4">
        <Text className="text-white font-bold text-base" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-zinc-500 text-sm mt-0.5">{item.trackCount} canciones</Text>
      </View>
      <View className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center">
        <Play size={14} color="#1DB954" fill="#1DB954" />
      </View>
    </TouchableOpacity>
  );

  // -------------------------------------------------------------------------
  // RENDER TRACK ITEM WITH CONTEXT (usa componente memoizado)
  // -------------------------------------------------------------------------
  const renderTrackItemWithContext = useCallback(
    (
      item: SpotifyPlaylistTrack,
      index: number,
      trackList: SpotifyPlaylistTrack[],
      context: 'playlist' | 'liked' | 'search'
    ) => {
      const isCurrentTrack = currentTrack?.uri === item.uri;

      return (
        <TrackItem
          item={item}
          index={index}
          isCurrentTrack={isCurrentTrack}
          isPlaying={playbackState?.isPlaying || false}
          onPress={() => handlePlayTrack(item, trackList, index, context)}
        />
      );
    },
    [currentTrack?.uri, playbackState?.isPlaying, handlePlayTrack]
  );

  // -------------------------------------------------------------------------
  // RENDER CONNECTED VIEW
  // -------------------------------------------------------------------------
  const renderConnectedView = () => (
    <View className="flex-1">
      {/* NOW PLAYING TAB */}
      {activeTab === 'now-playing' && (
        <Animated.View entering={FadeIn.duration(200)} className="flex-1">
          {/* Fondo animado con carátula */}
          <AnimatedAlbumBackground
            albumArt={currentTrack?.albumArt}
            isPlaying={playbackState?.isPlaying ?? false}
          />

          <View className="flex-1 px-6 pt-4">
            {currentTrack ? (
              <View className="flex-1 items-center justify-center">
                {/* Large Album Art */}
                <View className="w-72 h-72 rounded-2xl overflow-hidden shadow-2xl mb-8">
                  {currentTrack.albumArt ? (
                    <Image
                      source={{ uri: currentTrack.albumArt }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-full h-full bg-zinc-800 items-center justify-center">
                      <Disc3 size={80} color="#1DB954" />
                    </View>
                  )}
                </View>

                {/* Track Info */}
                <View className="w-full items-center mb-4">
                  <Text className="text-white font-bold text-2xl text-center" numberOfLines={2}>
                    {currentTrack.name}
                  </Text>
                  <Text className="text-zinc-400 text-lg mt-2">{currentTrack.artist}</Text>
                  <Text className="text-zinc-600 text-sm mt-1">{currentTrack.album}</Text>
                </View>

                {/* Progress Bar Slider */}
                <View className="w-full mb-6">
                  <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={0}
                    maximumValue={currentTrack.durationMs || 1}
                    value={isSeeking ? currentPosition : currentPosition}
                    onSlidingStart={handleSeekStart}
                    onSlidingComplete={handleSeekComplete}
                    minimumTrackTintColor="#1DB954"
                    maximumTrackTintColor="#27272A"
                    thumbTintColor="#1DB954"
                    disabled={!isPro}
                  />
                  <View className="flex-row justify-between px-1 -mt-1">
                    <Text className="text-zinc-500 text-xs font-mono">
                      {formatDuration(currentPosition)}
                    </Text>
                    <Text className="text-zinc-500 text-xs font-mono">
                      {formatDuration(currentTrack.durationMs || 0)}
                    </Text>
                  </View>
                </View>

                {/* Controls */}
                {isPro ? (
                  <View className="flex-row items-center justify-center gap-8">
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handlePrevInPlaylist();
                      }}
                      className="w-14 h-14 bg-zinc-800 rounded-full items-center justify-center"
                    >
                      <SkipBack size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onPlayPause();
                      }}
                      className="w-20 h-20 bg-[#1DB954] rounded-full items-center justify-center"
                    >
                      {playbackState?.isPlaying ? (
                        <Pause size={36} color="#000" fill="#000" />
                      ) : (
                        <Play size={36} color="#000" fill="#000" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleNextInPlaylist();
                      }}
                      className="w-14 h-14 bg-zinc-800 rounded-full items-center justify-center"
                    >
                      <SkipForward size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 w-full">
                    <Text className="text-zinc-400 text-center text-sm">
                      Tu música sigue sonando mientras entrenas
                    </Text>
                    <View className="mt-3 bg-[#DC2626]/20 border border-[#DC2626]/50 rounded-lg p-3">
                      <Text className="text-[#DC2626] text-xs text-center font-bold">
                        🔥 PRO: Desbloquea controles de reproducción
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View className="flex-1 items-center justify-center">
                <View className="w-32 h-32 bg-zinc-900 rounded-full items-center justify-center mb-6">
                  <Music size={48} color="#71717A" />
                </View>
                <Text className="text-white font-bold text-xl mb-2">Sin reproducción</Text>
                <Text className="text-zinc-500 text-center">
                  Abre Spotify y reproduce algo,{'\n'}o busca una canción aquí
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('search')}
                  className="mt-6 bg-[#1DB954] px-6 py-3 rounded-full"
                >
                  <Text className="text-black font-bold">Buscar música</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* PLAYLISTS TAB */}
      {activeTab === 'playlists' && (
        <Animated.View entering={FadeIn.duration(200)} className="flex-1">
          {showPlaylistTracks && selectedPlaylist ? (
            // Tracks de playlist seleccionada
            <View className="flex-1">
              {/* Header de playlist */}
              <View className="flex-row items-center px-4 py-4 border-b border-zinc-800">
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPlaylistTracks(false);
                    setSelectedPlaylist(null);
                  }}
                  className="w-10 h-10 bg-zinc-800 rounded-full items-center justify-center mr-3"
                >
                  <ChevronLeft size={20} color="#fff" />
                </TouchableOpacity>
                {selectedPlaylist.imageUrl && (
                  <Image
                    source={{ uri: selectedPlaylist.imageUrl }}
                    style={{ width: 40, height: 40, borderRadius: 6 }}
                    contentFit="cover"
                  />
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-white font-bold text-base" numberOfLines={1}>
                    {selectedPlaylist.name}
                  </Text>
                  <Text className="text-zinc-500 text-xs">
                    {tracks.length}
                    {hasMoreTracks ? '+' : ''} / {selectedPlaylist.trackCount} canciones
                  </Text>
                </View>
              </View>

              {/* Lista de tracks */}
              {loading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#1DB954" />
                </View>
              ) : (
                <FlatList
                  data={tracks}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) =>
                    renderTrackItemWithContext(item, index, tracks, 'playlist')
                  }
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                  onEndReached={loadMorePlaylistTracks}
                  onEndReachedThreshold={0.3}
                  initialNumToRender={10}
                  maxToRenderPerBatch={8}
                  windowSize={3}
                  removeClippedSubviews={true}
                  getItemLayout={(_, index) => ({
                    length: 60,
                    offset: 60 * index,
                    index,
                  })}
                  updateCellsBatchingPeriod={100}
                  ListFooterComponent={
                    loadingMore ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator size="small" color="#1DB954" />
                        <Text className="text-zinc-500 text-xs mt-2">
                          Cargando más canciones...
                        </Text>
                      </View>
                    ) : null
                  }
                />
              )}
            </View>
          ) : (
            // Lista de playlists
            <View className="flex-1">
              {loading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#1DB954" />
                </View>
              ) : (
                <FlatList
                  data={playlists}
                  keyExtractor={(item, index) => `${item.id}_${index}`}
                  renderItem={renderPlaylistItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                  ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                      <Library size={48} color="#71717A" />
                      <Text className="text-zinc-400 mt-4 text-center">
                        No se encontraron playlists.{'\n'}
                        Reconecta Spotify si es necesario.
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          )}
        </Animated.View>
      )}

      {/* LIKED SONGS TAB */}
      {activeTab === 'liked' && (
        <Animated.View entering={FadeIn.duration(200)} className="flex-1">
          {/* Header Liked Songs */}
          <LinearGradient colors={['#5B21B6', '#1E1B4B', '#000']} className="px-4 pt-4 pb-6">
            <View className="flex-row items-center">
              <View
                className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg items-center justify-center mr-4"
                style={{ backgroundColor: '#8B5CF6' }}
              >
                <Heart size={28} color="#fff" fill="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-xl">Liked Songs</Text>
                <Text className="text-zinc-300 text-sm mt-1">
                  {likedSongs.length}
                  {hasMoreLiked ? '+' : ''} canciones guardadas
                </Text>
              </View>
            </View>
          </LinearGradient>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#1DB954" />
            </View>
          ) : (
            <FlatList
              data={likedSongs}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) =>
                renderTrackItemWithContext(item, index, likedSongs, 'liked')
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              onEndReached={loadMoreLikedSongs}
              onEndReachedThreshold={0.3}
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              windowSize={3}
              removeClippedSubviews={true}
              getItemLayout={(_, index) => ({
                length: 60,
                offset: 60 * index,
                index,
              })}
              updateCellsBatchingPeriod={100}
              ListFooterComponent={
                loadingMore ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#1DB954" />
                    <Text className="text-zinc-500 text-xs mt-2">Cargando más canciones...</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View className="items-center justify-center py-20">
                  <Heart size={48} color="#71717A" />
                  <Text className="text-zinc-400 mt-4">No tienes canciones guardadas</Text>
                </View>
              }
            />
          )}
        </Animated.View>
      )}

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <Animated.View entering={FadeIn.duration(200)} className="flex-1">
          {/* Search Bar */}
          <View className="px-4 pt-4 pb-2">
            <View className="flex-row items-center bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800">
              <Search size={20} color="#71717A" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholder="¿Qué quieres escuchar?"
                placeholderTextColor="#71717A"
                className="flex-1 ml-3 text-white text-base"
                returnKeyType="search"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color="#71717A" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#1DB954" />
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.id}_${index}`}
              renderItem={({ item, index }) =>
                renderTrackItemWithContext(item, index, searchResults, 'search')
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <Search size={48} color="#71717A" />
              <Text className="text-zinc-400 mt-4 text-center">
                Busca por nombre de canción, artista o álbum
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Mini Player (si hay track y no está en Now Playing) */}
      {currentTrack && activeTab !== 'now-playing' && (
        <MiniPlayer
          currentTrack={currentTrack}
          isPlaying={playbackState?.isPlaying || false}
          onPlayPause={onPlayPause}
          onExpand={() => setActiveTab('now-playing')}
          isPro={isPro}
        />
      )}
    </View>
  );

  // -------------------------------------------------------------------------
  // RENDER NOT CONNECTED VIEW
  // -------------------------------------------------------------------------
  const renderNotConnectedView = () => (
    <View className="flex-1 items-center justify-center px-8">
      {/* Spotify Logo Area */}
      <View className="w-28 h-28 bg-[#1DB954] rounded-full items-center justify-center mb-8 shadow-lg">
        <Music size={56} color="#000" />
      </View>

      <Text className="text-white text-2xl font-bold mb-3 text-center">Conecta con Spotify</Text>
      <Text className="text-zinc-400 text-center mb-8 leading-6">
        Controla tu música mientras entrenas{'\n'}
        sin salir de TRENS
      </Text>

      {/* Features */}
      <View className="w-full mb-8">
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-zinc-800 rounded-full items-center justify-center mr-4">
            <Play size={16} color="#1DB954" />
          </View>
          <Text className="text-zinc-300 flex-1">Reproduce y controla desde aquí</Text>
        </View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-zinc-800 rounded-full items-center justify-center mr-4">
            <ListMusic size={16} color="#1DB954" />
          </View>
          <Text className="text-zinc-300 flex-1">Navega por tus playlists</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-zinc-800 rounded-full items-center justify-center mr-4">
            <Search size={16} color="#1DB954" />
          </View>
          <Text className="text-zinc-300 flex-1">Busca cualquier canción</Text>
        </View>
      </View>

      {/* Connect Button */}
      <TouchableOpacity
        onPress={onSpotifyConnect}
        disabled={spotifyLoading}
        className={`w-full p-4 rounded-full items-center ${
          spotifyLoading ? 'bg-[#1DB954]/50' : 'bg-[#1DB954]'
        }`}
      >
        {spotifyLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className="text-black font-bold text-lg">Conectar con Spotify</Text>
        )}
      </TouchableOpacity>

      <Text className="text-zinc-600 text-xs text-center mt-4">Requiere Spotify Premium</Text>
    </View>
  );

  // -------------------------------------------------------------------------
  // RENDER PRINCIPAL
  // -------------------------------------------------------------------------
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-14 pb-4 border-b border-zinc-900">
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 bg-zinc-900 rounded-full items-center justify-center"
          >
            <ChevronDown size={22} color="#fff" />
          </TouchableOpacity>

          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-[#1DB954] rounded-full items-center justify-center mr-2">
              <Music size={16} color="#000" />
            </View>
            <Text className="text-white font-bold text-lg">Spotify</Text>
          </View>

          {spotifyConnected ? (
            <TouchableOpacity
              onPress={onSpotifyDisconnect}
              className="px-3 py-2 bg-zinc-900 rounded-full flex-row items-center"
            >
              <Wifi size={14} color="#1DB954" />
              <Text className="text-zinc-400 text-xs ml-1.5">On</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>

        {spotifyConnected ? (
          <>
            {/* Tab Bar - Solo si está conectado */}
            <View className="flex-row px-4 py-3 bg-black border-b border-zinc-900">
              <TabButton tab="now-playing" icon={Disc3} label="Ahora" />
              <TabButton tab="playlists" icon={Library} label="Playlists" />
              <TabButton tab="liked" icon={Heart} label="Liked" />
              <TabButton tab="search" icon={Search} label="Buscar" />
            </View>

            {renderConnectedView()}
          </>
        ) : (
          renderNotConnectedView()
        )}
      </View>
    </Modal>
  );
}
