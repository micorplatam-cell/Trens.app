// ============================================================================
// STACK CARD - Tarjeta de Suplementos/Fármacos
// Compacta y expandible con hora fija
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Pill, Syringe, Droplets, FlaskConical, Zap } from 'lucide-react-native';

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
export const StackCard: React.FC<StackCardProps> = ({ stack }) => {
  const [expanded, setExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  const toggleExpand = () => {
    const newState = !expanded;
    setExpanded(newState);
    expandProgress.value = withTiming(newState ? 1 : 0, { duration: 200 });
  };

  const expandedStyle = useAnimatedStyle(() => ({
    height: interpolate(expandProgress.value, [0, 1], [0, stack.items.length * 50]),
    opacity: expandProgress.value,
  }));

  return (
    <View className="mb-6 pl-8 relative">
      {/* Timeline marker */}
      <View className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-purple-500 border-2 border-[#111111]" />

      <Pressable
        onPress={toggleExpand}
        className="bg-[#161616] border border-purple-500/30 rounded-lg p-3 active:scale-[0.98]"
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-purple-400 text-xs font-bold tracking-widest uppercase">
            STACK {formatTimeToAMPM(stack.time)}
          </Text>
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
            <View key={item.id} className="flex-row justify-between items-center py-2">
              <View className="flex-row items-center gap-2">
                {getTypeIcon(item.type)}
                <Text className="text-zinc-200 text-sm">{item.name}</Text>
              </View>
              <View className="items-end">
                <Text className="text-white font-mono text-sm">{item.dose}</Text>
                {item.notes && (
                  <Text className="text-purple-400/80 text-xs italic">{item.notes}</Text>
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
