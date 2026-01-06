import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Sharing from 'expo-sharing';
import { RotateCcw, Zap, ZapOff, Music, Lock } from 'lucide-react-native';
import { PWAGuard } from '../../../components/auth/PWAGuard';
import * as Haptics from 'expo-haptics';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import { Audio } from 'expo-av';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
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
import { useProRecording } from '../../../context/ProRecordingContext';
import { useHank } from '../../../context/HankContext';
import { useSaveGuard } from '../../_layout';
import { ProUpgradeModal } from '../../../components/pro/ProUpgradeModal';
import { FullscreenVideoEditor } from '../../../components/pro/FullscreenVideoEditor';
import { PRNotificationModal } from '../../../components/pro/PRNotificationModal';
import spotify from '../../../services/spotify/spotify';
import cloudflareStream from '../../../services/cloudflare/stream';
import { detectRecordsForNewVideo } from '../../../services/records/recordDetection';
import type { RecordDetectionResult } from '../../../types/records';

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
  durationMs?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function ProScreenContent() {
  const { user, isPro, spotifyPremium, spotifyConnected } = useUserRoleContext();
  const { context: proContext, clearContext } = useProContext();
  const { registerHandlers, setRecordingState, setSpotifyState, setExerciseState } =
    useProRecording();
  const { triggerRefresh, setScreenContext } = useHank();
  const { canSave } = useSaveGuard();

  // Sincronizar contexto con HANK
  useFocusEffect(
    useCallback(() => {
      setScreenContext({
        module: 'pro',
        viewMode: proContext.type || 'free',
        currentExerciseIndex: null,
        currentTrainingDay: 0,
      });
    }, [proContext.type, setScreenContext])
  );

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
  const [keepSpotifyPlaying, setKeepSpotifyPlaying] = useState(false); // No pausar Spotify al cerrar editor

  // Spotify State - solo para auto-detección inicial
  const [spotifyMetadata, setSpotifyMetadata] = useState<SpotifyMetadata | null>(null);

  // Toast de confirmación
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState('');

  // PR Notification State
  const [prResult, setPrResult] = useState<RecordDetectionResult | null>(null);
  const [showPRModal, setShowPRModal] = useState(false);

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeRef = useRef(0);

  // Capturar metadata de Spotify al montar y actualizar periódicamente
  useEffect(() => {
    const captureSpotifyMetadata = async () => {
      if (spotifyConnected && spotifyPremium) {
        try {
          const playbackState = await spotify.getPlaybackState();
          // Solo capturar si está REPRODUCIENDO activamente
          if (playbackState?.isPlaying && playbackState.track) {
            const track = playbackState.track;
            setSpotifyMetadata((prev) => {
              // Solo actualizar si cambió la canción
              if (prev?.trackUri !== track.uri) {
                return {
                  enabled: true,
                  trackUri: track.uri,
                  positionMs: track.positionMs || 0,
                  trackName: track.name,
                  artist: track.artist,
                  albumArt: track.albumArt,
                  durationMs: track.durationMs || 240000,
                };
              }
              return prev;
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

    // Capturar inmediatamente
    captureSpotifyMetadata();

    // Actualizar cada 2 segundos (para detectar cambios de canción)
    const interval = setInterval(captureSpotifyMetadata, 2000);

    return () => clearInterval(interval);
  }, [spotifyConnected, spotifyPremium]);

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
  // AUDIO SETUP - Permitir que Spotify siga reproduciéndose
  // -------------------------------------------------------------------------
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: 2, // MixWithOthers - NO interrumpe Spotify
          shouldDuckAndroid: false, // NO reducir volumen en Android
          interruptionModeAndroid: 2, // DoNotMix pero no interrumpir
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

    // 🎵 Capturar metadata de Spotify JUSTO ANTES de grabar
    // SOLO si está REPRODUCIENDO activamente (no en pausa)
    if (spotifyConnected && spotifyPremium) {
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
            durationMs: playbackState.track.durationMs || 240000,
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
    recordingTimeRef.current = 0;
    timerRef.current = setInterval(() => {
      recordingTimeRef.current += 1;
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Usar el ref para obtener la duración exacta (mínimo 1 segundo)
      const finalDuration = Math.max(1, recordingTimeRef.current);
      console.log('🎬 Video grabado, duración:', finalDuration, 'segundos');

      setCapturedVideo({
        uri: video.uri,
        duration: finalDuration,
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

  // Refs para las funciones (para que el contexto siempre tenga la versión actual)
  const startRecordingRef = useRef(startRecording);
  const stopRecordingRef = useRef(stopRecording);

  useEffect(() => {
    startRecordingRef.current = startRecording;
    stopRecordingRef.current = stopRecording;
  });

  // -------------------------------------------------------------------------
  // SINCRONIZAR CON CONTEXTO GLOBAL DE GRABACIÓN
  // -------------------------------------------------------------------------

  // Registrar handlers en el contexto global (una sola vez)
  useEffect(() => {
    registerHandlers({
      start: () => startRecordingRef.current(),
      stop: () => stopRecordingRef.current(),
    });
  }, [registerHandlers]);

  // Sincronizar estado de grabación con contexto
  useEffect(() => {
    setRecordingState(isRecording, recordingTime);
  }, [isRecording, recordingTime, setRecordingState]);

  // Sincronizar estado de Spotify con contexto
  useEffect(() => {
    setSpotifyState(!!spotifyMetadata);
  }, [spotifyMetadata, setSpotifyState]);

  // Sincronizar nombre del ejercicio con contexto
  useEffect(() => {
    const name = proContext.type === 'tactical' ? proContext.exerciseName || null : null;
    setExerciseState(name);
  }, [proContext, setExerciseState]);

  // -------------------------------------------------------------------------
  // EDITOR HANDLERS
  // -------------------------------------------------------------------------
  const discardVideo = () => {
    setCapturedVideo(null);
    setEditorVisible(false);
    setSpotifyMetadata(null);
    clearContext();
    // Reset keepSpotifyPlaying después de cerrar (para próximo uso)
    setTimeout(() => setKeepSpotifyPlaying(false), 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // -------------------------------------------------------------------------
  // SAVE/SHARE HANDLERS - Usa Cloudflare Stream
  // -------------------------------------------------------------------------
  const handleEditorSave = async (data: {
    videoTrimStart: number;
    videoTrimEnd: number;
    spotifyTrack: SpotifyMetadata | null;
    isPublic: boolean;
    weightKg: number | null;
    reps: number | null;
    caption: string | null;
  }) => {
    // Guard: Verificar si puede guardar (muestra modal persuasivo)
    if (!canSave('save_video_pro')) return;

    if (!capturedVideo || !user) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // DEBUG: Verificar qué contexto tenemos
    console.log('📹 GUARDANDO VIDEO - ProContext:', {
      type: proContext.type,
      exerciseId: proContext.exerciseId,
      exerciseName: proContext.exerciseName,
      exerciseNotes: proContext.exerciseNotes,
      exerciseTags: proContext.exerciseTags,
    });

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
          exercise_notes: proContext.type === 'tactical' ? proContext.exerciseNotes : null,
          tags: proContext.type === 'tactical' ? proContext.exerciseTags : null,
          weight_kg: data.weightKg,
          reps: data.reps,
          free_text: data.caption,
          spotify: data.spotifyTrack
            ? {
                enabled: true,
                trackUri: data.spotifyTrack.trackUri,
                positionMs: data.spotifyTrack.positionMs,
                trackName: data.spotifyTrack.trackName,
                artist: data.spotifyTrack.artist,
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

      // 4. DETECTAR RÉCORDS PERSONALES (PRs)
      // Solo para videos tácticos con peso y reps
      if (
        proContext.type === 'tactical' &&
        proContext.exerciseId &&
        proContext.exerciseName &&
        data.weightKg &&
        data.reps
      ) {
        try {
          const recordResult = await detectRecordsForNewVideo(
            user.id,
            proContext.exerciseId,
            proContext.exerciseName,
            data.weightKg,
            data.reps
          );

          if (recordResult.hasRecord) {
            console.log('🏆 PR DETECTADO:', recordResult.primaryRecord?.type);
            setPrResult(recordResult);
            setShowPRModal(true);
          }
        } catch (prError) {
          console.warn('Error detectando PRs:', prError);
          // No bloquear el flujo si falla la detección de PRs
        }
      }

      // 5. COMPARTIR SI ES PÚBLICO
      if (data.isPublic && capturedVideo?.uri) {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          const exerciseInfo =
            proContext.type === 'tactical' && proContext.exerciseName
              ? proContext.exerciseName
              : 'Entrenamiento';
          const spotifyInfo = data.spotifyTrack ? ` 🎵 ${data.spotifyTrack.trackName}` : '';

          await Sharing.shareAsync(capturedVideo.uri, {
            mimeType: 'video/mp4',
            dialogTitle: `🏋️ ${exerciseInfo}${spotifyInfo} #TRENS`,
          });
        }
      }

      triggerRefresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Mostrar toast de confirmación
      const exerciseInfo =
        proContext.type === 'tactical' && proContext.exerciseName
          ? proContext.exerciseName
          : 'Entrenamiento';
      setSaveToastMessage(`✅ Video guardado: ${exerciseInfo}`);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);

      // Mantener Spotify sonando después de guardar
      setKeepSpotifyPlaying(true);
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
    // Debug log
    console.log('🎬 PRO Context:', JSON.stringify(proContext));

    if (proContext.type === 'tactical' && proContext.exerciseName) {
      return `🔥 ${proContext.exerciseName.toUpperCase()}`;
    }
    return '🔥 CÁMARA LIBRE';
  };

  // -------------------------------------------------------------------------
  // RENDER: MAIN SCREEN - CÁMARA EN VIVO PERMANENTE - ED HARDY FIRE STYLE
  // -------------------------------------------------------------------------

  // Pedir permisos si no están concedidos
  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <View
          style={{
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
          }}
        >
          <Lock color="#F97316" size={64} />
        </View>
        <Text
          className="text-fire-orange text-xl font-bold mb-2 text-center mt-4"
          style={{
            textShadowColor: '#F97316',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
          }}
        >
          🔥 Acceso a Cámara Requerido
        </Text>
        <Text className="text-zinc-400 text-center mb-8">
          PRO necesita acceso a tu cámara para grabar tus entrenamientos
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="px-8 py-4 rounded-full"
          style={{
            backgroundColor: '#0a0000',
            borderWidth: 2,
            borderColor: '#F97316',
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 15,
          }}
        >
          <Text className="text-fire-orange font-bold">PERMITIR ACCESO 🔥</Text>
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

        {/* HUD SUPERIOR - ED HARDY FIRE */}
        <LinearGradient
          colors={['rgba(10,0,0,0.85)', 'transparent']}
          className="absolute top-0 left-0 right-0 h-28"
        />
        <View className="absolute top-14 left-0 right-0 px-4 flex-row justify-between items-center z-10">
          {/* Etiqueta de Contexto (Izquierda) - Fire Style */}
          <View
            className="flex-row items-center px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: 'rgba(10, 0, 0, 0.8)',
              borderWidth: 1,
              borderColor: '#F97316',
            }}
          >
            <Animated.View style={pulseAnimatedStyle}>
              <View
                className="w-3 h-3 bg-fire-orange rounded-full mr-2"
                style={{
                  shadowColor: '#F97316',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                }}
              />
            </Animated.View>
            <Text className="text-fire-orange font-bold text-sm tracking-wide">
              {getContextLabel()}
            </Text>
          </View>

          {/* Herramientas Rápidas (Derecha) */}
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={toggleFlash}
              className="p-2 rounded-full"
              style={{
                backgroundColor: 'rgba(10, 0, 0, 0.8)',
                borderWidth: 1,
                borderColor: flashMode === 'on' ? '#FBBF24' : '#F97316',
              }}
            >
              {getFlashIcon()}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={flipCamera}
              className="p-2 rounded-full"
              style={{
                backgroundColor: 'rgba(10, 0, 0, 0.8)',
                borderWidth: 1,
                borderColor: '#F97316',
              }}
            >
              <RotateCcw color="#F97316" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTADOR TIEMPO (Solo grabando) - ED HARDY */}
        {isRecording && (
          <View className="absolute top-32 left-0 right-0 items-center z-10">
            <View
              className="px-5 py-2 rounded-full"
              style={{
                backgroundColor: 'rgba(10, 0, 0, 0.85)',
                borderWidth: 2,
                borderColor: '#DC2626',
                shadowColor: '#DC2626',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 15,
              }}
            >
              <Text className="text-fire-orange font-mono font-bold text-lg">
                🔥 {formatTime(recordingTime)}
              </Text>
            </View>
          </View>
        )}

        {/* SPOTIFY INDICATOR - Visible en pre-grabación y grabando */}
        {spotifyMetadata && (
          <View className={`absolute ${isRecording ? 'top-44' : 'top-28'} left-4 right-4 z-10`}>
            <View
              className="rounded-xl p-3 flex-row items-center"
              style={{
                backgroundColor: 'rgba(10, 0, 0, 0.85)',
                borderWidth: 1,
                borderColor: '#1DB954',
              }}
            >
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
              <View
                className="px-2 py-1 rounded"
                style={{
                  backgroundColor: isRecording
                    ? 'rgba(30, 215, 96, 0.2)'
                    : 'rgba(30, 215, 96, 0.1)',
                  borderWidth: 1,
                  borderColor: '#1DB954',
                }}
              >
                <Text className="text-green-500 text-xs font-bold">
                  {isRecording ? 'SYNC' : '🎵 DETECTADO'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* GRADIENTE INFERIOR - Solo decorativo, sin botón */}
        <LinearGradient
          colors={['transparent', 'rgba(10,0,0,0.7)']}
          className="absolute bottom-0 left-0 right-0 h-24"
        />

        {/* Overlay post-grabación */}
        <FullscreenVideoEditor
          visible={editorVisible}
          videoData={capturedVideo}
          spotifyMetadata={spotifyMetadata}
          spotifyConnected={spotifyConnected}
          onClose={discardVideo}
          onSave={handleEditorSave}
          saving={saving}
          keepSpotifyPlaying={keepSpotifyPlaying}
        />

        {/* PRO Upgrade Modal para usuarios FREE */}
        <ProUpgradeModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="camera"
        />

        {/* PR NOTIFICATION MODAL - Celebración de récords */}
        <PRNotificationModal
          visible={showPRModal}
          result={prResult}
          onClose={() => {
            setShowPRModal(false);
            setPrResult(null);
          }}
        />

        {/* TOAST DE CONFIRMACIÓN */}
        {showSaveToast && (
          <Animated.View
            className="absolute top-20 left-4 right-4 z-50"
            style={{
              opacity: showSaveToast ? 1 : 0,
            }}
          >
            <View
              className="rounded-xl p-4 flex-row items-center"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.95)',
                borderWidth: 1,
                borderColor: '#22C55E',
                shadowColor: '#22C55E',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
              }}
            >
              <Text className="text-white font-bold text-sm flex-1">{saveToastMessage}</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

export default function ProScreen() {
  return (
    <PWAGuard moduleName="PRO">
      <ProScreenContent />
    </PWAGuard>
  );
}
