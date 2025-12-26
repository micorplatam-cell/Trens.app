// =============================================================================
// FULLSCREEN VIDEO EDITOR - Editor unificado Video + Spotify
// Timeline sincronizado con selector de posición de Spotify
// Vista previa en tiempo real: video + música sincronizados
// =============================================================================

import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  Dimensions,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Play,
  Pause,
  Scissors,
  Music,
  VolumeX,
  RotateCcw,
  Share2,
  Eye,
  Lock,
  Search,
  Plus,
  ChevronLeft,
  Volume2,
} from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import spotify from '../../services/spotify/spotify';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// TIPOS
// ============================================================================
interface VideoData {
  uri: string;
  duration: number;
}

interface SpotifyMetadata {
  enabled: boolean;
  trackUri: string;
  positionMs: number;
  trackName: string;
  artist: string;
  albumArt?: string;
  durationMs?: number;
}

interface SpotifyTrack {
  uri: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
}

interface FullscreenVideoEditorProps {
  visible: boolean;
  videoData: VideoData | null;
  spotifyMetadata: SpotifyMetadata | null;
  spotifyConnected: boolean;
  onClose: () => void;
  onSave: (data: {
    videoTrimStart: number;
    videoTrimEnd: number;
    spotifyTrack: SpotifyMetadata | null;
    isPublic: boolean;
  }) => void;
  saving: boolean;
}

// ============================================================================
// TRACK ITEM COMPONENT
// ============================================================================
const TrackItem = memo(({ track, onSelect }: { track: SpotifyTrack; onSelect: () => void }) => (
  <TouchableOpacity
    onPress={onSelect}
    className="flex-row items-center p-3 bg-zinc-800/80 rounded-xl mb-2"
  >
    {track.albumArt ? (
      <Image source={{ uri: track.albumArt }} className="w-12 h-12 rounded-lg" />
    ) : (
      <View className="w-12 h-12 rounded-lg bg-zinc-700 items-center justify-center">
        <Music color="#71717A" size={20} />
      </View>
    )}
    <View className="flex-1 ml-3 mr-2">
      <Text className="text-white font-bold text-sm" numberOfLines={1}>
        {track.name}
      </Text>
      <Text className="text-zinc-400 text-xs" numberOfLines={1}>
        {track.artist}
      </Text>
    </View>
    <View className="w-8 h-8 rounded-full bg-green-600 items-center justify-center">
      <Plus color="#FFFFFF" size={16} />
    </View>
  </TouchableOpacity>
));

TrackItem.displayName = 'TrackItem';

// ============================================================================
// HELPERS
// ============================================================================
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function FullscreenVideoEditor({
  visible,
  videoData,
  spotifyMetadata,
  spotifyConnected,
  onClose,
  onSave,
  saving,
}: FullscreenVideoEditorProps) {
  // -------------------------------------------------------------------------
  // VIDEO STATE
  // -------------------------------------------------------------------------
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoTrimStart, setVideoTrimStart] = useState(0); // percentage 0-100
  const [videoTrimEnd, setVideoTrimEnd] = useState(100); // percentage 0-100

  // -------------------------------------------------------------------------
  // SPOTIFY STATE
  // -------------------------------------------------------------------------
  const [selectedTrack, setSelectedTrack] = useState<SpotifyMetadata | null>(spotifyMetadata);
  const [spotifyEnabled, setSpotifyEnabled] = useState(!!spotifyMetadata);

  // Spotify Browser state
  const [showSpotifyBrowser, setShowSpotifyBrowser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [likedSongs, setLikedSongs] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);

  // -------------------------------------------------------------------------
  // UI STATE
  // -------------------------------------------------------------------------
  const [isPublic, setIsPublic] = useState(true);

  // -------------------------------------------------------------------------
  // REFS
  // -------------------------------------------------------------------------
  const videoTimelineRef = useRef<View>(null);
  const spotifyTimelineRef = useRef<View>(null);
  const spotifyTimelineLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const videoPlayerRef = useRef<any>(null);
  const currentValuesRef = useRef({
    videoTrimStart: 0,
    videoTrimEnd: 100,
    videoDurationMs: 30000,
    spotifyPositionPercent: 0,
    spotifyDurationMs: 240000,
    spotifyPositionMs: 0,
    spotifyTrackUri: '',
  });

  // -------------------------------------------------------------------------
  // VIDEO PLAYER
  // -------------------------------------------------------------------------
  const videoPlayer = useVideoPlayer(videoData?.uri || '', (player) => {
    player.loop = true;
    player.play();
  });

  // Mantener ref actualizado
  useEffect(() => {
    videoPlayerRef.current = videoPlayer;
  }, [videoPlayer]);

  // -------------------------------------------------------------------------
  // COMPUTED VALUES
  // -------------------------------------------------------------------------
  const videoDurationMs = (videoData?.duration || 30) * 1000;
  const videoTrimStartMs = (videoTrimStart / 100) * videoDurationMs;
  const videoTrimEndMs = (videoTrimEnd / 100) * videoDurationMs;
  const trimmedDurationMs = videoTrimEndMs - videoTrimStartMs;
  const spotifyDurationMs = selectedTrack?.durationMs || 240000;

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  // Update refs for PanResponders
  useEffect(() => {
    currentValuesRef.current = {
      videoTrimStart,
      videoTrimEnd,
      videoDurationMs,
      spotifyPositionPercent: selectedTrack
        ? (selectedTrack.positionMs / (selectedTrack.durationMs || 240000)) * 100
        : 0,
      spotifyDurationMs: selectedTrack?.durationMs || 240000,
      spotifyPositionMs: selectedTrack?.positionMs || 0,
      spotifyTrackUri: selectedTrack?.trackUri || '',
    };
  }, [videoTrimStart, videoTrimEnd, videoDurationMs, selectedTrack]);

  // Playback simulation
  useEffect(() => {
    if (!visible || !videoData) return;

    const interval = setInterval(() => {
      if (isPlaying) {
        setCurrentVideoTime((prev) => {
          const next = prev + 100;
          if (next >= videoTrimEndMs) return videoTrimStartMs;
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [visible, isPlaying, videoData, videoTrimStartMs, videoTrimEndMs]);

  // Reset on open + iniciar Spotify sincronizado
  useEffect(() => {
    if (visible) {
      console.log(
        '📽️ Editor opened, spotifyMetadata:',
        spotifyMetadata ? `${spotifyMetadata.trackName} at ${spotifyMetadata.positionMs}ms` : 'null'
      );

      setVideoTrimStart(0);
      setVideoTrimEnd(100);
      setSelectedTrack(spotifyMetadata);
      setSpotifyEnabled(!!spotifyMetadata);
      setCurrentVideoTime(0);
      setIsPlaying(true);
      setShowSpotifyBrowser(false);
      setSearchQuery('');
      setSearchResults([]);

      // Actualizar ref inmediatamente para que esté disponible
      if (spotifyMetadata) {
        currentValuesRef.current.spotifyTrackUri = spotifyMetadata.trackUri;
        currentValuesRef.current.spotifyPositionMs = spotifyMetadata.positionMs;
        currentValuesRef.current.spotifyPositionPercent =
          (spotifyMetadata.positionMs / (spotifyMetadata.durationMs || 240000)) * 100;
        currentValuesRef.current.spotifyDurationMs = spotifyMetadata.durationMs || 240000;

        // Iniciar Spotify al abrir el editor
        console.log(
          '🎵 Iniciando Spotify al abrir editor:',
          spotifyMetadata.trackUri,
          'at',
          spotifyMetadata.positionMs
        );
        spotify.play(spotifyMetadata.trackUri, spotifyMetadata.positionMs).catch((e) => {
          console.warn('Error starting Spotify on editor open:', e);
        });
      }
    }
  }, [visible, spotifyMetadata]);

  // Pausar Spotify al cerrar editor
  useEffect(() => {
    if (!visible) {
      spotify.pause().catch(() => {});
    }
  }, [visible]);

  // Load liked songs when browser opens
  useEffect(() => {
    if (showSpotifyBrowser && likedSongs.length === 0) {
      loadLikedSongs();
    }
  }, [showSpotifyBrowser]);

  // -------------------------------------------------------------------------
  // SPOTIFY HANDLERS
  // -------------------------------------------------------------------------
  const loadLikedSongs = useCallback(async () => {
    setLoadingLiked(true);
    try {
      const data = await spotify.getLikedSongs(30, 0);
      if (data && data.length > 0) {
        setLikedSongs(
          data.map((item: any) => ({
            uri: item.uri,
            name: item.name,
            artist: item.artist,
            album: item.album,
            albumArt: item.albumArt || '',
            durationMs: item.durationMs,
          }))
        );
      }
    } catch (error) {
      console.warn('Error loading liked songs:', error);
    }
    setLoadingLiked(false);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const data = await spotify.searchTracks(searchQuery, 20);
      if (data && data.length > 0) {
        setSearchResults(
          data.map((track: any) => ({
            uri: track.uri,
            name: track.name,
            artist: track.artist,
            album: track.album,
            albumArt: track.albumArt || '',
            durationMs: track.durationMs,
          }))
        );
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.warn('Error searching:', error);
    }
    setSearching(false);
  }, [searchQuery]);

  const handleSelectTrack = useCallback(
    async (track: SpotifyTrack) => {
      // La posición de inicio de Spotify = proporción del trim de video
      // Si el video empieza en 20%, la canción empieza en 20% de su duración
      const syncedPositionMs = Math.floor((videoTrimStart / 100) * track.durationMs);

      console.log('🎵 Track selected:', track.name, 'starting at', syncedPositionMs, 'ms');

      const newTrack: SpotifyMetadata = {
        enabled: true,
        trackUri: track.uri,
        positionMs: syncedPositionMs,
        trackName: track.name,
        artist: track.artist,
        albumArt: track.albumArt,
        durationMs: track.durationMs,
      };

      setSelectedTrack(newTrack);
      setSpotifyEnabled(true);
      setShowSpotifyBrowser(false);

      // Actualizar ref inmediatamente
      currentValuesRef.current.spotifyTrackUri = track.uri;
      currentValuesRef.current.spotifyPositionMs = syncedPositionMs;
      currentValuesRef.current.spotifyPositionPercent = (syncedPositionMs / track.durationMs) * 100;
      currentValuesRef.current.spotifyDurationMs = track.durationMs;

      // Iniciar reproducción inmediatamente
      try {
        console.log('🎵 Starting playback after track selection');
        await spotify.play(track.uri, syncedPositionMs);
      } catch (e) {
        console.warn('Error playing selected track:', e);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [videoTrimStart]
  );

  const handleRemoveTrack = useCallback(() => {
    setSelectedTrack(null);
    setSpotifyEnabled(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Cambiar la posición de inicio de Spotify manualmente
  const updateSpotifyPosition = useCallback(
    (positionMs: number) => {
      if (!selectedTrack) {
        console.log('⚠️ updateSpotifyPosition: no selectedTrack');
        return;
      }

      console.log('🎚️ Spotify position updated to:', positionMs, 'ms');

      // Actualizar ref inmediatamente para que esté disponible en onPanResponderRelease
      currentValuesRef.current.spotifyPositionMs = positionMs;
      currentValuesRef.current.spotifyPositionPercent =
        (positionMs / (selectedTrack.durationMs || 240000)) * 100;

      setSelectedTrack((prev) => (prev ? { ...prev, positionMs } : null));
    },
    [selectedTrack]
  );

  // RESTART SYNCED PLAYBACK: Reiniciar video + Spotify desde el inicio (trim start / spotify position)
  // Cuando se mueve el trim del video, Spotify se sincroniza proporcionalmente
  const restartSyncedPlayback = useCallback(
    async (syncSpotifyToVideo: boolean = false) => {
      try {
        console.log('🔄 restartSyncedPlayback called, syncSpotifyToVideo:', syncSpotifyToVideo);

        // Reiniciar video desde el punto de trim
        if (videoPlayerRef.current) {
          const trimStartSeconds =
            (currentValuesRef.current.videoTrimStart / 100) * (videoData?.duration || 30);
          console.log('🎬 Video seek to:', trimStartSeconds, 'seconds');
          videoPlayerRef.current.currentTime = trimStartSeconds;
          videoPlayerRef.current.play();
        }

        // Si hay Spotify habilitado, iniciar desde la posición correspondiente
        const trackUri = currentValuesRef.current.spotifyTrackUri;
        let positionMs = currentValuesRef.current.spotifyPositionMs;

        // Si syncSpotifyToVideo, calcular posición proporcional al trim del video
        if (syncSpotifyToVideo && trackUri) {
          const spotifyDurationMs = currentValuesRef.current.spotifyDurationMs;
          positionMs = Math.floor(
            (currentValuesRef.current.videoTrimStart / 100) * spotifyDurationMs
          );
          console.log('🎵 Sincronizando Spotify al trim del video:', positionMs, 'ms');

          // Actualizar refs y estado
          currentValuesRef.current.spotifyPositionMs = positionMs;
          currentValuesRef.current.spotifyPositionPercent = currentValuesRef.current.videoTrimStart;
          setSelectedTrack((prev) => (prev ? { ...prev, positionMs } : null));
        }

        if (trackUri && spotifyEnabled) {
          console.log('🎵 Spotify play:', trackUri, 'at', positionMs, 'ms');
          await spotify.play(trackUri, positionMs);
        }

        setIsPlaying(true);
        setCurrentVideoTime(
          (currentValuesRef.current.videoTrimStart / 100) * ((videoData?.duration || 30) * 1000)
        );
      } catch (error) {
        console.warn('Error restarting synced playback:', error);
      }
    },
    [spotifyEnabled, videoData]
  );

  // Sync Spotify position when video trim changes (OPCIONAL - desactivado para control manual)
  // useEffect(() => {
  //   if (selectedTrack && spotifyEnabled) {
  //     const syncedPositionMs = Math.floor(
  //       (videoTrimStart / 100) * (selectedTrack.durationMs || 240000)
  //     );
  //     setSelectedTrack((prev) => (prev ? { ...prev, positionMs: syncedPositionMs } : null));
  //   }
  // }, [videoTrimStart]);

  // -------------------------------------------------------------------------
  // PLAYBACK HANDLERS
  // -------------------------------------------------------------------------
  const togglePlayback = useCallback(async () => {
    try {
      if (isPlaying) {
        // Pausar todo
        videoPlayerRef.current?.pause();
        if (spotifyEnabled && selectedTrack) await spotify.pause();
      } else {
        // Reproducir sincronizado
        if (spotifyEnabled && selectedTrack) {
          // Reiniciar ambos sincronizados
          if (videoPlayerRef.current) {
            videoPlayerRef.current.currentTime = videoTrimStartMs / 1000;
            videoPlayerRef.current.play();
          }
          setCurrentVideoTime(videoTrimStartMs);
          await spotify.play(selectedTrack.trackUri, selectedTrack.positionMs);
        } else {
          // Solo video
          videoPlayerRef.current?.play();
        }
      }
    } catch (error) {
      console.warn('Error toggling playback:', error);
    }
    setIsPlaying(!isPlaying);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isPlaying, spotifyEnabled, selectedTrack, videoTrimStartMs]);

  // -------------------------------------------------------------------------
  // PAN RESPONDERS - Video Trim (useMemo para tener acceso a restartSyncedPlayback actualizado)
  // -------------------------------------------------------------------------
  const videoTrimStartPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          if (!videoTimelineRef.current) return;
          videoTimelineRef.current.measure((_x, _y, width, _h, pageX) => {
            const relativeX = evt.nativeEvent.pageX - pageX;
            const percentage = Math.max(
              0,
              Math.min(currentValuesRef.current.videoTrimEnd - 10, (relativeX / width) * 100)
            );
            setVideoTrimStart(percentage);
            // Actualizar ref inmediatamente
            currentValuesRef.current.videoTrimStart = percentage;
          });
        },
        onPanResponderRelease: async () => {
          console.log('🎬 Video trim START released');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // Auto-reproducir: video desde trim start, Spotify desde su posición actual
          await restartSyncedPlayback(false);
        },
      }),
    [restartSyncedPlayback]
  );

  const videoTrimEndPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          if (!videoTimelineRef.current) return;
          videoTimelineRef.current.measure((_x, _y, width, _h, pageX) => {
            const relativeX = evt.nativeEvent.pageX - pageX;
            const percentage = Math.max(
              currentValuesRef.current.videoTrimStart + 10,
              Math.min(100, (relativeX / width) * 100)
            );
            setVideoTrimEnd(percentage);
            // Actualizar ref inmediatamente
            currentValuesRef.current.videoTrimEnd = percentage;
          });
        },
        onPanResponderRelease: async () => {
          console.log('🎬 Video trim END released');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // Auto-reproducir desde el inicio
          await restartSyncedPlayback(false);
        },
      }),
    [restartSyncedPlayback]
  );

  // -------------------------------------------------------------------------
  // PAN RESPONDER - Spotify Position Picker (useMemo para recrear cuando selectedTrack cambie)
  // -------------------------------------------------------------------------
  const spotifyPositionPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          console.log('🎚️ Spotify timeline: PanResponder GRANT');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Pausar durante el ajuste
          try {
            videoPlayerRef.current?.pause();
          } catch (e) {
            console.warn('Error pausing video:', e);
          }
          spotify.pause().catch(() => {});
          setIsPlaying(false);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          if (!spotifyTimelineRef.current) {
            console.log('⚠️ spotifyTimelineRef.current is null');
            return;
          }
          spotifyTimelineRef.current.measure((_x, _y, width, _h, pageX) => {
            if (width === 0) {
              console.log('⚠️ Timeline width is 0');
              return;
            }
            const relativeX = evt.nativeEvent.pageX - pageX;
            const percentage = Math.max(0, Math.min(100, (relativeX / width) * 100));
            const positionMs = Math.floor(
              (percentage / 100) * currentValuesRef.current.spotifyDurationMs
            );
            console.log('🎚️ Moving to:', positionMs, 'ms', '(', percentage.toFixed(1), '%)');

            // Actualizar ref inmediatamente
            currentValuesRef.current.spotifyPositionMs = positionMs;
            currentValuesRef.current.spotifyPositionPercent = percentage;

            // Actualizar estado
            setSelectedTrack((prev) => (prev ? { ...prev, positionMs } : null));
          });
        },
        onPanResponderRelease: async () => {
          console.log('🎚️ Spotify timeline: PanResponder RELEASE');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // Auto-reproducir sincronizado cuando sueltas (no sync video->spotify)
          await restartSyncedPlayback(false);
        },
      }),
    [restartSyncedPlayback]
  );

  // -------------------------------------------------------------------------
  // SAVE HANDLER
  // -------------------------------------------------------------------------
  const handleSave = useCallback(() => {
    onSave({
      videoTrimStart,
      videoTrimEnd,
      spotifyTrack: spotifyEnabled && selectedTrack ? selectedTrack : null,
      isPublic,
    });
  }, [videoTrimStart, videoTrimEnd, spotifyEnabled, selectedTrack, isPublic, onSave]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  if (!videoData) return null;

  const tracksToShow = searchResults.length > 0 ? searchResults : likedSongs;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        {/* FULLSCREEN VIDEO */}
        <VideoView
          player={videoPlayer}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          nativeControls={false}
        />

        {/* SEMI-TRANSPARENT OVERLAY */}
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          {/* TOP BAR */}
          <View className="flex-row items-center justify-between px-4 pt-14">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <X color="#FFFFFF" size={22} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsPublic(!isPublic)}
              className="flex-row items-center px-3 py-2 rounded-full"
              style={{ backgroundColor: isPublic ? 'rgba(220,38,38,0.8)' : 'rgba(0,0,0,0.6)' }}
            >
              {isPublic ? <Eye color="#FFF" size={16} /> : <Lock color="#FFF" size={16} />}
              <Text className="text-white text-xs font-bold ml-2">
                {isPublic ? 'PÚBLICO' : 'BÓVEDA'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CENTER - PLAY/PAUSE */}
          <View className="flex-1 items-center justify-center">
            <TouchableOpacity
              onPress={togglePlayback}
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              {isPlaying ? (
                <Pause color="#FFFFFF" size={28} />
              ) : (
                <Play color="#FFFFFF" size={28} fill="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* BOTTOM CONTROLS */}
          <View className="px-4 pb-8" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
            {/* VIDEO TRIM TIMELINE */}
            <View className="mb-4 pt-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Scissors color="#DC2626" size={14} />
                  <Text className="text-white text-xs font-bold ml-2">VIDEO</Text>
                </View>
                <Text className="text-zinc-400 text-xs font-mono">
                  {formatSeconds(videoTrimStartMs / 1000)} - {formatSeconds(videoTrimEndMs / 1000)}
                </Text>
              </View>

              <View ref={videoTimelineRef} className="relative h-10">
                {/* Base track */}
                <View className="absolute left-0 right-0 top-4 h-2 bg-zinc-700 rounded-full" />

                {/* Selected range */}
                <View
                  className="absolute top-4 h-2 bg-red-500"
                  style={{
                    left: `${videoTrimStart}%`,
                    right: `${100 - videoTrimEnd}%`,
                  }}
                />

                {/* Current position indicator */}
                <View
                  className="absolute top-3 w-1 h-4 bg-white rounded-full"
                  style={{ left: `${(currentVideoTime / videoDurationMs) * 100}%` }}
                />

                {/* Start handle */}
                <View
                  {...videoTrimStartPanResponder.panHandlers}
                  className="absolute items-center"
                  style={{
                    left: `${videoTrimStart}%`,
                    marginLeft: -15,
                    top: -2,
                    width: 30,
                    height: 30,
                    zIndex: 10,
                  }}
                >
                  <View className="w-6 h-6 rounded-md bg-red-500 items-center justify-center border border-red-300">
                    <Text className="text-white text-xs font-bold">‹</Text>
                  </View>
                </View>

                {/* End handle */}
                <View
                  {...videoTrimEndPanResponder.panHandlers}
                  className="absolute items-center"
                  style={{
                    left: `${videoTrimEnd}%`,
                    marginLeft: -15,
                    top: -2,
                    width: 30,
                    height: 30,
                    zIndex: 10,
                  }}
                >
                  <View className="w-6 h-6 rounded-md bg-red-500 items-center justify-center border border-red-300">
                    <Text className="text-white text-xs font-bold">›</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* SPOTIFY SECTION */}
            {spotifyConnected && (
              <View className="mb-4">
                {selectedTrack ? (
                  // Canción seleccionada con timeline interactivo
                  <View className="bg-zinc-800/50 rounded-xl p-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Music color="#1DB954" size={14} />
                        <Text className="text-green-500 text-xs font-bold ml-2">SPOTIFY</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSpotifyEnabled(!spotifyEnabled)}
                        className={`w-10 h-5 rounded-full ${spotifyEnabled ? 'bg-green-600' : 'bg-zinc-700'}`}
                        style={{ justifyContent: 'center', paddingHorizontal: 2 }}
                      >
                        <View
                          className="w-4 h-4 bg-white rounded-full"
                          style={{ alignSelf: spotifyEnabled ? 'flex-end' : 'flex-start' }}
                        />
                      </TouchableOpacity>
                    </View>

                    <View className="flex-row items-center">
                      {selectedTrack.albumArt ? (
                        <Image
                          source={{ uri: selectedTrack.albumArt }}
                          className="w-10 h-10 rounded"
                        />
                      ) : (
                        <View className="w-10 h-10 rounded bg-zinc-700 items-center justify-center">
                          <Music color="#71717A" size={16} />
                        </View>
                      )}
                      <View className="flex-1 ml-3">
                        <Text className="text-white text-sm font-bold" numberOfLines={1}>
                          {selectedTrack.trackName}
                        </Text>
                        <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                          {selectedTrack.artist}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowSpotifyBrowser(true)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-700"
                      >
                        <Text className="text-zinc-300 text-xs">Cambiar</Text>
                      </TouchableOpacity>
                    </View>

                    {/* SPOTIFY POSITION PICKER TIMELINE */}
                    {spotifyEnabled && (
                      <View className="mt-3 pt-3 border-t border-zinc-700">
                        {/* Label con tiempo */}
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            <Volume2 color="#1DB954" size={12} />
                            <Text className="text-zinc-400 text-xs ml-1">Punto de inicio</Text>
                          </View>
                          <Text className="text-green-500 text-xs font-mono font-bold">
                            {formatTime(selectedTrack.positionMs)} /{' '}
                            {formatTime(selectedTrack.durationMs || 240000)}
                          </Text>
                        </View>

                        {/* Timeline arrastrable - panHandlers en todo el contenedor */}
                        <View
                          ref={spotifyTimelineRef}
                          onLayout={(e) => {
                            const { x, y, width, height } = e.nativeEvent.layout;
                            console.log('📏 Spotify timeline layout:', { x, y, width, height });
                            spotifyTimelineLayoutRef.current = { x, y, width, height };
                          }}
                          {...spotifyPositionPanResponder.panHandlers}
                          className="h-12 rounded-lg overflow-hidden relative"
                          style={{ backgroundColor: 'rgba(29, 185, 84, 0.2)' }}
                        >
                          {/* Track base */}
                          <View className="absolute inset-0 flex-row" pointerEvents="none">
                            {/* Waveform visual (simulada) */}
                            {Array.from({ length: 30 }).map((_, i) => (
                              <View key={i} className="flex-1 mx-px justify-center items-center">
                                <View
                                  style={{
                                    width: 2,
                                    height: 8 + Math.random() * 16,
                                    backgroundColor:
                                      i <
                                      (selectedTrack.positionMs /
                                        (selectedTrack.durationMs || 240000)) *
                                        30
                                        ? '#1DB954'
                                        : 'rgba(29, 185, 84, 0.3)',
                                    borderRadius: 1,
                                  }}
                                />
                              </View>
                            ))}
                          </View>

                          {/* Position handle - visual only, panHandlers are on the timeline */}
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              left: `${(selectedTrack.positionMs / (selectedTrack.durationMs || 240000)) * 100}%`,
                              top: 0,
                              bottom: 0,
                              width: 24,
                              marginLeft: -12,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <View
                              style={{
                                width: 4,
                                height: '100%',
                                backgroundColor: '#FFFFFF',
                                borderRadius: 2,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.5,
                                shadowRadius: 4,
                              }}
                            />
                            <View
                              style={{
                                position: 'absolute',
                                top: -4,
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: '#1DB954',
                                borderWidth: 2,
                                borderColor: '#FFFFFF',
                              }}
                            />
                          </View>
                        </View>

                        {/* Tiempo de inicio/fin */}
                        <View className="flex-row justify-between mt-1">
                          <Text className="text-zinc-600 text-xs font-mono">0:00</Text>
                          <Text className="text-zinc-600 text-xs font-mono">
                            {formatTime(selectedTrack.durationMs || 240000)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  // Sin canción - botón para agregar
                  <TouchableOpacity
                    onPress={() => setShowSpotifyBrowser(true)}
                    className="py-3 rounded-xl flex-row items-center justify-center"
                    style={{ backgroundColor: 'rgba(29, 185, 84, 0.3)' }}
                  >
                    <Music color="#1DB954" size={18} />
                    <Text className="text-green-500 text-sm font-bold ml-2">AGREGAR CANCIÓN</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ACTION BUTTONS */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-3 rounded-xl items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <RotateCcw color="#FFFFFF" size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="flex-[3] py-3 rounded-xl flex-row items-center justify-center bg-savage-red"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Share2 color="#FFFFFF" size={20} />
                    <Text className="text-white font-bold text-base ml-2">
                      {isPublic ? 'COMPARTIR' : 'GUARDAR'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SPOTIFY BROWSER OVERLAY */}
        {showSpotifyBrowser && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          >
            <View className="flex-1 pt-14 px-4">
              {/* Header */}
              <View className="flex-row items-center mb-4">
                <TouchableOpacity
                  onPress={() => setShowSpotifyBrowser(false)}
                  className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center mr-3"
                >
                  <ChevronLeft color="#FFFFFF" size={22} />
                </TouchableOpacity>
                <Text className="text-white text-lg font-bold flex-1">Elegir canción</Text>
                {selectedTrack && (
                  <TouchableOpacity
                    onPress={handleRemoveTrack}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20"
                  >
                    <Text className="text-red-500 text-xs font-bold">Quitar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Bar */}
              <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 py-3 mb-4">
                <Search color="#71717A" size={18} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  placeholder="Buscar canciones..."
                  placeholderTextColor="#71717A"
                  returnKeyType="search"
                  className="flex-1 text-white ml-3"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searching && <ActivityIndicator size="small" color="#1DB954" />}
              </View>

              {/* Results Label */}
              <Text className="text-zinc-500 text-xs mb-2 uppercase tracking-wide">
                {searchResults.length > 0 ? 'Resultados' : 'Tus favoritas'}
              </Text>

              {/* Track List */}
              {loadingLiked ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#1DB954" />
                </View>
              ) : (
                <FlatList
                  data={tracksToShow}
                  keyExtractor={(item) => item.uri}
                  renderItem={({ item }) => (
                    <TrackItem track={item} onSelect={() => handleSelectTrack(item)} />
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 100 }}
                  ListEmptyComponent={
                    <View className="items-center justify-center py-12">
                      <Music color="#71717A" size={48} />
                      <Text className="text-zinc-500 mt-4 text-center">
                        {searchQuery
                          ? 'No se encontraron canciones'
                          : 'Busca o escucha música en Spotify'}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

export default FullscreenVideoEditor;
