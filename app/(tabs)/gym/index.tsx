import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../_layout';
import { Sliders, Plus, Trash2, X } from 'lucide-react-native';

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
          <View
            className="justify-center items-center"
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          >
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
                  <Text className="text-savage-text font-bold text-xl font-mono">{index + 1}</Text>
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
