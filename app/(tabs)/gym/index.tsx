import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
  ScrollView,
  Pressable,
  PanResponder,
  AppState,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import React, { useState, useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../_layout';
import {
  Sliders,
  Plus,
  Trash2,
  X,
  Music,
  Sparkles,
  Timer,
  Edit3,
  Camera as CameraIcon,
  Video,
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
// COMPONENTE: VIDEO HERO
// ============================================================================
const VideoHero = ({
  videoUrl,
  videoMuted,
  isActive,
}: {
  videoUrl: string;
  videoMuted: boolean;
  isActive: boolean;
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
      style={{ width: SCREEN_WIDTH, aspectRatio: 1 }}
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
  exercise_id: string;
  video_url: string;
  thumbnail_url: string;
  weight: number;
  reps: number;
  date: string;
  is_public: boolean;
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function GymScreen() {
  const { user } = useAuth();
  const isFocused = useIsFocused(); // Detecta si esta pantalla está activa
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
  const [spotifyModalVisible, setSpotifyModalVisible] = useState(false);
  const [axisModalVisible, setAxisModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Video State
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);

  // Modal State
  const [historialModalVisible, setHistorialModalVisible] = useState(false);
  const [structureModalVisible, setStructureModalVisible] = useState(false);
  const [modalExercise, setModalExercise] = useState<Exercise | null>(null);

  // Camera State
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [captureProcessing, setCaptureProcessing] = useState(false);

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

  // ============================================================================
  // TRAINING DAY LOGIC
  // ============================================================================
  const updateTrainingDay = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('training_last_access, training_current_day')
        .eq('id', user.id)
        .single();

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

  useEffect(() => {
    if (isFocused && user) {
      updateTrainingDay();
    }
  }, [isFocused, user]);

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
    if (user) {
      loadExercises(selectedDayIndex);
    }
  }, [selectedDayIndex, user]);

  const loadExercises = async (dayIndex: number | null = null) => {
    if (!user) {
      return;
    }
    setLoading(true);
    const targetDayIndex = dayIndex !== null ? dayIndex : selectedDayIndex;

    try {
      // Cargar TODOS los ejercicios del usuario y filtrar en cliente
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'gym_exercise')
        .is('deleted_at', null) // Solo ejercicios activos
        .order('order', { ascending: true });

      if (error) throw error;

      // Filtrar por día de entrenamiento usando array training_days
      const filteredData =
        data?.filter((item: any) => {
          const itemDays = item.training_days || [0]; // Default [0] si no existe
          return itemDays.includes(targetDayIndex);
        }) || [];

      console.log(`� TOTAL EJERCICIOS EN DB: ${data?.length || 0}`);
      console.log(
        '  - TODOS:',
        data?.map((e: any) => ({
          name: e.name,
          id: e.id?.substring(0, 8),
          hasCustomImage: !e.asset_url?.includes('unsplash'),
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
            hasCustomImage: !e.asset_url?.includes('unsplash'),
            training_days: e.training_days,
          }))
        );
      }

      if (filteredData && filteredData.length > 0) {
        // Cargar alternativas desde user_exercise_alternatives
        const { data: alternativesData } = await supabase
          .from('user_exercise_alternatives')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true });

        // Cargar los datos completos de las alternativas
        const alternativeIds = alternativesData?.map((a: any) => a.alternative_exercise_id) || [];

        console.log('🔍 DEBUG ALTERNATIVAS:');
        console.log('  - Total relaciones:', alternativesData?.length || 0);
        console.log('  - IDs de alternativas:', alternativeIds);

        const { data: alternativeAssets } = await supabase
          .from('user_assets')
          .select('*')
          .in('id', alternativeIds);

        console.log('  - Assets cargados:', alternativeAssets?.length || 0);
        if (alternativeAssets && alternativeAssets.length > 0) {
          console.log(
            '  - Assets details:',
            alternativeAssets.map((a: any) => ({
              id: a.id,
              name: a.name,
              url: a.asset_url,
            }))
          );
        }

        // AUTO-REPARACIÓN: Detectar y corregir IDs obsoletos (verificar contra TODOS los ejercicios, no solo filteredData)
        const orphanedRelations =
          alternativesData?.filter((rel: any) => {
            const mainExists = data?.some((ex: any) => ex.id === rel.main_exercise_id);
            return !mainExists;
          }) || [];

        if (orphanedRelations.length > 0 && !autoRepairDone.current) {
          autoRepairDone.current = true;
          console.log(
            '🗑️ AUTO-CLEANUP: Eliminando',
            orphanedRelations.length,
            'relaciones huérfanas'
          );

          // ELIMINAR relaciones huérfanas en lugar de reasignarlas
          const { error: deleteError } = await supabase
            .from('user_exercise_alternatives')
            .delete()
            .in(
              'id',
              orphanedRelations.map((o: any) => o.id)
            );

          if (deleteError) {
            console.error('❌ Error eliminando relaciones huérfanas:', deleteError);
          } else {
            console.log('✅ Relaciones huérfanas eliminadas correctamente');
          }

          // Continuar con el mapeo normal (sin recargar)
        }

        const mappedExercises: Exercise[] = filteredData.map((item, index) => {
          // Buscar alternativas vinculadas a este ejercicio
          const alternativeRelations =
            alternativesData?.filter((rel: any) => rel.main_exercise_id === item.id) || [];

          // Cargar estructura personalizada si existe (ANTES de mapear alternativas)
          const customSeriesData: SeriesConfig[] = item.metadata?.custom_series || [];
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

          // Mapear alternativas CON las series del ejercicio principal
          const alternatives: ExerciseAlternative[] = alternativeRelations.map((rel: any) => {
            const asset = alternativeAssets?.find((a: any) => a.id === rel.alternative_exercise_id);

            return {
              id: asset?.id || '',
              name: asset?.name || 'UNKNOWN',
              image_url: asset?.asset_url || '',
              videos: [], // Las alternativas usan la imagen/video del asset_url
              series: seriesForState, // Usar las mismas series del ejercicio principal
            };
          });

          return {
            id: item.id,
            name: item.name || 'UNNAMED',
            sets: item.metadata?.sets || '0x0',
            image_url: item.asset_url || '',
            order: item.order || 0,
            series: seriesForState,
            training_days: item.training_days || [0],
            videos: generateMockVideos(item.id, index),
            alternatives,
          };
        });
        setExercises(mappedExercises);

        // Solo cambiar a FOCUS si no estamos ya en algún modo
        if (viewMode === 'LOADING') {
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
      const { data, error } = await supabase
        .from('asset_templates')
        .select('*')
        .eq('asset_type', 'gym_exercise')
        .order('category', { ascending: true });

      if (error) throw error;

      if (data) {
        setTemplates(data as AssetTemplate[]);
      }
    } catch (error) {
      console.error('💥 Error loading templates:', error);
    }
  };

  const loadAllUserExercises = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_assets')
        .select('name, asset_url')
        .eq('user_id', user.id)
        .eq('asset_type', 'gym_exercise')
        .is('deleted_at', null);

      if (error) throw error;

      if (data) {
        setAllUserExercises(
          data.map((ex) => ({
            name: ex.name,
            image_url: ex.asset_url,
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
        quality: 0.8,
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

      // Comprimir y hacer cuadrada la imagen (1:1)
      const manipulatedImage = await manipulateAsync(
        photo.uri,
        [
          { resize: { width: 1080 } },
          {
            crop: {
              originX: 0,
              originY: 0,
              width: 1080,
              height: 1080,
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

      // Eliminar el archivo anterior del storage si existe
      if (currentExercise.image_url) {
        const oldPath = currentExercise.image_url.split('/').pop();
        if (oldPath && oldPath !== currentExercise.image_url) {
          try {
            await supabase.storage
              .from('exercise-media')
              .remove([`${user.id}/${exerciseIdToUpdate}/${oldPath}`]);
          } catch (deleteError) {
            console.warn('No se pudo eliminar archivo anterior:', deleteError);
          }
        }
      }

      // Leer archivo como base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const fileExt = type === 'photo' ? 'jpg' : 'mp4';
      const fileName = `exercise_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${exerciseIdToUpdate}/${fileName}`;

      // Convertir base64 a ArrayBuffer
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Upload a Supabase Storage
      const { data, error } = await supabase.storage
        .from('exercise-media')
        .upload(filePath, byteArray, {
          contentType: type === 'photo' ? 'image/jpeg' : 'video/mp4',
          upsert: true,
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: urlData } = supabase.storage.from('exercise-media').getPublicUrl(filePath);

      console.log('📹 Media uploaded:', { type, filePath, url: urlData.publicUrl });

      // Actualizar en la base de datos
      console.log('💾 Actualizando DB:', { exerciseIdToUpdate, newUrl: urlData.publicUrl });
      const { error: updateError, data: updateData } = await supabase
        .from('user_assets')
        .update({ asset_url: urlData.publicUrl })
        .eq('id', exerciseIdToUpdate)
        .select();

      console.log('✅ DB actualizada:', { error: updateError, data: updateData });
      if (updateError) throw updateError;

      // Actualizar estado local - puede ser ejercicio principal o alternativa
      const updatedExercises = exercises.map((ex) => {
        if (ex.id === exerciseIdToUpdate) {
          return { ...ex, image_url: urlData.publicUrl };
        }
        // Si es alternativa, actualizar dentro del array de alternatives
        if (ex.alternatives && ex.alternatives.length > 0) {
          return {
            ...ex,
            alternatives: ex.alternatives.map((alt) =>
              alt.id === exerciseIdToUpdate ? { ...alt, image_url: urlData.publicUrl } : alt
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

      if (exerciseName) {
        setAllUserExercises((prev) => {
          const exists = prev.find((ex) => ex.name === exerciseName);
          if (exists) {
            return prev.map((ex) =>
              ex.name === exerciseName ? { ...ex, image_url: urlData.publicUrl } : ex
            );
          } else {
            return [...prev, { name: exerciseName, image_url: urlData.publicUrl }];
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
      // Verificar si ya existe un ejercicio con el mismo nombre (SIN importar el día)
      const { data: existingExercise, error: searchError } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'gym_exercise')
        .eq('name', template.name)
        .is('deleted_at', null)
        .maybeSingle();

      if (searchError) {
        console.error('Error buscando ejercicio existente:', searchError);
      }

      let data;
      let error;

      if (existingExercise) {
        // El ejercicio YA EXISTE - agregar este día a su array training_days
        const currentDays = existingExercise.training_days || [0];

        if (currentDays.includes(selectedDayIndex)) {
          alert('Este ejercicio ya está agregado en este día de entrenamiento');
          setAdding(false);
          return;
        }

        // Agregar el nuevo día al array
        const updatedDays = [...currentDays, selectedDayIndex].sort();

        const result = await supabase
          .from('user_assets')
          .update({
            training_days: updatedDays,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingExercise.id)
          .select()
          .single();

        data = result.data;
        error = result.error;
      } else {
        // Verificar si existe un ejercicio eliminado con el mismo nombre
        const { data: existingDeleted } = await supabase
          .from('user_assets')
          .select('*')
          .eq('user_id', user.id)
          .eq('asset_type', 'gym_exercise')
          .eq('name', template.name)
          .not('deleted_at', 'is', null)
          .maybeSingle();

        if (existingDeleted) {
          // Reactivar ejercicio eliminado (mantiene asset_url personalizado)
          const result = await supabase
            .from('user_assets')
            .update({
              deleted_at: null,
              training_days: [selectedDayIndex], // Asignar al día seleccionado
              order: exercises.length,
              updated_at: new Date().toISOString(),
              metadata: {
                sets: customSeries
                  ? `${customSeries.length}x${customSeries[0]?.reps || 10}`
                  : template.default_metadata.sets,
                rest: template.default_metadata.rest,
                category: template.category,
                difficulty: template.difficulty,
                custom_series: customSeries || null,
              },
            })
            .eq('id', existingDeleted.id)
            .select()
            .single();

          data = result.data;
          error = result.error;
        } else {
          // Crear NUEVO ejercicio con imagen por defecto
          const result = await supabase
            .from('user_assets')
            .insert({
              user_id: user.id,
              asset_type: 'gym_exercise',
              name: template.name,
              asset_url: template.image_url,
              training_days: [selectedDayIndex], // Array con el día seleccionado
              metadata: {
                sets: customSeries
                  ? `${customSeries.length}x${customSeries[0]?.reps || 10}`
                  : template.default_metadata.sets,
                rest: template.default_metadata.rest,
                category: template.category,
                difficulty: template.difficulty,
                custom_series: customSeries || null,
              },
              order: exercises.length,
            })
            .select()
            .single();

          data = result.data;
          error = result.error;
        }
      }

      if (error) throw error;

      if (data) {
        // No crear alternativas automáticamente
        // El usuario las vinculará manualmente más adelante

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
          : generateDefaultSeries(data.metadata.sets);

        const newExercise: Exercise = {
          id: data.id,
          name: data.name,
          sets: data.metadata.sets,
          image_url: data.asset_url,
          order: data.order,
          series: seriesForState,
          training_days: data.training_days || [selectedDayIndex],
          videos: [], // Sin historial al principio
          alternatives: [], // Se cargarán en próximo loadExercises
        };

        setExercises([...exercises, newExercise]);
        setModalVisible(false);

        // Recargar ejercicios para obtener alternativas (sin cambiar modo)
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
      // Obtener el ejercicio actual
      const { data: exercise, error: fetchError } = await supabase
        .from('user_assets')
        .select('training_days')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentDays = exercise?.training_days || [0];

      if (currentDays.length > 1) {
        // Si está en MÚLTIPLES días, solo REMOVER el día actual del array
        const updatedDays = currentDays.filter((day: number) => day !== selectedDayIndex);

        const { error } = await supabase
          .from('user_assets')
          .update({
            training_days: updatedDays,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Si está en UN SOLO día, hacer soft delete completo
        const { error } = await supabase
          .from('user_assets')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);

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
                // Actualizar ejercicio existente
                try {
                  const { error } = await supabase
                    .from('user_assets')
                    .update({
                      metadata: {
                        ...selectedTemplate.default_metadata,
                        sets: `${seriesConfig.length}x${seriesConfig[0]?.reps || 10}`,
                        custom_series: seriesConfig,
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
                className="flex-row bg-savage-dark border border-zinc-800 rounded-lg p-4 mb-3 items-center"
              >
                {/* IMAGE */}
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: 80, height: 80 }}
                  className="rounded-lg mr-4"
                  contentFit="cover"
                />

                {/* INFO */}
                <View className="flex-1">
                  <Text className="text-savage-text font-bold text-lg mb-1">{item.name}</Text>
                  <Text className="text-zinc-500 text-sm mb-2">{item.description}</Text>
                  <View className="flex-row gap-2">
                    <View className="bg-zinc-900 px-2 py-1 rounded">
                      <Text className="text-zinc-400 text-xs font-mono">{item.category}</Text>
                    </View>
                    <View className="bg-savage-red/20 px-2 py-1 rounded">
                      <Text className="text-savage-red text-xs font-bold">{item.difficulty}</Text>
                    </View>
                  </View>
                </View>

                {/* ARROW */}
                {adding ? (
                  <ActivityIndicator color="#DC2626" size="small" />
                ) : (
                  <Text className="text-savage-red text-2xl font-bold">→</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );

  // ============================================================================
  // RENDER STRUCTURE MODE
  // ============================================================================
  if (viewMode === 'STRUCTURE') {
    return (
      <View className="flex-1 bg-savage-black">
        {/* HEADER CON WHEEL ENGRANAJE */}
        <View className="px-6 pt-16 pb-4 border-b border-zinc-800">
          <Text className="text-savage-text text-4xl font-bold italic mb-4">STRUCTURE</Text>

          {/* WHEEL SELECTOR DÍAS - AHORA HORIZONTAL */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
          >
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
                  className={`mr-3 px-4 py-3 rounded-lg border-2 ${
                    isActive ? 'bg-savage-red border-savage-red' : 'bg-zinc-900/50 border-zinc-800'
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    {isCurrent && (
                      <View
                        className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-green-500'}`}
                      />
                    )}
                    <Text
                      className={`font-bold text-xs uppercase tracking-wider ${
                        isActive ? 'text-white' : 'text-zinc-400'
                      }`}
                    >
                      {day.muscleGroups}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* EXERCISES LIST */}
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          className="flex-1 px-6 pt-4"
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-zinc-700 text-center mb-8 text-lg font-mono">
                NO HAY EJERCICIOS CONFIGURADOS
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className="bg-savage-red px-8 py-6 rounded-lg"
              >
                <View className="flex-row items-center">
                  <Plus color="#FFFFFF" size={32} strokeWidth={3} />
                  <Text className="text-savage-text font-bold text-xl ml-3 tracking-widest">
                    AGREGAR PRIMER EJERCICIO
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={async () => {
                // Cargar template del ejercicio para editarlo
                const { data } = await supabase
                  .from('user_assets')
                  .select('*')
                  .eq('id', item.id)
                  .single();

                if (data) {
                  const template: AssetTemplate = {
                    id: data.id,
                    name: data.name,
                    description: data.metadata?.description || '',
                    image_url: data.asset_url || '',
                    category: data.metadata?.category || 'OTRO',
                    difficulty: data.metadata?.difficulty || 'MEDIO',
                    default_metadata: data.metadata || {},
                  };

                  // Cargar series existentes
                  const existingSeries: SeriesConfig[] = data.metadata?.custom_series || [];
                  setSeriesConfig(existingSeries);
                  setSelectedTemplate(template);
                  setSeriesConfigModalVisible(true);
                }
              }}
              className="bg-savage-dark border border-zinc-800 rounded-lg p-4 mb-3 flex-row items-center"
            >
              {/* ORDER NUMBER */}
              <View className="bg-savage-red rounded px-3 py-1 mr-4">
                <Text className="text-savage-text font-bold font-mono">{index + 1}</Text>
              </View>

              {/* IMAGE */}
              <Image
                source={{ uri: item.image_url }}
                style={{ width: 60, height: 60 }}
                className="rounded-lg mr-4"
                contentFit="cover"
              />

              {/* INFO */}
              <View className="flex-1">
                <Text className="text-savage-text font-bold text-lg mb-1">{item.name}</Text>
                {/* RESUMEN DE ESTRUCTURA */}
                {item.series && item.series.length > 0 && (
                  <View className="flex-row flex-wrap gap-1 mt-2">
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
                            className={`${colorClass} w-8 h-8 rounded-full items-center justify-center`}
                          >
                            <Text className="text-white text-[10px] font-bold leading-tight">
                              {String(s.reps || 0)}
                            </Text>
                            {s.weight && Number(s.weight) > 0 ? (
                              <Text className="text-white text-[7px] leading-none">
                                {Number(s.weight)}kg
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => deleteExercise(item.id)}
                className="p-3 bg-zinc-900 rounded"
              >
                <Trash2 color="#DC2626" size={20} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />

        {/* FOOTER */}
        <View className="border-t border-zinc-800 p-6 bg-savage-dark">
          {exercises.length > 0 && (
            <TouchableOpacity
              onPress={saveAndTrain}
              className="bg-savage-red p-5 rounded-lg items-center mb-3"
            >
              <Text className="text-savage-text font-bold text-lg tracking-widest">
                GUARDAR Y ENTRENAR →
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="border border-savage-red p-4 rounded-lg items-center"
          >
            <Text className="text-savage-red font-bold tracking-wider">+ AGREGAR EJERCICIO</Text>
          </TouchableOpacity>
        </View>

        {/* CATALOG MODAL */}
        {renderCatalogModal()}
        {renderSeriesConfigModal()}
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
        <View className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <Text className="text-savage-text text-2xl font-bold mb-4">NOTAS</Text>
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

  const renderSpotifyModal = () => (
    <Modal
      visible={spotifyModalVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setSpotifyModalVisible(false)}
    >
      <View className="flex-1 bg-black/90 justify-center px-6">
        <View className="bg-zinc-900 rounded-2xl p-6 border border-green-500">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-savage-text text-2xl font-bold">SPOTIFY</Text>
            <TouchableOpacity onPress={() => setSpotifyModalVisible(false)}>
              <X color="#FFFFFF" size={24} />
            </TouchableOpacity>
          </View>

          <View className="items-center py-8">
            <Music color="#1DB954" size={64} />
            <Text className="text-zinc-500 text-center mt-4">
              Conecta tu cuenta de Spotify{'\n'}para controlar la música
            </Text>
          </View>

          <TouchableOpacity className="bg-green-500 p-4 rounded-lg items-center">
            <Text className="text-black font-bold">CONECTAR SPOTIFY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAxisModal = () => (
    <Modal
      visible={axisModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setAxisModalVisible(false)}
    >
      <View className="flex-1 bg-black/95">
        <View className="flex-1 px-6 pt-16">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-savage-red text-2xl font-bold">AXIS IA</Text>
            <TouchableOpacity onPress={() => setAxisModalVisible(false)}>
              <X color="#DC2626" size={24} />
            </TouchableOpacity>
          </View>

          <View className="flex-1 bg-zinc-900 rounded-2xl p-4 border border-savage-red">
            <Text className="text-zinc-500 text-sm mb-4">
              Contexto: {exercises[currentExerciseIndex]?.name}
            </Text>
            <Text className="text-zinc-600">
              Hola, soy AXIS. ¿En qué puedo ayudarte con este ejercicio?
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
        <View className="flex-1 justify-center items-center">
          {imageToEdit && (
            <Image
              source={{ uri: imageToEdit }}
              style={{
                width: SCREEN_WIDTH * 0.9,
                height: SCREEN_WIDTH * 0.9,
              }}
              className="rounded-lg"
              contentFit="cover"
            />
          )}

          {/* Overlay con guías de recorte */}
          <View
            style={{
              position: 'absolute',
              width: SCREEN_WIDTH * 0.9,
              height: SCREEN_WIDTH * 0.9,
              borderWidth: 2,
              borderColor: '#DC2626',
              borderStyle: 'dashed',
            }}
          />
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

  const renderCameraModal = () => (
    <Modal
      visible={cameraModalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setCameraModalVisible(false)}
    >
      <View className="flex-1 bg-savage-black">
        {/* HEADER */}
        <View className="absolute top-0 left-0 right-0 z-50 bg-black/90 px-6 pt-14 pb-4">
          <View className="flex-row justify-between items-center mb-2">
            <TouchableOpacity
              onPress={() => {
                setCameraModalVisible(false);
              }}
            >
              <X color="#FFFFFF" size={28} />
            </TouchableOpacity>
            <Text className="text-savage-text font-bold text-lg tracking-wider">CAPTURAR FOTO</Text>
            <View style={{ width: 28 }} />
          </View>
          <Text className="text-zinc-500 text-center text-sm">
            {exercises[currentExerciseIndex]?.name}
          </Text>
        </View>

        {/* CAMERA VIEW - FORMATO CUADRADO */}
        <View className="flex-1 justify-center items-center bg-black">
          <CameraView
            ref={cameraRef}
            style={{
              width: SCREEN_WIDTH,
              height: SCREEN_WIDTH,
              overflow: 'hidden',
            }}
            facing="back"
          />
        </View>

        {/* PROCESSING INDICATOR */}
        {captureProcessing && (
          <View className="absolute inset-0 bg-black/80 justify-center items-center">
            <ActivityIndicator size="large" color="#DC2626" />
            <Text className="text-white mt-4 font-bold">PROCESANDO...</Text>
          </View>
        )}

        {/* CONTROLS */}
        <View className="absolute bottom-0 left-0 right-0 pb-10 pt-6 bg-gradient-to-t from-black via-black/90 to-transparent">
          {/* BOTÓN GALERÍA */}
          <View className="flex-row justify-center mb-6">
            <TouchableOpacity
              onPress={() => {
                setCameraModalVisible(false);
                setTimeout(() => pickFromGallery(), 300);
              }}
              className="bg-zinc-900 px-6 py-3 rounded-full border border-zinc-700"
            >
              <Text className="text-white font-bold">📁 SELECCIONAR DE GALERÍA</Text>
            </TouchableOpacity>
          </View>

          {/* CAPTURE BUTTON */}
          <View className="items-center">
            <TouchableOpacity
              onPress={capturePhoto}
              disabled={captureProcessing}
              className="w-20 h-20 rounded-full border-4 border-white bg-transparent items-center justify-center"
            >
              <View className="w-16 h-16 rounded-full bg-white" />
            </TouchableOpacity>
            <Text className="text-zinc-500 text-xs mt-4 tracking-wider">
              TOCA PARA CAPTURAR FOTO
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderVideoViewer = () => (
    <Modal
      visible={videoViewerVisible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => setVideoViewerVisible(false)}
    >
      <View className="flex-1 bg-savage-black">
        {/* HEADER */}
        <View className="absolute top-0 left-0 right-0 z-50 bg-black/90 px-6 pt-14 pb-4 flex-row justify-between items-center">
          <TouchableOpacity onPress={() => setVideoViewerVisible(false)}>
            <X color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <Text className="text-savage-text font-bold">HISTORIAL</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* VIDEO PREVIEW */}
        {selectedVideo && (
          <View className="flex-1 justify-center items-center">
            <Image
              source={{ uri: selectedVideo.thumbnail_url }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 }}
              contentFit="cover"
            />

            {/* DATA OVERLAY */}
            <View className="absolute bottom-40 left-0 right-0 bg-black/90 p-6">
              <View className="flex-row justify-around mb-4">
                <View className="items-center">
                  <Text className="text-zinc-500 text-xs mb-1">PESO</Text>
                  <Text className="text-savage-red text-3xl font-bold font-mono">
                    {selectedVideo.weight}kg
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-zinc-500 text-xs mb-1">REPS</Text>
                  <Text className="text-savage-red text-3xl font-bold font-mono">
                    {selectedVideo.reps}
                  </Text>
                </View>
              </View>

              <Text className="text-zinc-500 text-center text-sm">{selectedVideo.date}</Text>
            </View>

            {/* ACTIONS */}
            <View className="absolute bottom-10 left-6 right-6 flex-row justify-around">
              <TouchableOpacity className="bg-zinc-900 p-4 rounded-full border border-zinc-800">
                <Trash2 color="#DC2626" size={24} />
              </TouchableOpacity>

              <TouchableOpacity className="bg-zinc-900 p-4 rounded-full border border-zinc-800">
                <Text className="text-savage-text font-bold">📤</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`${
                  selectedVideo.is_public ? 'bg-savage-red' : 'bg-zinc-900'
                } p-4 rounded-full border ${
                  selectedVideo.is_public ? 'border-savage-red' : 'border-zinc-800'
                }`}
              >
                <Text className="text-savage-text font-bold text-xs">TRENS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  const renderHistorialModal = () => {
    if (!modalExercise) return null;

    return (
      <Modal
        visible={historialModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistorialModalVisible(false)}
      >
        <View className="flex-1 bg-transparent">
          <Animated.View
            className="bg-black"
            style={[{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 }, animatedStyleHistorial]}
          >
            {/* Drag Handle + Header (Área para arrastrar) */}
            <Animated.View
              className="items-center pt-6 pb-4 border-b border-zinc-800"
              {...panResponderHistorial.panHandlers}
            >
              <View className="w-16 h-1.5 bg-zinc-600 rounded-full mb-6" />

              {/* Header */}
              <View className="px-6 pb-2 w-full">
                <Text className="text-savage-text text-2xl font-bold text-center">
                  {modalExercise.name}
                </Text>
                <Text className="text-zinc-500 text-sm mt-2 tracking-wider text-center">
                  HISTORIAL DE VIDEOS
                </Text>
              </View>
            </Animated.View>

            {/* Lista de Videos */}
            <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={true}>
              {modalExercise.videos.length === 0 ? (
                <View className="flex-1 justify-center items-center py-20">
                  <CameraIcon color="#3F3F46" size={64} />
                  <Text className="text-zinc-600 text-center mt-4 text-lg">
                    Sin videos registrados
                  </Text>
                  <Text className="text-zinc-700 text-center mt-2 text-sm">
                    Graba tu primer set desde el botón PRO
                  </Text>
                </View>
              ) : (
                modalExercise.videos.map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    onPress={() => {
                      setSelectedVideo(video);
                      setVideoViewerVisible(true);
                      setHistorialModalVisible(false);
                    }}
                    className="flex-row bg-zinc-900 rounded-xl mb-4 border border-zinc-800 overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <View className="bg-zinc-800" style={{ width: 120, height: 160 }}>
                      <View className="flex-1 justify-center items-center">
                        <Text className="text-zinc-600 text-4xl">▶</Text>
                      </View>
                    </View>

                    {/* Datos */}
                    <View className="flex-1 p-4 justify-center">
                      <View className="flex-row items-baseline mb-2">
                        <Text className="text-white font-bold text-3xl font-mono">
                          {video.weight}
                        </Text>
                        <Text className="text-zinc-500 text-sm ml-1">kg</Text>
                        <Text className="text-zinc-700 text-2xl mx-2">×</Text>
                        <Text className="text-white font-bold text-3xl font-mono">
                          {video.reps}
                        </Text>
                        <Text className="text-zinc-500 text-sm ml-1">reps</Text>
                      </View>
                      <Text className="text-zinc-600 text-sm">{video.date}</Text>
                      <View className="flex-row items-center mt-2">
                        <View
                          className={`w-2 h-2 rounded-full mr-2 ${
                            video.is_public ? 'bg-green-500' : 'bg-zinc-700'
                          }`}
                        />
                        <Text className="text-zinc-600 text-xs">
                          {video.is_public ? 'PÚBLICO' : 'PRIVADO'}
                        </Text>
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
        <View className="flex-1 bg-transparent">
          <Animated.View
            className="bg-black"
            style={[{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 }, animatedStyleStructure]}
          >
            {/* Drag Handle + Header (Área para arrastrar) */}
            <Animated.View
              className="items-center pt-6 pb-4 border-b border-zinc-800"
              {...panResponderStructure.panHandlers}
            >
              <View className="w-16 h-1.5 bg-zinc-600 rounded-full mb-6" />

              {/* Header */}
              <View className="px-6 pb-2 w-full">
                <Text className="text-savage-text text-2xl font-bold text-center">
                  {modalExercise.name}
                </Text>
                <Text className="text-zinc-500 text-sm mt-2 tracking-wider text-center">
                  ESTRUCTURA DE SERIES
                </Text>
              </View>
            </Animated.View>

            {/* Lista de Series */}
            <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={true}>
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
                      className="flex-row items-center mb-4 bg-zinc-900/50 p-5 rounded-xl border border-zinc-800"
                    >
                      {/* Número de Serie */}
                      <View className="bg-savage-red rounded-full w-10 h-10 justify-center items-center mr-4">
                        <Text className="text-white font-bold text-lg font-mono">{idx + 1}</Text>
                      </View>

                      {/* Color Tag - Esfera más grande */}
                      <View
                        className="w-8 h-8 rounded-full mr-4 items-center justify-center"
                        style={{ backgroundColor: info.color }}
                      >
                        <Text className="text-white text-xs font-bold">
                          {String(serie.reps || 0)}
                        </Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <View className="flex-row items-baseline mb-1">
                          <Text className="text-savage-text font-bold text-xl">
                            {String(serie.reps || 0)}
                          </Text>
                          <Text className="text-zinc-500 text-sm ml-1">REPS</Text>
                          {serie.weight && Number(serie.weight) > 0 ? (
                            <>
                              <Text className="text-zinc-700 text-lg mx-2">×</Text>
                              <Text className="text-savage-red font-bold text-xl">
                                {String(serie.weight)}
                              </Text>
                              <Text className="text-zinc-500 text-sm ml-1">kg</Text>
                            </>
                          ) : null}
                        </View>
                        <Text className="text-zinc-500 text-xs uppercase tracking-wider">
                          {String(info.label)}
                        </Text>
                        {serie.note ? (
                          <Text className="text-zinc-600 text-sm mt-2 italic">
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
    <GestureHandlerRootView className="flex-1 bg-savage-black">
      {/* HEADER FIJO */}
      <View className="absolute top-0 left-0 right-0 z-50 bg-black/90 px-6 pt-14 pb-4 flex-row justify-between items-center">
        <View className="flex-1 items-center">
          <Text className="text-savage-text text-xl font-bold tracking-wider uppercase">
            {trainingProgram.days[selectedDayIndex]?.muscleGroups || 'ENTRENAMIENTO'}
          </Text>
          <Text className="text-zinc-500 text-sm font-mono">{getCurrentTime()}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setViewMode('STRUCTURE')}
          className="bg-zinc-900 p-3 rounded-lg ml-4"
        >
          <Sliders color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {/* HUD TÁCTICO (Flotante Derecha) */}
      <View className="absolute right-4 top-32 z-40 gap-4">
        {/* TIMER */}
        <View>
          {timerActive ? (
            // Cuenta regresiva activa
            <View className="bg-black/90 p-4 rounded-full border-2 border-savage-red items-center justify-center">
              <Text className="text-savage-red font-mono font-bold text-sm">
                {formatTime(timeRemaining)}
              </Text>
            </View>
          ) : timerExpanded ? (
            // Burbujas desplegadas
            <View className="flex-row gap-2 bg-black/90 px-3 py-2 rounded-full border border-zinc-800">
              <TouchableOpacity
                onPress={() => startTimer(1)}
                className="bg-zinc-800 px-3 py-2 rounded-full"
              >
                <Text className="text-savage-text text-xs font-bold">1m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => startTimer(2)}
                className="bg-zinc-800 px-3 py-2 rounded-full"
              >
                <Text className="text-savage-text text-xs font-bold">2m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => startTimer(3)}
                className="bg-zinc-800 px-3 py-2 rounded-full"
              >
                <Text className="text-savage-text text-xs font-bold">3m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTimerExpanded(false)}
                className="bg-savage-red px-3 py-2 rounded-full"
              >
                <Text className="text-savage-text text-xs font-bold">+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Icono normal
            <TouchableOpacity
              onPress={() => setTimerExpanded(true)}
              className="bg-black/80 p-4 rounded-full border border-zinc-800"
            >
              <Timer color="#FFFFFF" size={24} />
            </TouchableOpacity>
          )}
        </View>

        {/* SPOTIFY */}
        <TouchableOpacity
          onPress={() => setSpotifyModalVisible(true)}
          className="bg-black/80 p-4 rounded-full border border-zinc-800"
        >
          <Music color="#1DB954" size={24} />
        </TouchableOpacity>

        {/* AXIS */}
        <TouchableOpacity
          onPress={() => setAxisModalVisible(true)}
          className="bg-black/80 p-4 rounded-full border border-savage-red"
        >
          <Sparkles color="#DC2626" size={24} />
        </TouchableOpacity>
      </View>

      {/* VERTICAL SCROLL (ESTILO TIKTOK) */}
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        pagingEnabled
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
            ...(item.alternatives || []).map((alt) => ({ ...alt, isMain: false })),
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
                <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} className="bg-black">
                  {/* IMAGEN/VIDEO HERO */}
                  <View>
                    {isVideoUrl(variation.image_url) ? (
                      <VideoHero
                        videoUrl={variation.image_url!}
                        videoMuted={videoMuted}
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
                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.5 }}
                        contentFit="cover"
                      />
                    )}

                    {/* BOTÓN MUTE/AUDIO (solo para videos) */}
                    {isVideoUrl(variation.image_url) && (
                      <TouchableOpacity
                        onPress={() => {
                          setVideoMuted(!videoMuted);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className="absolute bottom-6 left-6 bg-black/70 p-3 rounded-full border border-zinc-700"
                      >
                        <Text className="text-white text-xl">{videoMuted ? '🔇' : '🔊'}</Text>
                      </TouchableOpacity>
                    )}

                    {/* BOTÓN CÁMARA (SOBRE LA IMAGEN) - Todas las variaciones */}
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentExerciseIndex(index);
                        setCurrentVariationId(variation.id); // Guardar ID de la variación actual
                        openCamera();
                      }}
                      className="absolute bottom-6 right-6 bg-savage-red p-4 rounded-full shadow-lg border-2 border-white"
                      style={{
                        shadowColor: '#DC2626',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.6,
                        shadowRadius: 8,
                        elevation: 8,
                      }}
                    >
                      <CameraIcon color="#FFFFFF" size={28} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>

                  {/* OVERLAY GRADIENTE */}
                  <View className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-transparent to-black" />

                  {/* TÍTULO EJERCICIO */}
                  <View className="absolute top-32 left-6 right-20">
                    <Text className="text-savage-text text-4xl font-bold uppercase tracking-wide">
                      {variation.name}
                    </Text>
                    {!variation.isMain && (
                      <Text className="text-zinc-500 text-sm mt-1">ALTERNATIVA</Text>
                    )}

                    {/* INDICADORES DE ALTERNATIVAS (DOTS) */}
                    {allVariations.length > 1 && (
                      <View className="flex-row gap-2 mt-3">
                        {allVariations.map((_, dotIndex) => (
                          <View
                            key={dotIndex}
                            className={`h-2 rounded-full ${
                              dotIndex === activeAltIndex ? 'w-6 bg-savage-red' : 'w-2 bg-zinc-600'
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
                    className="absolute top-32 right-20 z-50 bg-black/70 p-3 rounded-full border border-zinc-700"
                  >
                    <Edit3 color="#FFFFFF" size={20} />
                  </TouchableOpacity>

                  {/* CARDS EN LA PARTE INFERIOR */}
                  <View className="absolute bottom-20 left-0 right-0 px-6 pb-6 bg-gradient-to-t from-black via-black/95 to-transparent pt-12">
                    {/* CARD HISTORIAL */}
                    <TouchableOpacity
                      onPress={() => {
                        setModalExercise(item);
                        setHistorialModalVisible(true);
                      }}
                      className="bg-zinc-900/80 backdrop-blur-xl p-5 rounded-xl border border-zinc-800 mb-3"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-zinc-500 text-xs tracking-widest mb-2">
                            HISTORIAL
                          </Text>
                          {variation.videos.length > 0 ? (
                            <>
                              <Text className="text-white font-bold text-lg mb-1">
                                Último: {variation.videos[0].weight}kg × {variation.videos[0].reps}{' '}
                                reps
                              </Text>
                              <Text className="text-zinc-600 text-sm">
                                {variation.videos[0].date}
                              </Text>
                            </>
                          ) : (
                            <Text className="text-zinc-600">Sin registros</Text>
                          )}
                        </View>
                        <View className="bg-zinc-800 px-3 py-1 rounded-full">
                          <Text className="text-zinc-400 font-bold font-mono">
                            {variation.videos.length}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* CARD ESTRUCTURA - Mostrar en todas las variaciones */}
                    <TouchableOpacity
                      onPress={() => {
                        setModalExercise(item);
                        setStructureModalVisible(true);
                      }}
                      className="bg-zinc-900/80 backdrop-blur-xl p-5 rounded-xl border border-zinc-800"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-zinc-500 text-xs tracking-widest mb-2">
                            ESTRUCTURA
                          </Text>
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
                                    className={`${colorClass} w-8 h-8 rounded-full items-center justify-center`}
                                  >
                                    <Text className="text-white text-[10px] font-bold leading-tight">
                                      {String(s.reps || 0)}
                                    </Text>
                                    {s.weight && Number(s.weight) > 0 ? (
                                      <Text className="text-white text-[7px] leading-none">
                                        {Number(s.weight)}kg
                                      </Text>
                                    ) : null}
                                  </View>
                                );
                              })}
                          </View>
                        </View>
                        <View className="bg-zinc-800 px-3 py-1 rounded-full">
                          <Text className="text-zinc-400 font-bold font-mono">
                            {((variation as any).series || (item as any).series || []).length}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* FOOTER "PRÓXIMO" - Solo en ejercicio principal */}
                  {variation.isMain && index < exercises.length - 1 && (
                    <View className="absolute bottom-0 left-0 right-0 bg-zinc-900 py-3 px-6 border-t border-zinc-800">
                      <Text className="text-zinc-500 text-xs tracking-wider uppercase">
                        PRÓXIMO: {exercises[index + 1].name}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />
          );
        }}
      />

      {/* MODALS */}
      {renderNotesModal()}
      {renderSpotifyModal()}
      {renderAxisModal()}
      {renderVideoViewer()}
      {renderHistorialModal()}
      {renderStructureModal()}
      {renderCameraModal()}
      {renderEditorModal()}
    </GestureHandlerRootView>
  );
}
