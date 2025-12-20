// ============================================================================
// SPOTIFY OVERLAY - FAB flotante global para control de Spotify
// Visible en todas las pantallas excepto Feed
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Music, Play, Pause } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import spotify, { SpotifyTrack, SpotifyPlaybackState } from '../../services/spotify/spotify';
import SpotifyModal from './SpotifyModal';
import { useUserRoleContext } from '../../context/UserRoleContext';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function SpotifyOverlay() {
  const pathname = usePathname();
  const {
    isPro,
    spotifyConnected: contextSpotifyConnected,
    updateSpotifyStatus,
  } = useUserRoleContext();

  // Estados
  const [modalVisible, setModalVisible] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);

  // Animaciones
  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  // Ocultar en Feed
  const isHidden = pathname?.includes('feed') || pathname === '/feed/index' || pathname === '/feed';

  // -------------------------------------------------------------------------
  // SINCRONIZAR ESTADO DE SPOTIFY
  // -------------------------------------------------------------------------
  useEffect(() => {
    const checkSpotifyStatus = async () => {
      const connected = await spotify.isTokenValid();
      setSpotifyConnected(connected);

      if (connected) {
        const playback = await spotify.getPlaybackState();
        setPlaybackState(playback);
        setCurrentTrack(playback?.track || null);
      }
    };

    checkSpotifyStatus();

    // Sincronizar con contexto
    if (contextSpotifyConnected !== undefined) {
      setSpotifyConnected(contextSpotifyConnected);
    }
  }, [contextSpotifyConnected]);

  // -------------------------------------------------------------------------
  // POLLING DE PLAYBACK STATE
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!spotifyConnected || isHidden) return;

    const interval = setInterval(async () => {
      try {
        const playback = await spotify.getPlaybackState();
        setPlaybackState(playback);
        if (playback?.track) {
          setCurrentTrack(playback.track);
        }
      } catch {
        // Silenciar errores de polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [spotifyConnected, isHidden]);

  // -------------------------------------------------------------------------
  // ANIMACIÓN DE PULSO CUANDO HAY REPRODUCCIÓN
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (playbackState?.isPlaying) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowAnim.value = withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0.5, { duration: 600 })),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(1, { duration: 300 });
      glowAnim.value = withTiming(0, { duration: 300 });
    }
  }, [playbackState?.isPlaying]);

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------
  const handleSpotifyConnect = async () => {
    setSpotifyLoading(true);
    const success = await spotify.authenticate();
    setSpotifyConnected(success);
    if (success) {
      const playback = await spotify.getPlaybackState();
      setPlaybackState(playback);
      setCurrentTrack(playback?.track || null);
      await updateSpotifyStatus(true, true);
    }
    setSpotifyLoading(false);
  };

  const handleSpotifyDisconnect = async () => {
    await spotify.disconnect();
    setSpotifyConnected(false);
    setPlaybackState(null);
    setCurrentTrack(null);
    await updateSpotifyStatus(false, false);
  };

  const handlePlayPause = async () => {
    await spotify.togglePlayPause();
    const playback = await spotify.getPlaybackState();
    setPlaybackState(playback);
  };

  const handleNext = async () => {
    await spotify.next();
    setTimeout(async () => {
      const playback = await spotify.getPlaybackState();
      setPlaybackState(playback);
      setCurrentTrack(playback?.track || null);
    }, 500);
  };

  const handlePrevious = async () => {
    await spotify.previous();
    setTimeout(async () => {
      const playback = await spotify.getPlaybackState();
      setPlaybackState(playback);
      setCurrentTrack(playback?.track || null);
    }, 500);
  };

  const handleTrackChange = (track: SpotifyTrack) => {
    setCurrentTrack(track);
    setTimeout(async () => {
      const playback = await spotify.getPlaybackState();
      setPlaybackState(playback);
    }, 500);
  };

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  };

  // -------------------------------------------------------------------------
  // ESTILOS ANIMADOS
  // -------------------------------------------------------------------------
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnim.value, [0, 1], [0, 0.6]),
    transform: [{ scale: interpolate(glowAnim.value, [0, 1], [1, 1.5]) }],
  }));

  // -------------------------------------------------------------------------
  // NO RENDERIZAR EN FEED
  // -------------------------------------------------------------------------
  if (isHidden) {
    return null;
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <>
      {/* FAB FLOTANTE */}
      <View
        style={{
          position: 'absolute',
          bottom: 180,
          right: 16,
          zIndex: 9998,
        }}
      >
        {/* Glow Effect */}
        {playbackState?.isPlaying && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#1DB954',
              },
              glowStyle,
            ]}
          />
        )}

        {/* FAB Button */}
        <Animated.View style={fabStyle}>
          <TouchableOpacity
            onPress={handleFabPress}
            activeOpacity={0.8}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: spotifyConnected ? '#1DB954' : '#27272a',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#1DB954',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: spotifyConnected ? 0.4 : 0,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {/* Mini Album Art o Icono */}
            {currentTrack?.albumArt && spotifyConnected ? (
              <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden' }}>
                <Image
                  source={{ uri: currentTrack.albumArt }}
                  style={{ width: 40, height: 40 }}
                  contentFit="cover"
                />
                {/* Mini Play/Pause Overlay */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {playbackState?.isPlaying ? (
                    <Pause size={16} color="#fff" fill="#fff" />
                  ) : (
                    <Play size={16} color="#fff" fill="#fff" />
                  )}
                </View>
              </View>
            ) : (
              <Music size={24} color={spotifyConnected ? '#000' : '#1DB954'} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Mini Track Name Badge */}
        {currentTrack && spotifyConnected && playbackState?.isPlaying && (
          <View
            style={{
              position: 'absolute',
              bottom: -8,
              right: 60,
              backgroundColor: '#000',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              maxWidth: 150,
              borderWidth: 1,
              borderColor: '#1DB954',
            }}
          >
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
              {currentTrack.name}
            </Text>
          </View>
        )}
      </View>

      {/* MODAL DE SPOTIFY */}
      <SpotifyModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        isPro={isPro}
        onSpotifyConnect={handleSpotifyConnect}
        onSpotifyDisconnect={handleSpotifyDisconnect}
        spotifyConnected={spotifyConnected}
        spotifyLoading={spotifyLoading}
        currentTrack={currentTrack}
        playbackState={playbackState}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onTrackChange={handleTrackChange}
      />
    </>
  );
}

export default SpotifyOverlay;
