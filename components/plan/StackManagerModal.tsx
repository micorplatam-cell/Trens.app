// ============================================================================
// STACK MANAGER MODAL - Gestión de Suplementos/Fármacos
// Administra el inventario de química y suplementos
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  Plus,
  Clock,
  Trash2,
  Pill,
  Syringe,
  FlaskConical,
  Droplets,
  Zap,
  Flame,
} from 'lucide-react-native';

// ============================================================================
// TYPES
// ============================================================================
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

interface StackManagerModalProps {
  visible: boolean;
  onClose: () => void;
  items: StackItem[];
  onAddItem: (item: Omit<StackItem, 'id'>) => void;
  onRemoveItem: (id: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const TYPES: { key: StackItem['type']; icon: React.ReactNode; label: string }[] = [
  { key: 'pill', icon: <Pill size={20} color="#A855F7" />, label: 'Oral' },
  { key: 'syringe', icon: <Syringe size={20} color="#A855F7" />, label: 'Inyectable' },
  { key: 'powder', icon: <FlaskConical size={20} color="#A855F7" />, label: 'Polvo' },
  { key: 'liquid', icon: <Droplets size={20} color="#A855F7" />, label: 'Líquido' },
];

// ============================================================================
// HELPERS
// ============================================================================
const getTypeIcon = (type: string) => {
  const iconProps = { size: 16, color: '#A855F7' };
  switch (type) {
    case 'pill':
      return <Pill {...iconProps} />;
    case 'syringe':
      return <Syringe {...iconProps} />;
    case 'liquid':
      return <Droplets {...iconProps} />;
    case 'powder':
      return <FlaskConical {...iconProps} />;
    default:
      return <Zap {...iconProps} />;
  }
};

// ============================================================================
// COMPONENT
// ============================================================================
export const StackManagerModal: React.FC<StackManagerModalProps> = ({
  visible,
  onClose,
  items,
  onAddItem,
  onRemoveItem,
}) => {
  const insets = useSafeAreaInsets();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [type, setType] = useState<StackItem['type']>('pill');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState('');
  const [isPreWorkout, setIsPreWorkout] = useState(false);
  const [isPostWorkout, setIsPostWorkout] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const resetForm = () => {
    setName('');
    setDose('');
    setType('pill');
    setNotes('');
    setTime('');
    setIsPreWorkout(false);
    setIsPostWorkout(false);
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setShowAddForm(false);
  };

  const toggleDay = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAddItem = () => {
    if (!name.trim() || !dose.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onAddItem({
      name: name.trim(),
      dose: dose.trim(),
      type,
      notes: notes.trim() || undefined,
      time: !isPreWorkout && !isPostWorkout ? time || undefined : undefined,
      isPreWorkout,
      isPostWorkout,
      daysOfWeek: selectedDays,
    });

    resetForm();
  };

  const handlePreWorkoutToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPreWorkout(!isPreWorkout);
    if (!isPreWorkout) {
      setIsPostWorkout(false);
      setTime('');
    }
  };

  const handlePostWorkoutToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPostWorkout(!isPostWorkout);
    if (!isPostWorkout) {
      setIsPreWorkout(false);
      setTime('');
    }
  };

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemoveItem(id);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-[#1a1a1a] rounded-t-3xl max-h-[90%] border-t border-white/10">
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-white/10 bg-[#222222] rounded-t-3xl">
              <Text className="text-white font-bold text-lg">Stack Manager</Text>
              <Pressable onPress={onClose} className="p-2">
                <X size={20} color="#999" />
              </Pressable>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              {/* Info Banner */}
              <View className="flex-row bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl mb-4 gap-3">
                <Clock size={16} color="#EAB308" className="mt-0.5" />
                <Text className="text-zinc-300 text-xs flex-1">
                  Administra aquí tus ciclos y suplementación. Los cambios se reflejan en tu plan
                  diario automáticamente.
                </Text>
              </View>

              {/* Items List */}
              {!showAddForm && (
                <>
                  <Text className="text-zinc-500 text-xs font-bold uppercase mb-3">Activos</Text>
                  {items.length === 0 ? (
                    <View className="bg-[#111111] p-6 rounded-xl border border-white/5 mb-4">
                      <Text className="text-zinc-500 text-center">
                        No hay suplementos configurados
                      </Text>
                    </View>
                  ) : (
                    items.map((item) => (
                      <View
                        key={item.id}
                        className="flex-row justify-between items-center bg-[#111111] p-4 rounded-xl border border-white/5 mb-3"
                      >
                        <View className="flex-row gap-3 items-center flex-1">
                          {getTypeIcon(item.type)}
                          <View className="flex-1">
                            <Text className="text-white font-bold">{item.name}</Text>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-zinc-500 text-xs">{item.dose}</Text>
                              {item.isPreWorkout && (
                                <View className="flex-row items-center gap-1 bg-yellow-500/20 px-1.5 py-0.5 rounded">
                                  <Zap size={10} color="#EAB308" />
                                  <Text className="text-yellow-500 text-[10px]">PRE</Text>
                                </View>
                              )}
                              {item.isPostWorkout && (
                                <View className="flex-row items-center gap-1 bg-green-500/20 px-1.5 py-0.5 rounded">
                                  <Flame size={10} color="#22C55E" />
                                  <Text className="text-green-500 text-[10px]">POST</Text>
                                </View>
                              )}
                              {item.time && (
                                <Text className="text-zinc-600 text-xs">{item.time}</Text>
                              )}
                            </View>
                          </View>
                        </View>
                        <Pressable onPress={() => handleRemove(item.id)} className="p-2">
                          <Trash2 size={18} color="#EF4444" />
                        </Pressable>
                      </View>
                    ))
                  )}

                  {/* Add Button */}
                  <Pressable
                    onPress={() => setShowAddForm(true)}
                    className="w-full bg-purple-600 py-4 rounded-xl mb-6 flex-row items-center justify-center gap-2 active:bg-purple-500"
                  >
                    <Plus size={18} color="#FFF" />
                    <Text className="text-white font-bold">AGREGAR COMPUESTO</Text>
                  </Pressable>
                </>
              )}

              {/* Add Form */}
              {showAddForm && (
                <View className="mb-6">
                  <Text className="text-zinc-400 text-xs font-bold uppercase mb-3">
                    Nuevo Compuesto
                  </Text>

                  {/* Name */}
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Nombre (ej. Creatina)"
                    placeholderTextColor="#666"
                    className="bg-black/40 border border-white/10 rounded-lg p-3 text-white mb-3"
                  />

                  {/* Type Selector */}
                  <Text className="text-zinc-500 text-xs mb-2">Tipo</Text>
                  <View className="flex-row gap-2 mb-3">
                    {TYPES.map((t) => (
                      <Pressable
                        key={t.key}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setType(t.key);
                        }}
                        className={`flex-1 p-3 rounded-lg border items-center ${
                          type === t.key
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-[#111111] border-white/10'
                        }`}
                      >
                        {t.icon}
                        <Text
                          className={`text-xs mt-1 ${
                            type === t.key ? 'text-purple-400' : 'text-zinc-500'
                          }`}
                        >
                          {t.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Dose */}
                  <TextInput
                    value={dose}
                    onChangeText={setDose}
                    placeholder="Dosis (ej. 5g, 1 tab, 2 UI)"
                    placeholderTextColor="#666"
                    className="bg-black/40 border border-white/10 rounded-lg p-3 text-white mb-3"
                  />

                  {/* Days Selector */}
                  <Text className="text-zinc-500 text-xs mb-2">Días de la semana</Text>
                  <View className="flex-row gap-1 mb-3">
                    {DAYS.map((day, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => toggleDay(idx)}
                        className={`flex-1 py-2 rounded-lg items-center ${
                          selectedDays.includes(idx)
                            ? 'bg-purple-500'
                            : 'bg-[#111111] border border-white/10'
                        }`}
                      >
                        <Text
                          className={`font-bold text-xs ${
                            selectedDays.includes(idx) ? 'text-white' : 'text-zinc-500'
                          }`}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Time Binding */}
                  <Text className="text-zinc-500 text-xs mb-2">Vinculación Temporal</Text>
                  <View className="gap-2 mb-3">
                    {/* Fixed Time */}
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        value={time}
                        onChangeText={setTime}
                        placeholder="Hora fija (08:00)"
                        placeholderTextColor="#666"
                        editable={!isPreWorkout && !isPostWorkout}
                        className={`flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-white ${
                          isPreWorkout || isPostWorkout ? 'opacity-30' : ''
                        }`}
                      />
                    </View>

                    {/* Pre/Post Workout */}
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={handlePreWorkoutToggle}
                        className={`flex-1 flex-row items-center justify-center gap-2 p-3 rounded-lg border ${
                          isPreWorkout
                            ? 'bg-yellow-500/20 border-yellow-500'
                            : 'bg-[#111111] border-white/10'
                        }`}
                      >
                        <Zap size={16} color={isPreWorkout ? '#EAB308' : '#666'} />
                        <Text
                          className={`text-sm font-bold ${
                            isPreWorkout ? 'text-yellow-500' : 'text-zinc-500'
                          }`}
                        >
                          PRE
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handlePostWorkoutToggle}
                        className={`flex-1 flex-row items-center justify-center gap-2 p-3 rounded-lg border ${
                          isPostWorkout
                            ? 'bg-green-500/20 border-green-500'
                            : 'bg-[#111111] border-white/10'
                        }`}
                      >
                        <Flame size={16} color={isPostWorkout ? '#22C55E' : '#666'} />
                        <Text
                          className={`text-sm font-bold ${
                            isPostWorkout ? 'text-green-500' : 'text-zinc-500'
                          }`}
                        >
                          POST
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Notes */}
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notas (ej. Con estómago vacío)"
                    placeholderTextColor="#666"
                    className="bg-black/40 border border-white/10 rounded-lg p-3 text-white mb-4"
                    multiline
                  />

                  {/* Action Buttons */}
                  <View className="flex-row gap-3" style={{ marginBottom: Math.max(insets.bottom, 16) + 8 }}>
                    <Pressable
                      onPress={resetForm}
                      className="flex-1 py-3 rounded-xl border border-zinc-700"
                    >
                      <Text className="text-zinc-400 font-bold text-center">CANCELAR</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleAddItem}
                      className="flex-1 bg-purple-600 py-3 rounded-xl active:bg-purple-500"
                    >
                      <Text className="text-white font-bold text-center">GUARDAR</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default StackManagerModal;
