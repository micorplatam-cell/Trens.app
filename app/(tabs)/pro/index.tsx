import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import {
  RotateCcw,
  Zap,
  ZapOff,
  Music,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import { Audio } from 'expo-av';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { supabase } from '../../../lib/supabase';
import { useUserRoleContext } from '../../../context/UserRoleContext';
import { useProContext } from '../../../context/ProContext';
import { useHank } from '../../../context/HankContext';
import { ProUpgradeModal } from '../../../components/pro/ProUpgradeModal';
import { FullscreenVideoEditor } from '../../../components/pro/FullscreenVideoEditor';
import spotify from '../../../services/spotify/spotify';
import cloudflareStream from '../../../services/cloudflare/stream';

// ============================================================================
// TIPOS
// ============================================================================

interface VideoData {
  uri: string;
  duration: number;
  timestamp: Date;
}

interface SpotifyMetadata {
  enabled: boolean;
  trackUri: string;
  positionMs: number;
  trackName: string;
  artist: string;
  albumArt?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ProScreen() {
  const { user, isPro, spotifyPremium, spotifyConnected } =
    useUserRoleContext();
  const { context: proContext, clearContext } = useProContext();
  const { triggerRefresh } = useHank();

  // Upgrade Modal (para usuarios FREE)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef<any>(null);

  // Video Data
  const [capturedVideo, setCapturedVideo] = useState<VideoData | null>(null);

  // Editor Modal State
  const [editorVisible, setEditorVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Spotify State
  const [spotifyMetadata, setSpotifyMetadata] = useState<SpotifyMetadata | null>(null);

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Capturar metadata de Spotify al montar (solo PRO y solo si está reproduciendo)
  useEffect(() => {
    const captureSpotifyMetadata = async () => {
      if (isPro && spotifyConnected && spotifyPremium) {
        try {
          const playbackState = await spotify.getPlaybackState();
          // Solo capturar si está REPRODUCIENDO activamente
          if (playbackState?.isPlaying && playbackState.track) {
            setSpotifyMetadata({
              enabled: true,
              trackUri: playbackState.track.uri,
              positionMs: playbackState.track.positionMs || 0,
              trackName: playbackState.track.name,
              artist: playbackState.track.artist,
              albumArt: playbackState.track.albumArt,
            });
          } else {
            // No hay música reproduciéndose - no auto-detectar
            setSpotifyMetadata(null);
          }
        } catch (error) {
          console.warn('No se pudo capturar metadata de Spotify:', error);
        }
      }
    };

    captureSpotifyMetadata();
  }, [isPro, spotifyConnected, spotifyPremium]);

  // Animation - Breathing effect para el shutter
  const shutterScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  // -------------------------------------------------------------------------
  // ANIMATIONS
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isRecording) {
      shutterScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 500 }), withTiming(0.5, { duration: 500 })),
        -1,
        true
      );
    } else {
      shutterScale.value = withTiming(1);
      pulseOpacity.value = withTiming(0.5);
    }
  }, [isRecording]);

  const shutterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // -------------------------------------------------------------------------
  // AUDIO SETUP - NO grabar audio de Spotify, SOLO video + audio ambiente
  // -------------------------------------------------------------------------
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: 1, // DuckOthers - permite que música siga
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error configurando audio:', error);
      }
    };

    setupAudio();
  }, []);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // CAMERA HANDLERS
  // -------------------------------------------------------------------------
  const closeCamera = () => {
    if (isRecording) {
      stopRecording();
    }
    setRecordingTime(0);
  };

  const flipCamera = () => {
    setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleFlash = () => {
    setFlashMode((prev) => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'auto';
      return 'off';
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(true);
    setRecordingTime(0);

    // 🎵 PRO: Capturar metadata de Spotify JUSTO ANTES de grabar
    // SOLO si está REPRODUCIENDO activamente (no en pausa)
    if (isPro && spotifyConnected && spotifyPremium) {
      try {
        const playbackState = await spotify.getPlaybackState();
        // Solo capturar si está REPRODUCIENDO activamente
        if (playbackState?.isPlaying && playbackState.track) {
          const capturedMetadata = {
            enabled: true,
            trackUri: playbackState.track.uri,
            positionMs: playbackState.track.positionMs || 0, // Posición EXACTA del momento épico
            trackName: playbackState.track.name,
            artist: playbackState.track.artist,
            albumArt: playbackState.track.albumArt,
          };
          setSpotifyMetadata(capturedMetadata);
          console.warn(
            '🎵 Spotify metadata capturado (reproduciendo):',
            capturedMetadata.trackName,
            'en',
            capturedMetadata.positionMs,
            'ms'
          );
        } else {
          // Spotify está en pausa - NO auto-detectar
          console.warn('🎵 Spotify en pausa - no se detectó canción automáticamente');
        }
      } catch (error) {
        console.warn('No se pudo capturar metadata de Spotify:', error);
      }
    }

    // Timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setCapturedVideo({
        uri: video.uri,
        duration: recordingTime,
        timestamp: new Date(),
      });
      setEditorVisible(true); // Mostrar editor fullscreen
      setIsRecording(false);
    } catch (error) {
      console.error('Error recording:', error);
      setIsRecording(false);
      setSpotifyMetadata(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // -------------------------------------------------------------------------
  // EDITOR HANDLERS
  // -------------------------------------------------------------------------
  const discardVideo = () => {
    setCapturedVideo(null);
    setEditorVisible(false);
    setSpotifyMetadata(null);
    clearContext();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // -------------------------------------------------------------------------
  // SAVE/SHARE HANDLERS - Usa Cloudflare Stream
  // -------------------------------------------------------------------------
  const handleEditorSave = async (data: {
    videoTrimStart: number;
    videoTrimEnd: number;
    spotifyEnabled: boolean;
    spotifyStartMs: number;
    isPublic: boolean;
  }) => {
    if (!isPro) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowUpgradeModal(true);
      return;
    }

    if (!capturedVideo || !user) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. SUBIR VIDEO A CLOUDFLARE STREAM
      const uploadResult = await cloudflareStream.uploadVideo(capturedVideo.uri, {
        name: `TRENS_${user.id}_${Date.now()}`,
        exerciseName: proContext.type === 'tactical' ? proContext.exerciseName : undefined,
        userId: user.id,
        isPublic: data.isPublic,
      });

      if (!uploadResult.success || !uploadResult.videoId) {
        throw new Error(uploadResult.error || 'Error subiendo a Cloudflare Stream');
      }

      // 2. OBTENER URLs DE REPRODUCCIÓN
      const playbackUrls = cloudflareStream.getPlaybackUrls(uploadResult.videoId);

      // 3. GUARDAR EN TABLA pro_videos (metadata en Supabase)
      const { error: insertError } = await supabase
        .from('pro_videos')
        .insert({
          user_id: user.id,
          video_url: playbackUrls.hls,
          thumbnail_url: playbackUrls.thumbnail,
          cloudflare_video_id: uploadResult.videoId,
          duration_seconds: Math.round(capturedVideo.duration),
          context_type: proContext.type,
          exercise_id: proContext.type === 'tactical' ? proContext.exerciseId : null,
          exercise_name: proContext.type === 'tactical' ? proContext.exerciseName : null,
          spotify:
            data.spotifyEnabled && spotifyMetadata
              ? {
                  enabled: true,
                  trackUri: spotifyMetadata.trackUri,
                  positionMs: data.spotifyStartMs,
                  trackName: spotifyMetadata.trackName,
                  artist: spotifyMetadata.artist,
                }
              : { enabled: false },
          ambient_audio: true,
          is_public: data.isPublic,
          trim_start_percent: Math.round(data.videoTrimStart),
          trim_end_percent: Math.round(data.videoTrimEnd),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error guardando en DB:', insertError);
        throw insertError;
      }

      // 4. COMPARTIR SI ES PÚBLICO
      if (data.isPublic && capturedVideo?.uri) {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          const exerciseInfo = proContext.type === 'tactical' && proContext.exerciseName
            ? proContext.exerciseName
            : 'Entrenamiento';
          const spotifyInfo = data.spotifyEnabled && spotifyMetadata
            ? ` 🎵 ${spotifyMetadata.trackName}`
            : '';

          await Sharing.shareAsync(capturedVideo.uri, {
            mimeType: 'video/mp4',
            dialogTitle: `🏋️ ${exerciseInfo}${spotifyInfo} #TRENS`,
          });
        }
      }

      triggerRefresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      discardVideo();
    } catch (error) {
      console.error('Error saving:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // FORMAT HELPERS
  // -------------------------------------------------------------------------
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFlashIcon = () => {
    if (flashMode === 'on') return <Zap color="#FFCC00" size={24} fill="#FFCC00" />;
    if (flashMode === 'auto') return <Zap color="#FFFFFF" size={24} />;
    return <ZapOff color="#FFFFFF" size={24} />;
  };

  const getContextLabel = (): string => {
    if (proContext.type === 'tactical' && proContext.exerciseName) {
      return `REC: ${proContext.exerciseName.toUpperCase()}`;
    }
    return 'REC: CÁMARA LIBRE';
  };

  // -------------------------------------------------------------------------
  // RENDER: MAIN SCREEN - CÁMARA EN VIVO PERMANENTE
  // -------------------------------------------------------------------------

  // Pedir permisos si no están concedidos
  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Lock color="#DC2626" size={64} className="mb-4" />
        <Text className="text-white text-xl font-bold mb-2 text-center">
          Acceso a Cámara Requerido
        </Text>
        <Text className="text-zinc-400 text-center mb-8">
          PRO necesita acceso a tu cámara para grabar tus entrenamientos
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-savage-red px-8 py-4 rounded-full"
        >
          <Text className="text-white font-bold">PERMITIR ACCESO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-black">
        {/* CameraView SIEMPRE VISIBLE */}
        <CameraView
          ref={cameraRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing={cameraFacing}
          mode="video"
          flash={flashMode}
        />

        {/* HUD SUPERIOR */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          className="absolute top-0 left-0 right-0 h-28"
        />
        <View className="absolute top-14 left-0 right-0 px-4 flex-row justify-between items-center z-10">
          {/* Etiqueta de Contexto (Izquierda) */}
          <View className="flex-row items-center">
            <Animated.View style={pulseAnimatedStyle}>
              <View className="w-3 h-3 bg-savage-red rounded-full mr-2" />
            </Animated.View>
            <Text className="text-white font-bold text-sm tracking-wide">
              {isRecording ? getContextLabel() : 'PRO'}
            </Text>
          </View>

          {/* Herramientas Rápidas (Derecha) */}
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={toggleFlash} className="bg-black/40 p-2 rounded-full">
              {getFlashIcon()}
            </TouchableOpacity>
            <TouchableOpacity onPress={flipCamera} className="bg-black/40 p-2 rounded-full">
              <RotateCcw color="#FFFFFF" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTADOR TIEMPO (Solo grabando) */}
        {isRecording && (
          <View className="absolute top-32 left-0 right-0 items-center z-10">
            <View className="bg-black/60 px-4 py-2 rounded-full">
              <Text className="text-white font-mono font-bold text-lg">
                {formatTime(recordingTime)}
              </Text>
            </View>
          </View>
        )}

        {/* SPOTIFY INDICATOR (Solo si hay música capturada) */}
        {isRecording && spotifyMetadata && (
          <View className="absolute top-44 left-4 right-4 z-10">
            <View className="bg-black/70 rounded-xl p-3 flex-row items-center border border-green-500/30">
              <View className="w-10 h-10 bg-green-500 rounded-lg items-center justify-center mr-3">
                <Music color="#000" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm" numberOfLines={1}>
                  {spotifyMetadata.trackName}
                </Text>
                <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                  {spotifyMetadata.artist}
                </Text>
              </View>
              <View className="bg-green-500/20 px-2 py-1 rounded">
                <Text className="text-green-500 text-xs font-bold">SYNC</Text>
              </View>
            </View>
          </View>
        )}

        {/* CONTROLES INFERIORES */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          className="absolute bottom-0 left-0 right-0 h-40"
        />
        <View className="absolute bottom-12 left-0 right-0 items-center z-10">
          {/* SHUTTER BUTTON */}
          <Animated.View style={shutterAnimatedStyle}>
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
                style={{
                  borderWidth: 4,
                  borderColor: '#DC2626',
                  shadowColor: '#DC2626',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 12,
                }}
              >
                {isRecording ? (
                  <View className="w-8 h-8 bg-savage-red rounded-md" />
                ) : (
                  <View className="w-16 h-16 rounded-full border-2 border-savage-red/50" />
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Overlay post-grabación */}
        <FullscreenVideoEditor
          visible={editorVisible}
          videoData={capturedVideo}
          spotifyMetadata={spotifyMetadata}
          onClose={discardVideo}
          onSave={handleEditorSave}
          saving={saving}
        />

        {/* PRO Upgrade Modal para usuarios FREE */}
        <ProUpgradeModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="camera"
        />
      </View>
    </GestureHandlerRootView>
  );
}
