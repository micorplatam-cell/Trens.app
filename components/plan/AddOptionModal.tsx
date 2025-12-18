// ============================================================================
// ADD OPTION MODAL - Modal para añadir un nuevo platillo a una comida
// Genera opciones con AXIS AI o permite ingreso manual
// ============================================================================

import React, { useState } from 'react';
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
import { X, Plus, Trash2, Zap, Sparkles } from 'lucide-react-native';

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
  onGenerateWithAI?: (mealId: string) => Promise<{ name: string; ingredients: Ingredient[] } | null>;
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
  onGenerateWithAI,
}) => {
  const [optionName, setOptionName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: `new-${Date.now()}`, name: '', quantity: '', portion: '' },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [axisAI, setAxisAI] = useState(true);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setOptionName('');
      setIngredients([{ id: `new-${Date.now()}`, name: '', quantity: '', portion: '' }]);
      setAxisAI(true);
    }
  }, [visible]);

  const toggleAxisAI = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAxisAI(!axisAI);
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

  // Generar platillo completo con IA
  const handleGenerateWithAI = async () => {
    if (!onGenerateWithAI) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsGenerating(true);

    try {
      const generated = await onGenerateWithAI(mealId);
      if (generated) {
        setOptionName(generated.name);
        setIngredients(generated.ingredients);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error generating with AI:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
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

      // Si AXIS AI está activo, calcular macros antes de guardar
      if (axisAI && onCalculateMacros) {
        try {
          finalIngredients = await onCalculateMacros(validIngredients);
        } catch (error) {
          console.error('Error calculating macros:', error);
        }
      }

      const name = optionName.trim() || `Opción ${Date.now().toString().slice(-4)}`;
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
              <View>
                <Text className="text-white font-bold text-lg">Añadir Platillo</Text>
                <Text className="text-zinc-500 text-xs">{mealName}</Text>
                {targetMacros && (
                  <View className="flex-row gap-2 mt-1">
                    <Text className="text-savage-red text-xs">{targetMacros.protein}P</Text>
                    <Text className="text-yellow-500 text-xs">{targetMacros.carbs}C</Text>
                    <Text className="text-blue-400 text-xs">{targetMacros.fat}G</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={onClose} className="p-2">
                <X size={20} color="#999" />
              </Pressable>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              {/* AI Generate Button */}
              {onGenerateWithAI && (
                <Pressable
                  onPress={handleGenerateWithAI}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 p-4 rounded-xl mb-4 active:opacity-80"
                >
                  <View className="flex-row items-center justify-center gap-3">
                    {isGenerating ? (
                      <ActivityIndicator size="small" color="#A855F7" />
                    ) : (
                      <Sparkles size={20} color="#A855F7" />
                    )}
                    <Text className="text-purple-300 font-bold">
                      {isGenerating ? 'GENERANDO PLATILLO...' : 'GENERAR CON AXIS AI'}
                    </Text>
                  </View>
                  <Text className="text-purple-400/60 text-xs text-center mt-1">
                    Crea un platillo alternativo con los mismos macros
                  </Text>
                </Pressable>
              )}

              {/* Option Name */}
              <Text className="text-zinc-400 text-xs font-bold mb-2 uppercase">
                Nombre del platillo (opcional)
              </Text>
              <TextInput
                value={optionName}
                onChangeText={setOptionName}
                placeholder="Ej: Versión vegetariana, Con arroz..."
                placeholderTextColor="#666"
                className="bg-[#222222] border border-white/10 text-white p-3 rounded-xl mb-4"
              />

              {/* AXIS AI Toggle */}
              {onCalculateMacros && (
                <View className="flex-row items-center justify-between bg-purple-900/10 p-4 rounded-xl border border-purple-500/20 mb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="bg-purple-500 p-2 rounded-lg">
                      <Zap size={16} color="#FFF" />
                    </View>
                    <View>
                      <Text className="text-purple-300 font-bold">AXIS AI</Text>
                      <Text className="text-purple-400/60 text-xs">
                        Cálculo automático de gramos
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={toggleAxisAI}
                    className={`w-12 h-6 rounded-full justify-center ${
                      axisAI ? 'bg-purple-500' : 'bg-zinc-700'
                    }`}
                  >
                    <View
                      className={`w-4 h-4 bg-white rounded-full mx-1 ${
                        axisAI ? 'self-end' : 'self-start'
                      }`}
                    />
                  </Pressable>
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
                  {/* Solo mostrar campos manuales cuando AXIS AI está desactivado */}
                  {!axisAI && (
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
                  isSaving ? 'bg-zinc-600' : 'bg-savage-red active:bg-red-700'
                }`}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text className="text-white font-bold text-center text-lg">
                    AÑADIR PLATILLO
                  </Text>
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
