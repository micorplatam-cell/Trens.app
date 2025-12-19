import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
  Share,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import {
  X,
  RotateCcw,
  Zap,
  ZapOff,
  Scissors,
  Palette,
  Type,
  Check,
  Eye,
  EyeOff,
  Share2,
  Crosshair,
  Music,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import { Audio } from 'expo-av';
import { VideoView, useVideoPlayer } from 'expo-video';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../lib/supabase';
import { useAuth, useProContext } from '../../_layout';
import spotify, { SpotifyTrack } from '../../../services/spotify/spotify';

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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const { user } = useAuth();
  const { context: proContext, clearContext } = useProContext();

  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef<any>(null);

  // Video Data
  const [capturedVideo, setCapturedVideo] = useState<VideoData | null>(null);

  // The Lab State (Editor)
  const [labVisible, setLabVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('RAW');
  const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 100 });
  const [showTrimTool, setShowTrimTool] = useState(false);

  // Data Overlay Inputs (Contexto Táctico)
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  // Texto libre (Contexto Libre)
  const [freeText, setFreeText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // Publicación
  const [isPublic, setIsPublic] = useState(true); // Default: Visible en TRENS
  const [saving, setSaving] = useState(false);

  // Spotify State
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyMetadata, setSpotifyMetadata] = useState<SpotifyMetadata | null>(null);
  const [attachSpotify, setAttachSpotify] = useState(true); // Toggle para adjuntar música

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // Breathing animation
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
  // AUDIO NON-STOP + SPOTIFY CHECK
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Configurar audio para NO interrumpir música del sistema
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          // MixWithOthers permite que la música siga sonando
          interruptionModeIOS: 1, // DoNotMix = 0, DuckOthers = 1, MixWithOthers = 2
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1, // DoNotMix = 0, DuckOthers = 1
          playThroughEarpieceAndroid: false,
        });
        console.warn('🎧 PRO: Audio configurado para no interrumpir música');
      } catch (error) {
        console.error('Error configurando audio:', error);
      }
    };

    // Verificar conexión de Spotify
    const checkSpotify = async () => {
      const connected = await spotify.loadStoredTokens();
      setSpotifyConnected(connected);
    };

    setupAudio();
    checkSpotify();
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
  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setCameraVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [permission, requestPermission]);

  const closeCamera = () => {
    if (isRecording) {
      stopRecording();
    }
    setCameraVisible(false);
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

    // 🎧 CAPTURAR METADATA DE SPOTIFY AL INICIAR GRABACIÓN
    if (spotifyConnected) {
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
          console.warn('🎵 PRO: Capturada metadata de Spotify:', currentTrack.name);
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
      setCameraVisible(false);
      setLabVisible(true);
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
  // LAB HANDLERS
  // -------------------------------------------------------------------------
  const discardVideo = () => {
    setCapturedVideo(null);
    setLabVisible(false);
    setSelectedFilter('RAW');
    setTrimRange({ start: 0, end: 100 });
    setWeight('');
    setReps('');
    setFreeText('');
    setShowTrimTool(false);
    setShowTextInput(false);
    setSpotifyMetadata(null); // Limpiar metadata de Spotify
    setAttachSpotify(true); // Reset toggle
    clearContext(); // Limpiar contexto táctico
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const retryRecording = () => {
    discardVideo();
    openCamera();
  };

  // -------------------------------------------------------------------------
  // SAVE HANDLERS
  // -------------------------------------------------------------------------
  const saveVideo = async (share: boolean = false) => {
    if (!capturedVideo || !user) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. LEER EL ARCHIVO DE VIDEO
      const videoUri = capturedVideo.uri;
      const fileInfo = await FileSystem.getInfoAsync(videoUri);

      if (!fileInfo.exists) {
        throw new Error('El archivo de video no existe');
      }

      // 2. CONVERTIR A BASE64 Y SUBIR A SUPABASE STORAGE
      const base64 = await FileSystem.readAsStringAsync(videoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileName = `${user.id}/${Date.now()}.mp4`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pro-videos')
        .upload(fileName, decode(base64), {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error subiendo video:', uploadError);
        throw uploadError;
      }

      // 3. OBTENER URL PÚBLICA
      const { data: urlData } = supabase.storage.from('pro-videos').getPublicUrl(fileName);

      const videoUrl = urlData.publicUrl;

      // 4. GUARDAR EN TABLA pro_videos
      const { data: insertData, error: insertError } = await supabase
        .from('pro_videos')
        .insert({
          user_id: user.id,
          video_url: videoUrl,
          thumbnail_url: videoUrl, // Usar video URL como thumbnail (el player mostrará el primer frame)
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
          is_public: isPublic,
          trim_start_percent: Math.round(trimRange.start),
          trim_end_percent: Math.round(trimRange.end),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error guardando en DB:', insertError);
        throw insertError;
      }

      console.warn('📹 PRO: Video guardado exitosamente:', insertData);

      // 5. COMPARTIR SI SE SOLICITA
      if (share) {
        const spotifyInfo =
          attachSpotify && spotifyMetadata
            ? `\n🎵 ${spotifyMetadata.trackName} – ${spotifyMetadata.artist}`
            : '';
        await Share.share({
          message:
            proContext.type === 'tactical'
              ? `🏋️ ${proContext.exerciseName || 'Entrenamiento'} - ${weight}kg x ${reps} reps${spotifyInfo}`
              : `💪 ${freeText || 'Check de entrenamiento'}${spotifyInfo}`,
          url: videoUrl, // URL pública de Supabase
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
  const renderCamera = () => (
    <Modal visible={cameraVisible} animationType="slide" presentationStyle="fullScreen">
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={cameraFacing}
          mode="video"
          flash={flashMode}
        >
          {/* HUD SUPERIOR */}
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            className="absolute top-0 left-0 right-0 h-28"
          />
          <View className="absolute top-14 left-0 right-0 px-4 flex-row justify-between items-center">
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
              <TouchableOpacity onPress={closeCamera} className="bg-black/40 p-2 rounded-full">
                <X color="#FFFFFF" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          {/* CONTADOR TIEMPO (Solo grabando) */}
          {isRecording && (
            <View className="absolute top-32 left-0 right-0 items-center">
              <View className="bg-black/60 px-4 py-2 rounded-full">
                <Text className="text-white font-mono font-bold text-lg">
                  {formatTime(recordingTime)}
                </Text>
              </View>
            </View>
          )}

          {/* 🎧 SPOTIFY INDICATOR (Solo si hay música capturada durante grabación) */}
          {isRecording && spotifyMetadata && (
            <View className="absolute top-44 left-4 right-4">
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
          <View className="absolute bottom-12 left-0 right-0 items-center">
            {/* SHUTTER BUTTON */}
            <Animated.View style={shutterAnimatedStyle}>
              <TouchableOpacity
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.8}
              >
                {/* Anillo Exterior */}
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
                  {/* Centro */}
                  {isRecording ? (
                    // Estado Grabando: Cuadrado rojo sólido
                    <View className="w-8 h-8 bg-savage-red rounded-md" />
                  ) : (
                    // Estado Reposo: Centro transparente
                    <View className="w-16 h-16 rounded-full border-2 border-savage-red/50" />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );

  // -------------------------------------------------------------------------
  // RENDER: THE LAB (POST-PRODUCCIÓN)
  // -------------------------------------------------------------------------
  const renderLab = () => (
    <Modal visible={labVisible} animationType="fade" presentationStyle="fullScreen">
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

          {/* DATA OVERLAY */}
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
              // CASO GYM: Peso y Reps
              <View className="absolute bottom-48 left-0 right-0 flex-row justify-center gap-6 pointer-events-auto">
                {/* PESO */}
                <TouchableOpacity
                  className="bg-black/70 border-2 border-savage-red rounded-xl px-6 py-4 items-center min-w-[120px]"
                  onPress={() => {
                    /* Abrir teclado */
                  }}
                >
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
                </TouchableOpacity>

                {/* REPS */}
                <TouchableOpacity
                  className="bg-black/70 border-2 border-savage-red rounded-xl px-6 py-4 items-center min-w-[120px]"
                  onPress={() => {
                    /* Abrir teclado */
                  }}
                >
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
                </TouchableOpacity>
              </View>
            ) : (
              // CASO LIBRE: Texto
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

          {/* BOTÓN DESCARTAR (Esquina superior derecha) */}
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
                {/* Timeline visual simplificada */}
                <View
                  className="absolute top-0 bottom-0 bg-savage-red/30"
                  style={{
                    left: `${trimRange.start}%`,
                    right: `${100 - trimRange.end}%`,
                  }}
                />
                {/* Manijas */}
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

        {/* FOOTER DE PUBLICACIÓN */}
        <View className="bg-zinc-950 border-t border-zinc-800 px-4 py-4 pb-8">
          {/* 🎧 TOGGLE ADJUNTAR MÚSICA (Solo si hay metadata de Spotify) */}
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

          {/* CONTROL DE PRIVACIDAD */}
          <TouchableOpacity
            onPress={() => setIsPublic(!isPublic)}
            className="flex-row items-center mb-4"
          >
            <View
              className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
                isPublic ? 'bg-savage-red border-savage-red' : 'border-zinc-600'
              }`}
            >
              {isPublic && <Check color="#FFFFFF" size={14} />}
            </View>
            <View className="flex-row items-center">
              {isPublic ? <Eye color="#FFFFFF" size={16} /> : <EyeOff color="#71717A" size={16} />}
              <Text className={`ml-2 font-bold ${isPublic ? 'text-white' : 'text-zinc-500'}`}>
                VISIBLE EN [ TRENS ]
              </Text>
            </View>
          </TouchableOpacity>

          {/* BOTONES DE ACCIÓN */}
          <View className="flex-row gap-3">
            {/* REGISTRAR */}
            <TouchableOpacity
              onPress={() => saveVideo(false)}
              disabled={saving}
              className="flex-1 bg-zinc-800 border border-savage-red/30 p-4 rounded-xl items-center"
            >
              {saving ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text className="text-white font-bold">REGISTRAR</Text>
              )}
            </TouchableOpacity>

            {/* REGISTRAR Y COMPARTIR */}
            <TouchableOpacity
              onPress={() => saveVideo(true)}
              disabled={saving}
              className="flex-1 bg-savage-red p-4 rounded-xl flex-row items-center justify-center"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Share2 color="#FFFFFF" size={18} />
                  <Text className="text-white font-bold ml-2">COMPARTIR</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // -------------------------------------------------------------------------
  // RENDER: MAIN SCREEN
  // -------------------------------------------------------------------------
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-savage-black">
        {/* Header */}
        <LinearGradient
          colors={['#000000', 'transparent']}
          className="absolute top-0 left-0 right-0 z-10 pt-14 pb-8 px-6"
        >
          <Text className="text-white text-2xl font-bold tracking-wider">PRO</Text>
          <Text className="text-zinc-500 text-sm">Documenta tu entrenamiento</Text>
        </LinearGradient>

        {/* Main Content */}
        <View className="flex-1 justify-center items-center px-6">
          {/* Glow Effect */}
          <View
            className="absolute w-72 h-72 rounded-full bg-savage-red opacity-10"
            style={{
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 120,
            }}
          />

          {/* Contexto Actual */}
          <View className="bg-zinc-900/80 border border-zinc-800 rounded-full px-4 py-2 mb-8">
            <Text className="text-zinc-400 text-sm">🔴 {getContextLabel()}</Text>
          </View>

          {/* SHUTTER BUTTON - Central */}
          <TouchableOpacity onPress={openCamera} activeOpacity={0.8} className="mb-8">
            <View
              className="w-32 h-32 rounded-full items-center justify-center"
              style={{
                borderWidth: 4,
                borderColor: '#DC2626',
                shadowColor: '#DC2626',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.6,
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              <Crosshair color="#DC2626" size={48} />
            </View>
          </TouchableOpacity>

          <Text className="text-white text-lg font-bold mb-2">DISPARAR</Text>
          <Text className="text-zinc-500 text-center text-sm">
            Toca para abrir la cámara{'\n'}y empezar a grabar
          </Text>
        </View>

        {/* Modals */}
        {renderCamera()}
        {renderLab()}
      </View>
    </GestureHandlerRootView>
  );
}
