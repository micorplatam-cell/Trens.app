// ============================================================================
// TIME PICKER MODAL - Modal para cambiar hora de comida
// Selector interactivo de hora en formato AM/PM
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Haptics } from '../../lib/haptics';
import { X, Clock, Check } from 'lucide-react-native';

// ============================================================================
// TYPES
// ============================================================================
interface TimePickerModalProps {
  visible: boolean;
  currentTime: string; // Formato 24h: "07:30"
  onClose: () => void;
  onSave: (time24h: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================
const formatTimeToAMPM = (
  time24: string
): { hour: number; minute: number; period: 'AM' | 'PM' } => {
  const [h, m] = time24.split(':').map((s) => parseInt(s, 10));
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return { hour: hour12, minute: m || 0, period };
};

// ============================================================================
// COMPONENT
// ============================================================================
export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  currentTime,
  onClose,
  onSave,
}) => {
  const parsed = formatTimeToAMPM(currentTime);
  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(parsed.period);

  // Sincronizar cuando cambia currentTime
  useEffect(() => {
    const p = formatTimeToAMPM(currentTime);
    setSelectedHour(p.hour);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
  }, [currentTime]);

  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Convertir a formato 24h
    let hour24 = selectedHour;
    if (selectedPeriod === 'AM') {
      if (hour24 === 12) hour24 = 0;
    } else {
      if (hour24 !== 12) hour24 += 12;
    }

    const time24h = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onSave(time24h);
    onClose();
  };

  const selectHour = (h: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedHour(h);
  };

  const selectMinute = (m: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMinute(m);
  };

  const togglePeriod = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPeriod(selectedPeriod === 'AM' ? 'PM' : 'AM');
  };

  // Formatear display
  const displayTime = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-[#1a1a1a] rounded-t-3xl border-t border-white/10">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-white/10 bg-[#222222] rounded-t-3xl">
            <View className="flex-row items-center gap-3">
              <Clock size={20} color="#3B82F6" />
              <Text className="text-white font-bold text-lg">Cambiar Hora</Text>
            </View>
            <Pressable onPress={onClose} className="p-2">
              <X size={20} color="#999" />
            </Pressable>
          </View>

          {/* Time Display */}
          <View className="items-center py-6 border-b border-white/5">
            <Text className="text-white text-5xl font-mono font-bold tracking-wider">
              {displayTime}
            </Text>
          </View>

          {/* Hour Selector */}
          <View className="p-4">
            <Text className="text-zinc-500 text-xs font-bold uppercase mb-3">Hora</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {hours.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => selectHour(h)}
                    className={`w-12 h-12 rounded-xl items-center justify-center ${
                      selectedHour === h ? 'bg-blue-500' : 'bg-zinc-800 active:bg-zinc-700'
                    }`}
                  >
                    <Text
                      className={`font-bold text-lg ${
                        selectedHour === h ? 'text-white' : 'text-zinc-400'
                      }`}
                    >
                      {h}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Minute Selector */}
          <View className="px-4 pb-4">
            <Text className="text-zinc-500 text-xs font-bold uppercase mb-3">Minutos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {minutes.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => selectMinute(m)}
                    className={`w-12 h-12 rounded-xl items-center justify-center ${
                      selectedMinute === m ? 'bg-blue-500' : 'bg-zinc-800 active:bg-zinc-700'
                    }`}
                  >
                    <Text
                      className={`font-bold text-lg ${
                        selectedMinute === m ? 'text-white' : 'text-zinc-400'
                      }`}
                    >
                      {m.toString().padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* AM/PM Toggle */}
          <View className="px-4 pb-4">
            <Text className="text-zinc-500 text-xs font-bold uppercase mb-3">Período</Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod('AM');
                }}
                className={`flex-1 py-4 rounded-xl items-center ${
                  selectedPeriod === 'AM'
                    ? 'bg-yellow-500/20 border-2 border-yellow-500'
                    : 'bg-zinc-800 border-2 border-transparent'
                }`}
              >
                <Text
                  className={`font-bold text-xl ${
                    selectedPeriod === 'AM' ? 'text-yellow-500' : 'text-zinc-500'
                  }`}
                >
                  AM
                </Text>
                <Text
                  className={`text-xs ${selectedPeriod === 'AM' ? 'text-yellow-500/60' : 'text-zinc-600'}`}
                >
                  Mañana
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod('PM');
                }}
                className={`flex-1 py-4 rounded-xl items-center ${
                  selectedPeriod === 'PM'
                    ? 'bg-purple-500/20 border-2 border-purple-500'
                    : 'bg-zinc-800 border-2 border-transparent'
                }`}
              >
                <Text
                  className={`font-bold text-xl ${
                    selectedPeriod === 'PM' ? 'text-purple-500' : 'text-zinc-500'
                  }`}
                >
                  PM
                </Text>
                <Text
                  className={`text-xs ${selectedPeriod === 'PM' ? 'text-purple-500/60' : 'text-zinc-600'}`}
                >
                  Tarde/Noche
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Save Button */}
          <View className="p-4 pb-8">
            <Pressable
              onPress={handleSave}
              className="w-full bg-blue-500 py-4 rounded-xl flex-row items-center justify-center gap-2 active:bg-blue-600"
            >
              <Check size={20} color="#FFF" />
              <Text className="text-white font-bold text-lg">GUARDAR HORA</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default TimePickerModal;
