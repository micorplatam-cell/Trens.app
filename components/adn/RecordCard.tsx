import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface PersonalRecord {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_icon: string;
  weight: number;
  reps: number;
  video_id?: string;
}

interface RecordCardProps {
  record: PersonalRecord;
  onPlayVideo?: (videoId: string) => void;
}

export default function RecordCard({ record, onPlayVideo }: RecordCardProps) {
  const handlePlayVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (record.video_id && onPlayVideo) {
      onPlayVideo(record.video_id);
    }
  };

  return (
    <View className="flex-1 bg-gradient-to-b from-[#111] to-black border border-zinc-900 items-center justify-center py-6 px-2">
      {/* Barra superior roja */}
      <View className="absolute top-0 left-0 right-0 h-1 bg-savage-red opacity-30" />

      {/* Icono del ejercicio */}
      <Text className="text-2xl mb-2 opacity-60">{record.exercise_icon}</Text>

      {/* Nombre del ejercicio */}
      <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
        {record.exercise_name}
      </Text>

      {/* Peso */}
      <View className="flex-row items-baseline gap-1 mb-1">
        <Text className="text-4xl font-mono font-black text-white tracking-tighter">
          {record.weight}
        </Text>
        <Text className="text-[10px] font-bold text-zinc-600">KG</Text>
      </View>

      {/* Reps */}
      <Text className="text-xs font-bold text-zinc-400 mb-4">
        {record.reps === 1 ? '1RM' : `${record.reps} REPS`}
      </Text>

      {/* Botón Play */}
      {record.video_id && (
        <TouchableOpacity
          onPress={handlePlayVideo}
          className="w-8 h-8 rounded-full border border-savage-red items-center justify-center"
          style={{
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Play size={10} color="#DC2626" fill="#DC2626" />
        </TouchableOpacity>
      )}
    </View>
  );
}
