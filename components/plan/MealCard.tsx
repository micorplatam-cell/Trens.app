// ============================================================================
// MEAL CARD - Tarjeta de Comida con Slider Horizontal de Opciones
// Diseño industrial con opciones intercambiables
// ============================================================================

import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useHankTarget } from '../../hooks/useHankTarget';

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
  isCompressed?: boolean;
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
  isCompressed = false,
}) => {
  // ============================================================================
  // HOOKS - Siempre deben llamarse primero, antes de cualquier return
  // ============================================================================
  const scrollViewRef = useRef<ScrollView>(null);
  const scaleAnim = useSharedValue(1);

  // Hank Target - Registrar esta tarjeta como target para animaciones
  const { targetRef, onLayout, isHighlighted } = useHankTarget({
    id: `meal-${meal.id}`,
    type: 'meal',
    label: mealName,
  });

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================
  const hasMultipleOptions = meal.options.length > 1;
  const canAddMore = meal.options.length < 5; // Máximo 5 opciones
  const displayTime = formatTimeToAMPM(meal.time);

  // ============================================================================
  // MODO COMPRIMIDO - Para drag & drop (después de los hooks)
  // ============================================================================
  if (isCompressed) {
    const currentOption = meal.options[meal.selectedOption] || meal.options[0];
    const ingredientNames = currentOption?.ingredients?.map((i) => i.name).join(', ') || '';
    return (
      <View className="mb-3 pl-8 relative">
        <View className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-savage-red/60 border-2 border-[#111111]" />
        <View className="bg-[#161616] border border-savage-red/30 rounded-xl px-4 py-3 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-white text-sm font-bold uppercase mb-1">{mealName}</Text>
            <Text className="text-zinc-400 text-sm" numberOfLines={1}>
              {ingredientNames || 'Sin ingredientes'}
            </Text>
          </View>
          <View className="bg-savage-red/20 px-3 py-1.5 rounded-lg">
            <Text className="text-savage-red text-sm font-bold">{displayTime}</Text>
          </View>
        </View>
      </View>
    );
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================
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

  // Handle add option
  const handleAddOption = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onAddOption) {
      onAddOption(meal.id);
    }
  };

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
  // RENDER - ED HARDY STYLE
  // ============================================================================
  return (
    <Animated.View style={animatedStyle} className="mb-6">
      <View
        ref={targetRef}
        onLayout={onLayout}
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: '#0a0a0a',
          borderWidth: isHighlighted ? 2 : 1,
          borderColor: isHighlighted ? '#F97316' : '#DC262640',
          shadowColor: isHighlighted ? '#F97316' : '#DC2626',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isHighlighted ? 0.6 : 0.15,
          shadowRadius: isHighlighted ? 20 : 10,
          elevation: isHighlighted ? 10 : 5,
        }}
      >
        {/* Header - ED HARDY FIRE GRADIENT */}
        <View
          className="flex-row justify-between items-center p-4 border-b"
          style={{
            backgroundColor: '#0f0505',
            borderBottomColor: '#DC262650',
            borderBottomWidth: 2,
          }}
        >
          <View className="flex-1">
            <Text
              className="font-bold tracking-wider text-lg uppercase"
              style={{ color: '#F97316' }}
            >
              {mealName}
            </Text>
            {/* Macros objetivo si existen */}
            {meal.targetMacros && (
              <View className="flex-row gap-3 mt-1">
                <Text className="text-xs font-mono" style={{ color: '#A855F7' }}>
                  {meal.targetMacros.protein}P
                </Text>
                <Text className="text-xs font-mono" style={{ color: '#FBBF24' }}>
                  {meal.targetMacros.carbs}C
                </Text>
                <Text className="text-xs font-mono" style={{ color: '#3B82F6' }}>
                  {meal.targetMacros.fat}G
                </Text>
                <Text className="text-zinc-500 text-xs font-mono">
                  {meal.targetMacros.calories} kcal
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => onTimeChange(meal.id)}
            className="flex-row items-center gap-2 px-3 py-1.5 rounded-full active:opacity-70"
            style={{ backgroundColor: '#F9731620' }}
          >
            <Clock size={14} color="#F97316" />
            <Text className="text-sm font-mono font-bold" style={{ color: '#F97316' }}>
              {displayTime}
            </Text>
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

        {/* Footer / Pagination + Navigation - FIRE ACCENT */}
        <View
          className="py-2 px-4 flex-row items-center justify-between"
          style={{ backgroundColor: '#0a0505' }}
        >
          {/* Navigation arrows */}
          <Pressable
            onPress={() => navigateToOption(Math.max(0, meal.selectedOption - 1))}
            disabled={meal.selectedOption === 0}
            className={`p-1 ${meal.selectedOption === 0 ? 'opacity-20' : 'opacity-100'}`}
          >
            <ChevronLeft size={18} color="#F97316" />
          </Pressable>

          {/* Dots - FIRE COLORS */}
          <View className="flex-row gap-2 flex-1 justify-center">
            {meal.options.map((_, idx) => (
              <Pressable key={idx} onPress={() => navigateToOption(idx)} className="p-1">
                <View
                  className="rounded-full"
                  style={{
                    backgroundColor: idx === meal.selectedOption ? '#F97316' : '#3F3F46',
                    width: idx === meal.selectedOption ? 24 : 6,
                    height: 6,
                  }}
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
            <ChevronRight size={18} color="#F97316" />
          </Pressable>
        </View>

        {/* Hint */}
        <View style={{ backgroundColor: '#050505' }} className="py-1.5">
          <Text className="text-zinc-600 text-[10px] text-center font-medium tracking-wide">
            🔥 Desliza para ver opciones • Toca para editar
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default MealCard;
