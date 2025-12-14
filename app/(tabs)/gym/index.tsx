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
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.5 }}
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

interface Series {
  id: string;
  type: SeriesType;
  reps: string;
  note?: string;
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
  alternatives?: ExerciseAlternative[]; // Ejercicios alternativos
}

interface ExerciseAlternative {
  id: string;
  name: string;
  image_url: string;
  videos: VideoRecord[];
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
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
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [videoMuted, setVideoMuted] = useState(true);
  const [isPickingFromGallery, setIsPickingFromGallery] = useState(false);

  // Video playback control - trackea el ejercicio actualmente visible
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Considera visible si está 50% en pantalla
  });

  // Trackear alternativa activa por cada ejercicio (exerciseIndex -> alternativeIndex)
  const [activeAlternatives, setActiveAlternatives] = useState<Record<number, number>>({});

  // ID del ejercicio actual (puede ser principal o alternativa)
  const [currentVariationId, setCurrentVariationId] = useState<string | null>(null);

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
  // FETCH EXERCISES FROM SUPABASE
  // ============================================================================
  useEffect(() => {
    loadExercises();
    loadTemplates();
  }, []);

  const loadExercises = async () => {
    if (!user) {
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'gym_exercise')
        .is('deleted_at', null) // Solo ejercicios activos
        .order('order', { ascending: true });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Cargar alternativas desde user_exercise_alternatives
        const { data: alternativesData } = await supabase
          .from('user_exercise_alternatives')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true });



        // Cargar los datos completos de las alternativas
        const alternativeIds = alternativesData?.map((a: any) => a.alternative_exercise_id) || [];
        const { data: alternativeAssets } = await supabase
          .from('user_assets')
          .select('*')
          .in('id', alternativeIds);



        const mappedExercises: Exercise[] = data.map((item, index) => {
          // Buscar alternativas vinculadas a este ejercicio
          const alternativeRelations =
            alternativesData?.filter((rel: any) => rel.main_exercise_id === item.id) || [];



          const alternatives: ExerciseAlternative[] = alternativeRelations.map((rel: any) => {
            const asset = alternativeAssets?.find((a: any) => a.id === rel.alternative_exercise_id);
            return {
              id: asset?.id || '',
              name: asset?.name || 'UNKNOWN',
              image_url: asset?.asset_url || '',
              videos: generateMockVideos(asset?.id || '', 0),
            };
          });



          return {
            id: item.id,
            name: item.name || 'UNNAMED',
            sets: item.metadata?.sets || '0x0',
            image_url: item.asset_url || '',
            order: item.order || 0,
            series: generateDefaultSeries(item.metadata?.sets || '4x10'),
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
      const { error: updateError } = await supabase
        .from('user_assets')
        .update({ asset_url: urlData.publicUrl })
        .eq('id', exerciseIdToUpdate);

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
  // ADD EXERCISE FROM TEMPLATE
  // ============================================================================
  const addExerciseFromTemplate = async (template: AssetTemplate) => {
    if (!user) return;

    setAdding(true);
    try {
      // Verificar si existe un ejercicio eliminado con el mismo nombre
      const { data: existingDeleted } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'gym_exercise')
        .eq('name', template.name)
        .not('deleted_at', 'is', null)
        .single();

      let data;
      let error;

      if (existingDeleted) {
        // Reactivar ejercicio eliminado (mantiene asset_url personalizado)
        const result = await supabase
          .from('user_assets')
          .update({
            deleted_at: null,
            order: exercises.length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDeleted.id)
          .select()
          .single();

        data = result.data;
        error = result.error;
      } else {
        // Crear nuevo ejercicio con imagen por defecto
        const result = await supabase
          .from('user_assets')
          .insert({
            user_id: user.id,
            asset_type: 'gym_exercise',
            name: template.name,
            asset_url: template.image_url,
            metadata: {
              sets: template.default_metadata.sets,
              rest: template.default_metadata.rest,
              category: template.category,
              difficulty: template.difficulty,
            },
            order: exercises.length,
          })
          .select()
          .single();

        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data) {
        // No crear alternativas automáticamente
        // El usuario las vinculará manualmente más adelante

        const newExercise: Exercise = {
          id: data.id,
          name: data.name,
          sets: data.metadata.sets,
          image_url: data.asset_url,
          order: data.order,
          series: generateDefaultSeries(data.metadata.sets),
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
      // Soft delete: marcar como eliminado en lugar de borrar
      const { error } = await supabase
        .from('user_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setExercises(exercises.filter((ex) => ex.id !== id));
    } catch (error) {
      console.error('💥 Error deleting exercise:', error);
      alert('Error al eliminar ejercicio');
    }
  };

  // ============================================================================
  // SAVE AND TRAIN
  // ============================================================================
  const saveAndTrain = () => {
    if (exercises.length === 0) return;
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
            // Buscar si el ejercicio ya existe con imagen personalizada
            const existingExercise = exercises.find((ex) => ex.name === item.name);
            const imageUrl = existingExercise?.image_url || item.image_url;

            return (
              <TouchableOpacity
                onPress={() => addExerciseFromTemplate(item)}
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
        {/* HEADER */}
        <View className="px-6 pt-16 pb-4 border-b border-zinc-800">
          <Text className="text-savage-text text-4xl font-bold italic mb-2">STRUCTURE</Text>
          <Text className="text-zinc-500 text-sm tracking-wider">
            CONFIGURA TU RUTINA DE ENTRENAMIENTO
          </Text>
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
            <View className="bg-savage-dark border border-zinc-800 rounded-lg p-4 mb-3 flex-row items-center">
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
                <Text className="text-zinc-500 font-mono text-sm">{item.sets}</Text>
              </View>

              <TouchableOpacity
                onPress={() => deleteExercise(item.id)}
                className="p-3 bg-zinc-900 rounded"
              >
                <Trash2 color="#DC2626" size={20} />
              </TouchableOpacity>
            </View>
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
            className="flex-1 bg-black"
            style={[{ width: SCREEN_WIDTH }, animatedStyleHistorial]}
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
                      <Text className="text-white font-bold text-3xl font-mono mb-2">
                        {video.weight}kg
                      </Text>
                      <Text className="text-zinc-400 text-lg mb-3">{video.reps} reps</Text>
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
            className="flex-1 bg-black"
            style={[{ width: SCREEN_WIDTH }, animatedStyleStructure]}
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
              {modalExercise.series.map((serie, idx) => (
                <View
                  key={serie.id}
                  className="flex-row items-center mb-4 bg-zinc-900/50 p-5 rounded-xl border border-zinc-800"
                >
                  {/* Número de Serie */}
                  <View className="bg-savage-red rounded-full w-10 h-10 justify-center items-center mr-4">
                    <Text className="text-white font-bold text-lg font-mono">{idx + 1}</Text>
                  </View>

                  {/* Color Tag */}
                  <View
                    className="w-4 h-4 rounded-full mr-4"
                    style={{ backgroundColor: getSeriesColor(serie.type) }}
                  />

                  {/* Info */}
                  <View className="flex-1">
                    <Text className="text-savage-text font-bold text-xl mb-1">
                      {serie.reps} REPS
                    </Text>
                    <Text className="text-zinc-500 text-xs uppercase tracking-wider">
                      {serie.type}
                    </Text>
                    {serie.note && (
                      <Text className="text-zinc-600 text-sm mt-2 italic">"{serie.note}"</Text>
                    )}
                  </View>
                </View>
              ))}
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
            PUSH DAY A
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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

                    {/* CARD ESTRUCTURA - Solo en ejercicio principal */}
                    {variation.isMain && (
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
                            <Text className="text-white font-bold text-lg">
                              {item.series.length} SERIES DE{' '}
                              {item.series.filter((s) => s.type === 'WARMUP').length > 0 &&
                                `🟡×${item.series.filter((s) => s.type === 'WARMUP').length} `}
                              {item.series.filter((s) => s.type === 'FEEDER').length > 0 &&
                                `🔵×${item.series.filter((s) => s.type === 'FEEDER').length} `}
                              {item.series.filter((s) => s.type === 'EFFECTIVE').length > 0 &&
                                `🔴×${item.series.filter((s) => s.type === 'EFFECTIVE').length} `}
                              {item.series.filter((s) => s.type === 'INTENSITY').length > 0 &&
                                `🟣×${item.series.filter((s) => s.type === 'INTENSITY').length}`}
                            </Text>
                          </View>
                          <View className="bg-zinc-800 px-3 py-1 rounded-full">
                            <Text className="text-zinc-400 font-bold font-mono">
                              {item.series.length}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
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
