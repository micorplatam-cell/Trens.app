// ============================================================================
// EDIT MEAL MODAL - Modal para editar comidas existentes
// Con integración HANK AI y análisis inteligente de ingredientes
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
import { X, Plus, Trash2, Zap, AlertTriangle, CheckCircle } from 'lucide-react-native';
import {
  analyzeIngredientsSmart,
  IngredientAnalysis,
} from '../../services/hank/ingredientAnalyzer';

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
  targetMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface EditMealModalProps {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onSave: (mealId: string, optionId: string, ingredients: Ingredient[]) => Promise<void>;
  onCalculateMacros?: (
    ingredients: Ingredient[],
    targetMacros?: { calories: number; protein: number; carbs: number; fat: number }
  ) => Promise<Ingredient[]>;
}

// ============================================================================
// HELPER
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
  const [hankAI, setHankAI] = useState(true);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sincronizar ingredientes cuando cambia la comida
  useEffect(() => {
    if (meal && meal.options.length > 0) {
      const currentOption = meal.options[meal.selectedOption] || meal.options[0];
      setIngredients(currentOption.ingredients.map((ing) => ({ ...ing })));
      setHankAI(true);
      setAnalysis(null);
    }
  }, [meal]);

  // Analizar ingredientes cuando cambian - solo si HANK AI activo
  useEffect(() => {
    if (!hankAI) {
      setAnalysis(null);
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim().length >= 3);
    if (validIngredients.length === 0) {
      setAnalysis(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsAnalyzing(true);
      try {
        const result = await analyzeIngredientsSmart(validIngredients, {
          targetMacros: meal?.targetMacros,
        });
        setAnalysis(result);
      } catch (error) {
        console.error('Error analyzing:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [ingredients, hankAI, meal?.targetMacros]);

  const toggleHankAI = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newValue = !hankAI;
    setHankAI(newValue);

    if (newValue && onCalculateMacros && ingredients.length > 0) {
      setIsCalculating(true);
      try {
        const calculated = await onCalculateMacros(ingredients, meal?.targetMacros);
        setIngredients(calculated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error calculating macros:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsCalculating(false);
      }
    }
  };

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
      let finalIngredients = validIngredients;

      if (hankAI && onCalculateMacros) {
        setIsCalculating(true);
        try {
          finalIngredients = await onCalculateMacros(validIngredients, meal?.targetMacros);
          setIngredients(finalIngredients);
        } catch (error) {
          console.error('Error calculating macros:', error);
        } finally {
          setIsCalculating(false);
        }
      }

      const currentOption = meal.options[meal.selectedOption] || meal.options[0];
      await onSave(meal.id, currentOption.id, finalIngredients);
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
                {meal.targetMacros && (
                  <View className="flex-row gap-2 mt-1">
                    <Text className="text-savage-red text-xs font-mono">
                      {meal.targetMacros.protein}P
                    </Text>
                    <Text className="text-yellow-500 text-xs font-mono">
                      {meal.targetMacros.carbs}C
                    </Text>
                    <Text className="text-blue-400 text-xs font-mono">
                      {meal.targetMacros.fat}G
                    </Text>
                    <Text className="text-zinc-500 text-xs font-mono">
                      {meal.targetMacros.calories} kcal
                    </Text>
                  </View>
                )}
              </View>
              <Pressable onPress={onClose} className="p-2">
                <X size={20} color="#999" />
              </Pressable>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              {/* HANK AI Toggle */}
              {onCalculateMacros && (
                <View className="flex-row items-center justify-between bg-purple-900/10 p-4 rounded-xl border border-purple-500/20 mb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="bg-purple-500 p-2 rounded-lg">
                      {isCalculating ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Zap size={16} color="#FFF" />
                      )}
                    </View>
                    <View>
                      <Text className="text-purple-300 font-bold">HANK AI</Text>
                      <Text className="text-purple-400/60 text-xs">
                        {isCalculating ? 'Calculando gramos...' : 'Cálculo automático de gramos'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={toggleHankAI}
                    disabled={isCalculating}
                    className={`w-12 h-6 rounded-full justify-center ${
                      hankAI ? 'bg-purple-500' : 'bg-zinc-700'
                    }`}
                  >
                    <View
                      className={`w-4 h-4 bg-white rounded-full mx-1 ${
                        hankAI ? 'self-end' : 'self-start'
                      }`}
                    />
                  </Pressable>
                </View>
              )}

              {/* Analysis Alert - Solo visible si HANK AI está activo */}
              {hankAI && analysis && (
                <View
                  className={`p-4 rounded-xl mb-4 border ${
                    analysis.isBalanced
                      ? 'bg-green-900/20 border-green-500/30'
                      : analysis.hasUnhealthyOnly
                        ? 'bg-red-900/20 border-red-500/30'
                        : 'bg-yellow-900/20 border-yellow-500/30'
                  }`}
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    {isAnalyzing ? (
                      <ActivityIndicator size="small" color="#A855F7" />
                    ) : analysis.isBalanced ? (
                      <CheckCircle size={18} color="#22C55E" />
                    ) : (
                      <AlertTriangle
                        size={18}
                        color={analysis.hasUnhealthyOnly ? '#EF4444' : '#EAB308'}
                      />
                    )}
                    <Text
                      className={`font-bold ${
                        analysis.isBalanced
                          ? 'text-green-400'
                          : analysis.hasUnhealthyOnly
                            ? 'text-red-400'
                            : 'text-yellow-400'
                      }`}
                    >
                      {isAnalyzing
                        ? 'Analizando...'
                        : analysis.isBalanced
                          ? '✓ Comida balanceada'
                          : analysis.hasUnhealthyOnly
                            ? '✗ Revisar ingredientes'
                            : '! Falta balance'}
                    </Text>
                  </View>

                  {/* Target macros message */}
                  {analysis.macroFitMessage && (
                    <Text className="text-purple-400 text-xs font-mono mb-2">
                      🎯 {analysis.macroFitMessage}
                    </Text>
                  )}

                  {analysis.warnings.map((warning, idx) => (
                    <Text key={`w-${idx}`} className="text-red-400/80 text-xs mb-1">
                      {warning}
                    </Text>
                  ))}

                  {analysis.suggestions.map((suggestion, idx) => (
                    <Text key={`s-${idx}`} className="text-yellow-400/80 text-xs mb-1">
                      → {suggestion}
                    </Text>
                  ))}

                  {!analysis.isBalanced && (
                    <View className="flex-row gap-3 mt-2 pt-2 border-t border-white/10">
                      <View className="flex-row items-center gap-1">
                        <View
                          className={`w-2 h-2 rounded-full ${
                            analysis.hasProtein ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <Text className="text-zinc-400 text-xs">Proteína</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <View
                          className={`w-2 h-2 rounded-full ${
                            analysis.hasCarbs ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        />
                        <Text className="text-zinc-400 text-xs">Carbos</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <View
                          className={`w-2 h-2 rounded-full ${
                            analysis.hasFat ? 'bg-green-500' : 'bg-zinc-500'
                          }`}
                        />
                        <Text className="text-zinc-400 text-xs">Grasas</Text>
                      </View>
                    </View>
                  )}
                </View>
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
                  {!hankAI && (
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
                  )}
                  {hankAI && ing.quantity && (
                    <View className="mt-2 bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                      <Text className="text-purple-300 text-sm">
                        {ing.quantity}
                        {ing.portion ? ` • ${ing.portion}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              <Pressable
                onPress={addIngredient}
                className="w-full py-3 border border-dashed border-zinc-600 rounded-xl mb-6 active:border-white active:bg-white/5"
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Plus size={18} color="#888" />
                  <Text className="text-zinc-400 font-medium">Añadir ingrediente</Text>
                </View>
              </Pressable>

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
