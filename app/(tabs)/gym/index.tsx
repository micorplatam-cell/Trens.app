import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../_layout';
import {
  Sliders,
  Plus,
  Trash2,
  X,
  Clock,
  Music,
  Sparkles,
  Timer,
  Edit3,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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

interface Exercise {
  id: string;
  name: string;
  sets: string;
  image_url: string;
  order: number;
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

  // ============================================================================
  // FETCH EXERCISES FROM SUPABASE
  // ============================================================================
  useEffect(() => {
    loadExercises();
    loadTemplates();
  }, []);

  const loadExercises = async () => {
    if (!user) {
      console.log('❌ No user found');
      return;
    }

    console.log('✅ User authenticated:', user.id);
    setLoading(true);
    try {
      // Verificar sesión
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('📱 Session active:', !!sessionData.session);

      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'gym_exercise')
        .order('order', { ascending: true });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Data loaded:', data?.length || 0, 'exercises');

      if (data && data.length > 0) {
        const mappedExercises: Exercise[] = data.map((item) => ({
          id: item.id,
          name: item.name || 'UNNAMED',
          sets: item.metadata?.sets || '0x0',
          image_url: item.asset_url || '',
          order: item.order || 0,
          series: generateDefaultSeries(item.metadata?.sets || '4x10'),
        }));
        setExercises(mappedExercises);
        setViewMode('FOCUS');
      } else {
        console.log('📋 No exercises found, showing STRUCTURE mode');
        setViewMode('STRUCTURE');
      }
    } catch (error) {
      console.error('💥 Error loading exercises:', error);
      setViewMode('STRUCTURE');
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
  // ADD EXERCISE FROM TEMPLATE
  // ============================================================================
  const addExerciseFromTemplate = async (template: AssetTemplate) => {
    if (!user) return;

    setAdding(true);
    try {
      const newOrder = exercises.length;

      const { data, error } = await supabase
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
          order: newOrder,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newExercise: Exercise = {
          id: data.id,
          name: data.name,
          sets: data.metadata.sets,
          image_url: data.asset_url,
          order: data.order,
          series: generateDefaultSeries(data.metadata.sets),
        };

        setExercises([...exercises, newExercise]);
        setModalVisible(false);
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
      const { error } = await supabase.from('user_assets').delete().eq('id', id);

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
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => addExerciseFromTemplate(item)}
              disabled={adding}
              className="flex-row bg-savage-dark border border-zinc-800 rounded-lg p-4 mb-3 items-center"
            >
              {/* IMAGE */}
              <Image
                source={{ uri: item.image_url }}
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
          )}
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

  // ============================================================================
  // RENDER FOCUS MODE (VERTICAL SCROLL - TIKTOK STYLE)
  // ============================================================================
  return (
    <View className="flex-1 bg-savage-black">
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
        onMomentumScrollEnd={() => {
          // Haptic Feedback al cambiar ejercicio
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        renderItem={({ item, index }) => (
          <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
            {/* IMAGEN HERO */}
            <Image
              source={{ uri: item.image_url }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.5 }}
              contentFit="cover"
            />

            {/* OVERLAY GRADIENTE */}
            <View className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-transparent to-black" />

            {/* TÍTULO EJERCICIO */}
            <View className="absolute top-32 left-6">
              <Text className="text-savage-text text-4xl font-bold uppercase tracking-wide">
                {item.name}
              </Text>
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

            {/* SECCIÓN SERIES */}
            <ScrollView
              className="absolute bottom-20 left-0 right-0 px-6 py-6 bg-black"
              style={{ maxHeight: SCREEN_HEIGHT * 0.4 }}
            >
              <Text className="text-zinc-500 text-xs tracking-widest mb-4 uppercase">
                Estructura de Series
              </Text>

              {item.series.map((serie) => (
                <View key={serie.id} className="flex-row items-center mb-3">
                  {/* TAG COLOR */}
                  <View
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: getSeriesColor(serie.type) }}
                  />

                  {/* INFO */}
                  <View className="flex-1">
                    <Text className="text-savage-text font-bold text-base">{serie.reps} REPS</Text>
                    {serie.note && <Text className="text-zinc-500 text-xs">{serie.note}</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* FOOTER "PRÓXIMO" */}
            {index < exercises.length - 1 && (
              <View className="absolute bottom-0 left-0 right-0 bg-zinc-900 py-3 px-6 border-t border-zinc-800">
                <Text className="text-zinc-500 text-xs tracking-wider uppercase">
                  PRÓXIMO: {exercises[index + 1].name}
                </Text>
              </View>
            )}
          </View>
        )}
      />

      {/* MODALS */}
      {renderNotesModal()}
      {renderSpotifyModal()}
      {renderAxisModal()}
    </View>
  );
}
