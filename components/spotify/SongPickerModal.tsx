// =============================================================================
// SONG PICKER MODAL - Selector de canciones de Spotify
// Permite buscar y seleccionar canciones con punto de inicio personalizado
// =============================================================================

import React, { useState, useCallback, useEffect, memo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import {
  X,
  Search,
  Music,
  Play,
  Pause,
  Check,
  ChevronRight,
  Plus,
  Scissors,
} from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import spotify from '../../services/spotify/spotify';

// ============================================================================
// TIPOS
// ============================================================================
interface SpotifyTrack {
  uri: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  imageUrl: string;
  trackCount: number;
}

interface SongPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSong: (track: SpotifyTrack, startPositionMs: number) => void;
  currentTrack?: SpotifyTrack | null;
}

// ============================================================================
// TRACK ITEM COMPONENT - Con botones de preview y añadir
// ============================================================================
const TrackItem = memo(
  ({
    track,
    isPlaying,
    onAdd,
    onTogglePlay,
  }: {
    track: SpotifyTrack;
    isPlaying: boolean;
    onAdd: () => void;
    onTogglePlay: () => void;
  }) => (
    <View className="flex-row items-center p-3 bg-zinc-800 rounded-xl mb-2">
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

      {/* Preview Play/Pause Button */}
      <TouchableOpacity
        onPress={onTogglePlay}
        className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
          isPlaying ? 'bg-green-600' : 'bg-zinc-700'
        }`}
      >
        {isPlaying ? <Pause color="#FFFFFF" size={18} /> : <Play color="#1DB954" size={18} />}
      </TouchableOpacity>

      {/* Add Button */}
      <TouchableOpacity
        onPress={onAdd}
        className="w-10 h-10 rounded-full bg-green-600 items-center justify-center"
      >
        <Plus color="#FFFFFF" size={20} />
      </TouchableOpacity>
    </View>
  )
);

TrackItem.displayName = 'TrackItem';

// ============================================================================
// PLAYLIST ITEM COMPONENT
// ============================================================================
const PlaylistItem = memo(
  ({ playlist, onPress }: { playlist: SpotifyPlaylist; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center p-3 bg-zinc-800 rounded-xl mb-2"
    >
      {playlist.imageUrl ? (
        <Image source={{ uri: playlist.imageUrl }} className="w-14 h-14 rounded-lg" />
      ) : (
        <View className="w-14 h-14 rounded-lg bg-zinc-700 items-center justify-center">
          <Music color="#71717A" size={24} />
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className="text-white font-bold text-sm" numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text className="text-zinc-500 text-xs">{playlist.trackCount} canciones</Text>
      </View>
      <ChevronRight color="#71717A" size={20} />
    </TouchableOpacity>
  )
);

PlaylistItem.displayName = 'PlaylistItem';

// ============================================================================
// FORMAT TIME HELPER
// ============================================================================
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function SongPickerModal({
  visible,
  onClose,
  onSelectSong,
  currentTrack: _currentTrack,
}: SongPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'playlists' | 'liked'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
  const [likedSongs, setLikedSongs] = useState<SpotifyTrack[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Canción seleccionada y posición de inicio
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [startPosition, setStartPosition] = useState(0);
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  // Preview playback
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Current playback position (updates in real-time)
  const [currentPlaybackPosition, setCurrentPlaybackPosition] = useState(0);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track being previewed in list (before trim)
  const [previewingTrackUri, setPreviewingTrackUri] = useState<string | null>(null);

  // Trim slider state - track if was playing before drag
  const wasPlayingBeforeDrag = useRef(false);

  // Timeline dimensions ref
  const timelineWidth = useRef(0);
  const timelineRef = useRef<View>(null);

  // -------------------------------------------------------------------------
  // LOAD PLAYLISTS & LIKED SONGS
  // -------------------------------------------------------------------------
  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await spotify.getMyPlaylists(50, 0);
      if (data && data.length > 0) {
        setPlaylists(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl || '',
            trackCount: p.trackCount || 0,
          }))
        );
      }
    } catch (error) {
      console.warn('Error loading playlists:', error);
    }
    setLoading(false);
  }, []);

  const loadLikedSongs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await spotify.getLikedSongs(50, 0);
      if (data && data.length > 0) {
        setLikedSongs(
          data.map((item) => ({
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
    setLoading(false);
  }, []);

  const loadPlaylistTracks = useCallback(async (playlistId: string) => {
    setLoading(true);
    try {
      const data = await spotify.getPlaylistTracks(playlistId, 50, 0);
      if (data && data.length > 0) {
        setPlaylistTracks(
          data.map((item) => ({
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
      console.warn('Error loading playlist tracks:', error);
    }
    setLoading(false);
  }, []);

  // -------------------------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------------------------
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const data = await spotify.searchTracks(searchQuery, 20);
      if (data && data.length > 0) {
        setSearchResults(
          data.map((track) => ({
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

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (visible) {
      loadPlaylists();
      loadLikedSongs();
    }
  }, [visible, loadPlaylists, loadLikedSongs]);

  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistTracks(selectedPlaylist.id);
    }
  }, [selectedPlaylist, loadPlaylistTracks]);

  // Playback position tracking - update every 100ms when playing
  useEffect(() => {
    if (isPreviewPlaying && selectedTrack) {
      // Start from the startPosition when we begin playing
      setCurrentPlaybackPosition(startPosition);

      playbackIntervalRef.current = setInterval(() => {
        setCurrentPlaybackPosition((prev) => {
          const newPos = prev + 100;
          // Loop back to start position if we reach the end
          if (newPos >= selectedTrack.durationMs) {
            return startPosition;
          }
          return newPos;
        });
      }, 100);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPreviewPlaying, selectedTrack, startPosition]);

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------
  const handleSelectTrack = useCallback(
    (track: SpotifyTrack) => {
      // Stop any preview playing
      if (previewingTrackUri) {
        spotify.pause();
        setPreviewingTrackUri(null);
      }
      setSelectedTrack(track);
      setStartPosition(0);
      setShowPositionPicker(true);
      setIsPreviewPlaying(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [previewingTrackUri]
  );

  // Toggle preview for a track in the list (before selecting for trim)
  const handleToggleListPreview = useCallback(
    async (track: SpotifyTrack) => {
      if (previewingTrackUri === track.uri) {
        // Same track - pause it
        await spotify.pause();
        setPreviewingTrackUri(null);
      } else {
        // Different track or none playing - play this one
        await spotify.play(track.uri, 0);
        setPreviewingTrackUri(track.uri);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [previewingTrackUri]
  );

  const handleConfirmSelection = useCallback(() => {
    if (selectedTrack) {
      onSelectSong(selectedTrack, startPosition);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    }
  }, [selectedTrack, startPosition, onSelectSong, onClose]);

  const handlePreviewToggle = useCallback(async () => {
    if (!selectedTrack) return;

    if (isPreviewPlaying) {
      await spotify.pause();
      setIsPreviewPlaying(false);
    } else {
      await spotify.play(selectedTrack.uri, startPosition);
      setIsPreviewPlaying(true);
    }
  }, [selectedTrack, startPosition, isPreviewPlaying]);

  // Refs to hold current values for PanResponders (they capture values at creation time)
  const currentValuesRef = useRef({
    isPreviewPlaying: false,
    selectedTrack: null as SpotifyTrack | null,
    currentPlaybackPosition: 0,
    startPosition: 0,
  });

  // Keep refs updated
  useEffect(() => {
    currentValuesRef.current = {
      isPreviewPlaying,
      selectedTrack,
      currentPlaybackPosition,
      startPosition,
    };
  }, [isPreviewPlaying, selectedTrack, currentPlaybackPosition, startPosition]);

  // PanResponder for the TRIM marker (scissors) - HIGHEST PRIORITY
  const trimPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: async () => {
        const { isPreviewPlaying: playing } = currentValuesRef.current;
        wasPlayingBeforeDrag.current = playing;
        if (playing) {
          await spotify.pause();
          setIsPreviewPlaying(false);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
        const { selectedTrack: track, currentPlaybackPosition: playPos } = currentValuesRef.current;
        if (!track || !timelineRef.current) return;

        timelineRef.current.measure((_x, _y, _width, _height, pageX, _pageY) => {
          if (track && timelineWidth.current > 0) {
            const relativeX = evt.nativeEvent.pageX - pageX;
            const percentage = Math.max(0, Math.min(1, relativeX / timelineWidth.current));
            const newPos = Math.floor(percentage * track.durationMs);
            setStartPosition(newPos);
            if (playPos < newPos) {
              setCurrentPlaybackPosition(newPos);
            }
          }
        });
      },
      onPanResponderRelease: async (
        evt: GestureResponderEvent,
        _gestureState: PanResponderGestureState
      ) => {
        const { selectedTrack: track } = currentValuesRef.current;
        if (!track || !timelineRef.current) return;

        timelineRef.current.measure(async (_x, _y, _width, _height, pageX, _pageY) => {
          if (track && timelineWidth.current > 0) {
            const relativeX = evt.nativeEvent.pageX - pageX;
            const percentage = Math.max(0, Math.min(1, relativeX / timelineWidth.current));
            const newPos = Math.floor(percentage * track.durationMs);
            setStartPosition(newPos);
            setCurrentPlaybackPosition(newPos);
            await spotify.play(track.uri, newPos);
            setIsPreviewPlaying(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        });
      },
    })
  ).current;

  // PanResponder for the PLAYBACK position (ball) - LOWER PRIORITY
  const playbackPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: async () => {
        const { isPreviewPlaying: playing } = currentValuesRef.current;
        if (playing) {
          await spotify.pause();
          setIsPreviewPlaying(false);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
        const { selectedTrack: track, startPosition: trimPos } = currentValuesRef.current;
        if (!track || !timelineRef.current) return;

        timelineRef.current.measure((_x, _y, _width, _height, pageX, _pageY) => {
          if (track && timelineWidth.current > 0) {
            const relativeX = evt.nativeEvent.pageX - pageX;
            const percentage = Math.max(0, Math.min(1, relativeX / timelineWidth.current));
            const rawPos = Math.floor(percentage * track.durationMs);
            // Playback can only go from trimPos to end
            const newPos = Math.max(trimPos, rawPos);
            setCurrentPlaybackPosition(newPos);
          }
        });
      },
      onPanResponderRelease: async (
        evt: GestureResponderEvent,
        _gestureState: PanResponderGestureState
      ) => {
        const { selectedTrack: track, startPosition: trimPos } = currentValuesRef.current;
        if (!track || !timelineRef.current) return;

        timelineRef.current.measure(async (_x, _y, _width, _height, pageX, _pageY) => {
          if (track && timelineWidth.current > 0) {
            const relativeX = evt.nativeEvent.pageX - pageX;
            const percentage = Math.max(0, Math.min(1, relativeX / timelineWidth.current));
            const rawPos = Math.floor(percentage * track.durationMs);
            const newPos = Math.max(trimPos, rawPos);
            setCurrentPlaybackPosition(newPos);
            await spotify.play(track.uri, newPos);
            setIsPreviewPlaying(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        });
      },
    })
  ).current;

  const handleBackFromPlaylist = useCallback(() => {
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
  }, []);

  const handleClose = useCallback(() => {
    setShowPositionPicker(false);
    setSelectedTrack(null);
    setStartPosition(0);
    setSelectedPlaylist(null);
    setSearchQuery('');
    setSearchResults([]);
    setPreviewingTrackUri(null);
    if (isPreviewPlaying || previewingTrackUri) {
      spotify.pause();
      setIsPreviewPlaying(false);
    }
    onClose();
  }, [onClose, isPreviewPlaying, previewingTrackUri]);

  // -------------------------------------------------------------------------
  // RENDER POSITION PICKER (TRIM MODE)
  // -------------------------------------------------------------------------
  const renderPositionPicker = () => {
    if (!selectedTrack || !showPositionPicker) return null;

    return (
      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown}
        className="absolute inset-0 bg-zinc-950 z-50"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <TouchableOpacity
            onPress={() => {
              if (isPreviewPlaying) {
                spotify.pause();
                setIsPreviewPlaying(false);
              }
              setShowPositionPicker(false);
            }}
          >
            <Text className="text-zinc-400 text-base">Atrás</Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <Scissors color="#1DB954" size={18} />
            <Text className="text-white font-bold text-lg ml-2">Cortar inicio</Text>
          </View>
          <TouchableOpacity onPress={handleConfirmSelection}>
            <Text className="text-green-500 font-bold text-base">Listo</Text>
          </TouchableOpacity>
        </View>

        {/* Track Info */}
        <View className="items-center px-5 py-6">
          {selectedTrack.albumArt ? (
            <Image
              source={{ uri: selectedTrack.albumArt }}
              className="w-40 h-40 rounded-2xl mb-5"
            />
          ) : (
            <View className="w-40 h-40 rounded-2xl bg-zinc-800 items-center justify-center mb-5">
              <Music color="#71717A" size={56} />
            </View>
          )}
          <Text className="text-white font-bold text-xl text-center" numberOfLines={2}>
            {selectedTrack.name}
          </Text>
          <Text className="text-zinc-400 text-base text-center mt-1">{selectedTrack.artist}</Text>
        </View>

        {/* Trim Info Card */}
        <View className="mx-5 mb-4 bg-zinc-900 rounded-xl p-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-zinc-400 text-sm">Inicio de sincronización:</Text>
            <View className="flex-row items-center bg-green-600/20 px-3 py-1 rounded-full">
              <Scissors color="#1DB954" size={14} />
              <Text className="text-green-500 font-mono font-bold ml-2 text-lg">
                {formatTime(startPosition)}
              </Text>
            </View>
          </View>
          <Text className="text-zinc-600 text-xs">
            Arrastra ✂️ para marcar inicio. La bolita muestra el progreso actual.
          </Text>
        </View>

        {/* Unified Timeline with Trim Marker and Playback Progress */}
        <View className="px-5 mb-4">
          <View className="bg-zinc-900 rounded-xl p-4">
            {/* Timeline Container */}
            <View
              ref={timelineRef}
              className="relative h-20"
              onLayout={(e) => {
                timelineWidth.current = e.nativeEvent.layout.width;
              }}
            >
              {/* Base track bar */}
              <View className="absolute left-0 right-0 top-9 h-2 bg-zinc-700 rounded-full overflow-hidden">
                {/* Trimmed/cut portion (before start position) - red */}
                <View
                  className="h-full bg-red-500/40"
                  style={{ width: `${(startPosition / selectedTrack.durationMs) * 100}%` }}
                />
              </View>

              {/* Playable portion overlay (green) */}
              <View
                className="absolute top-9 h-2 bg-green-600/50 rounded-r-full"
                style={{
                  left: `${(startPosition / selectedTrack.durationMs) * 100}%`,
                  right: 0,
                }}
              />

              {/* Progress played indicator (bright green from trim to current position) */}
              {currentPlaybackPosition > startPosition && (
                <View
                  className="absolute top-9 h-2 bg-green-500"
                  style={{
                    left: `${(startPosition / selectedTrack.durationMs) * 100}%`,
                    width: `${((currentPlaybackPosition - startPosition) / selectedTrack.durationMs) * 100}%`,
                  }}
                />
              )}

              {/* DRAGGABLE: Playback position indicator (white ball) - z-index 10 */}
              <View
                {...playbackPanResponder.panHandlers}
                className="absolute items-center justify-center"
                style={{
                  left: `${(currentPlaybackPosition / selectedTrack.durationMs) * 100}%`,
                  marginLeft: -20,
                  top: 0,
                  width: 40,
                  height: 40,
                  zIndex: 10,
                }}
              >
                <View className="w-10 h-10 rounded-full bg-white shadow-lg items-center justify-center border-2 border-green-500">
                  <Play color="#1DB954" size={16} fill="#1DB954" />
                </View>
              </View>

              {/* DRAGGABLE: Trim/Cut marker (scissors line) - z-index 50 HIGHEST */}
              <View
                {...trimPanResponder.panHandlers}
                className="absolute items-center"
                style={{
                  left: `${(startPosition / selectedTrack.durationMs) * 100}%`,
                  marginLeft: -20,
                  top: 0,
                  bottom: 0,
                  width: 40,
                  zIndex: 50,
                }}
              >
                {/* Scissors icon at top */}
                <View className="w-10 h-10 rounded-full bg-red-600 items-center justify-center shadow-lg border-2 border-red-400">
                  <Scissors color="#FFFFFF" size={18} />
                </View>
                {/* Vertical cut line */}
                <View className="w-1 flex-1 bg-red-500 rounded-full" style={{ marginTop: 2 }} />
              </View>
            </View>

            {/* Time labels */}
            <View className="flex-row justify-between mt-2">
              <Text className="text-red-500 text-xs font-mono">0:00</Text>
              <Text className="text-white text-xs font-mono font-bold">
                {formatTime(currentPlaybackPosition)}
              </Text>
              <Text className="text-green-500 text-xs font-mono">
                {formatTime(selectedTrack.durationMs)}
              </Text>
            </View>

            {/* Legend */}
            <View className="flex-row justify-center mt-3 gap-4">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-red-600 mr-2" />
                <Text className="text-zinc-500 text-xs">Corte ✂️</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-white border border-green-500 mr-2" />
                <Text className="text-zinc-500 text-xs">Progreso ▶</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Play/Pause Preview Button */}
        <View className="px-5 mb-4">
          <TouchableOpacity
            onPress={handlePreviewToggle}
            className={`rounded-xl py-4 flex-row items-center justify-center ${
              isPreviewPlaying ? 'bg-green-600' : 'bg-zinc-800'
            }`}
          >
            {isPreviewPlaying ? (
              <>
                <Pause color="#FFFFFF" size={22} />
                <Text className="text-white font-bold ml-3">Reproduciendo...</Text>
              </>
            ) : (
              <>
                <Play color="#1DB954" size={22} />
                <Text className="text-white font-bold ml-3">
                  Escuchar desde {formatTime(startPosition)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Confirm Button */}
        <View className="px-5">
          <TouchableOpacity
            onPress={handleConfirmSelection}
            className="bg-green-600 rounded-xl py-4 flex-row items-center justify-center"
          >
            <Check color="#FFFFFF" size={20} />
            <Text className="text-white font-bold text-base ml-2">Usar esta canción</Text>
          </TouchableOpacity>
        </View>

        {/* Duration indicator */}
        <View className="px-5 mt-4">
          <Text className="text-zinc-600 text-center text-xs">
            Duración resultante: {formatTime(selectedTrack.durationMs - startPosition)}
          </Text>
        </View>
      </Animated.View>
    );
  };

  // -------------------------------------------------------------------------
  // RENDER CONTENT
  // -------------------------------------------------------------------------
  const renderContent = () => {
    // Si está viendo tracks de una playlist
    if (selectedPlaylist) {
      return (
        <>
          <TouchableOpacity
            onPress={handleBackFromPlaylist}
            className="flex-row items-center px-5 py-3 border-b border-zinc-800"
          >
            <Text className="text-savage-red text-base">← Volver a playlists</Text>
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg px-5 py-3">{selectedPlaylist.name}</Text>
          {loading ? (
            <ActivityIndicator color="#1DB954" className="mt-10" />
          ) : (
            <FlatList
              data={playlistTracks}
              keyExtractor={(item) => item.uri}
              renderItem={({ item }) => (
                <TrackItem
                  track={item}
                  isPlaying={previewingTrackUri === item.uri}
                  onAdd={() => handleSelectTrack(item)}
                  onTogglePlay={() => handleToggleListPreview(item)}
                />
              )}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      );
    }

    // Tabs normales
    switch (activeTab) {
      case 'search':
        return (
          <>
            {/* Search Input */}
            <View className="px-5 pb-4">
              <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 py-3">
                <Search color="#71717A" size={20} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  placeholder="Buscar canciones..."
                  placeholderTextColor="#71717A"
                  className="flex-1 text-white ml-3"
                  returnKeyType="search"
                  autoCapitalize="none"
                />
                {searching && <ActivityIndicator color="#1DB954" size="small" />}
              </View>
            </View>

            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.uri}
                renderItem={({ item }) => (
                  <TrackItem
                    track={item}
                    isPlaying={previewingTrackUri === item.uri}
                    onAdd={() => handleSelectTrack(item)}
                    onTogglePlay={() => handleToggleListPreview(item)}
                  />
                )}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View className="flex-1 items-center justify-center px-10">
                <Music color="#3F3F46" size={48} />
                <Text className="text-zinc-500 text-center mt-4">
                  Busca una canción para añadir a tu video
                </Text>
              </View>
            )}
          </>
        );

      case 'playlists':
        return loading ? (
          <ActivityIndicator color="#1DB954" className="mt-10" />
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PlaylistItem playlist={item} onPress={() => setSelectedPlaylist(item)} />
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        );

      case 'liked':
        return loading ? (
          <ActivityIndicator color="#1DB954" className="mt-10" />
        ) : (
          <FlatList
            data={likedSongs}
            keyExtractor={(item) => item.uri}
            renderItem={({ item }) => (
              <TrackItem
                track={item}
                isPlaying={previewingTrackUri === item.uri}
                onAdd={() => handleSelectTrack(item)}
                onTogglePlay={() => handleToggleListPreview(item)}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        );
    }
  };

  // -------------------------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------------------------
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 bg-black/80"
      >
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          className="flex-1 bg-zinc-950 mt-12 rounded-t-3xl overflow-hidden"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
            <View className="w-10" />
            <Text className="text-white font-bold text-lg">Añadir canción</Text>
            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-zinc-800"
            >
              <X size={20} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="flex-row border-b border-zinc-800">
            {[
              { id: 'search', label: 'Buscar' },
              { id: 'playlists', label: 'Playlists' },
              { id: 'liked', label: 'Me gusta' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 items-center border-b-2 ${
                  activeTab === tab.id ? 'border-green-500' : 'border-transparent'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    activeTab === tab.id ? 'text-green-500' : 'text-zinc-500'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <View className="flex-1">{renderContent()}</View>

          {/* Position Picker Overlay */}
          {renderPositionPicker()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default SongPickerModal;
