// ============================================================================
// PLAN MODULE - Agenda Metabólica Adaptable
// Línea de tiempo con Comidas, Stacks y Bloque de Entrenamiento
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { Plus, Pill } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { MealCard } from '../../../components/plan/MealCard';
import { StackCard } from '../../../components/plan/StackCard';
import { WorkoutBlock } from '../../../components/plan/WorkoutBlock';
import { AddMealModal } from '../../../components/plan/AddMealModal';
import { EditMealModal } from '../../../components/plan/EditMealModal';
import { TimePickerModal } from '../../../components/plan/TimePickerModal';
import { StackManagerModal } from '../../../components/plan/StackManagerModal';
import { supabase } from '../../../lib/supabase';
import { useAxis } from '../../../context/AxisContext';
import { calculateMacrosWithAI } from '../../../services/axis/nutrition';

// ============================================================================
// TYPES
// ============================================================================
interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  portion?: string;
}

interface MealOption {
  id: string;
  name: string;
  ingredients: Ingredient[];
}

interface Meal {
  id: string;
  time: string;
  options: MealOption[];
  selectedOption: number;
}

interface StackItem {
  id: string;
  name: string;
  dose: string;
  type: 'pill' | 'syringe' | 'powder' | 'liquid';
  notes?: string;
  time?: string;
  isPreWorkout?: boolean;
  isPostWorkout?: boolean;
  daysOfWeek?: number[];
}

interface Stack {
  id: string;
  time: string;
  items: StackItem[];
}

interface WorkoutBlockData {
  id: string;
  routineName: string;
  preStack: StackItem[];
  postStack: StackItem[];
  exercises?: { id: string; name: string; imageUrl?: string }[];
}

interface TimelineItem {
  type: 'meal' | 'stack' | 'workout';
  data: Meal | Stack | WorkoutBlockData;
  time?: string;
}

// ============================================================================
// HELPERS
// ============================================================================
const getMealName = (index: number, total: number): string => {
  if (total === 1) return 'COMIDA ÚNICA';
  if (total === 2) return index === 0 ? 'DESAYUNO' : 'CENA';
  if (total === 3) return ['DESAYUNO', 'ALMUERZO', 'CENA'][index] || `COMIDA ${index + 1}`;
  if (total === 4) return `COMIDA ${index + 1}`;
  if (total === 5) {
    return (
      ['DESAYUNO', 'MEDIA MAÑANA', 'ALMUERZO', 'MEDIA TARDE', 'CENA'][index] ||
      `COMIDA ${index + 1}`
    );
  }
  return `COMIDA ${index + 1}`;
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function PlanScreen() {
  const router = useRouter();
  const { refreshTrigger } = useAxis();

  // State
  const [planName, setPlanName] = useState('MI PLAN');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stackItems, setStackItems] = useState<StackItem[]>([]);
  const [workoutPosIndex, setWorkoutPosIndex] = useState(2);
  const [todayRoutine, setTodayRoutine] = useState<string>('SIN RUTINA');
  const [todayExercises, setTodayExercises] = useState<{ id: string; name: string }[]>([]);

  // Modals
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showEditMeal, setShowEditMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMealId, setTimePickerMealId] = useState<string | null>(null);
  const [timePickerCurrentTime, setTimePickerCurrentTime] = useState('12:00');
  const [showStackManager, setShowStackManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch plan
      const { data: planData } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (planData) {
        setPlanName(planData.name || 'MI PLAN');
      }

      // Fetch meals with options and ingredients
      const { data: mealsData } = await supabase
        .from('meals')
        .select(
          `
          id,
          time,
          selected_option,
          meal_options (
            id,
            name,
            option_index,
            meal_ingredients (
              id,
              name,
              quantity,
              portion,
              sort_order
            )
          )
        `
        )
        .eq('user_id', user.id)
        .order('time', { ascending: true });

      if (mealsData) {
        const formattedMeals: Meal[] = mealsData.map((meal) => ({
          id: meal.id,
          time: meal.time?.slice(0, 5) || '12:00',
          selectedOption: meal.selected_option || 0,
          options: (meal.meal_options || [])
            .sort(
              (a: { option_index: number }, b: { option_index: number }) =>
                a.option_index - b.option_index
            )
            .map(
              (opt: {
                id: string;
                name: string;
                meal_ingredients: {
                  id: string;
                  name: string;
                  quantity: string;
                  portion?: string;
                  sort_order: number;
                }[];
              }) => ({
                id: opt.id,
                name: opt.name || 'Opción',
                ingredients: (opt.meal_ingredients || [])
                  .sort(
                    (a: { sort_order: number }, b: { sort_order: number }) =>
                      a.sort_order - b.sort_order
                  )
                  .map((ing: { id: string; name: string; quantity: string; portion?: string }) => ({
                    id: ing.id,
                    name: ing.name,
                    quantity: ing.quantity,
                    portion: ing.portion,
                  })),
              })
            ),
        }));
        setMeals(formattedMeals);
      }

      // Fetch supplement stack
      const { data: stackData } = await supabase
        .from('supplement_stack')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (stackData) {
        const formattedStack: StackItem[] = stackData.map((item) => ({
          id: item.id,
          name: item.name,
          dose: item.dose,
          type: item.type as StackItem['type'],
          notes: item.notes,
          time: item.time?.slice(0, 5),
          isPreWorkout: item.is_pre_workout,
          isPostWorkout: item.is_post_workout,
          daysOfWeek: item.days_of_week,
        }));
        setStackItems(formattedStack);
      }

      // Fetch workout block position
      const { data: posData } = await supabase
        .from('workout_block_position')
        .select('position_index')
        .eq('user_id', user.id)
        .single();

      if (posData) {
        setWorkoutPosIndex(posData.position_index);
      }

      // Fetch today's routine from user_assets
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const { data: routineData } = await supabase
        .from('user_assets')
        .select('name')
        .eq('user_id', user.id)
        .contains('training_days', [today])
        .is('deleted_at', null)
        .limit(1)
        .single();

      if (routineData) {
        setTodayRoutine(routineData.name);
      }

      // Fetch today's exercises
      const { data: exercisesData } = await supabase
        .from('user_assets')
        .select('exercises')
        .eq('user_id', user.id)
        .contains('training_days', [today])
        .is('deleted_at', null)
        .single();

      if (exercisesData?.exercises) {
        setTodayExercises(
          exercisesData.exercises.slice(0, 6).map((ex: { name: string }, idx: number) => ({
            id: `ex-${idx}`,
            name: ex.name,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching plan data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // RefreshTrigger from AXIS
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 PLAN: refreshTrigger cambió, recargando datos...');
      fetchData();
    }
  }, [refreshTrigger, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleSwap = async (mealId: string, newOptionIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, selectedOption: newOptionIndex } : m))
    );

    // Persist to database
    await supabase.from('meals').update({ selected_option: newOptionIndex }).eq('id', mealId);
  };

  const handleTimeChange = (mealId: string) => {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimePickerMealId(mealId);
    setTimePickerCurrentTime(meal.time);
    setShowTimePicker(true);
  };

  // Guardar nueva hora desde el modal
  const handleSaveTime = async (newTime: string) => {
    if (!timePickerMealId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Update and re-sort
    const updated = meals
      .map((m) => (m.id === timePickerMealId ? { ...m, time: newTime } : m))
      .sort((a, b) => a.time.localeCompare(b.time));

    setMeals(updated);

    // Persist
    await supabase.from('meals').update({ time: newTime }).eq('id', timePickerMealId);

    setTimePickerMealId(null);
  };

  // Parsear input de hora flexible a formato 24h
  const parseTimeInput = (input: string): string | null => {
    const upper = input.toUpperCase().trim();

    // Detectar AM/PM
    const isPM = upper.includes('PM');
    const isAM = upper.includes('AM');
    const cleanTime = upper.replace(/\s*(AM|PM)\s*/g, '').trim();

    let hours: number;
    let minutes: number = 0;

    if (cleanTime.includes(':')) {
      const parts = cleanTime.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10) || 0;
    } else {
      hours = parseInt(cleanTime, 10);
    }

    if (isNaN(hours) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    // Convertir a 24h si hay AM/PM
    if (isAM || isPM) {
      if (hours > 12) return null;
      if (isAM && hours === 12) hours = 0;
      if (isPM && hours !== 12) hours += 12;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Eliminar comida
  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert('Eliminar Comida', '¿Estás seguro de que quieres eliminar esta comida?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await supabase.from('meals').delete().eq('id', mealId);
          setMeals((prev) => prev.filter((m) => m.id !== mealId));
        },
      },
    ]);
  };

  // Editar comida (abre modal)
  const handleEditMeal = (mealId: string) => {
    const meal = meals.find((m) => m.id === mealId);
    if (meal) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditingMeal(meal);
      setShowEditMeal(true);
    }
  };

  // Guardar cambios de ingredientes
  const handleSaveIngredients = async (
    mealId: string,
    optionId: string,
    ingredients: Ingredient[]
  ) => {
    try {
      // Delete existing ingredients
      await supabase.from('meal_ingredients').delete().eq('option_id', optionId);

      // Insert updated ingredients
      const ingredientsToInsert = ingredients.map((ing, idx) => ({
        option_id: optionId,
        name: ing.name,
        quantity: ing.quantity || '~100g',
        portion: ing.portion || '',
        sort_order: idx,
      }));

      await supabase.from('meal_ingredients').insert(ingredientsToInsert);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error saving ingredients:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
      throw error;
    }
  };

  // Calcular macros con IA
  const handleCalculateMacros = async (ingredients: Ingredient[]): Promise<Ingredient[]> => {
    try {
      const calculated = await calculateMacrosWithAI(ingredients);
      return calculated.map((ing) => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity,
        portion: ing.portion,
      }));
    } catch (error) {
      console.error('Error calculating macros:', error);
      throw error;
    }
  };

  const handleAddMeal = async (
    ingredients: { name: string; quantity: string; portion: string }[],
    time: string,
    useAxisAI: boolean
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Formatear hora correctamente (acepta "7", "07", "7:30", "07:30")
      let formattedTime = time.trim();
      if (!formattedTime.includes(':')) {
        // Solo hora, agregar :00
        formattedTime = formattedTime.padStart(2, '0') + ':00';
      } else {
        // Tiene :, asegurar formato HH:MM
        const [hours, minutes] = formattedTime.split(':');
        formattedTime = hours.padStart(2, '0') + ':' + (minutes || '00').padStart(2, '0');
      }

      // Get active plan
      let { data: plan } = await supabase
        .from('nutrition_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!plan) {
        // Create default plan
        const { data: newPlan, error: planError } = await supabase
          .from('nutrition_plans')
          .insert({ user_id: user.id, name: 'MI PLAN', is_active: true })
          .select()
          .single();

        if (planError) {
          console.error('Error creating plan:', planError);
          throw new Error(`No se pudo crear el plan: ${planError.message}`);
        }
        plan = newPlan;
      }

      if (!plan) {
        throw new Error('No se pudo obtener el plan');
      }

      // Create meal
      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .insert({
          plan_id: plan.id,
          user_id: user.id,
          time: formattedTime,
        })
        .select()
        .single();

      if (mealError) throw mealError;

      // Create meal option
      const { data: optionData, error: optError } = await supabase
        .from('meal_options')
        .insert({
          meal_id: mealData.id,
          name: 'Opción Principal',
          option_index: 0,
        })
        .select()
        .single();

      if (optError) throw optError;

      // Calcular macros con IA si está activado
      let finalIngredients = ingredients;
      if (useAxisAI) {
        try {
          const ingredientsWithIds = ingredients.map((ing, i) => ({
            id: `temp-${i}`,
            name: ing.name,
            quantity: ing.quantity || '',
            portion: ing.portion || '',
          }));
          const calculated = await calculateMacrosWithAI(ingredientsWithIds);
          finalIngredients = calculated.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            portion: ing.portion || '',
          }));
        } catch (aiError) {
          console.warn('Error calculando macros con IA, usando valores por defecto:', aiError);
        }
      }

      // Create ingredients
      const ingredientsToInsert = finalIngredients.map((ing, idx) => ({
        option_id: optionData.id,
        name: ing.name,
        quantity: ing.quantity || '~100 gr',
        portion: ing.portion || '',
        sort_order: idx,
      }));

      await supabase.from('meal_ingredients').insert(ingredientsToInsert);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error adding meal:', error);
      Alert.alert('Error', 'No se pudo agregar la comida');
    }
  };

  const handleAddStackItem = async (item: Omit<StackItem, 'id'>) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('supplement_stack').insert({
        user_id: user.id,
        name: item.name,
        dose: item.dose,
        type: item.type,
        notes: item.notes,
        time: item.time || null,
        is_pre_workout: item.isPreWorkout || false,
        is_post_workout: item.isPostWorkout || false,
        days_of_week: item.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      });

      fetchData();
    } catch (error) {
      console.error('Error adding stack item:', error);
    }
  };

  const handleRemoveStackItem = async (id: string) => {
    try {
      await supabase.from('supplement_stack').delete().eq('id', id);
      setStackItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error removing stack item:', error);
    }
  };

  const handleMoveWorkout = async (direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? Math.max(0, workoutPosIndex - 1) : workoutPosIndex + 1;

    setWorkoutPosIndex(newIndex);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('workout_block_position').upsert({
        user_id: user.id,
        position_index: newIndex,
      });
    }
  };

  // ============================================================================
  // BUILD TIMELINE
  // ============================================================================
  const buildTimeline = (): TimelineItem[] => {
    const today = new Date().getDay();

    // Filter stacks for today and group by time
    const todayStacks = stackItems.filter(
      (item) =>
        !item.isPreWorkout &&
        !item.isPostWorkout &&
        item.time &&
        (item.daysOfWeek?.includes(today) ?? true)
    );

    const groupedStacks: Stack[] = [];
    const stacksByTime: Record<string, StackItem[]> = {};

    todayStacks.forEach((item) => {
      const time = item.time || '00:00';
      if (!stacksByTime[time]) stacksByTime[time] = [];
      stacksByTime[time].push(item);
    });

    Object.entries(stacksByTime).forEach(([time, items]) => {
      groupedStacks.push({
        id: `stack-${time}`,
        time,
        items,
      });
    });

    // Create timeline with meals and stacks
    const timeline: TimelineItem[] = [
      ...meals.map((m) => ({ type: 'meal' as const, data: m, time: m.time })),
      ...groupedStacks.map((s) => ({ type: 'stack' as const, data: s, time: s.time })),
    ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    // Insert workout block at position
    const preStack = stackItems.filter(
      (i) => i.isPreWorkout && (i.daysOfWeek?.includes(today) ?? true)
    );
    const postStack = stackItems.filter(
      (i) => i.isPostWorkout && (i.daysOfWeek?.includes(today) ?? true)
    );

    const workoutBlock: WorkoutBlockData = {
      id: 'workout-block',
      routineName: todayRoutine,
      preStack,
      postStack,
      exercises: todayExercises,
    };

    const safeIndex = Math.min(Math.max(0, workoutPosIndex), timeline.length);
    const finalTimeline = [
      ...timeline.slice(0, safeIndex),
      { type: 'workout' as const, data: workoutBlock },
      ...timeline.slice(safeIndex),
    ];

    return finalTimeline;
  };

  const timeline = buildTimeline();

  // ============================================================================
  // RENDER
  // ============================================================================
  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Cargando plan...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="px-5 pt-16 pb-4 flex-row justify-between items-center border-b border-white/5 bg-black">
        <View>
          <Text className="text-zinc-500 text-xs tracking-widest uppercase mb-1">Tu Plan</Text>
          <Text className="text-white text-xl font-bold font-mono tracking-tighter">
            {planName}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowStackManager(true);
          }}
          className="flex-row items-center gap-2 bg-[#1a1a1a] border border-white/10 px-3 py-2 rounded-full active:bg-[#222222]"
        >
          <Pill size={16} color="#A855F7" />
          <Text className="text-white text-xs font-bold">STACK</Text>
        </Pressable>
      </View>

      {/* Timeline */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
        }
      >
        {/* Timeline Line */}
        <View className="absolute left-9 top-0 bottom-0 w-px bg-white/5" />

        <View className="pt-6">
          {timeline.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Text className="text-zinc-500 text-center mb-2">No hay comidas configuradas</Text>
              <Text className="text-zinc-600 text-sm text-center">
                Agrega tu primera comida para comenzar
              </Text>
            </View>
          ) : (
            timeline.map((item) => {
              if (item.type === 'meal') {
                const meal = item.data as Meal;
                const mealIndex = meals.findIndex((m) => m.id === meal.id);
                return (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    mealName={getMealName(mealIndex, meals.length)}
                    onSwap={handleSwap}
                    onTimeChange={handleTimeChange}
                    onDelete={handleDeleteMeal}
                    onEdit={handleEditMeal}
                  />
                );
              }

              if (item.type === 'stack') {
                const stack = item.data as Stack;
                return <StackCard key={stack.id} stack={stack} />;
              }

              if (item.type === 'workout') {
                const workout = item.data as WorkoutBlockData;
                return (
                  <WorkoutBlock
                    key="workout-block"
                    data={workout}
                    onMoveUp={() => handleMoveWorkout('up')}
                    onMoveDown={() => handleMoveWorkout('down')}
                    isFirst={workoutPosIndex === 0}
                    isLast={workoutPosIndex >= timeline.length - 1}
                    onPressRoutine={() => router.push('/(tabs)/gym')}
                  />
                );
              }

              return null;
            })
          )}
        </View>

        {/* Add Meal Button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddMeal(true);
          }}
          className="w-full py-4 mt-4 mb-24 border-2 border-dashed border-zinc-800 rounded-xl active:border-white/20 active:bg-white/5"
        >
          <View className="flex-row items-center justify-center gap-2">
            <Plus size={20} color="#666" />
            <Text className="text-zinc-500 font-bold tracking-widest">AGREGAR COMIDA</Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Modals */}
      <AddMealModal
        visible={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        onSave={handleAddMeal}
      />

      <EditMealModal
        visible={showEditMeal}
        meal={editingMeal}
        onClose={() => {
          setShowEditMeal(false);
          setEditingMeal(null);
        }}
        onSave={handleSaveIngredients}
        onCalculateMacros={handleCalculateMacros}
      />

      <TimePickerModal
        visible={showTimePicker}
        currentTime={timePickerCurrentTime}
        onClose={() => {
          setShowTimePicker(false);
          setTimePickerMealId(null);
        }}
        onSave={handleSaveTime}
      />

      <StackManagerModal
        visible={showStackManager}
        onClose={() => setShowStackManager(false)}
        items={stackItems}
        onAddItem={handleAddStackItem}
        onRemoveItem={handleRemoveStackItem}
      />
    </View>
  );
}
