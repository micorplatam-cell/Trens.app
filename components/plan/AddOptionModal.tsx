// ============================================================================
// ADD OPTION MODAL - Modal para añadir un nuevo platillo a una comida
// Análisis inteligente automático (siempre activo)
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Plus, Trash2, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react-native';
import {
  analyzeIngredientsSmart,
  IngredientAnalysis,
} from '../../services/hank/ingredientAnalyzer';
import { calculateMealWithUserMacros } from '../../services/hank/nutrition';

// ============================================================================
// TYPES
// ============================================================================
interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  portion?: string;
}

interface AddOptionModalProps {
  visible: boolean;
  mealId: string;
  mealName: string;
  targetMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onClose: () => void;
  onSave: (mealId: string, optionName: string, ingredients: Ingredient[]) => Promise<void>;
  onCalculateMacros?: (ingredients: Ingredient[]) => Promise<Ingredient[]>;
}

// ============================================================================
// COMPONENT
// ============================================================================
export const AddOptionModal: React.FC<AddOptionModalProps> = ({
  visible,
  mealId,
  mealName,
  targetMacros,
  onClose,
  onSave,
  onCalculateMacros,
}) => {
  const insets = useSafeAreaInsets();
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: `new-${Date.now()}`, name: '', quantity: '', portion: '' },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setIngredients([{ id: `new-${Date.now()}`, name: '', quantity: '', portion: '' }]);
      setAnalysis(null);
    }
  }, [visible]);

  // Analizar ingredientes automáticamente (siempre activo)
  useEffect(() => {
    const validIngredients = ingredients.filter((ing) => ing.name.trim().length >= 3);
    if (validIngredients.length === 0) {
      setAnalysis(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsAnalyzing(true);
      try {
        const result = await analyzeIngredientsSmart(validIngredients, {
          targetMacros: targetMacros,
        });
        setAnalysis(result);
      } catch (error) {
        console.error('Error analyzing:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [ingredients, targetMacros]);

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
    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let finalIngredients = validIngredients;

      // Siempre usar IA para calcular gramos
      if (targetMacros) {
        try {
          console.log('🎯 Calculando con macros objetivo:', targetMacros);
          const calculated = await calculateMealWithUserMacros(validIngredients, targetMacros);
          finalIngredients = calculated.map((ing) => ({
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity,
            portion: ing.portion,
          }));
        } catch (error) {
          console.error('Error calculating macros with target:', error);
          // Fallback a onCalculateMacros si falla
          if (onCalculateMacros) {
            finalIngredients = await onCalculateMacros(validIngredients);
          }
        }
      } else if (onCalculateMacros) {
        // Si no hay targetMacros, usar cálculo genérico
        try {
          finalIngredients = await onCalculateMacros(validIngredients);
        } catch (error) {
          console.error('Error calculating macros:', error);
        }
      }

      const name = `Opción ${Date.now().toString().slice(-4)}`;
      await onSave(mealId, name, finalIngredients);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Error saving option:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

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
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-bold text-lg">Añadir Platillo</Text>
                  <Sparkles size={14} color="#A855F7" />
                </View>
                <Text className="text-zinc-500 text-xs">{mealName}</Text>
                {targetMacros && (
                  <View className="flex-row gap-2 mt-1">
                    <Text className="text-savage-red text-xs font-mono">
                      {targetMacros.protein}P
                    </Text>
                    <Text className="text-yellow-500 text-xs font-mono">{targetMacros.carbs}C</Text>
                    <Text className="text-blue-400 text-xs font-mono">{targetMacros.fat}G</Text>
                    <Text className="text-zinc-500 text-xs font-mono">
                      {targetMacros.calories} kcal
                    </Text>
                  </View>
                )}
              </View>
              <Pressable onPress={onClose} className="p-2">
                <X size={20} color="#999" />
              </Pressable>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              {/* Analysis Alert - Siempre visible cuando hay análisis */}
              {analysis && (
                <View
                  className={`p-3 rounded-xl mb-4 border ${
                    analysis.isBalanced
                      ? 'bg-green-900/20 border-green-500/30'
                      : analysis.hasUnhealthyOnly
                        ? 'bg-red-900/20 border-red-500/30'
                        : 'bg-yellow-900/20 border-yellow-500/30'
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    {isAnalyzing ? (
                      <ActivityIndicator size="small" color="#A855F7" />
                    ) : analysis.isBalanced ? (
                      <CheckCircle size={16} color="#22C55E" />
                    ) : (
                      <AlertTriangle
                        size={16}
                        color={analysis.hasUnhealthyOnly ? '#EF4444' : '#EAB308'}
                      />
                    )}
                    <Text
                      className={`font-bold text-sm ${
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
                          ? 'Comida balanceada'
                          : analysis.hasUnhealthyOnly
                            ? 'Revisar ingredientes'
                            : 'Falta balance'}
                    </Text>
                  </View>

                  {/* Macro fit message */}
                  {analysis.macroFitMessage && (
                    <Text className="text-zinc-400 text-xs mt-1">
                      🎯 {analysis.macroFitMessage}
                    </Text>
                  )}

                  {/* Macro indicators en línea */}
                  {!analysis.isBalanced && !isAnalyzing && (
                    <View className="flex-row gap-3 mt-2">
                      <View className="flex-row items-center gap-1">
                        <View
                          className={`w-2 h-2 rounded-full ${
                            analysis.hasProtein ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <Text className="text-zinc-500 text-xs">P</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <View
                          className={`w-2 h-2 rounded-full ${
                            analysis.hasCarbs ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        />
                        <Text className="text-zinc-500 text-xs">C</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <View
                          className={`w-2 h-2 rounded-full ${
                            analysis.hasFat ? 'bg-green-500' : 'bg-zinc-600'
                          }`}
                        />
                        <Text className="text-zinc-500 text-xs">G</Text>
                      </View>
                    </View>
                  )}

                  {/* Sugerencia (máximo 1) */}
                  {analysis.suggestions.length > 0 && !analysis.isBalanced && (
                    <Text className="text-yellow-400/70 text-xs mt-1">
                      → {analysis.suggestions[0]}
                    </Text>
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
                    className="bg-transparent border-b border-zinc-700 text-white py-2"
                  />
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
                className={`w-full py-4 rounded-xl ${
                  isSaving ? 'bg-zinc-600' : 'bg-savage-red active:bg-red-700'
                }`}
                style={{ marginBottom: Math.max(insets.bottom, 16) + 8 }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text className="text-white font-bold text-center text-lg">AÑADIR PLATILLO</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddOptionModal;
