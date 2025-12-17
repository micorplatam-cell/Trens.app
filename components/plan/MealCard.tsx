// ============================================================================
// MEAL CARD - Tarjeta de Comida con Swap Horizontal
// Diseño industrial con opciones intercambiables
// ============================================================================

import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Clock } from 'lucide-react-native';

// ============================================================================
// TYPES
// ============================================================================
interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  portion?: string;
}

interface MealOption {
  id: string;
  name: string;
  ingredients: Ingredient[];
}

interface Meal {
  id: string;
  time: string;
  options: MealOption[];
  selectedOption: number;
}

interface MealCardProps {
  meal: Meal;
  mealName: string;
  onSwap: (mealId: string, newOptionIndex: number) => void;
  onTimeChange: (mealId: string) => void;
  onDelete?: (mealId: string) => void;
  onEdit?: (mealId: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================
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
export const MealCard: React.FC<MealCardProps> = ({
  meal,
  mealName,
  onSwap,
  onTimeChange,
  onDelete,
  onEdit,
}) => {
  const currentOption = meal.options[meal.selectedOption];
  const hasMultipleOptions = meal.options.length > 1;
  const translateX = useSharedValue(0);

  // Formatear hora a AM/PM
  const displayTime = formatTimeToAMPM(meal.time);

  // Long press handler - Delete
  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (onDelete) {
      onDelete(meal.id);
    }
  };

  // Double tap handler - Edit
  const handleDoubleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onEdit) {
      onEdit(meal.id);
    }
  };

  // ============================================================================
  // SWIPE GESTURE
  // ============================================================================
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (direction === 'left') {
        const next = (meal.selectedOption + 1) % meal.options.length;
        onSwap(meal.id, next);
      } else {
        const prev = meal.selectedOption === 0 ? meal.options.length - 1 : meal.selectedOption - 1;
        onSwap(meal.id, prev);
      }
    },
    [meal, onSwap]
  );

  const panGesture = Gesture.Pan()
    .enabled(hasMultipleOptions)
    .onUpdate((event) => {
      translateX.value = event.translationX * 0.3;
    })
    .onEnd((event) => {
      if (event.translationX < -50) {
        runOnJS(handleSwipe)('left');
      } else if (event.translationX > 50) {
        runOnJS(handleSwipe)('right');
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Pressable onLongPress={handleLongPress} onPress={handleDoubleTap} delayLongPress={500}>
      <View className="mb-6">
        <View className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-white/5 bg-[#222222]">
            <Text className="text-white font-bold tracking-wider text-lg uppercase">
              {mealName}
            </Text>
            <Pressable
              onPress={() => onTimeChange(meal.id)}
              className="flex-row items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full active:bg-blue-500/20"
            >
              <Clock size={14} color="#3B82F6" />
              <Text className="text-blue-400 text-sm font-mono">{displayTime}</Text>
            </Pressable>
          </View>

          {/* Swipeable Body */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={animatedStyle} className="p-4">
              {currentOption?.ingredients.map((ingredient, idx) => (
                <View
                  key={ingredient.id || idx}
                  className="flex-row justify-between items-start py-2"
                >
                  <Text className="text-zinc-300 font-medium flex-1">{ingredient.name}</Text>
                  <View className="items-end">
                    <Text className="text-white font-bold font-mono">{ingredient.quantity}</Text>
                    {ingredient.portion && (
                      <Text className="text-zinc-500 text-xs">{ingredient.portion}</Text>
                    )}
                  </View>
                </View>
              ))}

              {(!currentOption?.ingredients || currentOption.ingredients.length === 0) && (
                <Text className="text-zinc-500 text-center py-4">Sin ingredientes</Text>
              )}

              {/* Hint for edit */}
              <Text className="text-zinc-600 text-xs text-center mt-2">
                Toca para editar • Mantén para eliminar
              </Text>
            </Animated.View>
          </GestureDetector>

          {/* Footer / Pagination */}
          {hasMultipleOptions && (
            <View className="bg-[#151515] py-2 flex-row justify-center gap-2">
              {meal.options.map((_, idx) => (
                <View
                  key={idx}
                  className={`h-1.5 rounded-full ${
                    idx === meal.selectedOption ? 'bg-white w-4' : 'bg-zinc-600 w-1.5'
                  }`}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default MealCard;
