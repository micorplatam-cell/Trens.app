import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Modal,
  ScrollView,
  Pressable,
  PanResponder,
  AppState,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { useAuth, useProContext } from '../../_layout';
import {
  Sliders,
  Plus,
  Trash2,
  X,
  Music,
  Timer,
  Edit3,
  Camera as CameraIcon,
  Video,
  ChevronDown,
  Play,
  Pause,
  Eye,
  EyeOff,
  Share2,
  RotateCcw,
  Lock,
  Volume2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { useHank } from '../../../context/HankContext';
import { LinearGradient } from 'expo-linear-gradient';
import spotify, { SpotifyVideoMetadata } from '../../../services/spotify/spotify';
import { useUserRoleContext } from '../../../context/UserRoleContext';
import { useSaveGuard } from '../../_layout';
import cloudflareR2 from '../../../services/cloudflare/r2';

// ============================================================================
// HELPERS
// ============================================================================
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('.mp4') ||
    lowerUrl.includes('.mov') ||
    lowerUrl.includes('.m4v') ||
    lowerUrl.includes('.3gp') ||
    lowerUrl.includes('.webm')
  );
};

const getDayOfWeek = (): DayOfWeek => {
  const days: DayOfWeek[] = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  return days[new Date().getDay()];
};

// ============================================================================
// VIDEO THUMBNAIL - Muestra el primer frame del video
// ============================================================================
const VideoThumbnail = ({
  videoUrl,
  width = 96,
  height = 128,
}: {
  videoUrl: string;
  width?: number;
  height?: number;
}) => {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = true;
    p.pause();
  });

  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

// ============================================================================
// COMPONENTE: VIDEO HERO
// ============================================================================
const VideoHero = ({
  videoUrl,
  videoMuted,
  isActive,
  screenWidth,
}: {
  videoUrl: string;
  videoMuted: boolean;
  isActive: boolean;
  screenWidth: number;
}) => {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
    player.muted = videoMuted;
    // No llamar play() aquí, se controla con isActive
  });

  // Control principal: play/pause basado SOLO en isActive
  React.useEffect(() => {
    if (!player) return;

    if (isActive) {
      player.muted = videoMuted;
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, videoMuted, player]);

  // Reanudar video cuando la app vuelve al foreground (solo si isActive)
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && player && isActive) {
        player.play();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player, isActive]);

  return (
    <VideoView
      style={{ width: screenWidth, aspectRatio: 1 }}
      player={player}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

// ============================================================================
// TYPES
// ============================================================================
type ViewMode = 'LOADING' | 'FOCUS' | 'STRUCTURE';
type SeriesType = 'WARMUP' | 'FEEDER' | 'EFFECTIVE' | 'INTENSITY';
type UserLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';
type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

interface Series {
  id: string;
  type: SeriesType;
  reps: string;
  note?: string;
  weight?: number;
}

interface TrainingDay {
  id: string;
  dayNumber: number; // 1, 2, 3...
  muscleGroups: string; // "Pecho y Tríceps"
  exercises: Exercise[];
}

interface TrainingProgram {
  frequency: number; // 3, 4, 5, 6 días por semana
  days: TrainingDay[];
  lastAccessDate: string | null; // ISO date
  currentDayIndex: number; // 0, 1, 2...
}

interface SeriesConfig {
  id: string;
  reps: number;
  type: 'WARMUP' | 'APPROACH' | 'EFFECTIVE' | 'FAILURE';
  note: string;
  weight: number;
}

interface VideoRecord {
  id: string;
  exercise_id?: string;
  video_url?: string;
  videoUrl?: string; // alias para compatibilidad
  thumbnail_url?: string;
  weight: number;
  reps: number;
  date: string;
  is_public: boolean;
  spotify?: {
    enabled: boolean;
    trackName?: string;
    artist?: string;
    trackUri?: string;
    positionMs?: number;
  };
}

interface Exercise {
  id: string;
  name: string;
  sets: string;
  image_url: string;
  order: number;
  series: Series[];
  videos: VideoRecord[];
  training_days: number[]; // Array de días donde aparece este ejercicio
  alternatives?: ExerciseAlternative[]; // Ejercicios alternativos
}

interface ExerciseAlternative {
  id: string;
  name: string;
  image_url: string;
  videos: VideoRecord[];
  series: Series[];
}

interface AssetTemplate {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  difficulty: string;
  default_metadata: {
    sets: string;
    rest: string;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
// Altura del tab bar (aproximada)
const TAB_BAR_HEIGHT = 80;

export default function GymScreen() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const CONTENT_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;
  const { user } = useAuth();
  const {
    isPro,
    spotifyPremium,
    spotifyConnected: contextSpotifyConnected,
    updateSpotifyStatus,
  } = useUserRoleContext();
  const { setTacticalContext } = useProContext();
  const { canSave } = useSaveGuard();
  const isFocused = useIsFocused(); // Detecta si esta pantalla está activa
  const { setActiveAsset, setScreenContext, refreshTrigger } = useHank();
  const [viewMode, setViewMode] = useState<ViewMode>('LOADING');
  const [exercises, setExercises] = useState<Exercise[]>([]); // Ejercicios del día actual
  const [allUserExercises, setAllUserExercises] = useState<{ name: string; image_url: string }[]>(
    []
  ); // TODOS los ejercicios del usuario
  const [templates, setTemplates] = useState<AssetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);

  // Timer State
  const [timerExpanded, setTimerExpanded] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Modals State
  const [hankModalVisible, setHankModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Spotify State (solo para captura durante grabación)
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [capturedSpotifyMetadata, setCapturedSpotifyMetadata] =
    useState<SpotifyVideoMetadata | null>(null);

  // Helper: Arreglar URLs de Cloudflare Stream incompletas
  const fixCloudflareUrl = (url: string): string => {
    if (!url) return url;
    if (url.includes('cloudflarestream.com') && !url.includes('/manifest/')) {
      return `${url}/manifest/video.m3u8`;
    }
    return url;
  };

  // Video State
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [isVideoManuallyPaused, setIsVideoManuallyPaused] = useState(false);

  // Video Player para historial
  const rawVideoSource = selectedVideo?.videoUrl || selectedVideo?.video_url || '';
  const historialVideoSource = fixCloudflareUrl(rawVideoSource);
  const historialPlayer = useVideoPlayer(historialVideoSource, (player) => {
    player.loop = true;
    // Volumen se controla dinámicamente en el useEffect según Spotify
  });

  // Video Player para preview de video capturado
  const [capturedVideoUri, setCapturedVideoUri] = useState<string | null>(null);
  const videoPlayer = useVideoPlayer(capturedVideoUri || '', (player) => {
    player.loop = true;
  });

  // Play preview video cuando se captura
  useEffect(() => {
    if (capturedVideoUri && videoPlayer) {
      videoPlayer.play();
    }
  }, [capturedVideoUri, videoPlayer]);

  // Ref para rastrear si Spotify ya se sincronizó (evita re-sync al reanudar de pausa)
  const spotifySyncedRef = useRef(false);

  // Controlar play/pause del video cuando abre/cierra el viewer
  useEffect(() => {
    if (videoViewerVisible && historialPlayer) {
      // Determinar si hay Spotify para este video
      const hasSpotify = !!(
        isPro &&
        spotifyPremium &&
        selectedVideo?.spotify?.enabled &&
        selectedVideo?.spotify?.trackUri
      );

      // MUTEAR el video si hay Spotify - solo se escuchará Spotify
      historialPlayer.volume = hasSpotify ? 0 : 1;

      // Reproducir video si no está pausado manualmente
      if (!isVideoManuallyPaused) {
        historialPlayer.play();
      }

      // Solo sincronizar Spotify la PRIMERA vez que se abre el modal
      if (!spotifySyncedRef.current) {
        console.log('🎬 VIDEO VIEWER ABIERTO - Spotify check:', {
          isPro,
          spotifyPremium,
          hasSpotifyData: !!selectedVideo?.spotify,
          spotifyEnabled: selectedVideo?.spotify?.enabled,
          trackUri: selectedVideo?.spotify?.trackUri,
          positionMs: selectedVideo?.spotify?.positionMs,
          videoMuted: hasSpotify,
        });

        if (hasSpotify) {
          spotifySyncedRef.current = true;
          console.log(
            '🎵 SINCRONIZANDO SPOTIFY (video muted):',
            selectedVideo?.spotify?.trackName,
            'desde',
            selectedVideo?.spotify?.positionMs,
            'ms'
          );
          spotify.syncWithVideo(
            selectedVideo!.spotify!.trackUri as string,
            selectedVideo!.spotify!.positionMs || 0
          );
        } else {
          console.log('🔊 Reproduciendo audio ambiente del video');
        }
      }
    } else if (historialPlayer && !videoViewerVisible) {
      historialPlayer.pause();
      setIsVideoManuallyPaused(false); // Reset al cerrar
      spotifySyncedRef.current = false; // Reset para próxima apertura
      // Pausar Spotify al cerrar video viewer
      spotify.pauseForSwipe();
    }
  }, [videoViewerVisible, historialPlayer, selectedVideo, isPro, spotifyPremium]);

  // Handler para tap en el video (pausar/reanudar solo video, NO Spotify)
  const handleHistorialVideoTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsVideoManuallyPaused((prev) => {
      const newPaused = !prev;
      if (newPaused) {
        historialPlayer.pause();
      } else {
        historialPlayer.play();
      }
      return newPaused;
    });
  }, [historialPlayer]);

  // Modal State
  const [historialModalVisible, setHistorialModalVisible] = useState(false);
  const [structureModalVisible, setStructureModalVisible] = useState(false);
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);
  const [exerciseVideos, setExerciseVideos] = useState<VideoRecord[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Camera State
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [captureProcessing, setCaptureProcessing] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref para evitar loops en sincronización de contexto
  const lastSyncedExerciseId = useRef<string | null>(null);

  // Editor State
  const [editorVisible, setEditorVisible] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);

  // Series Config Modal State
  const [seriesConfigModalVisible, setSeriesConfigModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AssetTemplate | null>(null);
  const [seriesConfig, setSeriesConfig] = useState<SeriesConfig[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel>('INTERMEDIATE');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [videoMuted, setVideoMuted] = useState(true);
  const [isPickingFromGallery, setIsPickingFromGallery] = useState(false);

  // Day Name Edit Modal State
  const [dayNameModalVisible, setDayNameModalVisible] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [editingDayName, setEditingDayName] = useState('');

  // Training Program State
  const [trainingProgram, setTrainingProgram] = useState<TrainingProgram>({
    frequency: 3,
    days: [
      { id: '1', dayNumber: 1, muscleGroups: 'Pecho y Espalda', exercises: [] },
      { id: '2', dayNumber: 2, muscleGroups: 'Hombros, Bíceps y Tríceps', exercises: [] },
      { id: '3', dayNumber: 3, muscleGroups: 'Piernas', exercises: [] },
    ],
    lastAccessDate: null,
    currentDayIndex: 0,
  });
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Estado para editar nombre de rutina
  const [editingRoutineName, setEditingRoutineName] = useState(false);
  const [tempRoutineName, setTempRoutineName] = useState('');

  // Video playback control - trackea el ejercicio actualmente visible
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Considera visible si está 50% en pantalla
  });

  // Trackear alternativa activa por cada ejercicio (exerciseIndex -> alternativeIndex)
  const [activeAlternatives, setActiveAlternatives] = useState<Record<number, number>>({});

  // ID del ejercicio actual (puede ser principal o alternativa)
  const [currentVariationId, setCurrentVariationId] = useState<string | null>(null);

  // Auto-repair flag para evitar loops infinitos
  const autoRepairDone = useRef(false);

  // Ref del FlatList para scroll programático
  const exerciseListRef = useRef<FlatList>(null);

  // -------------------------------------------------------------------------
  // SPOTIFY: Cargar estado inicial para captura durante grabación
  // -------------------------------------------------------------------------
  useEffect(() => {
    const initSpotify = async () => {
      // Solo cargar si no está ya conectado en memoria
      if (spotify.isTokenValid()) {
        setSpotifyConnected(true);
        return;
      }

      // Intentar cargar desde storage
      const connected = await spotify.loadStoredTokens();
      setSpotifyConnected(connected);
      if (connected && !contextSpotifyConnected) {
        await updateSpotifyStatus(true, true);
      }
    };
    initSpotify();
  }, [contextSpotifyConnected, updateSpotifyStatus]);

  // -------------------------------------------------------------------------
  // SYNC ACTIVE EXERCISE WITH HANK CONTEXT
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Sincronizar módulo actual con HANK (incluyendo día de entrenamiento)
    if (isFocused) {
      setScreenContext({
        module: 'gym',
        viewMode: viewMode,
        currentExerciseIndex: activeExerciseIndex,
        currentTrainingDay: selectedDayIndex,
      });
    }
  }, [isFocused, viewMode, activeExerciseIndex, selectedDayIndex, setScreenContext]);

  useEffect(() => {
    // Sincronizar ejercicio activo con HANK (considerando alternativas)
    // Y actualizar ProContext para Smart Trigger
    const currentExercise = exercises[activeExerciseIndex];
    if (currentExercise && isFocused && viewMode === 'FOCUS') {
      const altIndex = activeAlternatives[activeExerciseIndex] || 0;

      // Determinar nombre del ejercicio actual (principal o alternativa)
      let exerciseName = currentExercise.name;
      let exerciseId = currentExercise.id;

      // Si altIndex > 0, estamos en una alternativa
      if (
        altIndex > 0 &&
        currentExercise.alternatives &&
        currentExercise.alternatives[altIndex - 1]
      ) {
        // Usar el ID de la alternativa, marcando que ES alternativa
        const alternativeId = currentExercise.alternatives[altIndex - 1].id;
        const alternativeName = currentExercise.alternatives[altIndex - 1].name;
        exerciseId = alternativeId;
        exerciseName = alternativeName;
      }

      // Solo actualizar si el exerciseId realmente cambió (evitar loops)
      if (lastSyncedExerciseId.current !== exerciseId) {
        lastSyncedExerciseId.current = exerciseId;

        // Actualizar HANK context
        if (altIndex > 0 && currentExercise.alternatives?.[altIndex - 1]) {
          console.log('🔄 HANK: Cambiando a alternativa:', exerciseName);
          setActiveAsset(exerciseId, {
            isAlternative: true,
            parentExerciseName: currentExercise.name,
          });
        } else {
          setActiveAsset(currentExercise.id);
        }

        // Actualizar ProContext para Smart Trigger (Contexto Táctico)
        setTacticalContext(exerciseId, exerciseName);
      }
    }
  }, [activeExerciseIndex, exercises, isFocused, activeAlternatives, viewMode, setTacticalContext]);

  // Modal drag state
  const translateYHistorial = useSharedValue(0);
  const translateYStructure = useSharedValue(0);

  const animatedStyleHistorial = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYHistorial.value }],
  }));

  const animatedStyleStructure = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYStructure.value }],
  }));

  const panResponderHistorial = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateYHistorial.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          setHistorialModalVisible(false);
          setTimeout(() => {
            translateYHistorial.value = 0;
          }, 300);
        } else {
          translateYHistorial.value = withSpring(0);
        }
      },
    })
  ).current;

  const panResponderStructure = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateYStructure.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          setStructureModalVisible(false);
          setTimeout(() => {
            translateYStructure.value = 0;
          }, 300);
        } else {
          translateYStructure.value = withSpring(0);
        }
      },
    })
  ).current;

  // Vibración al abrir modales
  useEffect(() => {
    if (historialModalVisible || structureModalVisible) {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 300);
    }
  }, [historialModalVisible, structureModalVisible]);

  // Cargar videos del ejercicio cuando se abre el historial
  useEffect(() => {
    const fetchExerciseVideos = async () => {
      if (!historialModalVisible || !modalExercise) return;

      setLoadingVideos(true);
      try {
        const { data, error } = await supabase
          .from('pro_videos')
          .select('*')
          .eq('exercise_id', modalExercise.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Mapear a formato VideoRecord
        const mappedVideos: VideoRecord[] = (data || []).map((v: any) => ({
          id: v.id,
          date: new Date(v.created_at).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          weight: v.weight_kg || 0,
          reps: v.reps || 0,
          is_public: v.is_public,
          videoUrl: v.video_url,
          video_url: v.video_url,
          thumbnail_url: v.thumbnail_url || v.video_url,
          spotify: v.spotify,
        }));

        setExerciseVideos(mappedVideos);
      } catch (err) {
        console.error('Error fetching exercise videos:', err);
        setExerciseVideos([]);
      } finally {
        setLoadingVideos(false);
      }
    };

    fetchExerciseVideos();
  }, [historialModalVisible, modalExercise]);

  // ============================================================================
  // VIDEO ACTIONS
  // ============================================================================

  // Eliminar video de pro_videos
  const handleDeleteVideo = async () => {
    if (!selectedVideo) return;

    Alert.alert(
      '🗑️ ELIMINAR VIDEO',
      '¿Estás seguro de que quieres eliminar este video? Esta acción no se puede deshacer.',
      [
        { text: 'CANCELAR', style: 'cancel' },
        {
          text: 'ELIMINAR',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

              // Eliminar de la base de datos
              const { error } = await supabase
                .from('pro_videos')
                .delete()
                .eq('id', selectedVideo.id);

              if (error) throw error;

              // Actualizar lista local
              setExerciseVideos((prev) => prev.filter((v) => v.id !== selectedVideo.id));

              // Cerrar viewer
              setVideoViewerVisible(false);
              setSelectedVideo(null);

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              console.error('Error deleting video:', err);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  // Toggle visibilidad pública del video
  const handleToggleVisibility = async () => {
    if (!selectedVideo) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const newPublicState = !selectedVideo.is_public;

      const { error } = await supabase
        .from('pro_videos')
        .update({ is_public: newPublicState })
        .eq('id', selectedVideo.id);

      if (error) throw error;

      // Actualizar estado local
      setSelectedVideo((prev) => (prev ? { ...prev, is_public: newPublicState } : null));
      setExerciseVideos((prev) =>
        prev.map((v) => (v.id === selectedVideo.id ? { ...v, is_public: newPublicState } : v))
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error toggling visibility:', err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Compartir - mostrar instrucción para screen record
  const handleShareVideo = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      '📱 COMPARTIR CON BRANDING',
      'Graba tu pantalla mientras reproduces este video para compartirlo con los overlays de TRENS.\n\n• Logo TRENS\n• Datos del ejercicio\n• Peso × Reps\n• Tu track de Spotify',
      [{ text: 'ENTENDIDO', style: 'default' }]
    );
  };

  // ============================================================================
  // TRAINING DAY LOGIC
  // ============================================================================
  const updateTrainingDay = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('training_last_access, training_current_day, training_routine_names')
        .eq('id', user.id)
        .single();

      // Cargar nombres de rutinas desde la base de datos
      const routineNames = profile?.training_routine_names || {};
      if (Object.keys(routineNames).length > 0) {
        setTrainingProgram((prev) => ({
          ...prev,
          days: prev.days.map((day, idx) => ({
            ...day,
            muscleGroups: routineNames[String(idx)] || day.muscleGroups,
          })),
        }));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      let newDayIndex = trainingProgram.currentDayIndex;

      if (profile?.training_last_access) {
        const lastAccess = new Date(profile.training_last_access);
        lastAccess.setHours(0, 0, 0, 0);
        const lastAccessISO = lastAccess.toISOString();

        // Si han pasado uno o más días, avanzar al siguiente día de entrenamiento
        if (todayISO > lastAccessISO) {
          newDayIndex = (profile.training_current_day || 0) + 1;
          if (newDayIndex >= trainingProgram.frequency) {
            newDayIndex = 0; // Reiniciar ciclo
          }
        } else {
          // Mismo día, mantener el índice actual
          newDayIndex = profile.training_current_day || 0;
        }
      } else {
        // Primera vez, empezar en día 1 (índice 0)
        newDayIndex = 0;
      }

      // Actualizar en Supabase
      await supabase
        .from('profiles')
        .update({
          training_last_access: todayISO,
          training_current_day: newDayIndex,
        })
        .eq('id', user.id);

      // Actualizar estado local
      setTrainingProgram((prev) => ({
        ...prev,
        lastAccessDate: todayISO,
        currentDayIndex: newDayIndex,
      }));
      setSelectedDayIndex(newDayIndex);
    } catch (error) {
      console.error('Error updating training day:', error);
    }
  };

  // Guardar nombre de rutina en la base de datos
  const saveRoutineName = async (dayIndex: number, newName: string) => {
    // Guard: Verificar si puede guardar
    if (!canSave('save_exercise')) return;

    if (!user || !newName.trim()) return;

    try {
      // Obtener nombres actuales
      const { data: profile } = await supabase
        .from('profiles')
        .select('training_routine_names')
        .eq('id', user.id)
        .single();

      const currentNames = profile?.training_routine_names || {};
      const updatedNames = {
        ...currentNames,
        [String(dayIndex)]: newName.trim().toUpperCase(),
      };

      // Guardar en Supabase
      await supabase
        .from('profiles')
        .update({ training_routine_names: updatedNames })
        .eq('id', user.id);

      // Actualizar estado local
      setTrainingProgram((prev) => ({
        ...prev,
        days: prev.days.map((day, idx) =>
          idx === dayIndex ? { ...day, muscleGroups: newName.trim().toUpperCase() } : day
        ),
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving routine name:', error);
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      updateTrainingDay();
    }
  }, [isFocused, user]);

  // ============================================================================
  // SAVE DAY NAME TO SUPABASE
  // ============================================================================
  const saveDayName = async (dayIndex: number, newName: string) => {
    // Guard: Verificar si puede guardar
    if (!canSave('save_exercise')) return;

    if (!user || !newName.trim()) return;

    try {
      // Obtener nombres actuales
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('training_routine_names')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('❌ Error obteniendo nombres actuales:', fetchError);
      }

      const currentNames = profile?.training_routine_names || {};
      const updatedNames = {
        ...currentNames,
        [String(dayIndex)]: newName.trim().toUpperCase(),
      };

      console.warn('💾 GYM: Guardando nombres de rutinas:', updatedNames);

      // Guardar en Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ training_routine_names: updatedNames })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error guardando nombres:', updateError);
        return;
      }

      console.warn('✅ GYM: Nombres guardados correctamente');

      // Actualizar estado local
      setTrainingProgram((prev) => ({
        ...prev,
        days: prev.days.map((day, idx) =>
          idx === dayIndex ? { ...day, muscleGroups: newName.trim().toUpperCase() } : day
        ),
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving day name:', error);
    }
  };

  // ============================================================================
  // FETCH EXERCISES FROM SUPABASE
  // ============================================================================
  useEffect(() => {
    loadTemplates();
    if (user) {
      loadAllUserExercises(); // Cargar TODOS los ejercicios del usuario al inicio
    }
  }, [user]);

  // Recargar ejercicios cuando cambie el día seleccionado o el usuario
  useEffect(() => {
    // Cargar ejercicios siempre - con o sin usuario
    loadExercises(selectedDayIndex);
  }, [selectedDayIndex, user]);

  // Recargar ejercicios cuando HANK modifica datos (mantener posición)
  useEffect(() => {
    console.warn('🔄 refreshTrigger cambió a:', refreshTrigger);
    if (user && refreshTrigger > 0) {
      const previousIndex = activeExerciseIndex;
      console.warn(
        '🔄 HANK modificó datos, recargando ejercicios del día:',
        selectedDayIndex,
        'manteniendo índice:',
        previousIndex
      );
      loadExercises(selectedDayIndex).then(() => {
        // Después de cargar, hacer scroll al mismo índice (o al último si el índice ya no existe)
        setTimeout(() => {
          if (exerciseListRef.current && previousIndex >= 0) {
            exerciseListRef.current.scrollToIndex({
              index: previousIndex,
              animated: false,
            });
            console.warn('🔄 Scroll restaurado a índice:', previousIndex);
          }
        }, 100);
      });
    }
  }, [refreshTrigger]);

  const loadExercises = async (dayIndex: number | null = null) => {
    // Si no hay usuario, mostrar vista STRUCTURE vacía
    if (!user) {
      setExercises([]);
      setViewMode('STRUCTURE');
      setLoading(false);
      return;
    }
    setLoading(true);
    const targetDayIndex = dayIndex !== null ? dayIndex : selectedDayIndex;

    try {
      // NUEVA ARQUITECTURA: Cargar desde exercises + user_exercise_config
      // 1. Cargar configuraciones del usuario
      const { data: userConfigs, error: configError } = await supabase
        .from('user_exercise_config')
        .select(
          `
          id,
          exercise_id,
          training_days,
          display_order,
          config,
          custom_media_url,
          personal_records,
          notes,
          created_at,
          updated_at,
          exercises (
            id,
            name,
            description,
            muscle_group,
            secondary_muscles,
            equipment,
            difficulty,
            default_media_url,
            thumbnail_url,
            video_url,
            sport_id,
            alternative_exercises
          )
        `
        )
        .eq('user_id', user.id)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (configError) throw configError;

      console.log('🔍 DEBUG userConfigs:', JSON.stringify(userConfigs?.[0], null, 2));

      // Mapear al formato que espera el código existente
      const data =
        userConfigs?.map((item: any) => {
          // El join puede venir como 'exercises' (objeto) o array dependiendo de la FK
          const exercise = item.exercises;
          return {
            id: item.id, // user_exercise_config.id
            exercise_id: item.exercise_id, // referencia al ejercicio global
            user_id: user.id,
            type: 'exercise',
            name: exercise?.name || 'UNNAMED',
            media_url:
              item.custom_media_url || exercise?.default_media_url || exercise?.thumbnail_url || '',
            training_days: item.training_days || [0],
            order: item.display_order || 0,
            deleted_at: null,
            created_at: item.created_at,
            updated_at: item.updated_at,
            metadata: {
              sets: item.config?.sets || '4x10',
              rest: item.config?.rest || '90s',
              category: exercise?.muscle_group || 'OTRO',
              difficulty: exercise?.difficulty || 'INTERMEDIO',
              series_by_day: item.config?.series_by_day || {},
              custom_series: item.config?.custom_series || null,
              description: exercise?.description,
              equipment: exercise?.equipment,
              video_url: exercise?.video_url,
              alternative_exercises: exercise?.alternative_exercises || [],
            },
          };
        }) || [];

      // Filtrar los datos ya mapeados por día de entrenamiento
      const filteredData =
        data?.filter((item: any) => {
          const itemDays = item.training_days || [0];
          return itemDays.includes(targetDayIndex);
        }) || [];

      console.log(`📊 TOTAL EJERCICIOS EN DB: ${data?.length || 0}`);
      console.log(
        '  - TODOS:',
        data?.map((e: any) => ({
          name: e.name,
          id: e.id?.substring(0, 8),
          hasCustomImage: !e.media_url?.includes('unsplash'),
          training_days: e.training_days,
          created: e.created_at?.substring(0, 10),
        }))
      );

      console.log(`📅 DÍA ${targetDayIndex}: ${filteredData.length} ejercicios filtrados`);
      if (filteredData.length > 0) {
        console.log(
          '  - Filtrados:',
          filteredData.map((e: any) => ({
            name: e.name,
            hasCustomImage: !e.media_url?.includes('unsplash'),
            training_days: e.training_days,
          }))
        );
      }

      if (filteredData && filteredData.length > 0) {
        // NUEVA ARQUITECTURA: Las alternativas están en exercises.alternative_exercises (array de UUIDs)
        // Recopilar todos los IDs de alternativas de todos los ejercicios filtrados
        const allAlternativeIds: string[] = [];
        filteredData.forEach((item: any) => {
          const altIds = item.metadata?.alternative_exercises || [];
          altIds.forEach((id: string) => {
            if (id && !allAlternativeIds.includes(id)) {
              allAlternativeIds.push(id);
            }
          });
        });

        console.log('🔍 DEBUG ALTERNATIVAS:');
        console.log('  - IDs de alternativas encontrados:', allAlternativeIds.length);

        // Cargar los datos de los ejercicios alternativos desde la tabla exercises
        let alternativeExercisesData: any[] = [];
        if (allAlternativeIds.length > 0) {
          const { data: altData } = await supabase
            .from('exercises')
            .select('id, name, thumbnail_url, default_media_url, muscle_group, difficulty')
            .in('id', allAlternativeIds);

          alternativeExercisesData = altData || [];
          console.log('  - Alternativas cargadas:', alternativeExercisesData.length);
          console.log(
            '  - Detalles:',
            alternativeExercisesData.map((a: any) => ({ id: a.id.substring(0, 8), name: a.name }))
          );
        }

        const mappedExercises: Exercise[] = filteredData.map((item, index) => {
          try {
            // Obtener IDs de alternativas de este ejercicio
            const alternativeIds = item.metadata?.alternative_exercises || [];

            // Cargar estructura personalizada del DÍA ACTUAL
            // Nueva estructura: series_by_day[day] | Fallback: custom_series (legacy)
            const seriesByDay = item.metadata?.series_by_day as
              | Record<string, SeriesConfig[]>
              | undefined;
            const customSeriesData: SeriesConfig[] =
              seriesByDay?.[String(targetDayIndex)] || // Primero buscar en series_by_day para el día actual
              (item.metadata?.custom_series as SeriesConfig[] | undefined) || // Fallback legacy
              [];

            const seriesForState: Series[] =
              customSeriesData.length > 0
                ? customSeriesData.map((s: SeriesConfig) => ({
                    id: s.id,
                    type:
                      s.type === 'WARMUP'
                        ? 'WARMUP'
                        : s.type === 'APPROACH'
                          ? 'FEEDER'
                          : s.type === 'FAILURE'
                            ? 'INTENSITY'
                            : 'EFFECTIVE',
                    reps: s.reps.toString(),
                    note: s.note || undefined,
                    weight: s.weight || 0,
                  }))
                : generateDefaultSeries(item.metadata?.sets || '4x10');

            // Mapear alternativas desde exercises.alternative_exercises
            const alternatives: ExerciseAlternative[] = alternativeIds
              .map((altId: string) => {
                const altExercise = alternativeExercisesData.find((a: any) => a.id === altId);
                if (!altExercise) return null;

                return {
                  id: altExercise.id,
                  name: altExercise.name,
                  image_url: altExercise.default_media_url || altExercise.thumbnail_url || '',
                  videos: [],
                  series: seriesForState, // Usar las mismas series del ejercicio principal
                };
              })
              .filter(Boolean) as ExerciseAlternative[];

            return {
              id: item.id,
              name: item.name || 'UNNAMED',
              sets: item.metadata?.sets || '0x0',
              image_url: item.media_url || '',
              order: item.order || 0,
              series: seriesForState,
              training_days: item.training_days || [0],
              videos: generateMockVideos(item.id, index),
              alternatives,
            };
          } catch (mapError) {
            console.error('💥 ERROR mapeando ejercicio:', item.name, mapError);
            // Retornar un ejercicio válido mínimo para no romper el array
            return {
              id: item.id || `error-${index}`,
              name: item.name || 'ERROR',
              sets: '0x0',
              image_url: '',
              order: index,
              series: [],
              training_days: [0],
              videos: [],
              alternatives: [],
            };
          }
        });
        console.log(
          '✅ SETEANDO EJERCICIOS:',
          mappedExercises.length,
          'ejercicios para día',
          targetDayIndex
        );
        console.log(
          '   Nombres:',
          mappedExercises.map((e) => e.name)
        );
        setExercises(mappedExercises);

        // Solo cambiar a FOCUS si no estamos ya en algún modo
        if (viewMode === 'LOADING') {
          console.log('🔀 Cambiando viewMode a FOCUS');
          setViewMode('FOCUS');
        }
      } else {
        // No hay ejercicios para este día - limpiar estado
        setExercises([]);

        if (viewMode === 'LOADING') {
          setViewMode('STRUCTURE');
        }
      }
    } catch {
      if (viewMode === 'LOADING') {
        setViewMode('STRUCTURE');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      // NUEVA ARQUITECTURA: Cargar desde exercises (catálogo global)
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_active', true)
        .order('muscle_group', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        // Mapear al formato AssetTemplate para compatibilidad
        const mappedTemplates: AssetTemplate[] = data.map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          description: ex.description || '',
          image_url: ex.default_media_url || '',
          category: ex.muscle_group || 'OTRO',
          difficulty: ex.difficulty || 'INTERMEDIO',
          default_metadata: {
            sets: '4x10',
            rest: '90s',
            equipment: ex.equipment,
            secondary_muscles: ex.secondary_muscles,
            video_url: ex.video_url,
            sport_id: ex.sport_id,
          },
        }));
        setTemplates(mappedTemplates);
      }
    } catch (error) {
      console.error('💥 Error loading templates:', error);
    }
  };

  const loadAllUserExercises = async () => {
    if (!user) return;

    try {
      // NUEVA ARQUITECTURA: Cargar desde user_exercise_config + exercises
      const { data, error } = await supabase
        .from('user_exercise_config')
        .select(
          `
          id,
          custom_media_url,
          exercises:exercise_id (
            name,
            default_media_url
          )
        `
        )
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        setAllUserExercises(
          data.map((config: any) => ({
            name: config.exercises?.name || 'UNNAMED',
            image_url: config.custom_media_url || config.exercises?.default_media_url || '',
          }))
        );
      }
    } catch (error) {
      console.error('💥 Error loading all user exercises:', error);
    }
  };

  // ============================================================================
  // HELPER: Generate Default Series
  // ============================================================================
  const generateDefaultSeries = (setsString: string): Series[] => {
    // Parse "4x10" -> 4 series efectivas de 10 reps
    const [count] = setsString.split('x');
    const numSets = parseInt(count) || 4;

    const series: Series[] = [
      { id: '1', type: 'WARMUP', reps: '12', note: 'Calentamiento' },
      { id: '2', type: 'FEEDER', reps: '10', note: 'Aproximación' },
    ];

    for (let i = 0; i < numSets; i++) {
      series.push({
        id: `${i + 3}`,
        type: 'EFFECTIVE',
        reps: '10',
        note: 'Al fallo',
      });
    }

    return series;
  };

  // ============================================================================
  // HELPER: Get Series Color
  // ============================================================================
  const getSeriesColor = (type: SeriesType): string => {
    switch (type) {
      case 'WARMUP':
        return '#FBBF24'; // Amarillo
      case 'FEEDER':
        return '#3B82F6'; // Azul
      case 'EFFECTIVE':
        return '#DC2626'; // Rojo Neón
      case 'INTENSITY':
        return '#A855F7'; // Morado
      default:
        return '#FFFFFF';
    }
  };

  // ============================================================================
  // HELPER: Get Current Time
  // ============================================================================
  const getCurrentTime = (): string => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ============================================================================
  // TIMER FUNCTIONS
  // ============================================================================
  const startTimer = (minutes: number) => {
    setTimeRemaining(minutes * 60);
    setTimerActive(true);
    setTimerExpanded(false);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================================================
  // CAMERA FUNCTIONS
  // ============================================================================
  const openCamera = async () => {
    if (!permission || !permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        alert('Se requiere permiso de cámara para esta función');
        return;
      }
    }

    setCameraModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const pickFromGallery = async () => {
    try {
      setIsPickingFromGallery(true); // Pausar videos mientras se elige de galería

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Se requiere permiso para acceder a la galería');
        setIsPickingFromGallery(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.5, // Reducido para optimizar tamaño de videos
        videoMaxDuration: 10, // Máximo 10 segundos
        videoQuality: 1, // Calidad media (0=baja, 1=media, 2=alta) - iOS only
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMediaType(asset.type === 'video' ? 'video' : 'photo');
        setImageToEdit(asset.uri);
        setEditorVisible(true);
      }

      setIsPickingFromGallery(false); // Reanudar videos
    } catch (error) {
      console.error('💥 Error picking from gallery:', error);
      alert('Error al seleccionar archivo');
      setIsPickingFromGallery(false);
    }
  };

  const handleEditorSave = async () => {
    if (!imageToEdit) return;

    try {
      setCaptureProcessing(true);
      setEditorVisible(false);

      if (mediaType === 'video') {
        // Para videos, subir directamente sin procesamiento
        await uploadExerciseMedia(imageToEdit, 'video');
      } else {
        // Para fotos, procesar y recortar cuadrado
        // Primero obtener info de la imagen para calcular crop correcto
        const imageInfo = await manipulateAsync(imageToEdit, []);
        const { width: origWidth, height: origHeight } = imageInfo;

        // Calcular el tamaño del lado más pequeño para crop cuadrado
        const cropSize = Math.min(origWidth, origHeight);
        const originX = (origWidth - cropSize) / 2;
        const originY = (origHeight - cropSize) / 2;

        // Recortar cuadrado desde el centro y luego resize a 1080x1080
        const manipulatedImage = await manipulateAsync(
          imageToEdit,
          [
            {
              crop: {
                originX,
                originY,
                width: cropSize,
                height: cropSize,
              },
            },
            { resize: { width: 1080, height: 1080 } },
          ],
          { compress: 0.7, format: SaveFormat.JPEG }
        );

        await uploadExerciseMedia(manipulatedImage.uri, 'photo');
      }

      setImageToEdit(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('💥 Error saving edited image:', error);
      alert('Error al guardar');
    } finally {
      setCaptureProcessing(false);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || captureProcessing) return;

    try {
      setCaptureProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // Comprimir a 720p y hacer cuadrada la imagen (1:1)
      const manipulatedImage = await manipulateAsync(
        photo.uri,
        [
          { resize: { width: 720 } },
          {
            crop: {
              originX: 0,
              originY: 0,
              width: 720,
              height: 720,
            },
          },
        ],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      await uploadExerciseMedia(manipulatedImage.uri, 'photo');
    } catch (error) {
      console.error('💥 Error capturing photo:', error);
      alert('Error al capturar foto');
    } finally {
      setCaptureProcessing(false);
    }
  };

  // ============================================================================
  // VIDEO RECORDING FUNCTIONS
  // ============================================================================
  const startVideoRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      setRecordingTime(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // 🎵 PRO: Capturar metadata de Spotify ANTES de grabar
      // Guarda trackUri + positionMs para sincronizar al reproducir
      // Spotify SIGUE sonando - el usuario escucha con audífonos mientras graba
      if (isPro && spotifyPremium) {
        const metadata = await spotify.captureMetadataForRecording();
        setCapturedSpotifyMetadata(metadata);
        if (metadata?.enabled) {
          console.log(
            '🎵 Spotify metadata capturado:',
            metadata.trackName,
            'en',
            metadata.positionMs,
            'ms'
          );
        }
      } else {
        setCapturedSpotifyMetadata(null);
      }

      // Timer para mostrar tiempo de grabación (máximo 10 segundos)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 10) {
            // Auto-stop at 10 seconds
            stopVideoRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 10, // Máximo 10 segundos
        quality: '480p', // Compresión a 480p para reducir tamaño (~1-2MB)
      });

      if (video?.uri) {
        setCapturedVideoUri(video.uri);
      }
    } catch (error) {
      console.error('💥 Error recording video:', error);
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const stopVideoRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      cameraRef.current.stopRecording();
      setIsRecording(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('💥 Error stopping recording:', error);
      setIsRecording(false);
    }
  };

  const saveVideo = async () => {
    // Guard: Verificar si puede guardar
    if (!canSave('save_exercise_video')) return;

    if (!capturedVideoUri) return;

    try {
      setCaptureProcessing(true);
      await uploadExerciseMedia(capturedVideoUri, 'video');
      setCapturedVideoUri(null);
      setCameraModalVisible(false);
    } catch (error) {
      console.error('💥 Error saving video:', error);
      alert('Error al guardar video');
    } finally {
      setCaptureProcessing(false);
    }
  };

  const discardVideo = () => {
    setCapturedVideoUri(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const uploadExerciseMedia = async (uri: string, type: 'photo' | 'video') => {
    if (!user) return;

    try {
      // Usar el ID de la variación actual (puede ser principal o alternativa)
      const exerciseIdToUpdate = currentVariationId || exercises[currentExerciseIndex]?.id;
      if (!exerciseIdToUpdate) return;

      // Buscar el ejercicio (puede estar en exercises o en alternatives)
      let currentExercise = exercises.find((ex) => ex.id === exerciseIdToUpdate);
      if (!currentExercise) {
        // Buscar en alternativas
        for (const ex of exercises) {
          const found = ex.alternatives?.find((alt) => alt.id === exerciseIdToUpdate);
          if (found) {
            currentExercise = found as any;
            break;
          }
        }
      }

      if (!currentExercise) return;

      // Eliminar el archivo anterior de R2 si existe
      if (currentExercise.image_url && currentExercise.image_url.includes('media.trens.app')) {
        const oldKey = cloudflareR2.getKeyFromUrl(currentExercise.image_url);
        if (oldKey) {
          try {
            await cloudflareR2.deleteFile(oldKey);
            console.log('🗑️ Archivo anterior eliminado de R2');
          } catch (deleteError) {
            console.warn('No se pudo eliminar archivo anterior de R2:', deleteError);
          }
        }
      }

      // Subir a Cloudflare R2
      const result = await cloudflareR2.uploadExerciseMedia(uri, user.id, exerciseIdToUpdate, type);

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Error subiendo a R2');
      }

      console.log('📹 Media uploaded to R2:', { type, url: result.url });

      // Actualizar en la base de datos (user_exercise_config)
      console.log('💾 Actualizando DB:', { exerciseIdToUpdate, newUrl: result.url });
      const { error: updateError, data: updateData } = await supabase
        .from('user_exercise_config')
        .update({ custom_media_url: result.url })
        .eq('id', exerciseIdToUpdate)
        .select();

      console.log('✅ DB actualizada:', { error: updateError, data: updateData });
      if (updateError) throw updateError;

      // Actualizar estado local - puede ser ejercicio principal o alternativa
      const updatedExercises = exercises.map((ex) => {
        if (ex.id === exerciseIdToUpdate) {
          return { ...ex, image_url: result.url || ex.image_url };
        }
        // Si es alternativa, actualizar dentro del array de alternatives
        if (ex.alternatives && ex.alternatives.length > 0) {
          return {
            ...ex,
            alternatives: ex.alternatives.map((alt) =>
              alt.id === exerciseIdToUpdate
                ? { ...alt, image_url: result.url || alt.image_url }
                : alt
            ),
          };
        }
        return ex;
      });
      setExercises(updatedExercises);

      // Actualizar también en allUserExercises para que el catálogo muestre la imagen nueva
      const exerciseName =
        exercises.find((ex) => ex.id === exerciseIdToUpdate)?.name ||
        exercises
          .flatMap((ex) => ex.alternatives || [])
          .find((alt) => alt.id === exerciseIdToUpdate)?.name;

      if (exerciseName && result.url) {
        setAllUserExercises((prev) => {
          const exists = prev.find((ex) => ex.name === exerciseName);
          if (exists) {
            return prev.map((ex) =>
              ex.name === exerciseName ? { ...ex, image_url: result.url! } : ex
            );
          } else {
            return [...prev, { name: exerciseName, image_url: result.url! }];
          }
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCameraModalVisible(false);
    } catch (error) {
      console.error('💥 Error uploading media:', error);
      alert('Error al guardar el archivo');
    }
  };

  // ============================================================================
  // HELPER: Generate Mock Videos
  // ============================================================================
  const generateMockVideos = (exerciseId: string, index: number): VideoRecord[] => {
    if (index === 0) {
      // Solo el primer ejercicio tiene historial mock
      return [
        {
          id: '1',
          exercise_id: exerciseId,
          video_url: 'https://example.com/video1.mp4',
          thumbnail_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
          weight: 140,
          reps: 10,
          date: '12 Oct',
          is_public: true,
        },
        {
          id: '2',
          exercise_id: exerciseId,
          video_url: 'https://example.com/video2.mp4',
          thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
          weight: 135,
          reps: 12,
          date: '5 Oct',
          is_public: false,
        },
      ];
    }
    return [];
  };

  // ============================================================================
  // SERIES CONFIG FUNCTIONS
  // ============================================================================
  const openSeriesConfigModal = (template: AssetTemplate) => {
    setSelectedTemplate(template);
    setSeriesConfig([]);
    setModalVisible(false);
    setSeriesConfigModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const addSeriesManually = () => {
    const newSeries: SeriesConfig = {
      id: Date.now().toString(),
      reps: 10,
      type: 'EFFECTIVE',
      note: '',
      weight: 0,
    };
    setSeriesConfig([...seriesConfig, newSeries]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeSeriesConfig = (id: string) => {
    setSeriesConfig(seriesConfig.filter((s) => s.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const updateSeriesConfig = (id: string, field: keyof SeriesConfig, value: any) => {
    setSeriesConfig(seriesConfig.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const generateRecommendedStructure = () => {
    const structures: Record<UserLevel, SeriesConfig[]> = {
      BEGINNER: [
        { id: '1', reps: 12, type: 'WARMUP', note: 'Calentamiento', weight: 0 },
        { id: '2', reps: 10, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '3', reps: 10, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '4', reps: 10, type: 'EFFECTIVE', note: '', weight: 0 },
      ],
      INTERMEDIATE: [
        { id: '1', reps: 12, type: 'WARMUP', note: 'Calentamiento', weight: 0 },
        { id: '2', reps: 10, type: 'APPROACH', note: 'Aproximación', weight: 0 },
        { id: '3', reps: 8, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '4', reps: 8, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '5', reps: 8, type: 'EFFECTIVE', note: '', weight: 0 },
      ],
      ADVANCED: [
        { id: '1', reps: 12, type: 'WARMUP', note: 'Calentamiento', weight: 0 },
        { id: '2', reps: 8, type: 'APPROACH', note: 'Aproximación 1', weight: 0 },
        { id: '3', reps: 6, type: 'APPROACH', note: 'Aproximación 2', weight: 0 },
        { id: '4', reps: 6, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '5', reps: 6, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '6', reps: 6, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '7', reps: 12, type: 'FAILURE', note: 'Al fallo', weight: 0 },
      ],
      PRO: [
        { id: '1', reps: 15, type: 'WARMUP', note: 'Calentamiento', weight: 0 },
        { id: '2', reps: 10, type: 'APPROACH', note: 'Aproximación 1', weight: 0 },
        { id: '3', reps: 8, type: 'APPROACH', note: 'Aproximación 2', weight: 0 },
        { id: '4', reps: 6, type: 'APPROACH', note: 'Aproximación 3', weight: 0 },
        { id: '5', reps: 5, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '6', reps: 5, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '7', reps: 5, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '8', reps: 5, type: 'EFFECTIVE', note: '', weight: 0 },
        { id: '9', reps: 15, type: 'FAILURE', note: 'Al fallo', weight: 0 },
      ],
    };

    setSeriesConfig(structures[userLevel]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ============================================================================
  // ADD EXERCISE FROM TEMPLATE
  // ============================================================================
  const addExerciseFromTemplate = async (
    template: AssetTemplate,
    customSeries?: SeriesConfig[]
  ) => {
    if (!user) return;

    setAdding(true);
    try {
      // NUEVA ARQUITECTURA: Usar user_exercise_config en lugar de user_assets
      // El template.id ahora es el exercise_id del catálogo global

      // Verificar si ya existe configuración para este ejercicio
      const { data: existingConfig, error: searchError } = await supabase
        .from('user_exercise_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', template.id)
        .maybeSingle();

      if (searchError) {
        console.error('Error buscando configuración existente:', searchError);
      }

      let data;
      let error;

      if (existingConfig) {
        // El ejercicio YA EXISTE - agregar este día a su array training_days
        const currentDays = existingConfig.training_days || [0];

        if (currentDays.includes(selectedDayIndex)) {
          alert('Este ejercicio ya está agregado en este día de entrenamiento');
          setAdding(false);
          return;
        }

        // Agregar el nuevo día al array
        const updatedDays = [...currentDays, selectedDayIndex].sort();

        // Obtener config actual para copiar series al nuevo día
        const currentConfig = existingConfig.config || {};
        const seriesByDay = (currentConfig.series_by_day as Record<string, any[]>) || {};

        // Si el usuario configuró series personalizadas, usarlas para el nuevo día
        if (customSeries && customSeries.length > 0) {
          seriesByDay[String(selectedDayIndex)] = customSeries;
        } else {
          // Copiar series del primer día configurado
          const firstDaySeries = seriesByDay[String(currentDays[0])] || [];
          if (firstDaySeries.length > 0) {
            seriesByDay[String(selectedDayIndex)] = [...firstDaySeries];
          }
        }

        const result = await supabase
          .from('user_exercise_config')
          .update({
            training_days: updatedDays,
            updated_at: new Date().toISOString(),
            config: {
              ...currentConfig,
              series_by_day: seriesByDay,
            },
          })
          .eq('id', existingConfig.id)
          .select()
          .single();

        data = result.data;
        error = result.error;
      } else {
        // Crear NUEVA configuración de usuario para este ejercicio
        const seriesByDay: Record<string, any[]> = {};
        if (customSeries) {
          seriesByDay[String(selectedDayIndex)] = customSeries;
        }

        const result = await supabase
          .from('user_exercise_config')
          .insert({
            user_id: user.id,
            exercise_id: template.id, // Referencia al ejercicio global
            training_days: [selectedDayIndex],
            display_order: exercises.length,
            config: {
              sets: customSeries
                ? `${customSeries.length}x${customSeries[0]?.reps || 10}`
                : template.default_metadata.sets,
              rest: template.default_metadata.rest,
              series_by_day: customSeries ? seriesByDay : {},
              custom_series: customSeries || null,
            },
          })
          .select()
          .single();

        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data) {
        // Convertir SeriesConfig a Series para el estado local
        const seriesForState: Series[] = customSeries
          ? customSeries.map((s) => ({
              id: s.id,
              type:
                s.type === 'WARMUP'
                  ? 'WARMUP'
                  : s.type === 'APPROACH'
                    ? 'FEEDER'
                    : s.type === 'FAILURE'
                      ? 'INTENSITY'
                      : 'EFFECTIVE',
              reps: s.reps.toString(),
              note: s.note || undefined,
            }))
          : generateDefaultSeries(data.config?.sets || template.default_metadata.sets);

        const newExercise: Exercise = {
          id: data.id, // user_exercise_config.id
          name: template.name,
          sets: data.config?.sets || template.default_metadata.sets,
          image_url: template.image_url,
          order: data.display_order || 0,
          series: seriesForState,
          training_days: data.training_days || [selectedDayIndex],
          videos: [],
          alternatives: [],
        };

        setExercises([...exercises, newExercise]);
        setModalVisible(false);

        // Recargar ejercicios
        setTimeout(() => loadExercises(), 500);
      }
    } catch (error) {
      console.error('💥 Error adding exercise:', error);
      alert('Error al agregar ejercicio');
    } finally {
      setAdding(false);
    }
  };

  // ============================================================================
  // DELETE EXERCISE
  // ============================================================================
  const deleteExercise = async (id: string) => {
    try {
      // NUEVA ARQUITECTURA: Usar user_exercise_config
      // Obtener la configuración actual
      const { data: config, error: fetchError } = await supabase
        .from('user_exercise_config')
        .select('training_days')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentDays = config?.training_days || [0];

      if (currentDays.length > 1) {
        // Si está en MÚLTIPLES días, solo REMOVER el día actual del array
        const updatedDays = currentDays.filter((day: number) => day !== selectedDayIndex);

        const { error } = await supabase
          .from('user_exercise_config')
          .update({
            training_days: updatedDays,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Si está en UN SOLO día, eliminar la configuración completa
        const { error } = await supabase.from('user_exercise_config').delete().eq('id', id);

        if (error) throw error;
      }

      // Remover del estado local (solo para el día actual)
      setExercises(exercises.filter((ex) => ex.id !== id));
    } catch (error) {
      console.error('💥 Error deleting exercise:', error);
      alert('Error al eliminar ejercicio');
    }
  };

  // ============================================================================
  // SAVE AND TRAIN
  // ============================================================================
  const saveAndTrain = async () => {
    // Guard: Verificar si puede guardar
    if (!canSave('save_workout')) return;

    if (exercises.length === 0) return;

    // Actualizar el día actual en el perfil
    if (user) {
      await supabase
        .from('profiles')
        .update({
          training_current_day: selectedDayIndex,
          training_last_access: new Date().toISOString(),
        })
        .eq('id', user.id);

      setTrainingProgram((prev) => ({
        ...prev,
        currentDayIndex: selectedDayIndex,
        lastAccessDate: new Date().toISOString(),
      }));
    }

    setViewMode('FOCUS');
  };

  // ============================================================================
  // RENDER LOADING
  // ============================================================================
  if (viewMode === 'LOADING' || loading) {
    return (
      <View className="flex-1 bg-savage-black justify-center items-center">
        <ActivityIndicator size="large" color="#DC2626" />
        <Text className="text-savage-red font-bold text-lg mt-4 tracking-widest">
          LOADING PROTOCOL...
        </Text>
      </View>
    );
  }

  // ============================================================================
  // RENDER SERIES CONFIG MODAL
  // ============================================================================
  const getSeriesTypeColor = (type: SeriesConfig['type']) => {
    const colors = {
      WARMUP: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: '#3B82F6' },
      APPROACH: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', bar: '#EAB308' },
      EFFECTIVE: { bg: 'bg-green-500/20', text: 'text-green-400', bar: '#22C55E' },
      FAILURE: { bg: 'bg-red-500/20', text: 'text-red-400', bar: '#EF4444' },
    };
    return colors[type];
  };

  const getSeriesTypeLabel = (type: SeriesConfig['type']) => {
    return {
      WARMUP: 'Calentamiento',
      APPROACH: 'Aproximación',
      EFFECTIVE: 'Efectiva',
      FAILURE: 'Al Fallo',
    }[type];
  };

  const renderSeriesConfigModal = () => (
    <Modal
      visible={seriesConfigModalVisible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
    >
      <View className="flex-1 bg-savage-black">
        {/* HEADER */}
        <View className="px-6 pt-16 pb-4 border-b border-zinc-800">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-savage-text text-3xl font-bold italic">CONFIGURAR EJERCICIO</Text>
            <TouchableOpacity
              onPress={() => {
                setSeriesConfigModalVisible(false);
                setModalVisible(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              className="bg-zinc-900 p-3 rounded-lg"
            >
              <X color="#DC2626" size={24} />
            </TouchableOpacity>
          </View>

          {/* EXERCISE INFO */}
          {selectedTemplate && (
            <View className="flex-row items-center bg-zinc-900 p-4 rounded-lg">
              <Image
                source={{
                  uri:
                    exercises.find((ex) => ex.name === selectedTemplate.name)?.image_url ||
                    selectedTemplate.image_url,
                }}
                style={{ width: 60, height: 60 }}
                className="rounded-lg mr-4"
                contentFit="cover"
              />
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">{selectedTemplate.name}</Text>
                <Text className="text-zinc-500 text-sm">{selectedTemplate.category}</Text>
              </View>
            </View>
          )}
        </View>

        {/* SERIES LIST */}
        <ScrollView className="flex-1 px-6 pt-4">
          {seriesConfig.map((serie, index) => {
            const colors = getSeriesTypeColor(serie.type);
            return (
              <View
                key={serie.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-3"
              >
                {/* HEADER */}
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-white font-bold">SERIE {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeSeriesConfig(serie.id)}>
                    <Trash2 color="#DC2626" size={20} />
                  </TouchableOpacity>
                </View>

                {/* REPETICIONES */}
                <Text className="text-zinc-500 text-sm mb-2">Repeticiones *</Text>
                <View className="flex-row items-center mb-3">
                  <TouchableOpacity
                    onPress={() =>
                      updateSeriesConfig(serie.id, 'reps', Math.max(1, serie.reps - 1))
                    }
                    className="bg-zinc-800 px-4 py-2 rounded-l-lg"
                  >
                    <Text className="text-white font-bold">-</Text>
                  </TouchableOpacity>
                  <TextInput
                    className="bg-black px-6 py-2 border-y border-zinc-700 text-white font-mono font-bold text-center"
                    keyboardType="numeric"
                    value={serie.reps.toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      updateSeriesConfig(serie.id, 'reps', Math.max(1, num));
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => updateSeriesConfig(serie.id, 'reps', serie.reps + 1)}
                    className="bg-zinc-800 px-4 py-2 rounded-r-lg"
                  >
                    <Text className="text-white font-bold">+</Text>
                  </TouchableOpacity>
                </View>

                {/* TIPO DE SERIE CON SLIDER */}
                <Text className="text-zinc-500 text-sm mb-2">Tipo de Serie *</Text>
                <View className="mb-3">
                  <View className="flex-row justify-between mb-2">
                    {(['WARMUP', 'APPROACH', 'EFFECTIVE', 'FAILURE'] as const).map((type) => {
                      const isActive = serie.type === type;
                      const typeColors = getSeriesTypeColor(type);
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => updateSeriesConfig(serie.id, 'type', type)}
                          className={`flex-1 mx-1 py-2 rounded ${
                            isActive ? typeColors.bg : 'bg-zinc-800'
                          }`}
                        >
                          <Text
                            className={`text-center text-xs font-bold ${
                              isActive ? typeColors.text : 'text-zinc-600'
                            }`}
                          >
                            {getSeriesTypeLabel(type)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {/* SLIDER ARRASTRABLE */}
                  <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={0}
                    maximumValue={3}
                    value={
                      serie.type === 'WARMUP'
                        ? 0
                        : serie.type === 'APPROACH'
                          ? 1
                          : serie.type === 'EFFECTIVE'
                            ? 2
                            : 3
                    }
                    onValueChange={(value) => {
                      const types: SeriesConfig['type'][] = [
                        'WARMUP',
                        'APPROACH',
                        'EFFECTIVE',
                        'FAILURE',
                      ];
                      const index = Math.round(value);
                      updateSeriesConfig(serie.id, 'type', types[index]);
                    }}
                    onSlidingComplete={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    minimumTrackTintColor={colors.bar}
                    maximumTrackTintColor="#27272a"
                    thumbTintColor={colors.bar}
                  />
                </View>

                {/* PESO */}
                <Text className="text-zinc-500 text-sm mb-2">Peso (kg)</Text>
                <View className="flex-row items-center mb-3">
                  <TouchableOpacity
                    onPress={() =>
                      updateSeriesConfig(serie.id, 'weight', Math.max(0, serie.weight - 2.5))
                    }
                    className="bg-zinc-800 px-4 py-2 rounded-l-lg"
                  >
                    <Text className="text-white font-bold">-</Text>
                  </TouchableOpacity>
                  <TextInput
                    className="bg-black px-6 py-2 border-y border-zinc-700 text-white font-mono font-bold text-center"
                    keyboardType="numeric"
                    value={serie.weight.toString()}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      updateSeriesConfig(serie.id, 'weight', Math.max(0, num));
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => updateSeriesConfig(serie.id, 'weight', serie.weight + 2.5)}
                    className="bg-zinc-800 px-4 py-2 rounded-r-lg"
                  >
                    <Text className="text-white font-bold">+</Text>
                  </TouchableOpacity>
                </View>

                {/* INDICACIÓN */}
                <Text className="text-zinc-500 text-sm mb-2">Indicación</Text>
                <TextInput
                  className="bg-black border border-zinc-700 rounded-lg p-3 text-white"
                  placeholder="Sin indicación"
                  placeholderTextColor="#71717a"
                  value={serie.note}
                  onChangeText={(text) => updateSeriesConfig(serie.id, 'note', text)}
                  multiline
                />
              </View>
            );
          })}

          {/* AGREGAR SERIE */}
          <TouchableOpacity
            onPress={addSeriesManually}
            className="bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg p-4 mb-3 items-center"
          >
            <Plus color="#FFFFFF" size={32} />
            <Text className="text-white font-bold mt-2">AGREGAR SERIE</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* FOOTER */}
        <View className="border-t border-zinc-800 p-6 bg-savage-dark">
          <TouchableOpacity
            onPress={generateRecommendedStructure}
            className="bg-zinc-900 border border-savage-red p-4 rounded-lg mb-3"
          >
            <Text className="text-savage-red font-bold text-center">
              AGREGAR ESTRUCTURA RECOMENDADA ({userLevel})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              if (seriesConfig.length === 0) {
                alert('Debes agregar al menos una serie');
                return;
              }
              if (!selectedTemplate) return;

              setSeriesConfigModalVisible(false);

              // Verificar si el ejercicio ya existe
              const existingExercise = exercises.find((ex) => ex.id === selectedTemplate.id);

              if (existingExercise) {
                // Actualizar ejercicio existente - solo el día actual
                try {
                  // NUEVA ARQUITECTURA: Obtener config actual para preservar series de otros días
                  const { data: currentConfig } = await supabase
                    .from('user_exercise_config')
                    .select('config')
                    .eq('id', selectedTemplate.id)
                    .single();

                  const currentConfigData = currentConfig?.config || {};
                  const seriesByDay =
                    (currentConfigData.series_by_day as Record<string, any[]>) || {};
                  seriesByDay[String(selectedDayIndex)] = seriesConfig;

                  const { error } = await supabase
                    .from('user_exercise_config')
                    .update({
                      config: {
                        ...selectedTemplate.default_metadata,
                        ...currentConfigData,
                        sets: `${seriesConfig.length}x${seriesConfig[0]?.reps || 10}`,
                        series_by_day: seriesByDay,
                      },
                    })
                    .eq('id', selectedTemplate.id);

                  if (error) throw error;

                  // Recargar ejercicios sin cambiar de modo
                  await loadExercises();
                } catch (error) {
                  console.error('Error actualizando ejercicio:', error);
                  alert('Error al actualizar ejercicio');
                }
              } else {
                // Agregar nuevo ejercicio
                await addExerciseFromTemplate(selectedTemplate, seriesConfig);
              }
            }}
            className="bg-savage-red p-4 rounded-lg"
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-center text-lg">
                {exercises.find((ex) => ex.id === selectedTemplate?.id)
                  ? 'ACTUALIZAR'
                  : 'GUARDAR Y AGREGAR'}{' '}
                ({seriesConfig.length} SERIES)
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ============================================================================
  // RENDER CATALOG MODAL
  // ============================================================================
  const renderCatalogModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 bg-black/95">
        {/* HEADER */}
        <View className="px-6 pt-16 pb-4 border-b border-zinc-800 flex-row justify-between items-center">
          <View>
            <Text className="text-savage-text text-3xl font-bold italic">CATÁLOGO</Text>
            <Text className="text-zinc-500 text-sm tracking-wider">SELECCIONA UN EJERCICIO</Text>
          </View>
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            className="bg-zinc-900 p-3 rounded-lg"
          >
            <X color="#DC2626" size={24} />
          </TouchableOpacity>
        </View>

        {/* CATALOG LIST */}
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          className="flex-1 px-6 pt-4"
          renderItem={({ item }) => {
            // Buscar si el ejercicio ya existe con imagen personalizada (en cualquier día)
            const existingExercise = allUserExercises.find((ex) => ex.name === item.name);
            const imageUrl = existingExercise?.image_url || item.image_url;

            return (
              <TouchableOpacity
                onPress={() => openSeriesConfigModal(item)}
                disabled={adding}
                className="flex-row bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mb-2 items-center"
              >
                {/* IMAGE */}
                <Image
                  source={{ uri: imageUrl }}
                  className="w-16 h-16 rounded-lg mr-3"
                  contentFit="cover"
                />

                {/* INFO */}
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm mb-0.5" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-zinc-500 text-xs mb-1.5" numberOfLines={1}>
                    {item.description}
                  </Text>
                  <View className="flex-row gap-1.5">
                    <View className="bg-zinc-800 px-1.5 py-0.5 rounded">
                      <Text className="text-zinc-400 text-[10px] font-mono">{item.category}</Text>
                    </View>
                    <View className="bg-savage-red/20 px-1.5 py-0.5 rounded">
                      <Text className="text-savage-red text-[10px] font-bold">
                        {item.difficulty}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ARROW */}
                {adding ? (
                  <ActivityIndicator color="#DC2626" size="small" />
                ) : (
                  <View className="bg-savage-red/20 p-2 rounded-full">
                    <Plus color="#DC2626" size={16} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );

  // ============================================================================
  // RENDER STRUCTURE MODE - Estilo ADN
  // ============================================================================
  if (viewMode === 'STRUCTURE') {
    return (
      <View className="flex-1 bg-black">
        {/* HEADER - Estilo ADN */}
        <View className="relative pt-14 pb-4 px-4">
          <LinearGradient
            colors={['#1a1a1a', '#000000']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            className="absolute inset-0 opacity-30"
          />

          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-white text-2xl font-bold tracking-tight">ESTRUCTURA</Text>
              <Text className="text-zinc-500 text-xs uppercase tracking-widest">
                Configura tu rutina
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => exercises.length > 0 && setViewMode('FOCUS')}
              className={`px-4 py-2 rounded-lg ${exercises.length > 0 ? 'bg-savage-red' : 'bg-zinc-800'}`}
            >
              <Text
                className={`font-bold text-sm ${exercises.length > 0 ? 'text-white' : 'text-zinc-500'}`}
              >
                ENTRENAR
              </Text>
            </TouchableOpacity>
          </View>

          {/* WHEEL SELECTOR DÍAS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trainingProgram.days.map((day, index) => {
              const isActive = selectedDayIndex === index;
              const isCurrent = trainingProgram.currentDayIndex === index;

              return (
                <TouchableOpacity
                  key={day.id}
                  onPress={() => {
                    setSelectedDayIndex(index);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  onLongPress={() => {
                    setEditingDayIndex(index);
                    setEditingDayName(day.muscleGroups);
                    setDayNameModalVisible(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  }}
                  className={`mr-2 px-3 py-2 rounded-lg ${
                    isActive ? 'bg-savage-red' : 'bg-zinc-900 border border-zinc-800'
                  }`}
                >
                  <View className="flex-row items-center gap-1.5">
                    {isCurrent && (
                      <View
                        className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-green-500'}`}
                      />
                    )}
                    <Text
                      className={`font-bold text-[10px] uppercase tracking-wider ${
                        isActive ? 'text-white' : 'text-zinc-400'
                      }`}
                      numberOfLines={1}
                    >
                      {day.muscleGroups}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text className="text-zinc-600 text-[10px] mt-1.5">Mantén presionado para renombrar</Text>
        </View>

        {/* EXERCISES LIST - Estilo ADN */}
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4 pt-2"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-16">
              <View className="w-16 h-16 rounded-full bg-zinc-900 items-center justify-center mb-4">
                <Plus size={28} color="#71717A" />
              </View>
              <Text className="text-zinc-600 text-center mb-6 text-sm">
                Sin ejercicios configurados
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className="bg-savage-red px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-bold text-sm tracking-wider">
                  + AGREGAR EJERCICIO
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={async () => {
                // NUEVA ARQUITECTURA: Cargar config del ejercicio para editarlo
                const { data } = await supabase
                  .from('user_exercise_config')
                  .select(
                    `
                    id,
                    config,
                    custom_media_url,
                    exercises:exercise_id (
                      id,
                      name,
                      description,
                      muscle_group,
                      difficulty,
                      default_media_url
                    )
                  `
                  )
                  .eq('id', item.id)
                  .single();

                if (data) {
                  // Cast: Supabase devuelve el objeto de exercises como objeto, no array
                  const exerciseInfo = data.exercises as unknown as {
                    id: string;
                    name: string;
                    description: string | null;
                    muscle_group: string | null;
                    difficulty: string | null;
                    default_media_url: string | null;
                  } | null;

                  const template: AssetTemplate = {
                    id: data.id,
                    name: exerciseInfo?.name || item.name,
                    description: exerciseInfo?.description || '',
                    image_url: data.custom_media_url || exerciseInfo?.default_media_url || '',
                    category: exerciseInfo?.muscle_group || 'OTRO',
                    difficulty: exerciseInfo?.difficulty || 'INTERMEDIO',
                    default_metadata: data.config || {},
                  };

                  // Cargar series existentes del DÍA ACTUAL
                  const seriesByDay = data.config?.series_by_day as
                    | Record<string, SeriesConfig[]>
                    | undefined;
                  const existingSeries: SeriesConfig[] =
                    seriesByDay?.[String(selectedDayIndex)] || // Primero series_by_day del día actual
                    (data.config?.custom_series as SeriesConfig[] | undefined) || // Fallback legacy
                    [];
                  setSeriesConfig(existingSeries);
                  setSelectedTemplate(template);
                  setSeriesConfigModalVisible(true);
                }
              }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mb-2 flex-row items-center"
            >
              {/* ORDER NUMBER */}
              <View className="bg-savage-red rounded-full w-6 h-6 items-center justify-center mr-2">
                <Text className="text-white font-bold text-xs font-mono">{index + 1}</Text>
              </View>

              {/* IMAGE */}
              <Image
                source={{ uri: item.image_url }}
                className="w-12 h-12 rounded-lg mr-3"
                contentFit="cover"
              />

              {/* INFO */}
              <View className="flex-1">
                <Text className="text-white font-bold text-sm mb-1" numberOfLines={1}>
                  {item.name}
                </Text>
                {/* RESUMEN DE ESTRUCTURA */}
                {item.series && item.series.length > 0 && (
                  <View className="flex-row flex-wrap gap-0.5">
                    {item.series
                      .filter((s) => s && typeof s === 'object')
                      .map((s, idx) => {
                        const typeColors = {
                          WARMUP: 'bg-blue-500',
                          FEEDER: 'bg-yellow-500',
                          EFFECTIVE: 'bg-green-500',
                          INTENSITY: 'bg-red-500',
                        };
                        const colorClass = typeColors[s.type] || 'bg-zinc-500';
                        return (
                          <View
                            key={String(idx)}
                            className={`${colorClass} w-5 h-5 rounded-full items-center justify-center`}
                          >
                            <Text className="text-white text-[8px] font-bold">
                              {String(s.reps || 0)}
                            </Text>
                          </View>
                        );
                      })}
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => deleteExercise(item.id)}
                className="p-2 bg-zinc-800 rounded-lg"
              >
                <Trash2 color="#DC2626" size={16} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />

        {/* FOOTER - Estilo ADN */}
        <View className="border-t border-zinc-800 p-4 bg-black">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="border border-zinc-700 p-3 rounded-lg items-center flex-row justify-center gap-2"
          >
            <Plus color="#DC2626" size={18} />
            <Text className="text-zinc-300 font-bold text-sm tracking-wider">
              AGREGAR EJERCICIO
            </Text>
          </TouchableOpacity>
        </View>

        {/* CATALOG MODAL */}
        {renderCatalogModal()}
        {renderSeriesConfigModal()}

        {/* DAY NAME EDIT MODAL */}
        <Modal
          visible={dayNameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDayNameModalVisible(false)}
        >
          <Pressable
            className="flex-1 bg-black/80 justify-center items-center p-4"
            onPress={() => setDayNameModalVisible(false)}
          >
            <Pressable
              className="bg-zinc-900 rounded-xl p-5 w-full border border-zinc-800"
              onPress={(e) => e.stopPropagation()}
            >
              <Text className="text-white text-lg font-bold mb-3">
                Renombrar día {editingDayIndex !== null ? editingDayIndex + 1 : ''}
              </Text>
              <TextInput
                value={editingDayName}
                onChangeText={setEditingDayName}
                placeholder="Ej: PECHO + ESPALDA"
                placeholderTextColor="#71717A"
                autoCapitalize="characters"
                className="bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm font-bold mb-3"
                autoFocus
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setDayNameModalVisible(false)}
                  className="flex-1 py-2.5 rounded-lg border border-zinc-700"
                >
                  <Text className="text-zinc-400 text-center font-bold text-sm">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (editingDayIndex !== null) {
                      saveDayName(editingDayIndex, editingDayName);
                    }
                    setDayNameModalVisible(false);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-savage-red"
                >
                  <Text className="text-white text-center font-bold text-sm">Guardar</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // ============================================================================
  // RENDER MODALS
  // ============================================================================
  const renderNotesModal = () => (
    <Modal
      visible={notesModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setNotesModalVisible(false)}
    >
      <View className="flex-1 bg-black/95 justify-center px-6">
        <View className="bg-glass-strong rounded-savage p-6 border border-glass-border">
          <Text className="text-savage-text text-2xl font-bold mb-4 tracking-wider">NOTAS</Text>
          <Text className="text-zinc-500 text-sm mb-4">
            Ejercicio: {exercises[currentExerciseIndex]?.name}
          </Text>

          <View className="bg-black border border-zinc-800 rounded-lg p-4 mb-4 min-h-32">
            <Text className="text-zinc-600 text-sm">Toca para agregar notas...</Text>
          </View>

          <TouchableOpacity
            onPress={() => setNotesModalVisible(false)}
            className="bg-savage-red p-4 rounded-lg items-center"
          >
            <Text className="text-savage-text font-bold">GUARDAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderHankModal = () => (
    <Modal
      visible={hankModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setHankModalVisible(false)}
    >
      <View className="flex-1 bg-black/95">
        <View className="flex-1 px-6 pt-16">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-savage-red text-2xl font-bold">HANK IA</Text>
            <TouchableOpacity onPress={() => setHankModalVisible(false)}>
              <X color="#DC2626" size={24} />
            </TouchableOpacity>
          </View>

          <View className="flex-1 bg-glass-strong rounded-savage p-4 border border-savage-red">
            <Text className="text-zinc-400 text-sm mb-4 tracking-wider">
              Contexto: {exercises[currentExerciseIndex]?.name}
            </Text>
            <Text className="text-zinc-600">
              Hola, soy HANK. ¿En qué puedo ayudarte con este ejercicio?
            </Text>
          </View>

          <View className="flex-row mt-4 gap-2">
            <View className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <Text className="text-zinc-600">Escribe tu pregunta...</Text>
            </View>
            <TouchableOpacity className="bg-savage-red p-4 rounded-lg">
              <Text className="text-savage-text font-bold">→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // MODAL: EDITOR SIMPLE
  const renderEditorModal = () => (
    <Modal visible={editorVisible} animationType="slide" statusBarTranslucent>
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 pt-14 pb-4 border-b border-zinc-800">
          <TouchableOpacity
            onPress={() => {
              setEditorVisible(false);
              setImageToEdit(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            className="bg-zinc-900 px-4 py-2 rounded-full"
          >
            <Text className="text-white font-bold">✕ CANCELAR</Text>
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">AJUSTAR RECORTE</Text>
          <TouchableOpacity
            onPress={() => {
              handleEditorSave();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }}
            className="bg-red-600 px-4 py-2 rounded-full"
          >
            <Text className="text-white font-bold">✓ GUARDAR</Text>
          </TouchableOpacity>
        </View>

        {/* Preview cuadrado centrado */}
        <View className="flex-1 justify-center items-center px-4">
          {imageToEdit && (
            <View className="w-full aspect-square max-w-[90%]">
              <Image
                source={{ uri: imageToEdit }}
                className="w-full h-full rounded-lg"
                contentFit="cover"
              />
              {/* Overlay con guías de recorte */}
              <View className="absolute inset-0 border-2 border-dashed border-savage-red rounded-lg" />
            </View>
          )}
        </View>

        {/* Info */}
        <View className="px-6 py-8 border-t border-zinc-800">
          <Text className="text-zinc-400 text-center text-sm">
            La imagen se recortará en formato cuadrado 1:1
          </Text>
          {mediaType === 'video' && (
            <Text className="text-zinc-400 text-center text-sm mt-2">
              📹 Máximo 10 segundos de video
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderCameraModal = () => {
    // Verificar permisos primero
    if (!permission?.granted) {
      return (
        <Modal
          visible={cameraModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCameraModalVisible(false)}
        >
          <View className="flex-1 bg-black justify-center items-center px-8">
            <Text className="text-white text-xl font-bold mb-4 text-center">
              📸 PERMISOS DE CÁMARA
            </Text>
            <Text className="text-zinc-400 text-center mb-8">
              Necesitamos acceso a tu cámara para capturar fotos y videos de tus ejercicios.
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              className="bg-savage-red px-8 py-4 rounded-full mb-4"
            >
              <Text className="text-white font-bold">PERMITIR CÁMARA</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCameraModalVisible(false)} className="px-8 py-4">
              <Text className="text-zinc-500 font-bold">CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      );
    }

    return (
      <Modal
        visible={cameraModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setCameraModalVisible(false);
          setCapturedVideoUri(null);
          setIsRecording(false);
          setRecordingTime(0);
        }}
      >
        {/* Container que NO tapa la barra de navegación */}
        <View className="flex-1 bg-black pt-12 pb-24">
          {/* VIDEO PREVIEW MODE - Si hay video capturado */}
          {capturedVideoUri ? (
            <View className="flex-1">
              {/* Header con opciones de video */}
              <View className="bg-black px-6 py-4">
                <View className="flex-row justify-between items-center">
                  <TouchableOpacity
                    onPress={discardVideo}
                    className="bg-zinc-900 px-4 py-2 rounded-full"
                  >
                    <Text className="text-white font-bold">✕ DESCARTAR</Text>
                  </TouchableOpacity>
                  <Text className="text-savage-text font-bold text-lg">PREVIEW VIDEO</Text>
                  <TouchableOpacity
                    onPress={saveVideo}
                    disabled={captureProcessing}
                    className="bg-savage-red px-4 py-2 rounded-full"
                  >
                    <Text className="text-white font-bold">
                      {captureProcessing ? '...' : '✓ GUARDAR'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-zinc-500 text-center text-sm mt-2">
                  {recordingTime}s de video • Máx 10s
                </Text>
              </View>

              {/* Video Preview */}
              <View className="flex-1 justify-center items-center px-4">
                <View className="w-full aspect-square overflow-hidden bg-zinc-900 rounded-lg">
                  <VideoView
                    player={videoPlayer}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    contentFit="cover"
                    nativeControls={false}
                  />
                </View>
              </View>

              {/* Info */}
              <View className="py-4 bg-black">
                <Text className="text-zinc-400 text-center text-sm">
                  Video comprimido a 480p (~1-2MB)
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* HEADER */}
              <View className="bg-black px-6 pb-4 border-b border-zinc-900">
                <View className="flex-row justify-between items-center mb-3">
                  <TouchableOpacity
                    onPress={() => {
                      setCameraModalVisible(false);
                      setIsRecording(false);
                      setRecordingTime(0);
                      if (recordingTimerRef.current) {
                        clearInterval(recordingTimerRef.current);
                      }
                    }}
                  >
                    <X color="#FFFFFF" size={28} />
                  </TouchableOpacity>
                  <Text className="text-savage-text font-bold text-lg tracking-wider">
                    {cameraMode === 'photo' ? '📸 FOTO' : '🎬 VIDEO'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setCameraFacing(cameraFacing === 'back' ? 'front' : 'back');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <RotateCcw color="#FFFFFF" size={24} />
                  </TouchableOpacity>
                </View>
                <Text className="text-zinc-500 text-center text-sm">
                  {exercises[currentExerciseIndex]?.name}
                </Text>
              </View>

              {/* MODE TOGGLE */}
              <View className="flex-row justify-center py-4 bg-black border-b border-zinc-900">
                <TouchableOpacity
                  onPress={() => {
                    setCameraMode('photo');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`px-6 py-2 rounded-l-full ${cameraMode === 'photo' ? 'bg-savage-red' : 'bg-zinc-800'}`}
                >
                  <Text
                    className={`font-bold ${cameraMode === 'photo' ? 'text-white' : 'text-zinc-400'}`}
                  >
                    📸 FOTO
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setCameraMode('video');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`px-6 py-2 rounded-r-full ${cameraMode === 'video' ? 'bg-savage-red' : 'bg-zinc-800'}`}
                >
                  <Text
                    className={`font-bold ${cameraMode === 'video' ? 'text-white' : 'text-zinc-400'}`}
                  >
                    🎬 VIDEO
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CAMERA VIEW - FORMATO CUADRADO CON DIMENSIONES FIJAS */}
              <View className="flex-1 justify-center items-center bg-black px-4">
                <View
                  className="w-full overflow-hidden rounded-lg bg-zinc-900"
                  style={{ aspectRatio: 1 }}
                >
                  <CameraView
                    ref={cameraRef}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    facing={cameraFacing}
                    mode={cameraMode === 'video' ? 'video' : 'picture'}
                  />
                  {/* Recording indicator */}
                  {isRecording && (
                    <View className="absolute top-4 left-4 flex-row items-center bg-savage-red px-3 py-1 rounded-full">
                      <View className="w-3 h-3 rounded-full bg-white mr-2" />
                      <Text className="text-white font-bold font-mono">{recordingTime}s / 10s</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* PROCESSING INDICATOR */}
              {captureProcessing && (
                <View className="absolute inset-0 bg-black/80 justify-center items-center z-50">
                  <ActivityIndicator size="large" color="#DC2626" />
                  <Text className="text-white mt-4 font-bold">PROCESANDO...</Text>
                </View>
              )}

              {/* CONTROLS */}
              <View className="bg-black py-4 border-t border-zinc-900">
                {/* BOTÓN GALERÍA */}
                <View className="flex-row justify-center mb-4">
                  <TouchableOpacity
                    onPress={() => {
                      setCameraModalVisible(false);
                      setTimeout(() => pickFromGallery(), 300);
                    }}
                    className="bg-zinc-900 px-6 py-3 rounded-full border border-zinc-700"
                    disabled={isRecording}
                  >
                    <Text className="text-white font-bold">📁 GALERÍA</Text>
                  </TouchableOpacity>
                </View>

                {/* CAPTURE/RECORD BUTTON */}
                <View className="items-center">
                  {cameraMode === 'photo' ? (
                    <>
                      <TouchableOpacity
                        onPress={capturePhoto}
                        disabled={captureProcessing}
                        className="w-20 h-20 rounded-full border-4 border-white bg-transparent items-center justify-center"
                      >
                        <View className="w-16 h-16 rounded-full bg-white" />
                      </TouchableOpacity>
                      <Text className="text-zinc-500 text-xs mt-3 tracking-wider">
                        TOCA PARA FOTO
                      </Text>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={isRecording ? stopVideoRecording : startVideoRecording}
                        disabled={captureProcessing}
                        className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-savage-red' : 'border-white'} bg-transparent items-center justify-center`}
                      >
                        {isRecording ? (
                          <View className="w-8 h-8 rounded-sm bg-savage-red" />
                        ) : (
                          <View className="w-16 h-16 rounded-full bg-savage-red" />
                        )}
                      </TouchableOpacity>
                      <Text className="text-zinc-500 text-xs mt-3 tracking-wider">
                        {isRecording ? 'TOCA PARA DETENER' : 'TOCA PARA GRABAR (MÁX 10s)'}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    );
  };

  const renderVideoViewer = () => {
    return (
      <Modal
        visible={videoViewerVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          setVideoViewerVisible(false);
        }}
      >
        <View className="flex-1 bg-savage-black">
          {/* VIDEO FULLSCREEN CON OVERLAYS */}
          {selectedVideo && (
            <View className="flex-1">
              {/* VIDEO con TAP para pausar/reanudar */}
              {historialVideoSource ? (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={handleHistorialVideoTap}
                  style={{ flex: 1 }}
                >
                  <VideoView
                    player={historialPlayer}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    contentFit="cover"
                    nativeControls={false}
                  />
                  {/* Icono de Play cuando está pausado */}
                  {isVideoManuallyPaused && (
                    <View className="absolute inset-0 justify-center items-center">
                      <View className="bg-black/60 rounded-full p-6">
                        <Play color="#DC2626" size={64} fill="#DC2626" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <View className="flex-1 bg-zinc-900 justify-center items-center">
                  <Text className="text-zinc-500">Video no disponible</Text>
                </View>
              )}

              {/* === OVERLAY BRANDING === */}

              {/* TOP BAR - Logo + Fecha */}
              <View className="absolute top-0 left-0 right-0 z-50">
                <LinearGradient
                  colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0)']}
                  className="px-6 pt-14 pb-10"
                >
                  <View className="flex-row justify-between items-center">
                    {/* Close Button */}
                    <TouchableOpacity
                      onPress={() => setVideoViewerVisible(false)}
                      className="bg-black/50 p-2 rounded-full"
                    >
                      <X color="#FFFFFF" size={24} />
                    </TouchableOpacity>

                    {/* TRENS Logo */}
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 bg-savage-red rounded-lg items-center justify-center">
                        <Text className="text-white font-black text-sm">T</Text>
                      </View>
                      <Text className="text-white font-bold tracking-wider">TRENS</Text>
                    </View>

                    {/* Visibility Badge */}
                    <View
                      className={`px-3 py-1 rounded-full ${selectedVideo.is_public ? 'bg-green-500/20' : 'bg-zinc-800'}`}
                    >
                      <Text
                        className={`text-xs font-bold ${selectedVideo.is_public ? 'text-green-500' : 'text-zinc-500'}`}
                      >
                        {selectedVideo.is_public ? 'PÚBLICO' : 'PRIVADO'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* BOTTOM BAR - Datos del ejercicio */}
              <View className="absolute bottom-0 left-0 right-0 z-50">
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.95)']}
                  className="px-6 pt-20 pb-10"
                >
                  {/* Ejercicio Name (si está disponible) */}
                  {modalExercise && (
                    <Text className="text-white text-2xl font-bold mb-4 tracking-wide">
                      {modalExercise.name}
                    </Text>
                  )}

                  {/* Datos: Peso x Reps */}
                  <View className="flex-row items-baseline mb-4">
                    <Text className="text-savage-red text-5xl font-black font-mono">
                      {selectedVideo.weight}
                    </Text>
                    <Text className="text-white text-xl font-bold ml-1">KG</Text>
                    <Text className="text-zinc-500 text-3xl mx-3">×</Text>
                    <Text className="text-savage-red text-5xl font-black font-mono">
                      {selectedVideo.reps}
                    </Text>
                    <Text className="text-white text-xl font-bold ml-1">REPS</Text>
                  </View>

                  {/* Spotify Track (si tiene) */}
                  {selectedVideo.spotify?.enabled && (
                    <TouchableOpacity
                      className="flex-row items-center bg-black/50 rounded-full px-4 py-2 self-start mb-4"
                      onPress={() => {
                        if (isPro && spotifyPremium && selectedVideo.spotify?.trackUri) {
                          // PRO: Sincronizar desde posición exacta
                          spotify.syncWithVideo(
                            selectedVideo.spotify.trackUri,
                            selectedVideo.spotify.positionMs || 0
                          );
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } else {
                          // FREE: Mostrar mensaje de upgrade
                          Alert.alert(
                            '🎵 Spotify Sync',
                            'Activa PRO para reproducir la música exacta con la que se grabó este video.',
                            [{ text: 'ENTENDIDO', style: 'default' }]
                          );
                        }
                      }}
                    >
                      {isPro && spotifyPremium ? (
                        <Volume2 color="#1DB954" size={16} />
                      ) : (
                        <Lock color="#71717A" size={16} />
                      )}
                      <Text className="text-green-500 text-sm font-bold ml-2">
                        {selectedVideo.spotify.trackName}
                      </Text>
                      <Text className="text-zinc-500 text-sm ml-1">
                        – {selectedVideo.spotify.artist}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Fecha */}
                  <Text className="text-zinc-500 text-sm">{selectedVideo.date}</Text>

                  {/* ACTIONS */}
                  <View className="flex-row justify-around mt-6 pt-4 border-t border-zinc-800">
                    {/* Delete */}
                    <TouchableOpacity className="items-center" onPress={handleDeleteVideo}>
                      <View className="bg-zinc-900 p-3 rounded-full border border-zinc-800 mb-1">
                        <Trash2 color="#DC2626" size={20} />
                      </View>
                      <Text className="text-zinc-600 text-[10px]">ELIMINAR</Text>
                    </TouchableOpacity>

                    {/* Toggle Visibility */}
                    <TouchableOpacity className="items-center" onPress={handleToggleVisibility}>
                      <View
                        className={`p-3 rounded-full border mb-1 ${
                          selectedVideo.is_public
                            ? 'bg-green-500/20 border-green-500/50'
                            : 'bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        {selectedVideo.is_public ? (
                          <Eye color="#22C55E" size={20} />
                        ) : (
                          <EyeOff color="#71717A" size={20} />
                        )}
                      </View>
                      <Text className="text-zinc-600 text-[10px]">
                        {selectedVideo.is_public ? 'EN TRENS' : 'OCULTO'}
                      </Text>
                    </TouchableOpacity>

                    {/* Share - Screen Record Hint */}
                    <TouchableOpacity className="items-center" onPress={handleShareVideo}>
                      <View className="bg-savage-red p-3 rounded-full mb-1">
                        <Share2 color="#FFFFFF" size={20} />
                      </View>
                      <Text className="text-zinc-600 text-[10px]">COMPARTIR</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  const renderHistorialModal = () => {
    if (!modalExercise) return null;

    return (
      <Modal
        visible={historialModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistorialModalVisible(false)}
      >
        <View className="flex-1 bg-transparent justify-end">
          <Animated.View
            className="bg-black rounded-t-3xl"
            style={[{ height: '85%' }, animatedStyleHistorial]}
          >
            {/* Drag Handle + Header (Área para arrastrar) */}
            <Animated.View
              className="items-center pt-4 pb-4 border-b border-zinc-800"
              {...panResponderHistorial.panHandlers}
            >
              <View className="w-12 h-1 bg-zinc-600 rounded-full mb-4" />

              {/* Header */}
              <View className="px-6 pb-2 w-full">
                <Text className="text-savage-text text-xl font-bold text-center">
                  {modalExercise.name}
                </Text>
                <Text className="text-zinc-500 text-xs mt-1 tracking-wider text-center uppercase">
                  Historial de Videos
                </Text>
              </View>
            </Animated.View>

            {/* Lista de Videos */}
            <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
              {loadingVideos ? (
                <View className="flex-1 justify-center items-center py-20">
                  <ActivityIndicator color="#DC2626" size="large" />
                  <Text className="text-zinc-500 text-center mt-4 text-sm">Cargando videos...</Text>
                </View>
              ) : exerciseVideos.length === 0 ? (
                <View className="flex-1 justify-center items-center py-20">
                  <CameraIcon color="#3F3F46" size={48} />
                  <Text className="text-zinc-600 text-center mt-4 text-base">
                    Sin videos registrados
                  </Text>
                  <Text className="text-zinc-700 text-center mt-2 text-xs">
                    Graba tu primer set desde el botón PRO
                  </Text>
                </View>
              ) : (
                exerciseVideos.map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    onPress={() => {
                      setSelectedVideo(video);
                      setVideoViewerVisible(true);
                      setHistorialModalVisible(false);
                    }}
                    className="flex-row bg-zinc-900 rounded-xl mb-3 border border-zinc-800 overflow-hidden"
                  >
                    {/* Thumbnail - usa VideoView pausado para mostrar primer frame */}
                    <View className="bg-zinc-800 w-24 aspect-[3/4] justify-center items-center overflow-hidden">
                      {video.videoUrl || video.video_url ? (
                        <VideoThumbnail
                          videoUrl={video.videoUrl || video.video_url || ''}
                          width={96}
                          height={128}
                        />
                      ) : (
                        <Play color="#52525b" size={28} fill="#52525b" />
                      )}
                      <View className="absolute inset-0 items-center justify-center bg-black/30">
                        <Play color="#fff" size={20} fill="#fff" />
                      </View>
                    </View>

                    {/* Datos */}
                    <View className="flex-1 p-3 justify-center">
                      <View className="flex-row items-baseline mb-1">
                        <Text className="text-white font-bold text-2xl font-mono">
                          {video.weight}
                        </Text>
                        <Text className="text-zinc-500 text-xs ml-1">kg</Text>
                        <Text className="text-zinc-700 text-xl mx-1">×</Text>
                        <Text className="text-white font-bold text-2xl font-mono">
                          {video.reps}
                        </Text>
                        <Text className="text-zinc-500 text-xs ml-1">reps</Text>
                      </View>
                      <Text className="text-zinc-600 text-xs">{video.date}</Text>
                      <View className="flex-row items-center mt-1">
                        <View
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            video.is_public ? 'bg-green-500' : 'bg-zinc-700'
                          }`}
                        />
                        <Text className="text-zinc-600 text-[10px] uppercase tracking-wider">
                          {video.is_public ? 'Público' : 'Privado'}
                        </Text>
                        {video.spotify?.enabled && (
                          <View className="flex-row items-center ml-2">
                            <Music color="#1DB954" size={10} />
                            <Text className="text-green-500 text-[10px] ml-1">
                              {video.spotify.trackName}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const renderStructureModal = () => {
    if (!modalExercise) return null;

    return (
      <Modal
        visible={structureModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStructureModalVisible(false)}
      >
        <View className="flex-1 bg-transparent justify-end">
          <Animated.View
            className="bg-black rounded-t-3xl"
            style={[{ height: '85%' }, animatedStyleStructure]}
          >
            {/* Drag Handle + Header (Área para arrastrar) */}
            <Animated.View
              className="items-center pt-4 pb-4 border-b border-zinc-800"
              {...panResponderStructure.panHandlers}
            >
              <View className="w-12 h-1 bg-zinc-600 rounded-full mb-4" />

              {/* Header */}
              <View className="px-6 pb-2 w-full">
                <Text className="text-savage-text text-xl font-bold text-center">
                  {modalExercise.name}
                </Text>
                <Text className="text-zinc-500 text-xs mt-1 tracking-wider text-center uppercase">
                  Estructura de Series
                </Text>
              </View>
            </Animated.View>

            {/* Lista de Series */}
            <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
              {(modalExercise.series || [])
                .filter((serie) => serie && typeof serie === 'object')
                .map((serie, idx) => {
                  const typeInfo = {
                    WARMUP: { color: '#3b82f6', label: 'Calentamiento' },
                    FEEDER: { color: '#eab308', label: 'Aproximación' },
                    EFFECTIVE: { color: '#22c55e', label: 'Efectiva' },
                    INTENSITY: { color: '#ef4444', label: 'Al Fallo' },
                  };
                  const info = typeInfo[serie.type as keyof typeof typeInfo] || {
                    color: '#71717a',
                    label: 'Efectiva',
                  };

                  return (
                    <View
                      key={serie.id || String(idx)}
                      className="flex-row items-center mb-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800"
                    >
                      {/* Número de Serie */}
                      <View className="bg-savage-red rounded-full w-8 h-8 justify-center items-center mr-3">
                        <Text className="text-white font-bold text-sm font-mono">{idx + 1}</Text>
                      </View>

                      {/* Color Tag - Esfera */}
                      <View
                        className="w-7 h-7 rounded-full mr-3 items-center justify-center"
                        style={{ backgroundColor: info.color }}
                      >
                        <Text className="text-white text-[10px] font-bold">
                          {String(serie.reps || 0)}
                        </Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <View className="flex-row items-baseline mb-0.5">
                          <Text className="text-savage-text font-bold text-lg">
                            {String(serie.reps || 0)}
                          </Text>
                          <Text className="text-zinc-500 text-xs ml-1">REPS</Text>
                          {serie.weight && Number(serie.weight) > 0 ? (
                            <>
                              <Text className="text-zinc-700 text-base mx-1">×</Text>
                              <Text className="text-savage-red font-bold text-lg">
                                {String(serie.weight)}
                              </Text>
                              <Text className="text-zinc-500 text-xs ml-1">kg</Text>
                            </>
                          ) : null}
                        </View>
                        <Text className="text-zinc-500 text-[10px] uppercase tracking-wider">
                          {String(info.label)}
                        </Text>
                        {serie.note ? (
                          <Text className="text-zinc-600 text-xs mt-1 italic">
                            "{String(serie.note)}"
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // ============================================================================
  // RENDER FOCUS MODE (VERTICAL SCROLL - TIKTOK STYLE)
  // ============================================================================
  return (
    <GestureHandlerRootView className="flex-1 bg-black">
      {/* HEADER FIJO - Estilo ADN */}
      <View className="absolute top-0 left-0 right-0 z-50">
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.8)', 'transparent']}
          className="px-4 pt-14 pb-6"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white text-lg font-bold tracking-wider uppercase">
                {trainingProgram.days[selectedDayIndex]?.muscleGroups || 'ENTRENAMIENTO'}
              </Text>
              <Text className="text-zinc-500 text-xs font-mono mt-0.5">{getCurrentTime()}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setViewMode('STRUCTURE')}
              className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800"
            >
              <Sliders color="#DC2626" size={18} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* HUD TÁCTICO (Flotante Derecha - Arriba de Hank) */}
      <View className="absolute right-4 bottom-24 z-40 gap-2">
        {/* TIMER */}
        <View>
          {timerActive ? (
            // Cuenta regresiva activa
            <View className="bg-black/90 p-3 rounded-full border-2 border-savage-red items-center justify-center">
              <Text className="text-savage-red font-mono font-bold text-xs">
                {formatTime(timeRemaining)}
              </Text>
            </View>
          ) : timerExpanded ? (
            // Burbujas desplegadas
            <View className="gap-2 bg-black/90 p-2 rounded-2xl border border-zinc-800">
              <TouchableOpacity
                onPress={() => startTimer(1)}
                className="bg-zinc-800 px-3 py-1.5 rounded-full"
              >
                <Text className="text-savage-text text-[10px] font-bold">1m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => startTimer(2)}
                className="bg-zinc-800 px-3 py-1.5 rounded-full"
              >
                <Text className="text-savage-text text-[10px] font-bold">2m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => startTimer(3)}
                className="bg-zinc-800 px-3 py-1.5 rounded-full"
              >
                <Text className="text-savage-text text-[10px] font-bold">3m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTimerExpanded(false)}
                className="bg-savage-red px-3 py-1.5 rounded-full"
              >
                <X color="#FFF" size={12} />
              </TouchableOpacity>
            </View>
          ) : (
            // Icono normal
            <TouchableOpacity
              onPress={() => setTimerExpanded(true)}
              className="bg-black/80 p-3 rounded-full border border-zinc-800"
            >
              <Timer color="#FFFFFF" size={20} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* VERTICAL SCROLL (ESTILO TIKTOK) */}
      <FlatList
        ref={exerciseListRef}
        data={exercises}
        keyExtractor={(item) => item.id}
        pagingEnabled
        getItemLayout={(_, index) => ({
          length: CONTENT_HEIGHT,
          offset: CONTENT_HEIGHT * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={({ viewableItems }) => {
          // Actualizar el índice del ejercicio activo cuando cambia el visible
          if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setActiveExerciseIndex(viewableItems[0].index);
          }
        }}
        onMomentumScrollEnd={() => {
          // Haptic Feedback al cambiar ejercicio
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        ListEmptyComponent={
          <View style={{ height: CONTENT_HEIGHT }} className="justify-center items-center px-6">
            <View className="w-20 h-20 rounded-full bg-zinc-900 items-center justify-center mb-6">
              <Plus size={32} color="#DC2626" />
            </View>
            <Text className="text-white text-xl font-bold text-center mb-2">SIN EJERCICIOS</Text>
            <Text className="text-zinc-500 text-center text-sm mb-8">
              Configura tu rutina para comenzar a entrenar
            </Text>
            <TouchableOpacity
              onPress={() => setViewMode('STRUCTURE')}
              className="bg-savage-red px-8 py-4 rounded-lg"
            >
              <Text className="text-white font-bold tracking-wider">CONFIGURAR RUTINA</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => {
          // Preparar array de ejercicios: principal + alternativas
          const allVariations = [
            {
              id: item.id,
              name: item.name,
              image_url: item.image_url,
              videos: item.videos,
              isMain: true,
            },
            ...(item.alternatives || []).map((alt: ExerciseAlternative) => ({
              ...alt,
              isMain: false,
            })),
          ];

          const activeAltIndex = activeAlternatives[index] || 0;

          return (
            <FlatList
              horizontal
              data={allVariations}
              keyExtractor={(variation) => variation.id}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={activeAltIndex}
              getItemLayout={(_, idx) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * idx,
                index: idx,
              })}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveAlternatives((prev) => ({ ...prev, [index]: newIndex }));
              }}
              renderItem={({ item: variation }) => (
                <View style={{ width: SCREEN_WIDTH, height: CONTENT_HEIGHT }} className="bg-black">
                  {/* CONTENEDOR PRINCIPAL */}
                  <View className="flex-1">
                    {/* IMAGEN/VIDEO HERO */}
                    <View className="relative">
                      {isVideoUrl(variation.image_url) ? (
                        <VideoHero
                          videoUrl={variation.image_url!}
                          videoMuted={videoMuted}
                          screenWidth={SCREEN_WIDTH}
                          isActive={
                            isFocused &&
                            index === activeExerciseIndex &&
                            activeAltIndex ===
                              allVariations.findIndex((v) => v.id === variation.id) &&
                            !editorVisible &&
                            !cameraModalVisible &&
                            !isPickingFromGallery
                          }
                        />
                      ) : (
                        <Image
                          source={{ uri: variation.image_url }}
                          style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                          contentFit="cover"
                        />
                      )}

                      {/* OVERLAY GRADIENTE SUPERIOR */}
                      <LinearGradient
                        colors={['rgba(0,0,0,0.8)', 'transparent']}
                        className="absolute top-0 left-0 right-0 h-32"
                      />

                      {/* OVERLAY GRADIENTE INFERIOR */}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.9)', '#000']}
                        className="absolute bottom-0 left-0 right-0 h-24"
                      />

                      {/* TÍTULO EJERCICIO - Sobre la imagen */}
                      <View className="absolute top-24 left-4 right-16">
                        <Text
                          className="text-white text-2xl font-bold uppercase tracking-wide"
                          numberOfLines={2}
                          adjustsFontSizeToFit
                        >
                          {variation.name}
                        </Text>
                        {!variation.isMain && (
                          <View className="flex-row items-center mt-1">
                            <View className="w-1.5 h-1.5 bg-savage-red rounded-sm mr-1.5" />
                            <Text className="text-zinc-500 text-[10px] uppercase tracking-widest">
                              Alternativa
                            </Text>
                          </View>
                        )}

                        {/* INDICADORES DE ALTERNATIVAS (DOTS) */}
                        {allVariations.length > 1 && (
                          <View className="flex-row gap-1.5 mt-2">
                            {allVariations.map((_, dotIndex) => (
                              <View
                                key={dotIndex}
                                className={`h-1.5 rounded-full ${
                                  dotIndex === activeAltIndex
                                    ? 'w-5 bg-savage-red'
                                    : 'w-1.5 bg-zinc-600'
                                }`}
                              />
                            ))}
                          </View>
                        )}
                      </View>

                      {/* BOTÓN NOTAS */}
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentExerciseIndex(index);
                          setNotesModalVisible(true);
                        }}
                        className="absolute top-24 right-4 z-50 bg-black/70 p-2.5 rounded-full border border-zinc-700"
                      >
                        <Edit3 color="#FFFFFF" size={16} />
                      </TouchableOpacity>

                      {/* BOTÓN MUTE/AUDIO (solo para videos) */}
                      {isVideoUrl(variation.image_url) && (
                        <TouchableOpacity
                          onPress={() => {
                            setVideoMuted(!videoMuted);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          className="absolute bottom-20 left-4 bg-black/70 p-2.5 rounded-full border border-zinc-700"
                        >
                          <Text className="text-white text-lg">{videoMuted ? '🔇' : '🔊'}</Text>
                        </TouchableOpacity>
                      )}

                      {/* BOTÓN CÁMARA */}
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentExerciseIndex(index);
                          setCurrentVariationId(variation.id);
                          openCamera();
                        }}
                        className="absolute bottom-20 right-4 bg-savage-red p-3 rounded-full shadow-lg border-2 border-white"
                        style={{
                          shadowColor: '#DC2626',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <CameraIcon color="#FFFFFF" size={22} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>

                    {/* CARDS - Justo debajo de la imagen, sin flex-1 */}
                    <View className="bg-black px-4 pt-2 pb-2">
                      {/* CARD HISTORIAL */}
                      <TouchableOpacity
                        onPress={() => {
                          setModalExercise(item);
                          setHistorialModalVisible(true);
                        }}
                        className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 mb-2"
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5 mb-1.5">
                              <View className="w-1 h-1 bg-savage-red rounded-full" />
                              <Text className="text-zinc-500 text-[10px] tracking-widest uppercase">
                                Historial
                              </Text>
                            </View>
                            {variation.videos.length > 0 ? (
                              <>
                                <Text className="text-white font-bold text-sm">
                                  Último: {variation.videos[0].weight}kg ×{' '}
                                  {variation.videos[0].reps} reps
                                </Text>
                                <Text className="text-zinc-600 text-xs mt-0.5">
                                  {variation.videos[0].date}
                                </Text>
                              </>
                            ) : (
                              <Text className="text-zinc-600 text-sm">Sin registros</Text>
                            )}
                          </View>
                          <View className="bg-zinc-800 px-2.5 py-1 rounded-full">
                            <Text className="text-zinc-400 font-bold font-mono text-xs">
                              {variation.videos.length}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* CARD ESTRUCTURA */}
                      <TouchableOpacity
                        onPress={() => {
                          setModalExercise(item);
                          setStructureModalVisible(true);
                        }}
                        className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800"
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5 mb-1.5">
                              <View className="w-1 h-1 bg-savage-red rounded-full" />
                              <Text className="text-zinc-500 text-[10px] tracking-widest uppercase">
                                Estructura
                              </Text>
                            </View>
                            <View className="flex-row flex-wrap gap-1">
                              {((variation as any).series || (item as any).series || [])
                                .filter((s: any) => s && typeof s === 'object')
                                .map((s: any, idx: number) => {
                                  const typeColors: Record<string, string> = {
                                    WARMUP: 'bg-blue-500',
                                    FEEDER: 'bg-yellow-500',
                                    EFFECTIVE: 'bg-green-500',
                                    INTENSITY: 'bg-red-500',
                                  };
                                  const colorClass = typeColors[s.type as string] || 'bg-zinc-500';
                                  return (
                                    <View
                                      key={String(idx)}
                                      className={`${colorClass} w-6 h-6 rounded-full items-center justify-center`}
                                    >
                                      <Text className="text-white text-[8px] font-bold">
                                        {String(s.reps || 0)}
                                      </Text>
                                    </View>
                                  );
                                })}
                            </View>
                          </View>
                          <View className="bg-zinc-800 px-2.5 py-1 rounded-full">
                            <Text className="text-zinc-400 font-bold font-mono text-xs">
                              {((variation as any).series || (item as any).series || []).length}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* ESPACIADOR FLEXIBLE */}
                    <View className="flex-1" />

                    {/* FOOTER "PRÓXIMO" */}
                    {variation.isMain && index < exercises.length - 1 && (
                      <View className="bg-zinc-900 py-3 px-4 border-t border-zinc-800">
                        <View className="flex-row items-center gap-2">
                          <ChevronDown color="#DC2626" size={16} />
                          <Text
                            className="text-zinc-400 text-xs tracking-wider uppercase flex-1 font-medium"
                            numberOfLines={1}
                          >
                            Siguiente:{' '}
                            <Text className="text-white">{exercises[index + 1].name}</Text>
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}
            />
          );
        }}
      />

      {/* MODALS */}
      {renderNotesModal()}
      {renderHankModal()}
      {renderVideoViewer()}
      {renderHistorialModal()}
      {renderStructureModal()}
      {renderCameraModal()}
      {renderEditorModal()}
    </GestureHandlerRootView>
  );
}
