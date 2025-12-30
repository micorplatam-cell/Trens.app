// ============================================================================
// STACK CARD - Tarjeta de Suplementos/Fármacos
// Compacta y expandible con hora editable
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Pill, Syringe, Droplets, FlaskConical, Zap, Clock, Trash2 } from 'lucide-react-native';
import { useHankTarget } from '../../hooks/useHankTarget';
import { HankInlineHighlight } from '../hank/HankInlineHighlight';

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

interface Stack {
  id: string;
  time: string;
  items: StackItem[];
}

interface StackCardProps {
  stack: Stack;
  onTimeChange?: (stackTime: string) => void;
  onItemDelete?: (itemId: string) => void;
  isCompressed?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================
const getTypeIcon = (type: string) => {
  const iconProps = { size: 14, color: '#A855F7' };
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

const formatTimeToAMPM = (time24: string): string => {
  if (!time24) return '12:00 PM';
  const [hours, minutes] = time24.split(':').map((s) => parseInt(s, 10));
  const h = hours || 0;
  const m = minutes || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

// ============================================================================
// COMPONENT
// ============================================================================
export const StackCard: React.FC<StackCardProps> = ({
  stack,
  onTimeChange,
  onItemDelete,
  isCompressed = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  // Hank Target - Registrar este stack como target para animaciones
  const { targetRef, onLayout, isHighlighted, animationPhase } = useHankTarget({
    id: `stack-${stack.id}`,
    type: 'custom',
    label: `Stack ${formatTimeToAMPM(stack.time)}`,
  });

  const toggleExpand = () => {
    if (isCompressed) return; // No expandir si está comprimido
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !expanded;
    setExpanded(newState);
    expandProgress.value = withTiming(newState ? 1 : 0, { duration: 200 });
  };

  const handleTimePress = () => {
    if (isCompressed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onTimeChange) {
      onTimeChange(stack.time);
    }
  };

  const handleItemDelete = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (onItemDelete) {
      onItemDelete(itemId);
    }
  };

  const expandedStyle = useAnimatedStyle(() => ({
    height: interpolate(expandProgress.value, [0, 1], [0, stack.items.length * 56]),
    opacity: expandProgress.value,
  }));

  // Modo comprimido para drag & drop
  if (isCompressed) {
    const itemNames = stack.items.map((i) => i.name).join(', ');
    return (
      <View className="mb-3 pl-8 relative">
        <View className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-purple-500/60 border-2 border-[#111111]" />
        <View className="bg-[#161616] border border-purple-500/30 rounded-xl px-4 py-3 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-purple-400 text-sm font-bold mb-1">💊 STACK</Text>
            <Text className="text-zinc-400 text-sm" numberOfLines={1}>
              {itemNames || 'Sin items'}
            </Text>
          </View>
          <View className="bg-purple-500/20 px-3 py-1.5 rounded-lg">
            <Text className="text-purple-400 text-sm font-bold">
              {formatTimeToAMPM(stack.time)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View ref={targetRef} onLayout={onLayout} className="mb-6 pl-8 relative">
      {/* Hank Inline Highlight - FUERA del Pressable */}
      <HankInlineHighlight isActive={isHighlighted} phase={animationPhase} borderRadius={8} />

      {/* Timeline marker */}
      <View className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-purple-500 border-2 border-[#111111]" />

      <Pressable
        onPress={toggleExpand}
        className="bg-[#161616] border border-purple-500/30 rounded-lg p-3 active:scale-[0.98]"
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-1">
          {/* Tiempo clickeable */}
          <Pressable
            onPress={handleTimePress}
            className="flex-row items-center gap-1.5 bg-purple-500/10 px-2 py-1 rounded active:bg-purple-500/20"
          >
            <Clock size={12} color="#A855F7" />
            <Text className="text-purple-400 text-xs font-bold tracking-widest uppercase">
              {formatTimeToAMPM(stack.time)}
            </Text>
          </Pressable>
          <Text className="text-zinc-500 text-xs">{stack.items.length} items</Text>
        </View>

        {/* Collapsed View (Summary) */}
        {!expanded && (
          <View className="flex-row flex-wrap gap-2 mt-2">
            {stack.items.map((item) => (
              <View key={item.id} className="flex-row items-center gap-1">
                {getTypeIcon(item.type)}
                <Text className="text-zinc-300 text-sm">{item.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Expanded View (Details) */}
        <Animated.View
          style={expandedStyle}
          className="mt-3 border-t border-white/5 pt-2 overflow-hidden"
        >
          {stack.items.map((item) => (
            <View key={item.id} className="flex-row justify-between items-center py-2.5 px-1">
              <View className="flex-row items-center gap-2 flex-1">
                {getTypeIcon(item.type)}
                <Text className="text-zinc-200 text-sm">{item.name}</Text>
              </View>
              <View className="items-end flex-row gap-3">
                <View className="items-end">
                  <Text className="text-white font-mono text-sm">{item.dose}</Text>
                  {item.notes && (
                    <Text className="text-purple-400/80 text-xs italic">{item.notes}</Text>
                  )}
                </View>
                {onItemDelete && (
                  <Pressable
                    onPress={() => handleItemDelete(item.id)}
                    className="p-1.5 bg-red-500/10 rounded active:bg-red-500/20"
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default StackCard;
