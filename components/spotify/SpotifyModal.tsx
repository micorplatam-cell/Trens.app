import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  ScrollView,
  Animated as RNAnimated,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  PlusCircle,
  CheckCircle,
} from 'lucide-react-native';
import { Haptics } from '../../lib/haptics';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  SharedValue,
  runOnJS,
  withSpring,
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

  if (!albumArt || albumArt.length === 0) return null;

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
// ALBUM CAROUSEL - Carrusel de carátulas estilo Spotify
// ============================================================================
const ALBUM_CAROUSEL_SIZE = 280;
const ALBUM_CAROUSEL_GAP = 16;

interface TrackInfo {
  name: string;
  artist: string;
  album: string;
}

interface AlbumCarouselItem {
  id: string;
  albumArt: string | null;
  trackInfo: TrackInfo | null;
  type: 'prev' | 'current' | 'next';
}

interface AlbumCarouselProps {
  currentAlbumArt: string | null;
  prevAlbumArt: string | null;
  nextAlbumArt: string | null;
  currentTrackInfo: TrackInfo | null;
  prevTrackInfo: TrackInfo | null;
  nextTrackInfo: TrackInfo | null;
  currentTrackUri: string | null;
  onNext: () => void;
  onPrevious: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  // Like button props
  isTrackLiked: boolean;
  checkingLikeStatus: boolean;
  togglingLike: boolean;
  onToggleLike: () => void;
}

const AlbumCarousel = React.memo(
  ({
    currentAlbumArt,
    prevAlbumArt,
    nextAlbumArt,
    currentTrackInfo,
    prevTrackInfo,
    nextTrackInfo,
    currentTrackUri,
    onNext,
    onPrevious,
    hasPrev,
    hasNext,
    isTrackLiked,
    checkingLikeStatus,
    togglingLike,
    onToggleLike,
  }: AlbumCarouselProps) => {
    const scrollX = useSharedValue(SCREEN_WIDTH);
    const flatListRef = useRef<FlatList>(null);
    const isScrolling = useRef(false);
    const lastIndex = useRef(1);

    // Estado local para mostrar la info de la canción instantáneamente
    const [displayedTrackInfo, setDisplayedTrackInfo] = useState<TrackInfo | null>(
      currentTrackInfo
    );
    const [displayedIndex, setDisplayedIndex] = useState(1); // 0=prev, 1=current, 2=next

    // Ref para guardar la info del track al que el usuario hizo swipe
    const swipeTargetInfo = useRef<TrackInfo | null>(null);
    // Ref para saber el URI de la canción original cuando se hizo el swipe
    const swipeOriginalUri = useRef<string | null>(null);

    // Array de infos para acceso por índice
    const trackInfos = useMemo(
      () => [prevTrackInfo, currentTrackInfo, nextTrackInfo],
      [prevTrackInfo, currentTrackInfo, nextTrackInfo]
    );

    // Construir los items del carrusel (siempre 3 items para el loop visual)
    const carouselItems = useMemo<AlbumCarouselItem[]>(() => {
      return [
        { id: 'prev', albumArt: prevAlbumArt, trackInfo: prevTrackInfo, type: 'prev' as const },
        {
          id: 'current',
          albumArt: currentAlbumArt,
          trackInfo: currentTrackInfo,
          type: 'current' as const,
        },
        { id: 'next', albumArt: nextAlbumArt, trackInfo: nextTrackInfo, type: 'next' as const },
      ];
    }, [
      currentAlbumArt,
      prevAlbumArt,
      nextAlbumArt,
      currentTrackInfo,
      prevTrackInfo,
      nextTrackInfo,
    ]);

    // Actualizar info cuando cambia la canción actual (cuando el URI cambia)
    useEffect(() => {
      // Si hay un swipe pendiente y el URI cambió, significa que la canción nueva llegó
      if (swipeOriginalUri.current && currentTrackUri !== swipeOriginalUri.current) {
        // La canción cambió - limpiar el swipe pendiente
        swipeOriginalUri.current = null;
        swipeTargetInfo.current = null;
      }

      // Solo actualizar displayedTrackInfo si NO hay un swipe pendiente
      if (!swipeTargetInfo.current) {
        setDisplayedTrackInfo(currentTrackInfo);
        setDisplayedIndex(1);
      }
    }, [currentTrackUri, currentTrackInfo]);

    // Resetear al centro cuando cambia la canción
    useEffect(() => {
      if (!isScrolling.current) {
        flatListRef.current?.scrollToOffset({
          offset: SCREEN_WIDTH,
          animated: false,
        });
        scrollX.value = SCREEN_WIDTH;
        lastIndex.current = 1;
      }
    }, [currentAlbumArt, scrollX]);

    // Actualizar info instantáneamente basado en el scroll
    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        scrollX.value = offsetX;

        // Si hay un swipe pendiente (esperando que Spotify cambie la canción), NO actualizar la info
        if (swipeTargetInfo.current) {
          return;
        }

        // Calcular qué índice está más cerca del centro
        const currentIndex = Math.round(offsetX / SCREEN_WIDTH);

        // Actualizar info instantáneamente si cambió el índice visible
        if (currentIndex !== displayedIndex && currentIndex >= 0 && currentIndex <= 2) {
          const newInfo = trackInfos[currentIndex];
          if (newInfo) {
            setDisplayedTrackInfo(newInfo);
            setDisplayedIndex(currentIndex);
          }
        }
      },
      [scrollX, displayedIndex, trackInfos]
    );

    const handleScrollEnd = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(offsetX / SCREEN_WIDTH);

        if (newIndex === lastIndex.current) {
          isScrolling.current = false;
          return;
        }

        if (newIndex === 0 && hasPrev) {
          // Swipe derecha → Anterior
          isScrolling.current = true;
          // Guardar la info del track destino y el URI original
          swipeTargetInfo.current = prevTrackInfo;
          swipeOriginalUri.current = currentTrackUri;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPrevious();
        } else if (newIndex === 2 && hasNext) {
          // Swipe izquierda → Siguiente
          isScrolling.current = true;
          // Guardar la info del track destino y el URI original
          swipeTargetInfo.current = nextTrackInfo;
          swipeOriginalUri.current = currentTrackUri;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext();
        } else {
          // Volver al centro si no hay canción disponible
          flatListRef.current?.scrollToOffset({
            offset: SCREEN_WIDTH,
            animated: true,
          });
          // Restaurar info de canción actual
          swipeTargetInfo.current = null;
          swipeOriginalUri.current = null;
          setDisplayedTrackInfo(currentTrackInfo);
          setDisplayedIndex(1);
        }

        // Reset después de un breve delay para permitir la actualización
        setTimeout(() => {
          isScrolling.current = false;
        }, 300);
      },
      [
        hasPrev,
        hasNext,
        onNext,
        onPrevious,
        currentTrackInfo,
        prevTrackInfo,
        nextTrackInfo,
        currentTrackUri,
      ]
    );

    const renderAlbumItem = useCallback(
      ({ item, index }: { item: AlbumCarouselItem; index: number }) => {
        const inputRange = [
          (index - 1) * SCREEN_WIDTH,
          index * SCREEN_WIDTH,
          (index + 1) * SCREEN_WIDTH,
        ];

        return (
          <AlbumCarouselItemComponent
            item={item}
            scrollX={scrollX}
            inputRange={inputRange}
            index={index}
          />
        );
      },
      [scrollX]
    );

    const getItemLayout = useCallback(
      (_: any, index: number) => ({
        length: SCREEN_WIDTH,
        offset: SCREEN_WIDTH * index,
        index,
      }),
      []
    );

    return (
      <View>
        {/* Carrusel de carátulas */}
        <View style={{ height: ALBUM_CAROUSEL_SIZE, marginBottom: 16 }}>
          <FlatList
            ref={flatListRef}
            data={carouselItems}
            keyExtractor={(item) => `album-${item.id}`}
            renderItem={renderAlbumItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="center"
            contentContainerStyle={{ alignItems: 'center' }}
            initialScrollIndex={1}
            getItemLayout={getItemLayout}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
            removeClippedSubviews={false}
          />
        </View>

        {/* Info de canción - actualización instantánea */}
        <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
          {displayedTrackInfo ? (
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 22,
                    textAlign: 'center',
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  {displayedTrackInfo.name}
                </Text>
                {/* Like button solo cuando es la canción actual */}
                {displayedIndex === 1 && (
                  <TouchableOpacity
                    onPress={onToggleLike}
                    disabled={checkingLikeStatus || togglingLike}
                    style={{ marginLeft: 12 }}
                  >
                    {checkingLikeStatus || togglingLike ? (
                      <ActivityIndicator size="small" color="#1DB954" />
                    ) : isTrackLiked ? (
                      <CheckCircle size={28} color="#1DB954" fill="#1DB954" />
                    ) : (
                      <PlusCircle size={28} color="#71717A" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text
                style={{
                  color: '#a1a1aa',
                  fontSize: 16,
                  marginTop: 8,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {displayedTrackInfo.artist}
              </Text>
              <Text
                style={{
                  color: '#52525b',
                  fontSize: 13,
                  marginTop: 4,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {displayedTrackInfo.album}
              </Text>
            </View>
          ) : (
            <View style={{ height: 80 }} />
          )}
        </View>
      </View>
    );
  }
);

// Componente individual del álbum con animación
interface AlbumCarouselItemComponentProps {
  item: AlbumCarouselItem;
  scrollX: SharedValue<number>;
  inputRange: number[];
  index: number;
}

const AlbumCarouselItemComponent = React.memo(
  ({ item, scrollX, inputRange, index }: AlbumCarouselItemComponentProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      const scale = interpolate(scrollX.value, inputRange, [0.75, 1, 0.75], Extrapolation.CLAMP);

      const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <View
        style={{
          width: SCREEN_WIDTH,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={[
            {
              width: ALBUM_CAROUSEL_SIZE,
              height: ALBUM_CAROUSEL_SIZE,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: '#18181b',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 15,
            },
            animatedStyle,
          ]}
        >
          {item.albumArt ? (
            <Image
              source={{ uri: item.albumArt }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`album-${item.id}-${item.albumArt}`}
              transition={0}
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#27272a',
              }}
            >
              <Disc3 size={80} color="#1DB954" />
            </View>
          )}
        </Animated.View>
      </View>
    );
  }
);

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
  const insets = useSafeAreaInsets();
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

  // Estado para saber si el track actual está en favoritos
  const [isTrackLiked, setIsTrackLiked] = useState(false);
  const [checkingLikeStatus, setCheckingLikeStatus] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);

  // Estado para almacenar álbumes adyacentes (carrusel estilo Spotify)
  const [adjacentAlbums, setAdjacentAlbums] = useState<{
    prev: string | null;
    next: string | null;
  }>({ prev: null, next: null });

  // Estado para almacenar info completa de canciones adyacentes
  const [adjacentTracks, setAdjacentTracks] = useState<{
    prev: { name: string; artist: string; album: string } | null;
    next: { name: string; artist: string; album: string } | null;
  }>({ prev: null, next: null });

  // Cargar info completa de canciones adyacentes desde la API de Spotify
  const loadAdjacentTracksInfo = useCallback(async () => {
    if (!spotifyConnected) return;

    try {
      const tracksInfo = await spotify.getAdjacentTracksInfo();
      setAdjacentAlbums({
        prev: tracksInfo.prev?.albumArt || null,
        next: tracksInfo.next?.albumArt || null,
      });
      setAdjacentTracks({
        prev: tracksInfo.prev
          ? {
              name: tracksInfo.prev.name,
              artist: tracksInfo.prev.artist,
              album: tracksInfo.prev.album,
            }
          : null,
        next: tracksInfo.next
          ? {
              name: tracksInfo.next.name,
              artist: tracksInfo.next.artist,
              album: tracksInfo.next.album,
            }
          : null,
      });
    } catch (error) {
      console.warn('Error cargando info de canciones adyacentes:', error);
    }
  }, [spotifyConnected]);

  // Cargar info cuando cambia la canción actual o el contexto
  useEffect(() => {
    if (currentPlaylistTracks.length > 0 && currentTrackIndex >= 0) {
      // Tenemos contexto de playlist, usar las canciones de la lista
      const prevIndex =
        currentTrackIndex > 0 ? currentTrackIndex - 1 : currentPlaylistTracks.length - 1;
      const nextIndex =
        currentTrackIndex < currentPlaylistTracks.length - 1 ? currentTrackIndex + 1 : 0;

      const prevTrack = currentPlaylistTracks[prevIndex];
      const nextTrack = currentPlaylistTracks[nextIndex];

      setAdjacentAlbums({
        prev: prevTrack?.albumArt || null,
        next: nextTrack?.albumArt || null,
      });

      setAdjacentTracks({
        prev: prevTrack
          ? { name: prevTrack.name, artist: prevTrack.artist, album: prevTrack.album }
          : null,
        next: nextTrack
          ? { name: nextTrack.name, artist: nextTrack.artist, album: nextTrack.album }
          : null,
      });
    } else if (spotifyConnected && currentTrack) {
      // Sin contexto de playlist, obtener info completa de la API de Spotify
      loadAdjacentTracksInfo();
    }
  }, [
    currentTrackIndex,
    currentPlaylistTracks,
    currentTrack?.uri,
    spotifyConnected,
    loadAdjacentTracksInfo,
  ]);

  // -------------------------------------------------------------------------
  // PAN RESPONDER - Cerrar deslizando hacia abajo desde el header
  // -------------------------------------------------------------------------
  const panY = useRef(new RNAnimated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (e, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          // Cerrar directamente sin animar de vuelta
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
        } else {
          // Volver arriba
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          RNAnimated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Resetear panY cuando el modal se abre
  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [visible]);

  const animatedStyle = {
    transform: [{ translateY: panY }],
  };

  // -------------------------------------------------------------------------
  // VERIFICAR SI EL TRACK ACTUAL ESTÁ EN FAVORITOS
  // -------------------------------------------------------------------------
  useEffect(() => {
    const checkIfTrackIsLiked = async () => {
      if (!currentTrack?.uri || !spotifyConnected) {
        setIsTrackLiked(false);
        return;
      }

      setCheckingLikeStatus(true);
      try {
        const trackId = spotify.getTrackIdFromUri(currentTrack.uri);
        const isSaved = await spotify.isTrackSaved(trackId);
        setIsTrackLiked(isSaved);
      } catch (error) {
        console.warn('Error checking like status:', error);
        setIsTrackLiked(false);
      } finally {
        setCheckingLikeStatus(false);
      }
    };

    checkIfTrackIsLiked();
  }, [currentTrack?.uri, spotifyConnected]);

  // -------------------------------------------------------------------------
  // TOGGLE LIKE/UNLIKE TRACK
  // -------------------------------------------------------------------------
  const handleToggleLike = useCallback(async () => {
    if (!currentTrack?.uri || togglingLike) return;

    setTogglingLike(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const trackId = spotify.getTrackIdFromUri(currentTrack.uri);

      if (isTrackLiked) {
        // Quitar de favoritos
        const success = await spotify.removeTrack(trackId);
        if (success) {
          setIsTrackLiked(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // Agregar a favoritos
        const success = await spotify.saveTrack(trackId);
        if (success) {
          setIsTrackLiked(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.warn('Error toggling like:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTogglingLike(false);
    }
  }, [currentTrack?.uri, isTrackLiked, togglingLike]);

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
  const loadPlaylists = useCallback(
    async (reset = false) => {
      if (!reset && playlists.length > 0) return; // Ya cargadas y no se forzó refresh
      setLoading(true);
      try {
        const data = await spotify.getMyPlaylists(50, 0);
        setPlaylists(data);
      } catch (error) {
        console.error('Error loading playlists:', error);
      } finally {
        setLoading(false);
      }
    },
    [playlists.length]
  );

  // -------------------------------------------------------------------------
  // CARGAR LIKED SONGS (con paginación)
  // -------------------------------------------------------------------------
  const loadLikedSongs = useCallback(
    async (reset = false) => {
      console.log(
        '🎵 loadLikedSongs llamado, reset=',
        reset,
        'likedSongs.length=',
        likedSongs.length
      );

      // Solo skip si ya hay canciones y no es un reset forzado
      if (!reset && likedSongs.length > 0) {
        console.log('🎵 loadLikedSongs: SKIP - ya hay canciones y no es reset');
        return;
      }

      setLoading(true);
      setLikedOffset(0);
      likedOffsetRef.current = 0;
      setHasMoreLiked(true);

      // IMPORTANTE: Limpiar canciones anteriores cuando es reset
      if (reset) {
        setLikedSongs([]);
      }

      try {
        console.log('🎵 loadLikedSongs: Llamando API con offset=0, limit=20');
        const data = await spotify.getLikedSongs(20, 0);
        console.log('🎵 loadLikedSongs: Recibidas', data.length, 'canciones');
        if (data[0]) {
          console.log('🎵 Primera canción recibida:', data[0].name);
        }
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
  // BUSCAR - Búsqueda en tiempo real con debounce
  // -------------------------------------------------------------------------
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const results = await spotify.searchTracks(query, 30);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search - se ejecuta 300ms después de que el usuario deje de escribir
  useEffect(() => {
    // Solo ejecutar cuando estamos en la tab de búsqueda
    if (activeTab !== 'search') return;

    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Si no hay query, limpiar resultados inmediatamente
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    // Mostrar indicador de carga inmediatamente
    setLoading(true);

    // Ejecutar búsqueda después de 300ms de inactividad
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeTab, performSearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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

        // Guardar contexto de playlist para next/prev
        if (trackList && index !== undefined && context) {
          setCurrentPlaylistTracks(trackList);
          setCurrentTrackIndex(index);
          setPlaylistContext(context);
        }

        // Esperar un momento y obtener el estado real de reproducción
        // para tener la imagen de alta calidad del álbum
        setTimeout(async () => {
          try {
            const playbackState = await spotify.getPlaybackState();
            if (playbackState?.track) {
              onTrackChange(playbackState.track);
              setCurrentPosition(playbackState.track.positionMs || 0);
            }
          } catch (error) {
            // Fallback: usar la info de la lista si falla
            const spotifyTrack: SpotifyTrack = {
              uri: track.uri,
              name: track.name,
              artist: track.artist,
              artistId: '',
              album: track.album,
              albumArt: track.albumArt || '',
              durationMs: track.durationMs,
              positionMs: 0,
            };
            onTrackChange(spotifyTrack);
            setCurrentPosition(0);
          }
        }, 300);
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
  // Track si el modal estaba visible antes (para detectar cuando SE ABRE)
  const wasVisibleRef = useRef(false);

  // Recargar datos SOLO cuando el modal SE ABRE (transición de invisible a visible)
  useEffect(() => {
    if (visible && spotifyConnected && !wasVisibleRef.current) {
      // Modal acaba de abrirse - refrescar la tab activa
      if (activeTab === 'playlists') {
        loadPlaylists(true);
      } else if (activeTab === 'liked') {
        loadLikedSongs(true);
      }
    }
    wasVisibleRef.current = visible;
  }, [visible, spotifyConnected]); // SIN activeTab para evitar recargas al cambiar de tab

  // Cargar datos al cambiar de tab (solo si no hay datos)
  useEffect(() => {
    if (visible && spotifyConnected) {
      if (activeTab === 'playlists') {
        loadPlaylists(); // Sin reset - solo carga si no hay datos
      } else if (activeTab === 'liked') {
        loadLikedSongs(); // Sin reset - solo carga si no hay datos
      }
    }
  }, [activeTab, visible, spotifyConnected, loadPlaylists, loadLikedSongs]);

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
  const renderConnectedView = () => {
    return (
      <View className="flex-1">
        {/* NOW PLAYING TAB */}
        {activeTab === 'now-playing' && (
          <View className="flex-1">
            {/* Fondo animado con carátula */}
            <AnimatedAlbumBackground
              albumArt={currentTrack?.albumArt}
              isPlaying={playbackState?.isPlaying ?? false}
            />

            <View className="flex-1 px-0 pt-4">
              {currentTrack ? (
                <View className="flex-1 items-center justify-center">
                  {/* Album Carousel - Swipe para cambiar canción con info sincronizada */}
                  <AlbumCarousel
                    currentAlbumArt={currentTrack.albumArt}
                    prevAlbumArt={adjacentAlbums.prev}
                    nextAlbumArt={adjacentAlbums.next}
                    currentTrackInfo={{
                      name: currentTrack.name,
                      artist: currentTrack.artist,
                      album: currentTrack.album,
                    }}
                    prevTrackInfo={adjacentTracks.prev}
                    nextTrackInfo={adjacentTracks.next}
                    currentTrackUri={currentTrack.uri}
                    onNext={handleNextInPlaylist}
                    onPrevious={handlePrevInPlaylist}
                    hasPrev={!!adjacentAlbums.prev}
                    hasNext={!!adjacentAlbums.next}
                    isTrackLiked={isTrackLiked}
                    checkingLikeStatus={checkingLikeStatus}
                    togglingLike={togglingLike}
                    onToggleLike={handleToggleLike}
                  />

                  {/* Progress Bar Slider */}
                  <View className="w-full mb-6 px-6">
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
                      disabled={false}
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

                  {/* Controls - Disponibles para todos */}
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
          </View>
        )}

        {/* PLAYLISTS TAB */}
        {activeTab === 'playlists' && (
          <View className="flex-1">
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
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                    onEndReached={loadMorePlaylistTracks}
                    onEndReachedThreshold={0.3}
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
                    keyExtractor={(item) => item.id}
                    renderItem={renderPlaylistItem}
                    style={{ flex: 1 }}
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
          </View>
        )}

        {/* LIKED SONGS TAB */}
        {activeTab === 'liked' && (
          <View className="flex-1">
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
              <View className="flex-1">
                <FlatList
                  data={likedSongs}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) =>
                    renderTrackItemWithContext(item, index, likedSongs, 'liked')
                  }
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                  onEndReached={loadMoreLikedSongs}
                  onEndReachedThreshold={0.3}
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
                  ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                      <Heart size={48} color="#71717A" />
                      <Text className="text-zinc-400 mt-4">No tienes canciones guardadas</Text>
                    </View>
                  }
                />
              </View>
            )}
          </View>
        )}

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <View className="flex-1">
            {/* Search Bar - Búsqueda en tiempo real */}
            <View className="px-4 pt-4 pb-2">
              <View className="flex-row items-center bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800">
                <Search size={20} color="#71717A" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="¿Qué quieres escuchar?"
                  placeholderTextColor="#71717A"
                  className="flex-1 ml-3 text-white text-base"
                  returnKeyType="search"
                  autoFocus
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {loading && (
                  <ActivityIndicator size="small" color="#1DB954" style={{ marginRight: 8 }} />
                )}
                {searchQuery.length > 0 && !loading && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={18} color="#71717A" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {searchResults.length > 0 ? (
              <View className="flex-1">
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) =>
                    renderTrackItemWithContext(item, index, searchResults, 'search')
                  }
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                />
              </View>
            ) : (
              <View className="flex-1 items-center justify-center px-8">
                <Search size={48} color="#71717A" />
                <Text className="text-zinc-400 mt-4 text-center">
                  Busca por nombre de canción, artista o álbum
                </Text>
              </View>
            )}
          </View>
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
  };

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
      <Pressable
        onPress={() => {
          console.log('🎵 Spotify Connect button pressed');
          onSpotifyConnect();
        }}
        disabled={spotifyLoading}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          width: '100%',
          padding: 16,
          borderRadius: 9999,
          alignItems: 'center',
          backgroundColor: spotifyLoading ? 'rgba(29, 185, 84, 0.5)' : '#1DB954',
          cursor: Platform.OS === 'web' ? 'pointer' : undefined,
        })}
      >
        {spotifyLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className="text-black font-bold text-lg">Conectar con Spotify</Text>
        )}
      </Pressable>

      <Text className="text-zinc-600 text-xs text-center mt-4">Requiere Spotify Premium</Text>
    </View>
  );

  // -------------------------------------------------------------------------
  // RENDER PRINCIPAL
  // -------------------------------------------------------------------------
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-transparent justify-end">
        <RNAnimated.View
          className="bg-black rounded-t-3xl"
          style={[
            { height: '95%', backgroundColor: '#000' },
            Platform.OS === 'web' ? { overflow: 'hidden' } : {},
            animatedStyle,
          ]}
        >
          {/* Header - Draggable para cerrar */}
          <View
            {...panResponder.panHandlers}
            className="flex-row items-center justify-between px-4 pt-6 pb-4 border-b border-zinc-900"
          >
            {/* Indicador de drag centrado arriba */}
            <View className="absolute top-2 left-0 right-0 items-center">
              <View className="w-10 h-1 bg-zinc-600 rounded-full" />
            </View>

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
              <View>
                <Text className="text-white font-bold text-lg">Spotify</Text>
                <Text className="text-zinc-600 text-[10px]">v3.5</Text>
              </View>
            </View>

            {spotifyConnected ? (
              <Pressable
                onPress={() => {
                  console.log('🎵 Spotify Reconectar button pressed');
                  if (Platform.OS === 'web') {
                    // En web, usar confirm nativo
                    const confirmed = window.confirm(
                      '🔄 RECONECTAR SPOTIFY\n\nSi no ves tus canciones recientes en "Me Gusta", reconecta para refrescar los permisos.\n\n¿Deseas reconectar?'
                    );
                    if (confirmed && onSpotifyDisconnect) {
                      onSpotifyDisconnect();
                    }
                  } else {
                    Alert.alert(
                      '🔄 RECONECTAR SPOTIFY',
                      'Si no ves tus canciones recientes en "Me Gusta", reconecta para refrescar los permisos.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Reconectar',
                          style: 'destructive',
                          onPress: onSpotifyDisconnect,
                        },
                      ]
                    );
                  }
                }}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: pressed ? '#27272a' : '#18181b',
                    borderRadius: 9999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    cursor: 'pointer' as any,
                  },
                ]}
              >
                <Wifi size={14} color="#1DB954" />
                <Text className="text-zinc-400 text-xs ml-1.5">Reconectar</Text>
              </Pressable>
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
        </RNAnimated.View>
      </View>
    </Modal>
  );
}
