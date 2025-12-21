// =============================================================================
// SONG PICKER MODAL - Selector de canciones de Spotify
// Permite buscar y seleccionar canciones con punto de inicio personalizado
// =============================================================================

import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Search,
  Music,
  Play,
  Pause,
  Check,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
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
// TRACK ITEM COMPONENT
// ============================================================================
const TrackItem = memo(
  ({
    track,
    isSelected,
    onPress,
  }: {
    track: SpotifyTrack;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center p-3 rounded-xl mb-2 ${
        isSelected ? 'bg-green-600/20 border border-green-600' : 'bg-zinc-800'
      }`}
    >
      {track.albumArt ? (
        <Image source={{ uri: track.albumArt }} className="w-12 h-12 rounded-lg" />
      ) : (
        <View className="w-12 h-12 rounded-lg bg-zinc-700 items-center justify-center">
          <Music color="#71717A" size={20} />
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className="text-white font-bold text-sm" numberOfLines={1}>
          {track.name}
        </Text>
        <Text className="text-zinc-400 text-xs" numberOfLines={1}>
          {track.artist}
        </Text>
      </View>
      {isSelected && (
        <View className="bg-green-600 rounded-full p-1">
          <Check color="#FFFFFF" size={16} />
        </View>
      )}
    </TouchableOpacity>
  )
);

TrackItem.displayName = 'TrackItem';

// ============================================================================
// PLAYLIST ITEM COMPONENT
// ============================================================================
const PlaylistItem = memo(
  ({
    playlist,
    onPress,
  }: {
    playlist: SpotifyPlaylist;
    onPress: () => void;
  }) => (
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
        <Text className="text-zinc-500 text-xs">
          {playlist.trackCount} canciones
        </Text>
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

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------
  const handleSelectTrack = useCallback((track: SpotifyTrack) => {
    setSelectedTrack(track);
    setStartPosition(0);
    setShowPositionPicker(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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
    if (isPreviewPlaying) {
      spotify.pause();
      setIsPreviewPlaying(false);
    }
    onClose();
  }, [onClose, isPreviewPlaying]);

  // -------------------------------------------------------------------------
  // RENDER POSITION PICKER
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
          <TouchableOpacity onPress={() => setShowPositionPicker(false)}>
            <Text className="text-zinc-400 text-base">Atrás</Text>
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">Punto de inicio</Text>
          <TouchableOpacity onPress={handleConfirmSelection}>
            <Text className="text-green-500 font-bold text-base">Listo</Text>
          </TouchableOpacity>
        </View>

        {/* Track Info */}
        <View className="items-center px-5 py-8">
          {selectedTrack.albumArt ? (
            <Image
              source={{ uri: selectedTrack.albumArt }}
              className="w-48 h-48 rounded-2xl mb-6"
            />
          ) : (
            <View className="w-48 h-48 rounded-2xl bg-zinc-800 items-center justify-center mb-6">
              <Music color="#71717A" size={64} />
            </View>
          )}
          <Text className="text-white font-bold text-xl text-center" numberOfLines={2}>
            {selectedTrack.name}
          </Text>
          <Text className="text-zinc-400 text-base text-center mt-1">
            {selectedTrack.artist}
          </Text>
        </View>

        {/* Position Slider */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-zinc-500 text-sm">Inicio de sincronización</Text>
            <View className="flex-row items-center">
              <Clock color="#1DB954" size={16} />
              <Text className="text-green-500 font-mono font-bold ml-2">
                {formatTime(startPosition)}
              </Text>
            </View>
          </View>

          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={selectedTrack.durationMs}
            value={startPosition}
            onValueChange={(value) => setStartPosition(Math.floor(value))}
            minimumTrackTintColor="#1DB954"
            maximumTrackTintColor="#3F3F46"
            thumbTintColor="#1DB954"
          />

          <View className="flex-row justify-between mt-1">
            <Text className="text-zinc-600 text-xs font-mono">0:00</Text>
            <Text className="text-zinc-600 text-xs font-mono">
              {formatTime(selectedTrack.durationMs)}
            </Text>
          </View>
        </View>

        {/* Preview Button */}
        <View className="px-5 mb-6">
          <TouchableOpacity
            onPress={handlePreviewToggle}
            className="bg-zinc-800 rounded-xl py-4 flex-row items-center justify-center"
          >
            {isPreviewPlaying ? (
              <>
                <Pause color="#FFFFFF" size={20} />
                <Text className="text-white font-bold ml-2">Pausar preview</Text>
              </>
            ) : (
              <>
                <Play color="#1DB954" size={20} />
                <Text className="text-white font-bold ml-2">Escuchar desde este punto</Text>
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
            <Text className="text-white font-bold text-base ml-2">
              Usar esta canción
            </Text>
          </TouchableOpacity>
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
          <Text className="text-white font-bold text-lg px-5 py-3">
            {selectedPlaylist.name}
          </Text>
          {loading ? (
            <ActivityIndicator color="#1DB954" className="mt-10" />
          ) : (
            <FlatList
              data={playlistTracks}
              keyExtractor={(item) => item.uri}
              renderItem={({ item }) => (
                <TrackItem
                  track={item}
                  isSelected={selectedTrack?.uri === item.uri}
                  onPress={() => handleSelectTrack(item)}
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
                    isSelected={selectedTrack?.uri === item.uri}
                    onPress={() => handleSelectTrack(item)}
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
              <PlaylistItem
                playlist={item}
                onPress={() => setSelectedPlaylist(item)}
              />
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
                isSelected={selectedTrack?.uri === item.uri}
                onPress={() => handleSelectTrack(item)}
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
