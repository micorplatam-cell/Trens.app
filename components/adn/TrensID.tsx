import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { ChevronDown, X, Edit2, Save, ShieldAlert, Crown, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';

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
}

interface TrensIDProps {
  userId: string;
  profileData: ProfileData;
  measurements: Measurement[];
  onUpdate: () => void;
}

export default function TrensID({ userId, profileData, measurements, onUpdate }: TrensIDProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState<ProfileData>(profileData);
  const [editMeasurements, setEditMeasurements] = useState<Measurement[]>(measurements);
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [newMeasurement, setNewMeasurement] = useState({ name: '', value: '', is_dominant: false });
  const [isSaving, setIsSaving] = useState(false);

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

  const saveChanges = async () => {
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

              {/* BOTÓN GUARDAR */}
              <TouchableOpacity
                onPress={saveChanges}
                disabled={isSaving}
                className="bg-white py-4 mt-6 flex-row items-center justify-center gap-2"
              >
                <Save size={14} color="#000" />
                <Text className="text-black font-black uppercase tracking-widest text-xs">
                  {isSaving ? 'Guardando...' : 'Guardar Ficha'}
                </Text>
              </TouchableOpacity>
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
