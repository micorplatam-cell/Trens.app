// ============================================================================
// SPOTIFY OVERLAY - FAB flotante global para control de Spotify
// Visible en todas las pantallas excepto Feed
// Gestos: Long press = play/pause, Swipe up = next, Swipe left = restart
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, PanResponder, GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Music, Play, Pause, SkipForward, RotateCcw } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import spotify, { SpotifyTrack, SpotifyPlaybackState } from '../../services/spotify/spotify';
import SpotifyModal from './SpotifyModal';
import { useUserRoleContext } from '../../context/UserRoleContext';

// Constantes para gestos
const LONG_PRESS_DURATION = 500; // ms
const SWIPE_THRESHOLD = 50; // px mínimo para considerar swipe

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function SpotifyOverlay() {
  // IMPORTANTE: usePathname debe llamarse antes de cualquier early return
  // para mantener el orden de hooks consistente
  let pathname: string | null = null;
  try {
    pathname = usePathname();
  } catch {
    // Si falla usePathname, el contexto de navegación no está disponible
    return null;
  }

  const {
    isPro,
    spotifyConnected: contextSpotifyConnected,
    updateSpotifyStatus,
  } = useUserRoleContext();

  // Estados - inicializar con valor del contexto
  const [modalVisible, setModalVisible] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(contextSpotifyConnected);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  // Estado separado para albumArt para evitar re-renders de imagen
  const [albumArtUrl, setAlbumArtUrl] = useState<string | null>(null);

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
      // Usar el estado del contexto que ya validó los tokens
      const connected = contextSpotifyConnected ?? (await spotify.isTokenValid());
      setSpotifyConnected(connected);

      if (connected) {
        const playback = await spotify.getPlaybackState();
        setPlaybackState(playback);
        // Solo actualizar si hay track y cambió el URI
        if (playback?.track) {
          setCurrentTrack((prev) => {
            if (prev?.uri !== playback.track?.uri) {
              // Actualizar albumArt solo cuando cambia la canción
              setAlbumArtUrl(playback.track?.albumArt || null);
              return playback.track;
            }
            return prev;
          });
        }
      }
    };

    checkSpotifyStatus();
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
        // Solo actualizar track si cambió (evita re-renders innecesarios de la imagen)
        if (playback?.track) {
          setCurrentTrack((prev) => {
            if (prev?.uri !== playback.track?.uri) {
              // Actualizar albumArt solo cuando cambia la canción
              setAlbumArtUrl(playback.track?.albumArt || null);
              return playback.track;
            }
            return prev;
          });
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
    const success = await spotify.next();
    if (success) {
      setTimeout(async () => {
        const playback = await spotify.getPlaybackState();
        setPlaybackState(playback);
        setCurrentTrack(playback?.track || null);
        if (playback?.track?.albumArt) {
          setAlbumArtUrl(playback.track.albumArt);
        }
      }, 600);
    }
  };

  const handlePrevious = async () => {
    await spotify.previous();
    setTimeout(async () => {
      const playback = await spotify.getPlaybackState();
      setPlaybackState(playback);
      setCurrentTrack(playback?.track || null);
      if (playback?.track?.albumArt) {
        setAlbumArtUrl(playback.track.albumArt);
      }
    }, 600);
  };

  const handleTrackChange = (track: SpotifyTrack) => {
    setCurrentTrack(track);
    if (track.albumArt) {
      setAlbumArtUrl(track.albumArt);
    }
    setTimeout(async () => {
      const playback = await spotify.getPlaybackState();
      setPlaybackState(playback);
    }, 500);
  };

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  };

  // Handler para reiniciar canción (seek to 0)
  const handleRestartTrack = useCallback(async () => {
    try {
      console.log('🎵 SpotifyOverlay: handleRestartTrack called');
      await spotify.seek(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Actualizar estado
      setTimeout(async () => {
        const playback = await spotify.getPlaybackState();
        setPlaybackState(playback);
      }, 300);
    } catch (error) {
      console.warn('Error restarting track:', error);
    }
  }, []);

  // -------------------------------------------------------------------------
  // GESTURE STATE & REFS
  // -------------------------------------------------------------------------
  const [gestureIndicator, setGestureIndicator] = useState<'none' | 'next' | 'restart'>('none');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isLongPress = useRef(false);
  const gestureHandled = useRef(false);

  // Refs para las funciones que el PanResponder necesita acceder
  const handleNextRef = useRef(handleNext);
  const handleRestartRef = useRef(handleRestartTrack);
  const handlePlayPauseRef = useRef(handlePlayPause);
  const handleFabPressRef = useRef(handleFabPress);

  // Mantener refs actualizados
  useEffect(() => {
    handleNextRef.current = handleNext;
    handleRestartRef.current = handleRestartTrack;
    handlePlayPauseRef.current = handlePlayPause;
    handleFabPressRef.current = handleFabPress;
  });

  // Animación para feedback visual del FAB
  const fabScale = useSharedValue(1);
  const fabTranslateX = useSharedValue(0);
  const fabTranslateY = useSharedValue(0);

  // -------------------------------------------------------------------------
  // PAN RESPONDER PARA GESTOS
  // -------------------------------------------------------------------------
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        startPos.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
        isLongPress.current = false;
        gestureHandled.current = false;
        setGestureIndicator('none');

        // Iniciar timer de long press
        longPressTimer.current = setTimeout(() => {
          if (!gestureHandled.current) {
            isLongPress.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            // Toggle play/pause
            handlePlayPauseRef.current();
            gestureHandled.current = true;
            fabScale.value = withSequence(withTiming(0.8, { duration: 100 }), withSpring(1));
          }
        }, LONG_PRESS_DURATION);

        // Feedback visual inicial
        fabScale.value = withTiming(0.95, { duration: 100 });
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const dx = evt.nativeEvent.pageX - startPos.current.x;
        const dy = evt.nativeEvent.pageY - startPos.current.y;

        // Si hay movimiento significativo, cancelar long press
        if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }

        // Mover FAB visualmente (limitado)
        fabTranslateX.value = Math.max(-60, Math.min(60, dx * 0.5));
        fabTranslateY.value = Math.max(-60, Math.min(60, dy * 0.5));

        // Detectar dirección del swipe y mostrar indicador
        if (dy < -SWIPE_THRESHOLD && Math.abs(dx) < SWIPE_THRESHOLD) {
          setGestureIndicator('next');
        } else if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
          setGestureIndicator('restart');
        } else {
          setGestureIndicator('none');
        }
      },

      onPanResponderRelease: (evt: GestureResponderEvent) => {
        // Cancelar timer de long press
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        const dx = evt.nativeEvent.pageX - startPos.current.x;
        const dy = evt.nativeEvent.pageY - startPos.current.y;

        // Resetear posición visual
        fabScale.value = withSpring(1);
        fabTranslateX.value = withSpring(0);
        fabTranslateY.value = withSpring(0);
        setGestureIndicator('none');

        // Si ya se manejó (long press), no hacer nada más
        if (gestureHandled.current) return;

        // Detectar swipe up -> Next track
        if (dy < -SWIPE_THRESHOLD && Math.abs(dx) < SWIPE_THRESHOLD) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleNextRef.current();
          gestureHandled.current = true;
          return;
        }

        // Detectar swipe left -> Restart track
        if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleRestartRef.current();
          gestureHandled.current = true;
          return;
        }

        // Si no hubo swipe ni long press, es un tap -> abrir modal
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !isLongPress.current) {
          handleFabPressRef.current();
        }
      },

      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        fabScale.value = withSpring(1);
        fabTranslateX.value = withSpring(0);
        fabTranslateY.value = withSpring(0);
        setGestureIndicator('none');
      },
    })
  ).current;

  // -------------------------------------------------------------------------
  // ESTILOS ANIMADOS
  // -------------------------------------------------------------------------
  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseAnim.value * fabScale.value },
      { translateX: fabTranslateX.value },
      { translateY: fabTranslateY.value },
    ],
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

        {/* FAB Button con Gestos */}
        <Animated.View style={fabStyle} {...panResponder.panHandlers}>
          <View
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
            {albumArtUrl && spotifyConnected ? (
              <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden' }}>
                <Image
                  key={albumArtUrl}
                  source={{ uri: albumArtUrl }}
                  style={{ width: 40, height: 40 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
            ) : (
              <Music size={24} color={spotifyConnected ? '#000' : '#1DB954'} />
            )}
          </View>
        </Animated.View>

        {/* Indicador de Gesto - Next (arriba) */}
        {gestureIndicator === 'next' && (
          <View
            style={{
              position: 'absolute',
              top: -40,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: '#1DB954',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <SkipForward size={14} color="#000" />
              <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>
                Siguiente
              </Text>
            </View>
          </View>
        )}

        {/* Indicador de Gesto - Restart (izquierda) */}
        {gestureIndicator === 'restart' && (
          <View
            style={{
              position: 'absolute',
              left: -80,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: '#1DB954',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <RotateCcw size={14} color="#000" />
              <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>
                Reiniciar
              </Text>
            </View>
          </View>
        )}

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

      {/* MODAL DE SPOTIFY - Solo renderizar cuando es visible */}
      {modalVisible && (
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
      )}
    </>
  );
}

export default SpotifyOverlay;
