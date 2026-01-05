// ============================================================================
// ADD MEAL MODAL - Modal para agregar comidas
// Análisis inteligente automático (siempre activo)
// TimePicker visual como Stack
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
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Clock,
} from 'lucide-react-native';
import {
  analyzeIngredientsSmart,
  IngredientAnalysis,
} from '../../services/hank/ingredientAnalyzer';

// ============================================================================
// TYPES
// ============================================================================
interface Ingredient {
  name: string;
  quantity: string;
  portion: string;
}

interface TargetMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface AddMealModalProps {
  visible: boolean;
  targetMacros?: TargetMacros;
  onClose: () => void;
  onSave: (ingredients: Ingredient[], time: string, useHankAI: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================
export const AddMealModal: React.FC<AddMealModalProps> = ({
  visible,
  targetMacros,
  onClose,
  onSave,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: '', portion: '' },
  ]);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = [0, 15, 30, 45];

  // Reset cuando se abre
  useEffect(() => {
    if (visible) {
      setSelectedHour(12);
      setSelectedMinute(0);
      setSelectedPeriod('PM');
      setIngredients([{ name: '', quantity: '', portion: '' }]);
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
    setIngredients([...ingredients, { name: '', quantity: '', portion: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngs = [...ingredients];
    newIngs[index][field] = value;
    setIngredients(newIngs);
  };

  const getTime24h = (): string => {
    let h = selectedHour;
    if (selectedPeriod === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return `${h.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
  };

  const selectHour = (h: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedHour(h);
  };

  const selectMinute = (m: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMinute(m);
  };

  const togglePeriod = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPeriod(selectedPeriod === 'AM' ? 'PM' : 'AM');
  };

  const handleSave = () => {
    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Siempre usar IA para cálculo automático
    onSave(validIngredients, getTime24h(), true);
    setIngredients([{ name: '', quantity: '', portion: '' }]);
    setSelectedHour(12);
    setSelectedMinute(0);
    setSelectedPeriod('PM');
    onClose();
  };

  // Formatear display
  const displayTime = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;

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
                  <Text className="text-white font-bold text-lg">Agregar Comida</Text>
                  <Sparkles size={14} color="#A855F7" />
                </View>
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

              {/* Time Picker Visual */}
              <View className="mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Clock size={14} color="#3B82F6" />
                  <Text className="text-zinc-400 text-xs font-bold uppercase">Hora</Text>
                  <Text className="text-blue-400 font-mono font-bold text-sm ml-auto">
                    {displayTime}
                  </Text>
                </View>

                {/* Hour Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                  <View className="flex-row gap-2">
                    {hours.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => selectHour(h)}
                        className={`w-11 h-11 rounded-xl items-center justify-center ${
                          selectedHour === h ? 'bg-blue-500' : 'bg-zinc-800 active:bg-zinc-700'
                        }`}
                      >
                        <Text
                          className={`font-bold text-lg ${
                            selectedHour === h ? 'text-white' : 'text-zinc-400'
                          }`}
                        >
                          {h}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* Minute + Period Row */}
                <View className="flex-row gap-2">
                  {/* Minutes */}
                  <View className="flex-1 flex-row gap-2">
                    {minutes.map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => selectMinute(m)}
                        className={`flex-1 h-10 rounded-lg items-center justify-center ${
                          selectedMinute === m ? 'bg-blue-500' : 'bg-zinc-800 active:bg-zinc-700'
                        }`}
                      >
                        <Text
                          className={`font-mono text-sm ${
                            selectedMinute === m ? 'text-white font-bold' : 'text-zinc-400'
                          }`}
                        >
                          :{m.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* AM/PM Toggle */}
                  <Pressable
                    onPress={togglePeriod}
                    className={`w-16 h-10 rounded-lg items-center justify-center ${
                      selectedPeriod === 'AM'
                        ? 'bg-yellow-500/20 border border-yellow-500'
                        : 'bg-purple-500/20 border border-purple-500'
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        selectedPeriod === 'AM' ? 'text-yellow-500' : 'text-purple-500'
                      }`}
                    >
                      {selectedPeriod}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Ingredients */}
              <Text className="text-zinc-400 text-xs font-bold mb-2 uppercase">Ingredientes</Text>
              {ingredients.map((ing, i) => (
                <View key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 mb-3">
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
                className="w-full bg-white py-4 rounded-xl active:bg-zinc-200"
                style={{ marginBottom: Math.max(insets.bottom, 16) + 8 }}
              >
                <Text className="text-black font-bold text-center text-lg">GUARDAR COMIDA</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddMealModal;
