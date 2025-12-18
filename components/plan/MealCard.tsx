// ============================================================================
// MEAL CARD - Tarjeta de Comida con Slider Horizontal de Opciones
// Diseño industrial con opciones intercambiables
// ============================================================================

import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 32; // padding horizontal del contenedor
const OPTION_WIDTH = SCREEN_WIDTH - CARD_PADDING - 16; // Ancho de cada opción

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
  // Macros objetivo por comida (opcional)
  targetMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MealCardProps {
  meal: Meal;
  mealName: string;
  onSwap: (mealId: string, newOptionIndex: number) => void;
  onTimeChange: (mealId: string) => void;
  onDelete?: (mealId: string) => void;
  onDeleteOption?: (mealId: string, optionId: string) => void;
  onEdit?: (mealId: string) => void;
  onAddOption?: (mealId: string) => void;
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
  onDeleteOption,
  onEdit,
  onAddOption,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const hasMultipleOptions = meal.options.length > 1;
  const canAddMore = meal.options.length < 5; // Máximo 5 opciones
  const scaleAnim = useSharedValue(1);

  // Formatear hora a AM/PM
  const displayTime = formatTimeToAMPM(meal.time);

  // Long press handler - Delete option or entire meal
  const handleLongPress = (optionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Si hay múltiples opciones, eliminar solo la opción
    if (hasMultipleOptions && onDeleteOption) {
      onDeleteOption(meal.id, optionId);
    } else if (onDelete) {
      // Si solo hay una opción, eliminar toda la comida
      onDelete(meal.id);
    }
  };

  // Navegar a opción específica
  const navigateToOption = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scrollViewRef.current?.scrollTo({
        x: index * OPTION_WIDTH,
        animated: true,
      });
      onSwap(meal.id, index);
    },
    [meal.id, onSwap]
  );

  // Handle scroll end
  const handleScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / OPTION_WIDTH);
      if (newIndex !== meal.selectedOption && newIndex >= 0 && newIndex < meal.options.length) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSwap(meal.id, newIndex);
      }
    },
    [meal.id, meal.selectedOption, meal.options.length, onSwap]
  );

  // Handle add option
  const handleAddOption = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onAddOption) {
      onAddOption(meal.id);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  // ============================================================================
  // RENDER OPTION CARD
  // ============================================================================
  const renderOptionCard = (option: MealOption, index: number) => (
    <Pressable
      key={option.id}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onEdit) onEdit(meal.id);
      }}
      onLongPress={() => handleLongPress(option.id)}
      delayLongPress={500}
      style={{ width: OPTION_WIDTH }}
      className="px-2"
    >
      <View className="bg-[#0a0a0a] rounded-lg p-4 min-h-[120px]">
        {/* Option name badge */}
        {hasMultipleOptions && (
          <View className="flex-row items-center gap-2 mb-3">
            <View className="bg-zinc-800 px-2 py-0.5 rounded">
              <Text className="text-zinc-400 text-xs font-mono">OPCIÓN {index + 1}</Text>
            </View>
          </View>
        )}

        {/* Ingredients */}
        {option.ingredients.map((ingredient, idx) => (
          <View key={ingredient.id || idx} className="flex-row justify-between items-start py-1.5">
            <Text className="text-zinc-300 font-medium flex-1 pr-2">{ingredient.name}</Text>
            <View className="items-end">
              <Text className="text-white font-bold font-mono">{ingredient.quantity}</Text>
              {ingredient.portion && (
                <Text className="text-zinc-500 text-xs">{ingredient.portion}</Text>
              )}
            </View>
          </View>
        ))}

        {(!option.ingredients || option.ingredients.length === 0) && (
          <View className="flex-1 justify-center items-center py-4">
            <Text className="text-zinc-600 text-center">Sin ingredientes</Text>
            <Text className="text-zinc-700 text-xs mt-1">Toca para editar</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  // ============================================================================
  // RENDER ADD OPTION CARD
  // ============================================================================
  const renderAddOptionCard = () => (
    <Pressable
      onPress={handleAddOption}
      style={{ width: OPTION_WIDTH * 0.4 }}
      className="px-2 justify-center"
    >
      <View className="bg-zinc-900/50 border border-dashed border-zinc-700 rounded-lg p-4 min-h-[120px] justify-center items-center">
        <View className="bg-zinc-800 p-3 rounded-full mb-2">
          <Plus size={24} color="#71717a" />
        </View>
        <Text className="text-zinc-500 text-xs font-medium text-center">AÑADIR{'\n'}PLATILLO</Text>
      </View>
    </Pressable>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Animated.View style={animatedStyle} className="mb-6">
      <View className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 border-b border-white/5 bg-[#222222]">
          <View className="flex-1">
            <Text className="text-white font-bold tracking-wider text-lg uppercase">
              {mealName}
            </Text>
            {/* Macros objetivo si existen */}
            {meal.targetMacros && (
              <View className="flex-row gap-3 mt-1">
                <Text className="text-savage-red text-xs font-mono">
                  {meal.targetMacros.protein}P
                </Text>
                <Text className="text-yellow-500 text-xs font-mono">
                  {meal.targetMacros.carbs}C
                </Text>
                <Text className="text-blue-400 text-xs font-mono">{meal.targetMacros.fat}G</Text>
                <Text className="text-zinc-500 text-xs font-mono">
                  {meal.targetMacros.calories} kcal
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => onTimeChange(meal.id)}
            className="flex-row items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full active:bg-blue-500/20"
          >
            <Clock size={14} color="#3B82F6" />
            <Text className="text-blue-400 text-sm font-mono">{displayTime}</Text>
          </Pressable>
        </View>

        {/* Slider de opciones */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={OPTION_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: 12 }}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
        >
          {meal.options.map((option, index) => renderOptionCard(option, index))}
          {canAddMore && onAddOption && renderAddOptionCard()}
        </ScrollView>

        {/* Footer / Pagination + Navigation */}
        <View className="bg-[#151515] py-2 px-4 flex-row items-center justify-between">
          {/* Navigation arrows */}
          <Pressable
            onPress={() => navigateToOption(Math.max(0, meal.selectedOption - 1))}
            disabled={meal.selectedOption === 0}
            className={`p-1 ${meal.selectedOption === 0 ? 'opacity-20' : 'opacity-100'}`}
          >
            <ChevronLeft size={18} color="#666" />
          </Pressable>

          {/* Dots */}
          <View className="flex-row gap-2 flex-1 justify-center">
            {meal.options.map((_, idx) => (
              <Pressable key={idx} onPress={() => navigateToOption(idx)} className="p-1">
                <View
                  className={`rounded-full ${
                    idx === meal.selectedOption ? 'bg-white w-6 h-1.5' : 'bg-zinc-600 w-1.5 h-1.5'
                  }`}
                />
              </Pressable>
            ))}
            {canAddMore && onAddOption && (
              <Pressable onPress={handleAddOption} className="p-1">
                <View className="bg-zinc-700 w-1.5 h-1.5 rounded-full" />
              </Pressable>
            )}
          </View>

          {/* Navigation arrows */}
          <Pressable
            onPress={() =>
              navigateToOption(Math.min(meal.options.length - 1, meal.selectedOption + 1))
            }
            disabled={meal.selectedOption === meal.options.length - 1}
            className={`p-1 ${meal.selectedOption === meal.options.length - 1 ? 'opacity-20' : 'opacity-100'}`}
          >
            <ChevronRight size={18} color="#666" />
          </Pressable>
        </View>

        {/* Hint */}
        <View className="bg-[#0f0f0f] py-1.5">
          <Text className="text-zinc-700 text-[10px] text-center">
            Desliza para ver opciones • Toca para editar • Mantén para eliminar
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default MealCard;
