import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Link as LinkIcon, CheckCircle } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';

const EXERCISES = [
  { id: 'squat', name: 'SENTADILLA', icon: '🦵' },
  { id: 'bench', name: 'BANCA', icon: '💪' },
  { id: 'deadlift', name: 'PESO MUERTO', icon: '☠️' },
  { id: 'ohp', name: 'MILITAR', icon: '🏋️' },
  { id: 'row', name: 'REMO', icon: '🚣' },
  { id: 'pullup', name: 'DOMINADAS', icon: '🧗' },
];

const ITEM_HEIGHT = 56;

interface GearWheelProps {
  onValueChange: (value: number) => void;
  initialValue?: number;
}

const GearWheel = ({ onValueChange, initialValue = 10 }: GearWheelProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeVal, setActiveVal] = useState(initialValue);
  const values = Array.from({ length: 30 }, (_, i) => 30 - i);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollTop = event.nativeEvent.contentOffset.y;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const safeIndex = Math.min(Math.max(index, 0), values.length - 1);
    const newValue = values[safeIndex];

    if (newValue !== activeVal) {
      setActiveVal(newValue);
      onValueChange(newValue);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View className="relative h-40 w-full bg-[#050505] rounded-xl overflow-hidden border border-zinc-800">
      {/* Gradientes superior e inferior */}
      <View className="absolute top-0 left-0 right-0 h-14 z-10 bg-black/90" pointerEvents="none" />
      <View
        className="absolute bottom-0 left-0 right-0 h-14 z-10 bg-black/90"
        pointerEvents="none"
      />

      {/* Indicador central */}
      <View className="absolute h-14 w-full bg-[#1a1a1a] z-0 top-1/2 -translate-y-1/2 flex-row items-center justify-between px-4 border-y border-savage-red/40">
        <View
          className="w-2 h-2 rounded-full bg-savage-red"
          style={{ shadowColor: '#DC2626', shadowRadius: 10, shadowOpacity: 1 }}
        />
        <View
          className="w-2 h-2 rounded-full bg-savage-red"
          style={{ shadowColor: '#DC2626', shadowRadius: 10, shadowOpacity: 1 }}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingTop: ITEM_HEIGHT,
          paddingBottom: ITEM_HEIGHT,
        }}
      >
        {values.map((val) => (
          <View key={val} style={{ height: ITEM_HEIGHT }} className="items-center justify-center">
            <Text
              className={`font-mono ${
                val === activeVal ? 'text-white text-4xl font-black' : 'text-zinc-700 text-xl'
              }`}
            >
              {val === 1 ? '1RM' : val}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

interface AddRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    exercise_id: string;
    exercise_name: string;
    exercise_icon: string;
    weight: number;
    reps: number;
    video_id?: string;
  }) => void;
  videos?: Array<{ id: string; title: string }>;
}

export default function AddRecordModal({
  visible,
  onClose,
  onSave,
  videos: _videos = [],
}: AddRecordModalProps) {
  const insets = useSafeAreaInsets();
  const [exercise, setExercise] = useState<(typeof EXERCISES)[0] | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState(10);
  const [videoId, setVideoId] = useState<string | null>(null);

  const canSave = exercise && weight && Number(weight) > 0;

  const handleSave = () => {
    if (!canSave || !exercise) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      exercise_icon: exercise.icon,
      weight: Number(weight),
      reps,
      video_id: videoId || undefined,
    });

    // Reset form
    setExercise(null);
    setWeight('');
    setReps(10);
    setVideoId(null);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-[#0F0F0F]">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 border-b border-zinc-800">
          <Text className="text-white font-bold uppercase tracking-widest text-sm">
            Nuevo Récord
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#71717a" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
          {/* 01. Ejercicio */}
          <View className="mb-8">
            <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
              01. Ejercicio
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2">
              <View className="flex-row gap-2 px-2">
                {EXERCISES.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExercise(ex);
                    }}
                    className={`w-20 h-20 items-center justify-center border rounded-lg ${
                      exercise?.id === ex.id
                        ? 'bg-white border-white'
                        : 'bg-[#050505] border-zinc-800'
                    }`}
                  >
                    <Text className="text-2xl mb-1">{ex.icon}</Text>
                    <Text
                      className={`text-[9px] font-bold uppercase ${
                        exercise?.id === ex.id ? 'text-black' : 'text-zinc-500'
                      }`}
                    >
                      {ex.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* 02. Carga */}
          <View className="mb-8">
            <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
              02. Carga (KG)
            </Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#3f3f46"
              className="bg-transparent border-b-2 border-zinc-800 text-6xl font-black text-center text-white py-2 font-mono"
              style={{ fontSize: 64 }}
            />
          </View>

          {/* 03. Repeticiones */}
          <View className="mb-8">
            <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
              03. Repeticiones
            </Text>
            <GearWheel onValueChange={setReps} initialValue={10} />
          </View>

          {/* 04. Evidencia (Opcional) */}
          <View className="mb-8">
            <Text className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
              04. Evidencia (Opcional)
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // TODO: Abrir selector de videos de la bóveda
                setVideoId(videoId ? null : 'temp-video-id');
              }}
              className={`py-4 border-2 border-dashed rounded items-center justify-center flex-row gap-2 ${
                videoId ? 'border-green-500 bg-green-900/10' : 'border-zinc-800'
              }`}
            >
              {videoId ? (
                <>
                  <CheckCircle size={16} color="#22c55e" />
                  <Text className="text-green-500 text-xs font-bold uppercase tracking-widest">
                    Evidencia Vinculada
                  </Text>
                </>
              ) : (
                <>
                  <LinkIcon size={16} color="#71717a" />
                  <Text className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    Vincular Video de Bóveda
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer con botón */}
        <View
          className="p-4 border-t border-zinc-800"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <TouchableOpacity
            disabled={!canSave}
            onPress={handleSave}
            className={`py-4 items-center ${canSave ? 'bg-white' : 'bg-zinc-800'}`}
          >
            <Text
              className={`font-black uppercase tracking-[0.2em] text-sm ${
                canSave ? 'text-black' : 'text-zinc-500'
              }`}
            >
              Fijar Récord
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
