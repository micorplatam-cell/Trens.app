import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Search,
  Plus,
  Trash2,
  X,
  Check,
  ChevronRight,
  Calendar,
  Target,
  Users,
  Copy,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================
interface TrainingTemplate {
  id: string;
  slug: string;
  name: string;
  description?: string;
  target_levels: string[];
  target_goals: string[];
  frequency: number;
  equipment: string[];
  days: TemplateDay[];
  is_active: boolean;
  sort_order: number;
}

interface TemplateDay {
  dayIndex: number;
  name: string;
  focus?: string;
  exercises: TemplateDayExercise[];
}

interface TemplateDayExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
}

// ============================================================================
// COLORS
// ============================================================================
const COLORS = {
  black: '#000000',
  blue: '#3B82F6',
  red: '#DC2626',
  green: '#22C55E',
  purple: '#8B5CF6',
  orange: '#F97316',
  white: '#FFFFFF',
  zinc400: '#A1A1AA',
  zinc700: '#3f3f46',
  zinc800: '#27272a',
  zinc900: '#18181b',
};

// Opciones
const LEVELS = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'];
const GOALS = ['HIPERTROFIA', 'FUERZA', 'DEFINICION', 'RECOMPOSICION', 'GENERAL'];
const EQUIPMENT = ['gym-completo', 'mancuernas', 'casa', 'calistenia', 'bandas'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AdminRutinasScreen() {
  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TrainingTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TrainingTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    frequency: 4,
    target_levels: ['INTERMEDIO'] as string[],
    target_goals: ['HIPERTROFIA'] as string[],
    equipment: ['gym-completo'] as string[],
    days: [] as TemplateDay[],
  });

  // Day editor modal
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [dayFormData, setDayFormData] = useState({
    name: '',
    focus: '',
    exercises: [] as TemplateDayExercise[],
  });

  // Exercise in day modal
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [exerciseFormData, setExerciseFormData] = useState({
    name: '',
    sets: 4,
    reps: '8-12',
    rest: '90s',
  });

  // -------------------------------------------------------------------------
  // FETCH TEMPLATES
  // -------------------------------------------------------------------------
  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('training_plan_templates')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Parse days JSON
      const parsed = (data || []).map((t) => ({
        ...t,
        days: typeof t.days === 'string' ? JSON.parse(t.days) : t.days || [],
      }));

      setTemplates(parsed);
      setFilteredTemplates(parsed);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // -------------------------------------------------------------------------
  // SEARCH FILTER
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTemplates(templates);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTemplates(
        templates.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            t.target_goals?.some((g) => g.toLowerCase().includes(query)) ||
            t.target_levels?.some((l) => l.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, templates]);

  // -------------------------------------------------------------------------
  // GENERATE SLUG
  // -------------------------------------------------------------------------
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // -------------------------------------------------------------------------
  // OPEN TEMPLATE MODAL
  // -------------------------------------------------------------------------
  const openModal = (template?: TrainingTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        slug: template.slug,
        description: template.description || '',
        frequency: template.frequency,
        target_levels: template.target_levels || ['INTERMEDIO'],
        target_goals: template.target_goals || ['HIPERTROFIA'],
        equipment: template.equipment || ['gym-completo'],
        days: template.days || [],
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        frequency: 4,
        target_levels: ['INTERMEDIO'],
        target_goals: ['HIPERTROFIA'],
        equipment: ['gym-completo'],
        days: [],
      });
    }
    setModalVisible(true);
  };

  // -------------------------------------------------------------------------
  // SAVE TEMPLATE
  // -------------------------------------------------------------------------
  const saveTemplate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (formData.days.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un día');
      return;
    }

    try {
      const slug = formData.slug || generateSlug(formData.name);

      if (editingTemplate) {
        const { error } = await supabase
          .from('training_plan_templates')
          .update({
            name: formData.name.trim(),
            slug,
            description: formData.description.trim() || null,
            frequency: formData.frequency,
            target_levels: formData.target_levels,
            target_goals: formData.target_goals,
            equipment: formData.equipment,
            days: formData.days,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        Alert.alert('✅ Éxito', 'Rutina actualizada');
      } else {
        const { error } = await supabase.from('training_plan_templates').insert({
          name: formData.name.trim(),
          slug,
          description: formData.description.trim() || null,
          frequency: formData.frequency,
          target_levels: formData.target_levels,
          target_goals: formData.target_goals,
          equipment: formData.equipment,
          days: formData.days,
          is_active: true,
          sort_order: templates.length,
        });

        if (error) throw error;
        Alert.alert('✅ Éxito', 'Rutina creada');
      }

      setModalVisible(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'No se pudo guardar la rutina');
    }
  };

  // -------------------------------------------------------------------------
  // DELETE TEMPLATE
  // -------------------------------------------------------------------------
  const deleteTemplate = (template: TrainingTemplate) => {
    Alert.alert('Eliminar Rutina', `¿Seguro que quieres eliminar "${template.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('training_plan_templates')
              .update({ is_active: false })
              .eq('id', template.id);

            if (error) throw error;
            fetchTemplates();
          } catch (error) {
            console.error('Error deleting template:', error);
          }
        },
      },
    ]);
  };

  // -------------------------------------------------------------------------
  // DUPLICATE TEMPLATE
  // -------------------------------------------------------------------------
  const duplicateTemplate = async (template: TrainingTemplate) => {
    try {
      const { error } = await supabase.from('training_plan_templates').insert({
        name: `${template.name} (Copia)`,
        slug: `${template.slug}-copy-${Date.now()}`,
        description: template.description,
        frequency: template.frequency,
        target_levels: template.target_levels,
        target_goals: template.target_goals,
        equipment: template.equipment,
        days: template.days,
        is_active: true,
        sort_order: templates.length,
      });

      if (error) throw error;
      Alert.alert('✅ Éxito', 'Rutina duplicada');
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  // -------------------------------------------------------------------------
  // DAY MANAGEMENT
  // -------------------------------------------------------------------------
  const openDayModal = (dayIndex?: number) => {
    if (dayIndex !== undefined && formData.days[dayIndex]) {
      setEditingDayIndex(dayIndex);
      setDayFormData({
        name: formData.days[dayIndex].name,
        focus: formData.days[dayIndex].focus || '',
        exercises: formData.days[dayIndex].exercises || [],
      });
    } else {
      setEditingDayIndex(null);
      setDayFormData({
        name: '',
        focus: '',
        exercises: [],
      });
    }
    setDayModalVisible(true);
  };

  const saveDay = () => {
    if (!dayFormData.name.trim()) {
      Alert.alert('Error', 'El nombre del día es requerido');
      return;
    }

    const newDay: TemplateDay = {
      dayIndex: editingDayIndex ?? formData.days.length,
      name: dayFormData.name.trim(),
      focus: dayFormData.focus.trim() || undefined,
      exercises: dayFormData.exercises,
    };

    if (editingDayIndex !== null) {
      const updatedDays = [...formData.days];
      updatedDays[editingDayIndex] = newDay;
      setFormData((prev) => ({ ...prev, days: updatedDays }));
    } else {
      setFormData((prev) => ({ ...prev, days: [...prev.days, newDay] }));
    }

    setDayModalVisible(false);
  };

  const deleteDay = (dayIndex: number) => {
    const updatedDays = formData.days
      .filter((_, i) => i !== dayIndex)
      .map((d, i) => ({ ...d, dayIndex: i }));
    setFormData((prev) => ({ ...prev, days: updatedDays, frequency: updatedDays.length }));
  };

  // -------------------------------------------------------------------------
  // EXERCISE IN DAY MANAGEMENT
  // -------------------------------------------------------------------------
  const openExerciseModal = (exerciseIndex?: number) => {
    if (exerciseIndex !== undefined && dayFormData.exercises[exerciseIndex]) {
      setEditingExerciseIndex(exerciseIndex);
      setExerciseFormData(dayFormData.exercises[exerciseIndex]);
    } else {
      setEditingExerciseIndex(null);
      setExerciseFormData({
        name: '',
        sets: 4,
        reps: '8-12',
        rest: '90s',
      });
    }
    setExerciseModalVisible(true);
  };

  const saveExercise = () => {
    if (!exerciseFormData.name.trim()) {
      Alert.alert('Error', 'El nombre del ejercicio es requerido');
      return;
    }

    const newExercise: TemplateDayExercise = {
      name: exerciseFormData.name.trim(),
      sets: exerciseFormData.sets,
      reps: exerciseFormData.reps,
      rest: exerciseFormData.rest,
    };

    if (editingExerciseIndex !== null) {
      const updatedExercises = [...dayFormData.exercises];
      updatedExercises[editingExerciseIndex] = newExercise;
      setDayFormData((prev) => ({ ...prev, exercises: updatedExercises }));
    } else {
      setDayFormData((prev) => ({
        ...prev,
        exercises: [...prev.exercises, newExercise],
      }));
    }

    setExerciseModalVisible(false);
  };

  const deleteExercise = (exerciseIndex: number) => {
    const updatedExercises = dayFormData.exercises.filter((_, i) => i !== exerciseIndex);
    setDayFormData((prev) => ({ ...prev, exercises: updatedExercises }));
  };

  // -------------------------------------------------------------------------
  // TOGGLE ARRAY VALUE
  // -------------------------------------------------------------------------
  const toggleArrayValue = (
    field: 'target_levels' | 'target_goals' | 'equipment',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
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
            placeholder="Buscar rutina..."
            placeholderTextColor={COLORS.zinc400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-zinc-400 text-xs font-mono">
            {filteredTemplates.length} rutinas
          </Text>
          <TouchableOpacity
            className="flex-row items-center bg-blue-600 px-3 py-2 rounded-lg"
            onPress={() => openModal()}
          >
            <Plus size={16} color={COLORS.white} />
            <Text className="text-white text-sm font-bold ml-1">NUEVA</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Template List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTemplates();
            }}
            tintColor={COLORS.blue}
          />
        }
      >
        {filteredTemplates.map((template) => (
          <TouchableOpacity
            key={template.id}
            className="bg-zinc-900 mx-4 my-1 p-4 rounded-lg border border-zinc-800"
            onPress={() => openModal(template)}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">{template.name}</Text>
                {template.description && (
                  <Text className="text-zinc-400 text-sm mt-1" numberOfLines={2}>
                    {template.description}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  className="p-2 bg-zinc-800 rounded-lg"
                  onPress={() => duplicateTemplate(template)}
                >
                  <Copy size={16} color={COLORS.blue} />
                </TouchableOpacity>
                <TouchableOpacity
                  className="p-2 bg-zinc-800 rounded-lg"
                  onPress={() => deleteTemplate(template)}
                >
                  <Trash2 size={16} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Metadata */}
            <View className="flex-row flex-wrap gap-2 mt-3">
              <View className="flex-row items-center bg-zinc-800 px-2 py-1 rounded">
                <Calendar size={12} color={COLORS.blue} />
                <Text className="text-blue-400 text-xs font-mono ml-1">
                  {template.frequency} días
                </Text>
              </View>
              <View className="flex-row items-center bg-zinc-800 px-2 py-1 rounded">
                <Target size={12} color={COLORS.purple} />
                <Text className="text-purple-400 text-xs font-mono ml-1">
                  {template.target_goals?.join(', ')}
                </Text>
              </View>
              <View className="flex-row items-center bg-zinc-800 px-2 py-1 rounded">
                <Users size={12} color={COLORS.green} />
                <Text className="text-green-400 text-xs font-mono ml-1">
                  {template.target_levels?.join(', ')}
                </Text>
              </View>
            </View>

            {/* Days Preview */}
            <View className="flex-row flex-wrap gap-1 mt-3">
              {template.days?.map((day, i) => (
                <View key={i} className="bg-zinc-800 px-2 py-1 rounded">
                  <Text className="text-zinc-400 text-xs font-mono">{day.name}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Main Template Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-zinc-900 rounded-t-3xl p-4" style={{ maxHeight: '95%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-lg">
                {editingTemplate ? 'Editar Rutina' : 'Nueva Rutina'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={COLORS.zinc400} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text className="text-zinc-400 text-xs font-mono mb-1">NOMBRE</Text>
              <TextInput
                className="bg-zinc-800 text-white p-3 rounded-lg mb-3 font-mono"
                placeholder="Nombre de la rutina"
                placeholderTextColor={COLORS.zinc400}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData((prev) => ({
                    ...prev,
                    name: text,
                    slug: generateSlug(text),
                  }));
                }}
              />

              {/* Description */}
              <Text className="text-zinc-400 text-xs font-mono mb-1">DESCRIPCIÓN</Text>
              <TextInput
                className="bg-zinc-800 text-white p-3 rounded-lg mb-3 font-mono"
                placeholder="Para qué tipo de usuario es este plan..."
                placeholderTextColor={COLORS.zinc400}
                value={formData.description}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />

              {/* Target Levels */}
              <Text className="text-zinc-400 text-xs font-mono mb-2">NIVEL OBJETIVO</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {LEVELS.map((level) => {
                  const isSelected = formData.target_levels.includes(level);
                  return (
                    <TouchableOpacity
                      key={level}
                      className={`px-3 py-2 rounded-lg border ${
                        isSelected ? 'bg-green-600 border-green-500' : 'bg-zinc-800 border-zinc-700'
                      }`}
                      onPress={() => toggleArrayValue('target_levels', level)}
                    >
                      <Text className={isSelected ? 'text-white' : 'text-zinc-400'}>{level}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Target Goals */}
              <Text className="text-zinc-400 text-xs font-mono mb-2">OBJETIVO</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {GOALS.map((goal) => {
                  const isSelected = formData.target_goals.includes(goal);
                  return (
                    <TouchableOpacity
                      key={goal}
                      className={`px-3 py-2 rounded-lg border ${
                        isSelected
                          ? 'bg-purple-600 border-purple-500'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                      onPress={() => toggleArrayValue('target_goals', goal)}
                    >
                      <Text className={isSelected ? 'text-white' : 'text-zinc-400'}>{goal}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Equipment */}
              <Text className="text-zinc-400 text-xs font-mono mb-2">EQUIPAMIENTO</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {EQUIPMENT.map((eq) => {
                  const isSelected = formData.equipment.includes(eq);
                  return (
                    <TouchableOpacity
                      key={eq}
                      className={`px-3 py-2 rounded-lg border ${
                        isSelected ? 'bg-blue-600 border-blue-500' : 'bg-zinc-800 border-zinc-700'
                      }`}
                      onPress={() => toggleArrayValue('equipment', eq)}
                    >
                      <Text className={isSelected ? 'text-white' : 'text-zinc-400'}>{eq}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Days Section */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-zinc-400 text-xs font-mono">
                  DÍAS ({formData.days.length})
                </Text>
                <TouchableOpacity
                  className="flex-row items-center bg-blue-600 px-2 py-1 rounded"
                  onPress={() => openDayModal()}
                >
                  <Plus size={14} color={COLORS.white} />
                  <Text className="text-white text-xs font-bold ml-1">AGREGAR DÍA</Text>
                </TouchableOpacity>
              </View>

              {/* Days List */}
              {formData.days.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  className="bg-zinc-800 p-3 rounded-lg mb-2 border border-zinc-700"
                  onPress={() => openDayModal(index)}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-white font-bold">
                        Día {index + 1}: {day.name}
                      </Text>
                      {day.focus && <Text className="text-zinc-400 text-xs">{day.focus}</Text>}
                      <Text className="text-blue-400 text-xs mt-1">
                        {day.exercises?.length || 0} ejercicios
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => deleteDay(index)}
                        className="p-2 bg-zinc-700 rounded"
                      >
                        <Trash2 size={14} color={COLORS.red} />
                      </TouchableOpacity>
                      <ChevronRight size={18} color={COLORS.zinc400} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              className="bg-blue-600 py-4 rounded-lg flex-row items-center justify-center mt-4"
              onPress={saveTemplate}
            >
              <Check size={20} color={COLORS.white} />
              <Text className="text-white font-bold ml-2">GUARDAR RUTINA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Day Editor Modal */}
      <Modal visible={dayModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-zinc-900 rounded-t-3xl p-4" style={{ maxHeight: '90%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-lg">
                {editingDayIndex !== null ? `Editar Día ${editingDayIndex + 1}` : 'Nuevo Día'}
              </Text>
              <TouchableOpacity onPress={() => setDayModalVisible(false)}>
                <X size={24} color={COLORS.zinc400} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Day Name */}
              <Text className="text-zinc-400 text-xs font-mono mb-1">NOMBRE DEL DÍA</Text>
              <TextInput
                className="bg-zinc-800 text-white p-3 rounded-lg mb-3 font-mono"
                placeholder="Ej: Push, Piernas, Upper A..."
                placeholderTextColor={COLORS.zinc400}
                value={dayFormData.name}
                onChangeText={(text) => setDayFormData((prev) => ({ ...prev, name: text }))}
              />

              {/* Focus */}
              <Text className="text-zinc-400 text-xs font-mono mb-1">ENFOQUE (opcional)</Text>
              <TextInput
                className="bg-zinc-800 text-white p-3 rounded-lg mb-4 font-mono"
                placeholder="Ej: Pecho/Hombros/Tríceps"
                placeholderTextColor={COLORS.zinc400}
                value={dayFormData.focus}
                onChangeText={(text) => setDayFormData((prev) => ({ ...prev, focus: text }))}
              />

              {/* Exercises */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-zinc-400 text-xs font-mono">
                  EJERCICIOS ({dayFormData.exercises.length})
                </Text>
                <TouchableOpacity
                  className="flex-row items-center bg-green-600 px-2 py-1 rounded"
                  onPress={() => openExerciseModal()}
                >
                  <Plus size={14} color={COLORS.white} />
                  <Text className="text-white text-xs font-bold ml-1">AGREGAR</Text>
                </TouchableOpacity>
              </View>

              {dayFormData.exercises.map((ex, i) => (
                <TouchableOpacity
                  key={i}
                  className="bg-zinc-800 p-3 rounded-lg mb-2 border border-zinc-700"
                  onPress={() => openExerciseModal(i)}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-white font-bold">{ex.name}</Text>
                      <Text className="text-zinc-400 text-xs font-mono">
                        {ex.sets} series × {ex.reps} reps • {ex.rest} descanso
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteExercise(i)}
                      className="p-2 bg-zinc-700 rounded"
                    >
                      <Trash2 size={14} color={COLORS.red} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>

            <TouchableOpacity
              className="bg-green-600 py-4 rounded-lg flex-row items-center justify-center mt-4"
              onPress={saveDay}
            >
              <Check size={20} color={COLORS.white} />
              <Text className="text-white font-bold ml-2">GUARDAR DÍA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exercise Editor Modal */}
      <Modal visible={exerciseModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/90 justify-center px-4">
          <View className="bg-zinc-900 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-lg">
                {editingExerciseIndex !== null ? 'Editar Ejercicio' : 'Agregar Ejercicio'}
              </Text>
              <TouchableOpacity onPress={() => setExerciseModalVisible(false)}>
                <X size={24} color={COLORS.zinc400} />
              </TouchableOpacity>
            </View>

            <Text className="text-zinc-400 text-xs font-mono mb-1">NOMBRE</Text>
            <TextInput
              className="bg-zinc-800 text-white p-3 rounded-lg mb-3 font-mono"
              placeholder="Nombre del ejercicio"
              placeholderTextColor={COLORS.zinc400}
              value={exerciseFormData.name}
              onChangeText={(text) => setExerciseFormData((prev) => ({ ...prev, name: text }))}
            />

            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <Text className="text-zinc-400 text-xs font-mono mb-1">SERIES</Text>
                <TextInput
                  className="bg-zinc-800 text-white p-3 rounded-lg font-mono"
                  placeholder="4"
                  placeholderTextColor={COLORS.zinc400}
                  value={String(exerciseFormData.sets)}
                  onChangeText={(text) =>
                    setExerciseFormData((prev) => ({
                      ...prev,
                      sets: parseInt(text) || 0,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 text-xs font-mono mb-1">REPS</Text>
                <TextInput
                  className="bg-zinc-800 text-white p-3 rounded-lg font-mono"
                  placeholder="8-12"
                  placeholderTextColor={COLORS.zinc400}
                  value={exerciseFormData.reps}
                  onChangeText={(text) => setExerciseFormData((prev) => ({ ...prev, reps: text }))}
                />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 text-xs font-mono mb-1">DESCANSO</Text>
                <TextInput
                  className="bg-zinc-800 text-white p-3 rounded-lg font-mono"
                  placeholder="90s"
                  placeholderTextColor={COLORS.zinc400}
                  value={exerciseFormData.rest}
                  onChangeText={(text) => setExerciseFormData((prev) => ({ ...prev, rest: text }))}
                />
              </View>
            </View>

            <TouchableOpacity
              className="bg-green-600 py-4 rounded-lg flex-row items-center justify-center"
              onPress={saveExercise}
            >
              <Check size={20} color={COLORS.white} />
              <Text className="text-white font-bold ml-2">GUARDAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
