// ============================================================================
// WORKOUT BLOCK - Bloque de Entrenamiento Flotante
// PRE + Rutina + POST, movible en la línea de tiempo
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Zap,
  Flame,
  ChevronUp,
  ChevronDown,
  GripHorizontal,
  Pill,
  Syringe,
  FlaskConical,
  Droplets,
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
}

interface WorkoutBlockData {
  id: string;
  routineName: string;
  preStack: StackItem[];
  postStack: StackItem[];
  exercises?: { id: string; name: string; imageUrl?: string }[];
}

interface WorkoutBlockProps {
  data: WorkoutBlockData;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onPressRoutine?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================
const getTypeIcon = (type: string, color: string) => {
  const iconProps = { size: 12, color };
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
export const WorkoutBlock: React.FC<WorkoutBlockProps> = ({
  data,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onPressRoutine,
}) => {
  const [expanded, setExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !expanded;
    setExpanded(newState);
    expandProgress.value = withTiming(newState ? 1 : 0, { duration: 250 });
  };

  const handleMoveUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMoveUp();
  };

  const handleMoveDown = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMoveDown();
  };

  const expandedStyle = useAnimatedStyle(() => ({
    height: interpolate(expandProgress.value, [0, 1], [0, 200]),
    opacity: expandProgress.value,
  }));

  return (
    <View className="mb-6">
      <View className="bg-[#1a1a1a] border-y-2 border-yellow-500/50 shadow-lg">
        {/* Control Handle */}
        <View className="flex-row justify-between items-center bg-yellow-500/10 px-4 py-2 border-b border-white/5">
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleMoveUp}
              disabled={isFirst}
              className={`p-1 ${isFirst ? 'opacity-20' : ''}`}
            >
              <ChevronUp size={18} color={isFirst ? '#666' : '#FFF'} />
            </Pressable>
            <Pressable
              onPress={handleMoveDown}
              disabled={isLast}
              className={`p-1 ${isLast ? 'opacity-20' : ''}`}
            >
              <ChevronDown size={18} color={isLast ? '#666' : '#FFF'} />
            </Pressable>
          </View>
          <View className="flex-row items-center gap-1">
            <GripHorizontal size={14} color="#EAB308" />
            <Text className="text-yellow-500 text-xs font-bold tracking-widest uppercase">
              BLOQUE ENTRENO
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <Pressable onPress={toggleExpand} className="p-4">
          {/* PRE-WORKOUT */}
          <View className="flex-row items-center gap-3 mb-3 opacity-80">
            <View className="bg-yellow-500/20 p-1.5 rounded">
              <Zap size={14} color="#EAB308" />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-200 font-bold text-xs">PRE:</Text>
              <Text className="text-zinc-400 text-sm" numberOfLines={1}>
                {data.preStack.map((i) => i.name).join(', ') || 'Sin suplementos'}
              </Text>
            </View>
          </View>

          {/* ROUTINE TITLE */}
          <Pressable
            onPress={onPressRoutine}
            className="py-4 border-y border-white/5 bg-[#111111] -mx-4 px-4"
          >
            <Text className="text-2xl text-white font-black italic uppercase tracking-tighter text-center">
              {data.routineName || 'SIN RUTINA'}
            </Text>
            <Text className="text-xs text-zinc-500 text-center mt-1">
              Toca para ver rutina completa
            </Text>
          </Pressable>

          {/* POST-WORKOUT */}
          <View className="flex-row items-center gap-3 mt-3 opacity-80">
            <View className="bg-green-500/20 p-1.5 rounded">
              <Flame size={14} color="#22C55E" />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-200 font-bold text-xs">POST:</Text>
              <Text className="text-zinc-400 text-sm" numberOfLines={1}>
                {data.postStack.map((i) => i.name).join(', ') || 'Sin suplementos'}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Expanded Details */}
        <Animated.View
          style={expandedStyle}
          className="px-4 pb-4 border-t border-white/5 bg-[#151515] overflow-hidden"
        >
          <View className="flex-row gap-4 mt-4">
            {/* PRE Detail */}
            <View className="flex-1">
              <Text className="text-yellow-500 text-xs font-bold mb-2">DETALLE PRE</Text>
              {data.preStack.map((item) => (
                <View key={item.id} className="border-l-2 border-zinc-700 pl-2 mb-2">
                  <View className="flex-row items-center gap-1">
                    {getTypeIcon(item.type, '#EAB308')}
                    <Text className="text-zinc-200 text-xs">
                      {item.name} ({item.dose})
                    </Text>
                  </View>
                  {item.notes && <Text className="text-zinc-500 text-xs italic">{item.notes}</Text>}
                </View>
              ))}
              {data.preStack.length === 0 && <Text className="text-zinc-600 text-xs">Vacío</Text>}
            </View>

            {/* POST Detail */}
            <View className="flex-1">
              <Text className="text-green-500 text-xs font-bold mb-2">DETALLE POST</Text>
              {data.postStack.map((item) => (
                <View key={item.id} className="border-l-2 border-zinc-700 pl-2 mb-2">
                  <View className="flex-row items-center gap-1">
                    {getTypeIcon(item.type, '#22C55E')}
                    <Text className="text-zinc-200 text-xs">
                      {item.name} ({item.dose})
                    </Text>
                  </View>
                  {item.notes && <Text className="text-zinc-500 text-xs italic">{item.notes}</Text>}
                </View>
              ))}
              {data.postStack.length === 0 && <Text className="text-zinc-600 text-xs">Vacío</Text>}
            </View>
          </View>

          {/* Exercise Carousel Preview */}
          {data.exercises && data.exercises.length > 0 && (
            <View className="mt-4">
              <Text className="text-zinc-400 text-xs font-bold mb-2">EJERCICIOS DEL DÍA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {data.exercises.map((ex) => (
                  <View
                    key={ex.id}
                    className="w-16 h-16 bg-zinc-800 rounded-lg mr-2 items-center justify-center"
                  >
                    {ex.imageUrl ? (
                      <Image source={{ uri: ex.imageUrl }} className="w-full h-full rounded-lg" />
                    ) : (
                      <Text className="text-zinc-500 text-[8px] text-center px-1">{ex.name}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

export default WorkoutBlock;
