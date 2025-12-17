// ============================================================================
// EDIT MEAL MODAL - Modal para editar comidas existentes
// Con integración AXIS AI para cálculo automático de macros
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { X, Plus, Trash2, Sparkles } from 'lucide-react-native';

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

interface EditMealModalProps {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onSave: (mealId: string, optionId: string, ingredients: Ingredient[]) => Promise<void>;
  onCalculateMacros?: (ingredients: Ingredient[]) => Promise<Ingredient[]>;
}

// ============================================================================
// HELPER: Convertir tiempo 24h a AM/PM
// ============================================================================
const formatTimeToAMPM = (time24: string): string => {
  const [h, m] = time24.split(':').map((s) => parseInt(s, 10));
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

// ============================================================================
// COMPONENT
// ============================================================================
export const EditMealModal: React.FC<EditMealModalProps> = ({
  visible,
  meal,
  onClose,
  onSave,
  onCalculateMacros,
}) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Sincronizar ingredientes cuando cambia la comida
  useEffect(() => {
    if (meal && meal.options.length > 0) {
      const currentOption = meal.options[meal.selectedOption] || meal.options[0];
      setIngredients(currentOption.ingredients.map((ing) => ({ ...ing })));
    }
  }, [meal]);

  const addIngredient = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients([
      ...ingredients,
      { id: `new-${Date.now()}`, name: '', quantity: '', portion: '' },
    ]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngs = [...ingredients];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setIngredients(newIngs);
  };

  const handleCalculateWithAI = async () => {
    if (!onCalculateMacros) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCalculating(true);

    try {
      const calculated = await onCalculateMacros(ingredients);
      setIngredients(calculated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error calculating macros:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!meal) return;

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const currentOption = meal.options[meal.selectedOption] || meal.options[0];
      await onSave(meal.id, currentOption.id, validIngredients);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Error saving meal:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!meal) return null;

  const currentOption = meal.options[meal.selectedOption] || meal.options[0];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-[#1a1a1a] rounded-t-3xl max-h-[90%] border-t border-white/10">
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-white/10 bg-[#222222] rounded-t-3xl">
              <View>
                <Text className="text-white font-bold text-lg">Editar Comida</Text>
                <Text className="text-zinc-500 text-xs">
                  {formatTimeToAMPM(meal.time)} • {currentOption?.name || 'Opción Principal'}
                </Text>
              </View>
              <Pressable onPress={onClose} className="p-2">
                <X size={20} color="#999" />
              </Pressable>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              {/* AXIS AI Calculate Button */}
              {onCalculateMacros && (
                <Pressable
                  onPress={handleCalculateWithAI}
                  disabled={isCalculating}
                  className={`flex-row items-center justify-center gap-3 p-4 rounded-xl border mb-4 ${
                    isCalculating
                      ? 'bg-purple-900/20 border-purple-500/30'
                      : 'bg-purple-900/10 border-purple-500/20 active:bg-purple-900/30'
                  }`}
                >
                  {isCalculating ? (
                    <ActivityIndicator size="small" color="#A855F7" />
                  ) : (
                    <Sparkles size={20} color="#A855F7" />
                  )}
                  <Text className="text-purple-300 font-bold">
                    {isCalculating ? 'Calculando con AXIS...' : 'CALCULAR GRAMOS CON AI'}
                  </Text>
                </Pressable>
              )}

              {/* Ingredients */}
              <Text className="text-zinc-400 text-xs font-bold mb-2 uppercase">Ingredientes</Text>
              {ingredients.map((ing, i) => (
                <View
                  key={ing.id}
                  className="bg-black/40 p-4 rounded-xl border border-white/5 mb-3"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-zinc-500 text-xs">Ingrediente {i + 1}</Text>
                    {ingredients.length > 1 && (
                      <Pressable onPress={() => removeIngredient(i)}>
                        <Trash2 size={16} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                  <TextInput
                    value={ing.name}
                    onChangeText={(v) => updateIngredient(i, 'name', v)}
                    placeholder="Nombre (ej. Pollo a la plancha)"
                    placeholderTextColor="#666"
                    className="bg-transparent border-b border-zinc-700 text-white py-2 mb-2"
                  />
                  <View className="flex-row gap-2 mt-2">
                    <TextInput
                      value={ing.quantity}
                      onChangeText={(v) => updateIngredient(i, 'quantity', v)}
                      placeholder="Cantidad (ej. 150g)"
                      placeholderTextColor="#666"
                      className="flex-1 bg-[#222222] text-white text-sm p-3 rounded-lg"
                    />
                    <TextInput
                      value={ing.portion || ''}
                      onChangeText={(v) => updateIngredient(i, 'portion', v)}
                      placeholder="Porción (~ 1 taza)"
                      placeholderTextColor="#666"
                      className="flex-1 bg-[#222222] text-white text-sm p-3 rounded-lg"
                    />
                  </View>
                </View>
              ))}

              {/* Add Ingredient Button */}
              <Pressable
                onPress={addIngredient}
                className="w-full py-3 border border-dashed border-zinc-600 rounded-xl mb-6 active:border-white active:bg-white/5"
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Plus size={18} color="#888" />
                  <Text className="text-zinc-400 font-medium">Añadir ingrediente</Text>
                </View>
              </Pressable>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                className={`w-full py-4 rounded-xl mb-8 ${
                  isSaving ? 'bg-zinc-600' : 'bg-white active:bg-zinc-200'
                }`}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text className="text-black font-bold text-center text-lg">GUARDAR CAMBIOS</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditMealModal;
