import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';

import {
  Search,
  Plus,
  Trash2,
  ImagePlus,
  X,
  Check,
  ChevronRight,
  Dumbbell,
  Layers,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================
interface Exercise {
  id: string;
  name: string;
  description?: string;
  muscle_groups: string[];
  default_image_url?: string;
  alternatives: string[];
  is_active: boolean;
  category?: string;
}

// ============================================================================
// COLORS
// ============================================================================
const COLORS = {
  black: '#000000',
  blue: '#3B82F6',
  red: '#DC2626',
  green: '#22C55E',
  white: '#FFFFFF',
  zinc400: '#A1A1AA',
  zinc700: '#3f3f46',
  zinc800: '#27272a',
  zinc900: '#18181b',
};

// Lista de grupos musculares
const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Antebrazos',
  'Core',
  'Cuádriceps',
  'Isquios',
  'Glúteos',
  'Pantorrillas',
  'Trapecios',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AdminEjerciciosScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    muscle_groups: [] as string[],
    default_image_url: '',
  });

  // Alternatives modal
  const [alternativesModalVisible, setAlternativesModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [alternativesSearch, setAlternativesSearch] = useState('');

  // -------------------------------------------------------------------------
  // FETCH EXERCISES
  // -------------------------------------------------------------------------
  const fetchExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setExercises(data || []);
      setFilteredExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      Alert.alert('Error', 'No se pudieron cargar los ejercicios');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // -------------------------------------------------------------------------
  // SEARCH FILTER
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredExercises(exercises);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredExercises(
        exercises.filter(
          (ex) =>
            ex.name.toLowerCase().includes(query) ||
            ex.muscle_groups?.some((mg) => mg.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, exercises]);

  // -------------------------------------------------------------------------
  // OPEN CREATE/EDIT MODAL
  // -------------------------------------------------------------------------
  const openModal = (exercise?: Exercise) => {
    if (exercise) {
      setEditingExercise(exercise);
      setFormData({
        name: exercise.name,
        description: exercise.description || '',
        muscle_groups: exercise.muscle_groups || [],
        default_image_url: exercise.default_image_url || '',
      });
    } else {
      setEditingExercise(null);
      setFormData({
        name: '',
        description: '',
        muscle_groups: [],
        default_image_url: '',
      });
    }
    setModalVisible(true);
  };

  // -------------------------------------------------------------------------
  // SAVE EXERCISE
  // -------------------------------------------------------------------------
  const saveExercise = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    try {
      if (editingExercise) {
        // Update
        const { error } = await supabase
          .from('exercises')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            muscle_groups: formData.muscle_groups,
            default_image_url: formData.default_image_url.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingExercise.id);

        if (error) throw error;
        Alert.alert('✅ Éxito', 'Ejercicio actualizado');
      } else {
        // Create
        const { error } = await supabase.from('exercises').insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          muscle_groups: formData.muscle_groups,
          default_image_url: formData.default_image_url.trim() || null,
          is_active: true,
          alternatives: [],
        });

        if (error) throw error;
        Alert.alert('✅ Éxito', 'Ejercicio creado');
      }

      setModalVisible(false);
      fetchExercises();
    } catch (error) {
      console.error('Error saving exercise:', error);
      Alert.alert('Error', 'No se pudo guardar el ejercicio');
    }
  };

  // -------------------------------------------------------------------------
  // DELETE EXERCISE
  // -------------------------------------------------------------------------
  const deleteExercise = (exercise: Exercise) => {
    Alert.alert('Eliminar Ejercicio', `¿Seguro que quieres eliminar "${exercise.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('exercises')
              .update({ is_active: false })
              .eq('id', exercise.id);

            if (error) throw error;
            fetchExercises();
          } catch (error) {
            console.error('Error deleting exercise:', error);
            Alert.alert('Error', 'No se pudo eliminar el ejercicio');
          }
        },
      },
    ]);
  };

  // -------------------------------------------------------------------------
  // TOGGLE MUSCLE GROUP
  // -------------------------------------------------------------------------
  const toggleMuscleGroup = (muscle: string) => {
    setFormData((prev) => ({
      ...prev,
      muscle_groups: prev.muscle_groups.includes(muscle)
        ? prev.muscle_groups.filter((m) => m !== muscle)
        : [...prev.muscle_groups, muscle],
    }));
  };

  // -------------------------------------------------------------------------
  // ALTERNATIVES
  // -------------------------------------------------------------------------
  const openAlternativesModal = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setAlternativesSearch('');
    setAlternativesModalVisible(true);
  };

  const toggleAlternative = async (alternativeId: string) => {
    if (!selectedExercise) return;

    const currentAlternatives = selectedExercise.alternatives || [];
    const newAlternatives = currentAlternatives.includes(alternativeId)
      ? currentAlternatives.filter((id) => id !== alternativeId)
      : [...currentAlternatives, alternativeId];

    try {
      const { error } = await supabase
        .from('exercises')
        .update({ alternatives: newAlternatives })
        .eq('id', selectedExercise.id);

      if (error) throw error;

      // Update local state
      setSelectedExercise({ ...selectedExercise, alternatives: newAlternatives });
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === selectedExercise.id ? { ...ex, alternatives: newAlternatives } : ex
        )
      );
    } catch (error) {
      console.error('Error updating alternatives:', error);
      Alert.alert('Error', 'No se pudo actualizar las alternativas');
    }
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <View className="flex-1 bg-black">
      {/* Search Header */}
      <View className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <View className="flex-row items-center bg-zinc-800 rounded-lg px-3 py-2">
          <Search size={18} color={COLORS.zinc400} />
          <TextInput
            className="flex-1 text-white ml-2 font-mono"
            placeholder="Buscar ejercicio..."
            placeholderTextColor={COLORS.zinc400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-zinc-400 text-xs font-mono">
            {filteredExercises.length} ejercicios
          </Text>
          <TouchableOpacity
            className="flex-row items-center bg-blue-600 px-3 py-2 rounded-lg"
            onPress={() => openModal()}
          >
            <Plus size={16} color={COLORS.white} />
            <Text className="text-white text-sm font-bold ml-1">NUEVO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchExercises();
            }}
            tintColor={COLORS.blue}
          />
        }
      >
        {filteredExercises.map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            className="flex-row items-center bg-zinc-900 mx-4 my-1 p-3 rounded-lg border border-zinc-800"
            onPress={() => openModal(exercise)}
          >
            {/* Image */}
            <View className="w-14 h-14 bg-zinc-800 rounded-lg overflow-hidden items-center justify-center">
              {exercise.default_image_url ? (
                <Image
                  source={{ uri: exercise.default_image_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Dumbbell size={24} color={COLORS.zinc400} />
              )}
            </View>

            {/* Info */}
            <View className="flex-1 ml-3">
              <Text className="text-white font-bold">{exercise.name}</Text>
              <Text className="text-zinc-400 text-xs font-mono mt-1">
                {exercise.muscle_groups?.join(', ') || 'Sin músculos asignados'}
              </Text>
              {exercise.alternatives?.length > 0 && (
                <Text className="text-blue-400 text-xs mt-1">
                  {exercise.alternatives.length} alternativas
                </Text>
              )}
            </View>

            {/* Actions */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="p-2 bg-zinc-800 rounded-lg"
                onPress={() => openAlternativesModal(exercise)}
              >
                <Layers size={18} color={COLORS.blue} />
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2 bg-zinc-800 rounded-lg"
                onPress={() => deleteExercise(exercise)}
              >
                <Trash2 size={18} color={COLORS.red} />
              </TouchableOpacity>
              <ChevronRight size={18} color={COLORS.zinc400} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-zinc-900 rounded-t-3xl p-4" style={{ maxHeight: '90%' }}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-lg">
                {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={COLORS.zinc400} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text className="text-zinc-400 text-xs font-mono mb-1">NOMBRE</Text>
              <TextInput
                className="bg-zinc-800 text-white p-3 rounded-lg mb-4 font-mono"
                placeholder="Nombre del ejercicio"
                placeholderTextColor={COLORS.zinc400}
                value={formData.name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
              />

              {/* Description */}
              <Text className="text-zinc-400 text-xs font-mono mb-1">DESCRIPCIÓN</Text>
              <TextInput
                className="bg-zinc-800 text-white p-3 rounded-lg mb-4 font-mono"
                placeholder="Descripción opcional"
                placeholderTextColor={COLORS.zinc400}
                value={formData.description}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />

              {/* Image URL */}
              <Text className="text-zinc-400 text-xs font-mono mb-1">IMAGEN URL</Text>
              <View className="flex-row items-center gap-2 mb-4">
                <TextInput
                  className="flex-1 bg-zinc-800 text-white p-3 rounded-lg font-mono"
                  placeholder="URL de la imagen"
                  placeholderTextColor={COLORS.zinc400}
                  value={formData.default_image_url}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, default_image_url: text }))
                  }
                />
                <TouchableOpacity className="bg-zinc-800 p-3 rounded-lg">
                  <ImagePlus size={20} color={COLORS.blue} />
                </TouchableOpacity>
              </View>

              {/* Muscle Groups */}
              <Text className="text-zinc-400 text-xs font-mono mb-2">MÚSCULOS</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {MUSCLE_GROUPS.map((muscle) => {
                  const isSelected = formData.muscle_groups.includes(muscle);
                  return (
                    <TouchableOpacity
                      key={muscle}
                      className={`px-3 py-2 rounded-lg border ${
                        isSelected ? 'bg-blue-600 border-blue-500' : 'bg-zinc-800 border-zinc-700'
                      }`}
                      onPress={() => toggleMuscleGroup(muscle)}
                    >
                      <Text
                        className={`text-sm font-mono ${
                          isSelected ? 'text-white' : 'text-zinc-400'
                        }`}
                      >
                        {muscle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              className="bg-blue-600 py-4 rounded-lg flex-row items-center justify-center"
              onPress={saveExercise}
            >
              <Check size={20} color={COLORS.white} />
              <Text className="text-white font-bold ml-2">GUARDAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Alternatives Modal */}
      <Modal visible={alternativesModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-zinc-900 rounded-t-3xl p-4" style={{ maxHeight: '80%' }}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-white font-bold text-lg">Alternativas</Text>
                <Text className="text-zinc-400 text-xs font-mono">{selectedExercise?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setAlternativesModalVisible(false)}>
                <X size={24} color={COLORS.zinc400} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="flex-row items-center bg-zinc-800 rounded-lg px-3 py-2 mb-4">
              <Search size={18} color={COLORS.zinc400} />
              <TextInput
                className="flex-1 text-white ml-2 font-mono"
                placeholder="Buscar ejercicio..."
                placeholderTextColor={COLORS.zinc400}
                value={alternativesSearch}
                onChangeText={setAlternativesSearch}
              />
            </View>

            {/* Exercise List */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {exercises
                .filter(
                  (ex) =>
                    ex.id !== selectedExercise?.id &&
                    ex.is_active &&
                    (alternativesSearch === '' ||
                      ex.name.toLowerCase().includes(alternativesSearch.toLowerCase()))
                )
                .map((exercise) => {
                  const isAlternative = selectedExercise?.alternatives?.includes(exercise.id);
                  return (
                    <TouchableOpacity
                      key={exercise.id}
                      className={`flex-row items-center p-3 rounded-lg mb-2 border ${
                        isAlternative
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                      onPress={() => toggleAlternative(exercise.id)}
                    >
                      <View className="w-10 h-10 bg-zinc-700 rounded-lg items-center justify-center">
                        {exercise.default_image_url ? (
                          <Image
                            source={{ uri: exercise.default_image_url }}
                            className="w-full h-full rounded-lg"
                            resizeMode="cover"
                          />
                        ) : (
                          <Dumbbell size={18} color={COLORS.zinc400} />
                        )}
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-white font-bold">{exercise.name}</Text>
                        <Text className="text-zinc-400 text-xs">
                          {exercise.muscle_groups?.join(', ')}
                        </Text>
                      </View>
                      {isAlternative && <Check size={20} color={COLORS.blue} />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
