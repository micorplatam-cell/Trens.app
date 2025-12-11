import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../_layout';
import { Sliders, Plus, Trash2 } from 'lucide-react-native';

// ============================================================================
// TYPES
// ============================================================================
type ViewMode = 'LOADING' | 'FOCUS' | 'STRUCTURE';

interface Exercise {
  id: string;
  name: string;
  sets: string;
  image_url: string;
  order: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function GymScreen() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('LOADING');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // FETCH EXERCISES FROM SUPABASE
  // ============================================================================
  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('asset_type', 'gym_exercise')
        .order('order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedExercises: Exercise[] = data.map((item) => ({
          id: item.id,
          name: item.name || 'UNNAMED',
          sets: item.metadata?.sets || '0x0',
          image_url: item.asset_url || '',
          order: item.order || 0,
        }));
        setExercises(mappedExercises);
        setViewMode('FOCUS');
      } else {
        setViewMode('STRUCTURE');
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      setViewMode('STRUCTURE');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ADD EXERCISE (MOCK)
  // ============================================================================
  const addExercise = () => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: `EJERCICIO ${exercises.length + 1}`,
      sets: '4x10',
      image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
      order: exercises.length,
    };
    setExercises([...exercises, newExercise]);
  };

  // ============================================================================
  // DELETE EXERCISE
  // ============================================================================
  const deleteExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  // ============================================================================
  // SAVE AND TRAIN
  // ============================================================================
  const saveAndTrain = async () => {
    if (exercises.length === 0) return;

    setLoading(true);
    try {
      // TODO: Implement actual save to Supabase
      // await supabase.from('user_assets').upsert(...)
      setViewMode('FOCUS');
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
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
                onPress={addExercise}
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
              <View className="bg-savage-red rounded px-3 py-1 mr-4">
                <Text className="text-savage-text font-bold font-mono">{index + 1}</Text>
              </View>

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
            onPress={addExercise}
            className="border border-savage-red p-4 rounded-lg items-center"
          >
            <Text className="text-savage-red font-bold tracking-wider">+ AGREGAR EJERCICIO</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================================================
  // RENDER FOCUS MODE (FULL SCREEN CAROUSEL)
  // ============================================================================
  return (
    <View className="flex-1 bg-savage-black">
      {/* HEADER */}
      <View className="absolute top-0 left-0 right-0 z-10 bg-black/80 px-6 pt-16 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-savage-text text-2xl font-bold italic">FOCUS</Text>
          <Text className="text-zinc-500 text-xs tracking-wider">MODE ACTIVO</Text>
        </View>
        <TouchableOpacity
          onPress={() => setViewMode('STRUCTURE')}
          className="bg-savage-red p-3 rounded-lg"
        >
          <Sliders color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      {/* FULL SCREEN CAROUSEL */}
      <FlashList
        data={exercises}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        estimatedItemSize={SCREEN_WIDTH}
        renderItem={({ item, index }) => (
          <View className="justify-center items-center" style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
            {/* IMAGE */}
            <Image
              source={{ uri: item.image_url }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              contentFit="cover"
              transition={300}
            />

            {/* OVERLAY INFO */}
            <View className="absolute bottom-20 left-0 right-0 bg-black/90 p-6">
              <View className="flex-row items-center mb-3">
                <View className="bg-savage-red rounded-full w-12 h-12 justify-center items-center mr-4">
                  <Text className="text-savage-text font-bold text-xl font-mono">
                    {index + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-savage-text text-2xl font-bold mb-1">{item.name}</Text>
                  <Text className="text-savage-red font-bold text-xl font-mono">{item.sets}</Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center pt-4 border-t border-zinc-800">
                <Text className="text-zinc-500 text-xs font-mono tracking-wider">
                  {index + 1} / {exercises.length}
                </Text>
                <Text className="text-zinc-500 text-xs tracking-wider">
                  DESLIZA PARA SIGUIENTE →
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}
