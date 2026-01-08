import React from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Play, Music } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '../../lib/haptics';

// ============================================================================
// TIPOS
// ============================================================================
interface PersonalRecord {
  id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  video_id?: string;
  achieved_at?: string;
  thumbnail_url?: string;
}

interface RecordCardProps {
  record: PersonalRecord;
  onPress?: () => void;
  thumbnailUrl?: string;
  hasSpotify?: boolean;
}

// ============================================================================
// DIMENSIONES
// ============================================================================
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3; // 3 columnas con padding
const CARD_HEIGHT = CARD_WIDTH * (16 / 9); // Ratio 9:16 vertical

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function RecordCard({ record, onPress, thumbnailUrl, hasSpotify }: RecordCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      className="rounded-xl overflow-hidden"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: '#DC262640',
        // ED HARDY: Fire glow effect
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      {/* Video Thumbnail Background */}
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          className="absolute inset-0 w-full h-full"
          resizeMode="cover"
        />
      ) : (
        <View className="absolute inset-0 bg-zinc-900 items-center justify-center">
          <Play size={32} color="#52525b" />
        </View>
      )}

      {/* Gradient Overlay - Para legibilidad del texto */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.3, 0.5, 1]}
        className="absolute inset-0"
      />

      {/* Top Bar - Fire Gradient */}
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

      {/* Spotify Badge - Top Right */}
      {hasSpotify && (
        <View
          className="absolute top-2 right-2 w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <Music size={12} color="#1DB954" />
        </View>
      )}

      {/* Content Overlay - Bottom */}
      <View className="absolute bottom-0 left-0 right-0 p-2">
        {/* Exercise Name */}
        <Text
          className="text-[9px] font-bold text-white uppercase tracking-widest mb-1"
          numberOfLines={1}
          style={{
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
        >
          {record.exercise_name}
        </Text>

        {/* Weight - ED HARDY FIRE */}
        <View className="flex-row items-baseline gap-1">
          <Text
            className="text-2xl font-mono font-black"
            style={{
              color: '#F97316',
              textShadowColor: 'rgba(0,0,0,0.9)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            {record.weight_kg}
          </Text>
          <Text
            className="text-[8px] font-bold text-zinc-300"
            style={{
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            KG
          </Text>
        </View>

        {/* Reps */}
        <Text
          className="text-[10px] font-bold text-zinc-200"
          style={{
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {record.reps === 1 ? '1RM' : `${record.reps} REPS`}
        </Text>
      </View>

      {/* Play Icon - Center */}
      {record.video_id && (
        <View className="absolute inset-0 items-center justify-center">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderWidth: 2,
              borderColor: '#DC2626',
            }}
          >
            <Play size={16} color="#DC2626" fill="#DC2626" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
