import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import {
  ChevronDown,
  X,
  Edit2,
  Save,
  ShieldAlert,
  Crown,
  Trash2,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { useSaveGuard } from '../../context/SaveGuardContext';
import {
  calculateUserDailyMacros,
  calculateMealWithUserMacros,
} from '../../services/hank/nutrition';

interface Measurement {
  id: string;
  name: string;
  value: string;
  is_dominant: boolean;
}

interface ProfileData {
  goal: string;
  weight: string;
  height: string;
  injuries: string;
  allergies: string;
  // Nuevos campos para ultra personalización de macros
  age?: number;
  sex?: string;
  body_fat_percentage?: number;
  muscle_mass?: number;
  activity_level?: string;
  training_experience?: string;
  metabolic_rate?: string;
  training_days_per_week?: number;
}

interface TrensIDProps {
  userId: string;
  profileData: ProfileData;
  measurements: Measurement[];
  onUpdate: () => void;
}

export default function TrensID({ userId, profileData, measurements, onUpdate }: TrensIDProps) {
  const { canSave } = useSaveGuard();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState<ProfileData>(profileData);
  const [editMeasurements, setEditMeasurements] = useState<Measurement[]>(measurements);
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [newMeasurement, setNewMeasurement] = useState({ name: '', value: '', is_dominant: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  const expandProgress = useSharedValue(0);

  useEffect(() => {
    setEditData(profileData);
    setEditMeasurements(measurements);
  }, [profileData, measurements]);

  useEffect(() => {
    expandProgress.value = withTiming(isExpanded ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isExpanded]);

  const dominantMuscle = editMeasurements.find((m) => m.is_dominant) || { name: 'N/A', value: '-' };

  const handleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(false);
    setShowMeasureForm(false);
  };

  const handleAddMeasurement = async () => {
    if (!newMeasurement.name || !newMeasurement.value) return;

    // Guard: Verificar si puede guardar
    if (!canSave('save_measurement')) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase
        .from('body_measurements')
        .insert({
          user_id: userId,
          name: newMeasurement.name.toUpperCase(),
          value: newMeasurement.value,
          is_dominant: newMeasurement.is_dominant,
        })
        .select()
        .single();

      if (error) throw error;

      setEditMeasurements((prev) => {
        let updated = [...prev];
        if (newMeasurement.is_dominant) {
          updated = updated.map((m) => ({ ...m, is_dominant: false }));
        }
        return [...updated, data];
      });

      setNewMeasurement({ name: '', value: '', is_dominant: false });
      setShowMeasureForm(false);
    } catch (err) {
      console.error('Error adding measurement:', err);
    }
  };

  const toggleDominant = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // El trigger en Supabase se encarga de desactivar los otros
      await supabase.from('body_measurements').update({ is_dominant: true }).eq('id', id);

      setEditMeasurements((prev) =>
        prev.map((m) => ({
          ...m,
          is_dominant: m.id === id,
        }))
      );
    } catch (err) {
      console.error('Error toggling dominant:', err);
    }
  };

  const deleteMeasurement = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      await supabase.from('body_measurements').delete().eq('id', id);

      setEditMeasurements((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Error deleting measurement:', err);
    }
  };

  // Guardar solo los datos del perfil (sin recalcular plan)
  const saveProfileOnly = async () => {
    // Guard: Verificar si puede guardar
    if (!canSave('save_profile')) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          goal: editData.goal,
          weight: editData.weight,
          height: editData.height,
          injuries: editData.injuries,
          allergies: editData.allergies,
          age: editData.age || null,
          sex: editData.sex || null,
          body_fat_percentage: editData.body_fat_percentage || null,
          muscle_mass: editData.muscle_mass || null,
          activity_level: editData.activity_level || 'MODERADO',
          training_experience: editData.training_experience || 'INTERMEDIO',
          metabolic_rate: editData.metabolic_rate || 'NORMAL',
          training_days_per_week: editData.training_days_per_week || 4,
        })
        .eq('user_id', userId);

      if (error) throw error;

      onUpdate();
      setIsExpanded(false);
      setShowMeasureForm(false);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar Y sincronizar con el plan (recalcula macros e ingredientes)
  const saveAndSyncWithPlan = async () => {
    // Guard: Verificar si puede guardar
    if (!canSave('save_profile')) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSyncing(true);
    setSyncProgress('Guardando perfil...');

    try {
      // 1. Guardar perfil e INVALIDAR CACHÉ DE MACROS
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          goal: editData.goal,
          weight: editData.weight,
          height: editData.height,
          injuries: editData.injuries,
          allergies: editData.allergies,
          age: editData.age || null,
          sex: editData.sex || null,
          body_fat_percentage: editData.body_fat_percentage || null,
          muscle_mass: editData.muscle_mass || null,
          activity_level: editData.activity_level || 'MODERADO',
          training_experience: editData.training_experience || 'INTERMEDIO',
          metabolic_rate: editData.metabolic_rate || 'NORMAL',
          training_days_per_week: editData.training_days_per_week || 4,
          // Invalidar caché de macros para forzar recalcular
          cached_daily_macros: null,
          cached_macros_meal_count: null,
          cached_macros_updated_at: null,
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // 2. Obtener todas las comidas del usuario
      setSyncProgress('Obteniendo comidas...');
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('id, name, ingredients')
        .eq('user_id', userId);

      if (mealsError) throw mealsError;

      if (!mealsData || mealsData.length === 0) {
        setSyncProgress('No hay comidas para sincronizar');
        setTimeout(() => {
          onUpdate();
          setIsExpanded(false);
          setIsSyncing(false);
          setSyncProgress('');
        }, 1000);
        return;
      }

      // 3. Calcular nuevos macros con IA usando el perfil actualizado + medidas
      setSyncProgress('Calculando macros con IA...');

      // Preparar medidas corporales para el cálculo
      const bodyMeasurementsForCalc = editMeasurements.map((m) => ({
        name: m.name,
        value: m.value,
        is_dominant: m.is_dominant,
      }));

      const dailyMacros = await calculateUserDailyMacros({
        weight: editData.weight,
        height: editData.height,
        goal: editData.goal,
        mealCount: mealsData.length,
        age: editData.age,
        sex: editData.sex,
        bodyFatPercentage: editData.body_fat_percentage,
        muscleMass: editData.muscle_mass,
        activityLevel: editData.activity_level || 'MODERADO',
        trainingExperience: editData.training_experience,
        metabolicRate: editData.metabolic_rate,
        trainingDaysPerWeek: editData.training_days_per_week,
        // Incluir todas las medidas corporales
        bodyMeasurements: bodyMeasurementsForCalc,
      });

      const perMealMacros = dailyMacros.perMeal;
      console.warn('🎯 Nuevos macros por comida:', perMealMacros);

      // 4. Recalcular cada comida con IA
      let processedCount = 0;
      for (const meal of mealsData) {
        processedCount++;
        setSyncProgress(`Recalculando ${processedCount}/${mealsData.length}...`);

        const ingredients = meal.ingredients || [];
        if (ingredients.length === 0) continue;

        // Preparar ingredientes para recálculo
        const ingredientsWithIds = ingredients.map((ing: any, i: number) => ({
          id: `ing-${i}`,
          name: ing.name,
          quantity: '', // Vacío para que IA recalcule
          portion: '',
        }));

        // Recalcular con IA
        const calculated = await calculateMealWithUserMacros(ingredientsWithIds, perMealMacros);

        // Actualizar en la base de datos
        const updatedIngredients = calculated.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          portion: ing.portion || '',
        }));

        // Calcular macros totales de la comida
        let totalCals = 0,
          totalP = 0,
          totalC = 0,
          totalF = 0;
        calculated.forEach((ing) => {
          totalCals += ing.nutritionInfo?.calories || 0;
          totalP += ing.nutritionInfo?.protein || 0;
          totalC += ing.nutritionInfo?.carbs || 0;
          totalF += ing.nutritionInfo?.fat || 0;
        });

        await supabase
          .from('meals')
          .update({
            ingredients: updatedIngredients,
            calories: Math.round(totalCals),
            protein_g: Math.round(totalP),
            carbs_g: Math.round(totalC),
            fat_g: Math.round(totalF),
          })
          .eq('id', meal.id);
      }

      setSyncProgress('✓ Plan sincronizado');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        onUpdate();
        setIsExpanded(false);
        setShowMeasureForm(false);
        setIsSyncing(false);
        setSyncProgress('');
      }, 1500);
    } catch (err) {
      console.error('Error syncing with plan:', err);
      setSyncProgress('Error al sincronizar');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress('');
      }, 2000);
    }
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(expandProgress.value, [0, 1], [0, 180])}deg` }],
    opacity: interpolate(expandProgress.value, [0, 1], [0.5, 0]),
  }));

  return (
    <View className="mb-6">
      {/* CARD CONTAINER */}
      <TouchableOpacity
        activeOpacity={isExpanded ? 1 : 0.8}
        onPress={!isExpanded ? handleExpand : undefined}
        className={`bg-[#111] border rounded-sm overflow-hidden ${
          isExpanded ? 'border-zinc-700 bg-[#0e0e0e]' : 'border-zinc-800'
        }`}
      >
        {/* HEADER */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-zinc-800">
          <View className="flex-row items-center gap-2">
            <View
              className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-savage-red' : 'bg-zinc-600'}`}
            />
            <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
              ID // Biometrics {isExpanded && <Text className="text-savage-red">[EDIT MODE]</Text>}
            </Text>
          </View>
          {isExpanded ? (
            <TouchableOpacity
              onPress={handleCollapse}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={14} color="#71717a" />
            </TouchableOpacity>
          ) : (
            <Edit2 size={12} color="#52525b" />
          )}
        </View>

        {/* CONTENIDO */}
        <View className="p-4">
          {!isExpanded ? (
            // --- VISTA RESUMEN (PASSIVE) ---
            <View>
              <View className="flex-row flex-wrap">
                {/* Objetivo */}
                <View className="w-1/2 mb-4">
                  <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                    Objetivo
                  </Text>
                  <Text className="text-white font-bold text-sm uppercase">{editData.goal}</Text>
                </View>

                {/* Peso Actual */}
                <View className="w-1/2 mb-4 items-end">
                  <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                    Peso Actual
                  </Text>
                  <Text className="text-white font-mono font-bold text-lg">{editData.weight}</Text>
                </View>

                {/* Lesiones */}
                <View className="w-1/2">
                  <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                    Lesiones
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <ShieldAlert size={10} color="#ef4444" />
                    <Text className="text-red-500 font-bold text-xs uppercase">
                      {editData.injuries}
                    </Text>
                  </View>
                </View>

                {/* Músculo Dominante */}
                <View className="w-1/2 items-end">
                  <View className="flex-row items-center gap-1 mb-1">
                    <Crown size={10} color="#eab308" />
                    <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Dominante
                    </Text>
                  </View>
                  <Text className="text-white font-bold text-sm uppercase">
                    {dominantMuscle.name} {dominantMuscle.value}
                  </Text>
                </View>
              </View>

              {/* Hint para expandir */}
              <Animated.View style={chevronStyle} className="items-center mt-3">
                <ChevronDown size={12} color="#52525b" />
              </Animated.View>
            </View>
          ) : (
            // --- VISTA EDICIÓN (ACTIVE) ---
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* CAMPOS PRINCIPALES */}
              <View className="flex-row flex-wrap -mx-1">
                <View className="w-1/2 px-1 mb-3">
                  <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                    Objetivo
                  </Text>
                  <TextInput
                    value={editData.goal}
                    onChangeText={(text) => setEditData({ ...editData, goal: text })}
                    className="bg-black border border-zinc-800 p-3 text-white text-xs font-bold"
                    placeholderTextColor="#52525b"
                  />
                </View>
                <View className="w-1/2 px-1 mb-3">
                  <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                    Peso
                  </Text>
                  <TextInput
                    value={editData.weight}
                    onChangeText={(text) => setEditData({ ...editData, weight: text })}
                    className="bg-black border border-zinc-800 p-3 text-white text-xs font-bold"
                    placeholderTextColor="#52525b"
                  />
                </View>
                <View className="w-1/2 px-1 mb-3">
                  <Text className="text-[9px] text-red-900 uppercase font-bold tracking-wider mb-1">
                    Lesiones
                  </Text>
                  <TextInput
                    value={editData.injuries}
                    onChangeText={(text) => setEditData({ ...editData, injuries: text })}
                    className="bg-black border border-red-900/30 p-3 text-red-400 text-xs font-bold"
                    placeholderTextColor="#7f1d1d"
                  />
                </View>
                <View className="w-1/2 px-1 mb-3">
                  <Text className="text-[9px] text-yellow-700 uppercase font-bold tracking-wider mb-1">
                    Alergias
                  </Text>
                  <TextInput
                    value={editData.allergies}
                    onChangeText={(text) => setEditData({ ...editData, allergies: text })}
                    className="bg-black border border-yellow-900/30 p-3 text-yellow-200 text-xs font-bold"
                    placeholderTextColor="#713f12"
                  />
                </View>
              </View>

              {/* SECCIÓN BIOMETRÍA AVANZADA */}
              <View className="pt-4 mt-2 border-t border-zinc-800">
                <Text className="text-savage-red text-[10px] font-bold uppercase tracking-widest mb-3">
                  🧬 Biometría Avanzada
                </Text>
                <View className="flex-row flex-wrap -mx-1">
                  {/* Edad */}
                  <View className="w-1/3 px-1 mb-3">
                    <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                      Edad
                    </Text>
                    <TextInput
                      value={editData.age?.toString() || ''}
                      onChangeText={(text) =>
                        setEditData({ ...editData, age: parseInt(text) || undefined })
                      }
                      keyboardType="numeric"
                      placeholder="30"
                      className="bg-black border border-zinc-800 p-3 text-white text-xs font-bold"
                      placeholderTextColor="#52525b"
                    />
                  </View>
                  {/* Sexo */}
                  <View className="w-1/3 px-1 mb-3">
                    <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                      Sexo
                    </Text>
                    <View className="flex-row gap-1">
                      <TouchableOpacity
                        onPress={() => setEditData({ ...editData, sex: 'M' })}
                        className={`flex-1 p-3 border ${editData.sex === 'M' ? 'bg-savage-red border-savage-red' : 'bg-black border-zinc-800'}`}
                      >
                        <Text
                          className={`text-center text-xs font-bold ${editData.sex === 'M' ? 'text-white' : 'text-zinc-500'}`}
                        >
                          M
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditData({ ...editData, sex: 'F' })}
                        className={`flex-1 p-3 border ${editData.sex === 'F' ? 'bg-savage-red border-savage-red' : 'bg-black border-zinc-800'}`}
                      >
                        <Text
                          className={`text-center text-xs font-bold ${editData.sex === 'F' ? 'text-white' : 'text-zinc-500'}`}
                        >
                          F
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {/* % Grasa */}
                  <View className="w-1/3 px-1 mb-3">
                    <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                      % Grasa
                    </Text>
                    <TextInput
                      value={editData.body_fat_percentage?.toString() || ''}
                      onChangeText={(text) =>
                        setEditData({
                          ...editData,
                          body_fat_percentage: parseFloat(text) || undefined,
                        })
                      }
                      keyboardType="numeric"
                      placeholder="15"
                      className="bg-black border border-zinc-800 p-3 text-white text-xs font-bold"
                      placeholderTextColor="#52525b"
                    />
                  </View>
                  {/* Masa Muscular */}
                  <View className="w-1/2 px-1 mb-3">
                    <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                      Masa Muscular (kg)
                    </Text>
                    <TextInput
                      value={editData.muscle_mass?.toString() || ''}
                      onChangeText={(text) =>
                        setEditData({ ...editData, muscle_mass: parseFloat(text) || undefined })
                      }
                      keyboardType="numeric"
                      placeholder="65"
                      className="bg-black border border-zinc-800 p-3 text-white text-xs font-bold"
                      placeholderTextColor="#52525b"
                    />
                  </View>
                  {/* Días de Entreno */}
                  <View className="w-1/2 px-1 mb-3">
                    <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                      Días/Semana
                    </Text>
                    <TextInput
                      value={editData.training_days_per_week?.toString() || '4'}
                      onChangeText={(text) =>
                        setEditData({ ...editData, training_days_per_week: parseInt(text) || 4 })
                      }
                      keyboardType="numeric"
                      placeholder="4"
                      className="bg-black border border-zinc-800 p-3 text-white text-xs font-bold"
                      placeholderTextColor="#52525b"
                    />
                  </View>
                </View>

                {/* Nivel de Actividad */}
                <View className="mb-3">
                  <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-2">
                    Nivel de Actividad
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
                    {['SEDENTARIO', 'LIGERO', 'MODERADO', 'ACTIVO', 'MUY ACTIVO'].map((level) => (
                      <TouchableOpacity
                        key={level}
                        onPress={() => setEditData({ ...editData, activity_level: level })}
                        className={`px-3 py-2 border ${editData.activity_level === level ? 'bg-savage-red border-savage-red' : 'bg-black border-zinc-800'}`}
                      >
                        <Text
                          className={`text-[9px] font-bold ${editData.activity_level === level ? 'text-white' : 'text-zinc-500'}`}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Experiencia */}
                <View className="mb-3">
                  <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-2">
                    Experiencia
                  </Text>
                  <View className="flex-row gap-1">
                    {['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO', 'ELITE'].map((exp) => (
                      <TouchableOpacity
                        key={exp}
                        onPress={() => setEditData({ ...editData, training_experience: exp })}
                        className={`flex-1 py-2 border ${editData.training_experience === exp ? 'bg-savage-red border-savage-red' : 'bg-black border-zinc-800'}`}
                      >
                        <Text
                          className={`text-center text-[8px] font-bold ${editData.training_experience === exp ? 'text-white' : 'text-zinc-500'}`}
                        >
                          {exp}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Metabolismo */}
                <View className="mb-3">
                  <Text className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-2">
                    Metabolismo
                  </Text>
                  <View className="flex-row gap-1">
                    {['LENTO', 'NORMAL', 'RAPIDO'].map((meta) => (
                      <TouchableOpacity
                        key={meta}
                        onPress={() => setEditData({ ...editData, metabolic_rate: meta })}
                        className={`flex-1 py-2 border ${editData.metabolic_rate === meta ? 'bg-savage-red border-savage-red' : 'bg-black border-zinc-800'}`}
                      >
                        <Text
                          className={`text-center text-[9px] font-bold ${editData.metabolic_rate === meta ? 'text-white' : 'text-zinc-500'}`}
                        >
                          {meta}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* SECCIÓN MEDIDAS */}
              <View className="pt-4 mt-2 border-t border-zinc-800">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                    Medidas Corporales
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowMeasureForm(!showMeasureForm);
                    }}
                    className="bg-zinc-800 px-3 py-1 rounded"
                  >
                    <Text className="text-[9px] text-white uppercase font-bold">
                      {showMeasureForm ? 'Cancelar' : '+ Agregar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Formulario Agregar Medida */}
                {showMeasureForm && (
                  <View className="bg-[#151515] p-3 rounded mb-3 border border-zinc-700">
                    <View className="flex-row gap-2 mb-3">
                      <TextInput
                        placeholder="Zona (ej: Pecho)"
                        value={newMeasurement.name}
                        onChangeText={(text) =>
                          setNewMeasurement({ ...newMeasurement, name: text })
                        }
                        className="bg-black text-white text-xs p-3 flex-1 border border-zinc-700"
                        placeholderTextColor="#52525b"
                      />
                      <TextInput
                        placeholder="Valor"
                        value={newMeasurement.value}
                        onChangeText={(text) =>
                          setNewMeasurement({ ...newMeasurement, value: text })
                        }
                        className="bg-black text-white text-xs p-3 w-20 border border-zinc-700"
                        placeholderTextColor="#52525b"
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        setNewMeasurement({
                          ...newMeasurement,
                          is_dominant: !newMeasurement.is_dominant,
                        })
                      }
                      className="flex-row items-center gap-2 mb-3"
                    >
                      <View
                        className={`w-5 h-5 border items-center justify-center ${
                          newMeasurement.is_dominant
                            ? 'bg-yellow-500 border-yellow-500'
                            : 'border-zinc-600 bg-transparent'
                        }`}
                      >
                        {newMeasurement.is_dominant && <Crown size={10} color="#000" />}
                      </View>
                      <Text
                        className={`text-[10px] uppercase font-bold ${
                          newMeasurement.is_dominant ? 'text-yellow-500' : 'text-zinc-500'
                        }`}
                      >
                        Músculo Dominante 👑
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleAddMeasurement}
                      className="bg-white py-3 items-center"
                    >
                      <Text className="text-black text-[10px] font-black uppercase tracking-widest">
                        Confirmar Medida
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Lista de Medidas */}
                <View className="gap-1">
                  {editMeasurements.map((m) => (
                    <View
                      key={m.id}
                      className={`flex-row items-center justify-between p-3 rounded bg-[#080808] border ${
                        m.is_dominant
                          ? 'border-yellow-600/40 bg-yellow-900/5'
                          : 'border-zinc-800/50'
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <TouchableOpacity onPress={() => toggleDominant(m.id)}>
                          <Crown
                            size={14}
                            color={m.is_dominant ? '#eab308' : '#3f3f46'}
                            fill={m.is_dominant ? '#eab308' : 'none'}
                          />
                        </TouchableOpacity>
                        <View>
                          <Text
                            className={`text-xs font-bold uppercase ${
                              m.is_dominant ? 'text-white' : 'text-zinc-400'
                            }`}
                          >
                            {m.name}
                          </Text>
                          <Text className="text-[10px] text-zinc-600 font-mono">{m.value}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => deleteMeasurement(m.id)}>
                        <Trash2 size={12} color="#3f3f46" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* BOTONES DE GUARDADO */}
              <View className="mt-6 gap-3">
                {/* Botón principal: Guardar y Sincronizar */}
                <TouchableOpacity
                  onPress={saveAndSyncWithPlan}
                  disabled={isSyncing || isSaving}
                  className={`py-4 flex-row items-center justify-center gap-2 ${
                    isSyncing ? 'bg-savage-red' : 'bg-white'
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text className="text-white font-black uppercase tracking-widest text-xs">
                        {syncProgress}
                      </Text>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} color="#000" />
                      <Text className="text-black font-black uppercase tracking-widest text-xs">
                        Guardar y Sincronizar Plan
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Botón secundario: Solo guardar ficha */}
                <TouchableOpacity
                  onPress={saveProfileOnly}
                  disabled={isSyncing || isSaving}
                  className="py-3 flex-row items-center justify-center gap-2 border border-zinc-700"
                >
                  <Save size={12} color="#71717a" />
                  <Text className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                    {isSaving ? 'Guardando...' : 'Solo Guardar Ficha'}
                  </Text>
                </TouchableOpacity>

                {/* Nota explicativa */}
                <Text className="text-[9px] text-zinc-600 text-center">
                  Sincronizar recalcula todos los macros e ingredientes de tu plan con IA
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>

      {/* Texto de privacidad */}
      {!isExpanded && (
        <View className="items-center mt-2">
          <Text className="text-[9px] text-zinc-700 uppercase tracking-widest">
            Privado • Solo tú ves esto
          </Text>
        </View>
      )}
    </View>
  );
}
