import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    <View
      className="flex-1 items-center justify-center py-6 px-2 rounded-lg overflow-hidden"
      style={{
        backgroundColor: '#0a0505',
        borderWidth: 1,
        borderColor: '#DC262640',
        // ED HARDY: Fire glow effect
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      {/* Barra superior - FIRE GRADIENT */}
      <LinearGradient
        colors={['#DC2626', '#F97316', '#FBBF24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
        }}
      />

      {/* Icono del ejercicio */}
      <Text className="text-3xl mb-2">{record.exercise_icon}</Text>

      {/* Nombre del ejercicio */}
      <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
        {record.exercise_name}
      </Text>

      {/* Peso - ED HARDY FIRE COLOR */}
      <View className="flex-row items-baseline gap-1 mb-1">
        <Text
          className="text-4xl font-mono font-black tracking-tighter"
          style={{ color: '#F97316' }}
        >
          {record.weight}
        </Text>
        <Text className="text-[10px] font-bold text-zinc-600">KG</Text>
      </View>

      {/* Reps */}
      <Text className="text-xs font-bold text-zinc-400 mb-4">
        {record.reps === 1 ? '1RM' : `${record.reps} REPS`}
      </Text>

      {/* Botón Play - FIRE NEON */}
      {record.video_id && (
        <TouchableOpacity
          onPress={handlePlayVideo}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: '#DC262620',
            borderWidth: 2,
            borderColor: '#DC2626',
            shadowColor: '#FF3B3B',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Play size={14} color="#DC2626" fill="#DC2626" />
        </TouchableOpacity>
      )}
    </View>
  );
}
