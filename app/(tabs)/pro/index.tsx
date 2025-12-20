import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Share,
  Switch,
} from 'react-native';
import {
  X,
  RotateCcw,
  Zap,
  ZapOff,
  Scissors,
  Palette,
  Type,
  Eye,
  Share2,
  Crosshair,
  Music,
  Volume2,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import { Audio } from 'expo-av';
import { VideoView, useVideoPlayer } from 'expo-video';
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
import { ProUpgradeModal } from '../../../components/pro/ProUpgradeModal';
import spotify from '../../../services/spotify/spotify';
import cloudflareStream from '../../../services/cloudflare/stream';

// ============================================================================
// TIPOS
// ============================================================================
type FilterType = 'RAW' | 'CONTRAST' | 'SAVAGE' | 'CHROME';

interface VideoData {
  uri: string;
  duration: number;
  timestamp: Date;
}

interface TrimRange {
  start: number;
  end: number;
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
// CONSTANTES
// ============================================================================
const FILTERS: { id: FilterType; name: string; style: object }[] = [
  { id: 'RAW', name: 'RAW', style: {} },
  { id: 'CONTRAST', name: 'B&N', style: { filter: 'grayscale(1) contrast(1.3)' } },
  { id: 'SAVAGE', name: 'SAVAGE', style: { filter: 'saturate(0.7) hue-rotate(-10deg)' } },
  { id: 'CHROME', name: 'CHROME', style: { filter: 'saturate(1.2) hue-rotate(180deg)' } },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ProScreen() {
  const { user, isPro, isFree, permissions, spotifyPremium, spotifyConnected } =
    useUserRoleContext();
  const { context: proContext, clearContext } = useProContext();

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

  // Post-Recording Overlay State
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('RAW');
  const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 100 });
  const [showTrimTool, setShowTrimTool] = useState(false);

  // Data Overlay Inputs (Contexto Táctico)
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  // Texto libre (Contexto Libre)
  const [freeText, setFreeText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // Publicación - Switch principal según MASTER
  // true = Publicar en TRENS (Público)
  // false = Guardar en la Bóveda (Privado)
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  // Spotify State
  const [spotifyMetadata, setSpotifyMetadata] = useState<SpotifyMetadata | null>(null);
  const [attachSpotify, setAttachSpotify] = useState(true);

  // Audio Mode: 'spotify' | 'ambient'
  const [audioMode, setAudioMode] = useState<'spotify' | 'ambient'>('spotify');

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Capturar metadata de Spotify al montar (solo PRO)
  useEffect(() => {
    const captureSpotifyMetadata = async () => {
      if (isPro && spotifyConnected && spotifyPremium) {
        try {
          const currentTrack = await spotify.getCurrentTrack();
          if (currentTrack) {
            setSpotifyMetadata({
              enabled: true,
              trackUri: currentTrack.uri,
              positionMs: currentTrack.positionMs,
              trackName: currentTrack.name,
              artist: currentTrack.artist,
              albumArt: currentTrack.albumArt,
            });
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

  // Video Player
  const videoPlayer = useVideoPlayer(capturedVideo?.uri || '', (player) => {
    player.loop = true;
  });

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
      setOverlayVisible(true); // Mostrar overlay post-grabación
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
  // OVERLAY HANDLERS
  // -------------------------------------------------------------------------
  const discardVideo = () => {
    setCapturedVideo(null);
    setOverlayVisible(false);
    setSelectedFilter('RAW');
    setTrimRange({ start: 0, end: 100 });
    setWeight('');
    setReps('');
    setFreeText('');
    setShowTrimTool(false);
    setShowTextInput(false);
    setSpotifyMetadata(null);
    setAttachSpotify(true);
    setIsPublic(true);
    clearContext();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // -------------------------------------------------------------------------
  // SAVE/SHARE HANDLERS - Según MASTER
  // Al compartir: El video se guarda + respeta Público/Bóveda
  // FREE puede grabar pero NO guardar/compartir
  // USA CLOUDFLARE STREAM para transcoding y adaptive bitrate
  // -------------------------------------------------------------------------
  const saveVideo = async (share: boolean = false) => {
    // Si es FREE, mostrar modal de upgrade
    if (isFree || !permissions.canPublish) {
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
        isPublic: isPublic,
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
          video_url: playbackUrls.hls, // URL HLS para adaptive bitrate
          thumbnail_url: playbackUrls.thumbnail, // Thumbnail automático
          cloudflare_video_id: uploadResult.videoId, // ID de Cloudflare Stream
          duration_seconds: Math.round(capturedVideo.duration),
          context_type: proContext.type,
          exercise_id: proContext.type === 'tactical' ? proContext.exerciseId : null,
          exercise_name: proContext.type === 'tactical' ? proContext.exerciseName : null,
          weight_kg: weight ? parseFloat(weight) : null,
          reps: reps ? parseInt(reps) : null,
          free_text: proContext.type === 'free' ? freeText : null,
          filter: selectedFilter,
          spotify:
            attachSpotify && spotifyMetadata
              ? {
                  enabled: true,
                  trackUri: spotifyMetadata.trackUri,
                  positionMs: spotifyMetadata.positionMs,
                  trackName: spotifyMetadata.trackName,
                  artist: spotifyMetadata.artist,
                }
              : { enabled: false },
          ambient_audio: true,
          is_public: isPublic, // Según switch: Público o Bóveda
          trim_start_percent: Math.round(trimRange.start),
          trim_end_percent: Math.round(trimRange.end),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error guardando en DB:', insertError);
        throw insertError;
      }

      // 4. COMPARTIR SI SE SOLICITA
      // El video se guarda Y se comparte, respetando Público/Bóveda
      if (share) {
        // Generar mensaje con metadata quemada
        const exerciseInfo =
          proContext.type === 'tactical' && proContext.exerciseName
            ? proContext.exerciseName
            : 'Entrenamiento';
        const weightInfo = weight ? `${weight}kg` : '';
        const repsInfo = reps ? `x${reps}` : '';
        const dateInfo = new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const spotifyInfo =
          attachSpotify && spotifyMetadata
            ? `\n🎵 ${spotifyMetadata.trackName} – ${spotifyMetadata.artist}`
            : '';

        const shareMessage =
          proContext.type === 'tactical'
            ? `🏋️ ${exerciseInfo} ${weightInfo} ${repsInfo}\n📅 ${dateInfo}${spotifyInfo}\n\n#TRENS`
            : `💪 ${freeText || 'Día de entreno'}\n📅 ${dateInfo}${spotifyInfo}\n\n#TRENS`;

        await Share.share({
          message: shareMessage,
          url: playbackUrls.hls,
        });
      }

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

  const getCurrentDate = (): string => {
    const now = new Date();
    return now
      .toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase();
  };

  // -------------------------------------------------------------------------
  // RENDER: CAMERA (VIEWFINDER)
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // RENDER: POST-RECORDING OVERLAY (No pantalla nueva, es OVERLAY)
  // -------------------------------------------------------------------------
  const renderOverlay = () => (
    <Modal visible={overlayVisible} animationType="fade" presentationStyle="fullScreen">
      <View className="flex-1 bg-black">
        {/* VIDEO PREVIEW */}
        <View className="flex-1">
          {capturedVideo && (
            <VideoView
              player={videoPlayer}
              style={{ flex: 1 }}
              contentFit="contain"
              nativeControls={false}
            />
          )}

          {/* DATA OVERLAY - Metadata quemada sobre el video */}
          <View className="absolute inset-0 pointer-events-box-none">
            {/* Logo TRENS + Fecha (Esquina superior izquierda) */}
            <View className="absolute top-14 left-4">
              <Text className="text-white font-bold text-xs tracking-widest opacity-80">
                [ TRENS ]
              </Text>
              <Text className="text-zinc-400 text-xs font-mono mt-1">{getCurrentDate()}</Text>
            </View>

            {/* INPUTS CONTEXTUALES */}
            {proContext.type === 'tactical' ? (
              <View className="absolute bottom-48 left-0 right-0 flex-row justify-center gap-6 pointer-events-auto">
                {/* PESO */}
                <View className="bg-black/70 border-2 border-savage-red rounded-xl px-6 py-4 items-center min-w-[120px]">
                  <Text className="text-zinc-500 text-xs mb-1">PESO</Text>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="0"
                    placeholderTextColor="#DC2626"
                    keyboardType="numeric"
                    className="text-savage-red text-3xl font-bold font-mono text-center"
                    style={{ minWidth: 60 }}
                  />
                  <Text className="text-zinc-500 text-xs mt-1">kg</Text>
                </View>

                {/* REPS */}
                <View className="bg-black/70 border-2 border-savage-red rounded-xl px-6 py-4 items-center min-w-[120px]">
                  <Text className="text-zinc-500 text-xs mb-1">REPS</Text>
                  <TextInput
                    value={reps}
                    onChangeText={setReps}
                    placeholder="0"
                    placeholderTextColor="#DC2626"
                    keyboardType="numeric"
                    className="text-savage-red text-3xl font-bold font-mono text-center"
                    style={{ minWidth: 60 }}
                  />
                </View>
              </View>
            ) : (
              showTextInput && (
                <View className="absolute bottom-48 left-4 right-4 pointer-events-auto">
                  <TextInput
                    value={freeText}
                    onChangeText={setFreeText}
                    placeholder="Escribe una nota..."
                    placeholderTextColor="#71717A"
                    multiline
                    className="bg-black/70 border border-zinc-700 rounded-xl p-4 text-white text-lg"
                    style={{ maxHeight: 120 }}
                  />
                </View>
              )
            )}
          </View>

          {/* BOTÓN DESCARTAR */}
          <TouchableOpacity
            onPress={discardVideo}
            className="absolute top-14 right-4 bg-black/60 p-3 rounded-full"
          >
            <X color="#EF4444" size={24} />
          </TouchableOpacity>
        </View>

        {/* BARRA DE HERRAMIENTAS */}
        <View className="bg-zinc-950 border-t border-zinc-800 px-4 py-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-4">
              {/* TRIM */}
              <TouchableOpacity
                onPress={() => setShowTrimTool(!showTrimTool)}
                className={`items-center px-4 py-2 rounded-lg ${showTrimTool ? 'bg-savage-red' : 'bg-zinc-800'}`}
              >
                <Scissors color="#FFFFFF" size={20} />
                <Text className="text-white text-xs mt-1">TRIM</Text>
              </TouchableOpacity>

              {/* FILTROS */}
              {FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => {
                    setSelectedFilter(filter.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`items-center px-4 py-2 rounded-lg ${
                    selectedFilter === filter.id ? 'bg-savage-red' : 'bg-zinc-800'
                  }`}
                >
                  <Palette color="#FFFFFF" size={20} />
                  <Text className="text-white text-xs mt-1">{filter.name}</Text>
                </TouchableOpacity>
              ))}

              {/* TEXTO (Solo contexto libre) */}
              {proContext.type === 'free' && (
                <TouchableOpacity
                  onPress={() => setShowTextInput(!showTextInput)}
                  className={`items-center px-4 py-2 rounded-lg ${showTextInput ? 'bg-savage-red' : 'bg-zinc-800'}`}
                >
                  <Type color="#FFFFFF" size={20} />
                  <Text className="text-white text-xs mt-1">TEXTO</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* TRIM TIMELINE */}
          {showTrimTool && (
            <View className="mb-4">
              <View className="h-12 bg-zinc-800 rounded-lg overflow-hidden relative">
                <View
                  className="absolute top-0 bottom-0 bg-savage-red/30"
                  style={{
                    left: `${trimRange.start}%`,
                    right: `${100 - trimRange.end}%`,
                  }}
                />
                <View
                  className="absolute top-0 bottom-0 w-1 bg-savage-red"
                  style={{ left: `${trimRange.start}%` }}
                />
                <View
                  className="absolute top-0 bottom-0 w-1 bg-savage-red"
                  style={{ left: `${trimRange.end}%` }}
                />
              </View>
              <Text className="text-zinc-500 text-xs text-center mt-2">
                Arrastra las manijas para recortar
              </Text>
            </View>
          )}
        </View>

        {/* FOOTER DE PUBLICACIÓN - Según MASTER */}
        <View className="bg-zinc-950 border-t border-zinc-800 px-4 py-4 pb-8">
          {/* SPOTIFY TOGGLE (Si hay metadata) */}
          {spotifyMetadata && (
            <View className="bg-black/50 rounded-xl p-3 mb-4 border border-zinc-800">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-green-500 rounded-lg items-center justify-center mr-3">
                    <Music color="#000" size={18} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>
                      {spotifyMetadata.trackName}
                    </Text>
                    <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                      {spotifyMetadata.artist}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={attachSpotify}
                  onValueChange={setAttachSpotify}
                  trackColor={{ false: '#3f3f46', true: '#1DB954' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Text className="text-zinc-500 text-xs mt-2">
                {attachSpotify ? '🎵 La canción se adjuntará al video' : '🔇 Sin música adjunta'}
              </Text>
            </View>
          )}

          {/* SWITCH PRINCIPAL: Público / Bóveda */}
          <View className="bg-zinc-900 rounded-xl p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                {isPublic ? <Eye color="#DC2626" size={24} /> : <Lock color="#71717A" size={24} />}
                <View className="ml-3 flex-1">
                  <Text className={`font-bold ${isPublic ? 'text-white' : 'text-zinc-500'}`}>
                    {isPublic ? 'PUBLICAR EN TRENS' : 'GUARDAR EN LA BÓVEDA'}
                  </Text>
                  <Text className="text-zinc-500 text-xs mt-1">
                    {isPublic ? 'Visible en el feed público' : 'Solo tú puedes verlo'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#3f3f46', true: '#DC2626' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* BOTÓN COMPARTIR - Según MASTER */}
          <TouchableOpacity
            onPress={() => saveVideo(true)}
            disabled={saving}
            className="bg-savage-red p-4 rounded-xl flex-row items-center justify-center mb-3"
            style={{
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Share2 color="#FFFFFF" size={20} />
                <Text className="text-white font-bold text-lg ml-2 tracking-wider">COMPARTIR</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Botón secundario: Solo guardar */}
          <TouchableOpacity
            onPress={() => saveVideo(false)}
            disabled={saving}
            className="bg-zinc-800 border border-zinc-700 p-3 rounded-xl items-center"
          >
            {saving ? (
              <ActivityIndicator color="#DC2626" size="small" />
            ) : (
              <Text className="text-zinc-400 font-bold text-sm">
                {isPublic ? 'PUBLICAR SIN COMPARTIR' : 'GUARDAR EN BÓVEDA'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
        {renderOverlay()}

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
