// ============================================================================
// AXIS OVERLAY - Interfaz Visual del Agente AXIS
// FAB flotante + Modal de Chat con estilo Savage Mode
// Incluye Long Press para comando de voz con confirmación
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  interpolate,
  Easing,
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Bot, Send, Mic, MicOff, Sparkles, ChevronDown, Check, X } from 'lucide-react-native';
import { useAxis } from '../../context/AxisContext';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { callGemini } from '../../services/axis/gemini';
import type { AxisToolResult, AxisToolCall } from '../../types/axis';

// ============================================================================
// TYPES
// ============================================================================
interface ChatMessage {
  id: string;
  role: 'user' | 'axis';
  content: string;
  timestamp: Date;
  results?: AxisToolResult[];
  pendingConfirmation?: boolean;
  pendingToolCalls?: AxisToolCall[];
}

// ============================================================================
// CONSTANTS
// ============================================================================
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.55;
const LONG_PRESS_DURATION = 400; // ms para activar long press

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// FAB BUTTON (Floating Action Button) con Long Press
// ============================================================================
const AxisFAB: React.FC<{
  onPress: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  isProcessing: boolean;
  isListening: boolean;
}> = ({ onPress, onLongPressStart, onLongPressEnd, isProcessing, isListening }) => {
  // Breathing animation
  const breathe = useSharedValue(0);
  // Processing spin animation
  const spin = useSharedValue(0);
  // Listening pulse animation
  const pulse = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    // Continuous breathing effect
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [breathe]);

  useEffect(() => {
    if (isProcessing) {
      spin.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      spin.value = withTiming(0, { duration: 300 });
    }
  }, [isProcessing, spin]);

  // Listening animation - aggressive pulsing
  useEffect(() => {
    if (isListening) {
      // Pulso agresivo
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(1.1, { duration: 300, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      // Ondas de radio
      pulseOpacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 100 }), withTiming(0, { duration: 600 })),
        -1,
        false
      );
    } else {
      cancelAnimation(pulse);
      cancelAnimation(pulseOpacity);
      pulse.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isListening, pulse, pulseOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: isListening
      ? interpolate(pulse.value, [1, 1.3], [0.5, 1])
      : interpolate(breathe.value, [0, 1], [0.3, 0.8]),
    shadowRadius: isListening
      ? interpolate(pulse.value, [1, 1.3], [15, 35])
      : interpolate(breathe.value, [0, 1], [8, 20]),
    transform: [
      {
        scale: isListening ? pulse.value : interpolate(breathe.value, [0, 1], [1, 1.05]),
      },
    ],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: interpolate(pulseOpacity.value, [0, 0.8], [2, 1]) }],
  }));

  // Gesture handling
  const longPressActive = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressIn = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      longPressActive.current = true;
      onLongPressStart();
    }, LONG_PRESS_DURATION);
  }, [onLongPressStart]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (longPressActive.current) {
      longPressActive.current = false;
      onLongPressEnd();
    } else {
      // Short press - open chat
      onPress();
    }
  }, [onPress, onLongPressEnd]);

  return (
    <View style={{ position: 'absolute', bottom: 100, right: 20, zIndex: 1000 }}>
      {/* Pulse ring effect when listening */}
      {isListening && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 60,
              height: 60,
              borderRadius: 30,
              borderWidth: 3,
              borderColor: '#DC2626',
              left: 0,
              top: 0,
            },
            pulseRingStyle,
          ]}
        />
      )}

      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: isListening ? '#DC2626' : '#000000',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 0 },
            elevation: 10,
          },
          glowStyle,
        ]}
      >
        {/* Animated Border */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 64,
              height: 64,
              borderRadius: 32,
              borderWidth: 2,
              borderColor: isListening ? '#FFFFFF' : '#DC2626',
              borderStyle: 'solid',
              borderTopColor: isProcessing ? '#DC2626' : isListening ? '#FFFFFF' : '#DC2626',
              borderRightColor: isProcessing ? 'transparent' : isListening ? '#FFFFFF' : '#DC2626',
              borderBottomColor: isProcessing ? 'transparent' : isListening ? '#FFFFFF' : '#DC2626',
              borderLeftColor: isProcessing ? 'transparent' : isListening ? '#FFFFFF' : '#DC2626',
            },
            borderStyle,
          ]}
        />

        {/* Icon */}
        {isListening ? (
          <Mic size={28} color="#FFFFFF" />
        ) : isProcessing ? (
          <Sparkles size={28} color="#DC2626" />
        ) : (
          <Bot size={28} color="#DC2626" />
        )}
      </AnimatedPressable>
    </View>
  );
};

// ============================================================================
// CHAT MESSAGE BUBBLE
// ============================================================================
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <View className={`max-w-[85%] mb-3 ${isUser ? 'self-end' : 'self-start'}`}>
      {/* Label */}
      <Text
        className={`text-xs font-mono mb-1 ${isUser ? 'text-zinc-500 text-right' : 'text-red-500'}`}
      >
        {isUser ? 'TÚ' : 'AXIS'}
      </Text>

      {/* Bubble */}
      <View
        className={`px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-zinc-800 rounded-tr-sm'
            : message.pendingConfirmation
              ? 'bg-yellow-600/20 border border-yellow-500/50 rounded-tl-sm'
              : 'bg-red-600/20 border border-red-600/30 rounded-tl-sm'
        }`}
      >
        <Text className="text-white text-base">{message.content}</Text>
      </View>

      {/* Tool Results */}
      {message.results && message.results.length > 0 && (
        <View className="mt-2 pl-2 border-l-2 border-red-600/50">
          {message.results.map((result, idx) => (
            <Text
              key={idx}
              className={`text-sm font-mono ${result.success ? 'text-green-500' : 'text-red-400'}`}
            >
              {result.message}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// CONFIRMATION BUTTONS
// ============================================================================
const ConfirmationButtons: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ onConfirm, onCancel, isLoading }) => {
  return (
    <View className="flex-row justify-center gap-4 py-4">
      <TouchableOpacity
        onPress={onCancel}
        disabled={isLoading}
        className="flex-row items-center px-6 py-3 bg-zinc-800 rounded-full"
      >
        <X size={20} color="#EF4444" />
        <Text className="text-red-500 font-bold ml-2">CANCELAR</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onConfirm}
        disabled={isLoading}
        className="flex-row items-center px-6 py-3 bg-red-600 rounded-full"
      >
        <Check size={20} color="#FFFFFF" />
        <Text className="text-white font-bold ml-2">EJECUTAR</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// THINKING INDICATOR
// ============================================================================
const ThinkingIndicator: React.FC = () => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animateDot = (dotValue: SharedValue<number>, delay: number) => {
      setTimeout(() => {
        dotValue.value = withRepeat(
          withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 300 })),
          -1,
          false
        );
      }, delay);
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, [dot1, dot2, dot3]);

  const dotStyle = (dotValue: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: interpolate(dotValue.value, [0, 1], [0.3, 1]),
      transform: [{ scale: interpolate(dotValue.value, [0, 1], [1, 1.3]) }],
    }));

  return (
    <View className="self-start max-w-[85%] mb-3">
      <Text className="text-xs font-mono mb-1 text-red-500">AXIS</Text>
      <View className="px-4 py-3 rounded-2xl bg-red-600/20 border border-red-600/30 rounded-tl-sm flex-row items-center">
        <Animated.View
          style={[
            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626', marginRight: 4 },
            dotStyle(dot1),
          ]}
        />
        <Animated.View
          style={[
            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626', marginRight: 4 },
            dotStyle(dot2),
          ]}
        />
        <Animated.View
          style={[
            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
            dotStyle(dot3),
          ]}
        />
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT: AXIS OVERLAY
// ============================================================================
export const AxisOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [pendingExecution, setPendingExecution] = useState<{
    text: string;
    toolCalls: AxisToolCall[];
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'axis',
      content: '¿Qué necesitas? Mantén presionado 🎤 para comandos con confirmación.',
      timestamp: new Date(),
    },
  ]);

  const flatListRef = useRef<FlatList>(null);
  const {
    executeCommand,
    executeTool,
    isProcessing,
    screenContext,
    sportMode,
    activeAsset,
    userProfile,
    availableExercises,
  } = useAxis();

  // Voice input hook
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error: voiceError,
  } = useVoiceInput();

  // Panel slide animation
  const panelY = useSharedValue(PANEL_HEIGHT);

  useEffect(() => {
    panelY.value = withSpring(isOpen ? 0 : PANEL_HEIGHT, {
      damping: 20,
      stiffness: 200,
    });
  }, [isOpen, panelY]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelY.value }],
  }));

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------
  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    setPendingExecution(null);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Execute command
    const results = await executeCommand(userMessage.content);

    // Add Axis response
    const axisMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'axis',
      content:
        results.length > 0 && results[0].success
          ? '✅ Listo. ¿Algo más?'
          : results[0]?.message || 'Procesado.',
      timestamp: new Date(),
      results: results.length > 1 ? results : undefined,
    };

    // If the first result has a message, use it as the main content
    if (results.length === 1) {
      axisMessage.content = results[0].message;
    }

    setMessages((prev) => [...prev, axisMessage]);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleMicPress = async () => {
    if (isRecording) {
      // Detener grabación y transcribir
      console.log('🎤 Deteniendo grabación...');
      const transcription = await stopRecording();

      if (transcription) {
        // Poner el texto transcrito en el input y enviarlo automáticamente
        setInputText(transcription);

        // Enviar automáticamente
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: transcription,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Agregar indicador de procesamiento
        const thinkingMessage: ChatMessage = {
          id: `thinking-${Date.now()}`,
          role: 'axis',
          content: '🎤 ' + transcription,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, thinkingMessage]);

        // Ejecutar comando
        const results = await executeCommand(transcription);

        // Remover thinking y agregar respuesta
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('thinking-')));

        const axisMessage: ChatMessage = {
          id: `axis-${Date.now()}`,
          role: 'axis',
          content: results.length > 0 ? results[0].message : 'Comando ejecutado.',
          timestamp: new Date(),
          results,
        };
        setMessages((prev) => [...prev, axisMessage]);
        setInputText('');

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else if (voiceError) {
        // Mostrar error
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'axis',
          content: `❌ ${voiceError}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } else {
      // Iniciar grabación
      console.log('🎤 Iniciando grabación...');
      await startRecording();
    }
  };

  // -------------------------------------------------------------------------
  // LONG PRESS HANDLERS (con confirmación)
  // -------------------------------------------------------------------------
  const handleLongPressStart = useCallback(async () => {
    console.log('🎤 Long press - Iniciando escucha...');
    setIsListening(true);

    // Vibración fuerte para indicar que está escuchando
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Iniciar grabación
    await startRecording();
  }, [startRecording]);

  const handleLongPressEnd = useCallback(async () => {
    console.log('🎤 Long press - Finalizando escucha...');
    setIsListening(false);

    // Vibración suave para indicar fin
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Detener grabación y transcribir
    const transcription = await stopRecording();

    if (transcription) {
      // Abrir el chat
      setIsOpen(true);

      // Agregar mensaje del usuario
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: `🎤 ${transcription}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Construir contexto para Gemini
      const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

      const geminiContext = {
        screenModule: screenContext.module,
        sportMode: sportMode || 'BODYBUILDING',
        userLevel: userProfile?.level || 'INTERMEDIATE',
        currentTrainingDay: userProfile?.currentTrainingDay || 0,
        activeAsset: activeAsset
          ? {
              name: activeAsset.name,
              type: activeAsset.type,
              liquidData: activeAsset.liquidData,
              isAlternative: activeAsset.isAlternative,
              parentExerciseName: activeAsset.parentExerciseName,
            }
          : null,
        customAliases: [],
        availableExercises: availableExercises || [],
      };

      try {
        console.log('🤖 Analizando comando para confirmación...');

        // Llamar a Gemini para obtener tool calls sin ejecutar
        const result = await callGemini(transcription, geminiContext, GEMINI_API_KEY, []);

        if (result.toolCalls && result.toolCalls.length > 0) {
          // Hay acciones por ejecutar - pedir confirmación
          const actionDescription = result.toolCalls
            .map((tc) => {
              switch (tc.tool) {
                case 'GYM_REPLACE_EXERCISE':
                  return `Reemplazar ${tc.parameters.oldExerciseName} por ${tc.parameters.newExerciseName}`;
                case 'GYM_ADD_EXERCISE':
                  return `Agregar ${tc.parameters.exerciseName}`;
                case 'GYM_REMOVE_EXERCISE':
                  return `Quitar ${tc.parameters.exerciseName}`;
                case 'ASSET_ADD_SERIES':
                  return `Agregar serie de ${tc.parameters.reps || 10} reps × ${tc.parameters.weight || 0}kg`;
                case 'ASSET_REMOVE_SERIES':
                  return `Quitar serie`;
                case 'ASSET_REPLACE_SERIES':
                  return `Reemplazar serie por ${tc.parameters.reps || 10} reps × ${tc.parameters.weight || 0}kg`;
                case 'ASSET_UPDATE_FIELD':
                  return `Modificar ${tc.parameters.fieldPath}`;
                default:
                  return tc.tool;
              }
            })
            .join('\n• ');

          const confirmMessage: ChatMessage = {
            id: `confirm-${Date.now()}`,
            role: 'axis',
            content: `⚠️ ¿Ejecutar?\n\n• ${actionDescription}`,
            timestamp: new Date(),
            pendingConfirmation: true,
            pendingToolCalls: result.toolCalls,
          };

          setMessages((prev) => [...prev, confirmMessage]);
          setPendingExecution({
            text: transcription,
            toolCalls: result.toolCalls,
          });

          // Vibración de alerta
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          // Es solo una pregunta, mostrar respuesta directamente
          const axisMessage: ChatMessage = {
            id: `axis-${Date.now()}`,
            role: 'axis',
            content: result.message || 'No entendí tu comando.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, axisMessage]);
        }
      } catch (error) {
        console.error('Error analizando comando:', error);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'axis',
          content: '❌ Error al procesar tu comando.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [stopRecording, screenContext, sportMode, activeAsset, userProfile, availableExercises]);

  // Confirmar ejecución pendiente
  const handleConfirmExecution = useCallback(async () => {
    if (!pendingExecution) return;

    console.log('✅ Ejecutando acciones confirmadas...');

    // Vibración de confirmación
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Ejecutar cada tool call
    const results: AxisToolResult[] = [];
    for (const toolCall of pendingExecution.toolCalls) {
      const result = await executeTool(toolCall);
      results.push(result);
    }

    // Agregar resultado
    const resultMessage: ChatMessage = {
      id: `result-${Date.now()}`,
      role: 'axis',
      content: results.every((r) => r.success) ? '✅ ¡Ejecutado!' : '⚠️ Algunas acciones fallaron.',
      timestamp: new Date(),
      results,
    };

    setMessages((prev) => prev.filter((m) => !m.pendingConfirmation).concat(resultMessage));
    setPendingExecution(null);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [pendingExecution, executeTool]);

  // Cancelar ejecución pendiente
  const handleCancelExecution = useCallback(async () => {
    console.log('❌ Ejecución cancelada');

    // Vibración de error
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const cancelMessage: ChatMessage = {
      id: `cancel-${Date.now()}`,
      role: 'axis',
      content: '🚫 Acción cancelada.',
      timestamp: new Date(),
    };

    setMessages((prev) => prev.filter((m) => !m.pendingConfirmation).concat(cancelMessage));
    setPendingExecution(null);
  }, []);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <>
      {/* FAB Button - Always visible */}
      <AxisFAB
        onPress={handleOpen}
        onLongPressStart={handleLongPressStart}
        onLongPressEnd={handleLongPressEnd}
        isProcessing={isProcessing || isTranscribing}
        isListening={isListening || isRecording}
      />

      {/* Chat Panel Modal */}
      <Modal visible={isOpen} transparent animationType="none" onRequestClose={handleClose}>
        <View className="flex-1 justify-end">
          {/* Backdrop - Semi-transparent dark overlay */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleClose}
            className="absolute inset-0 bg-black/70"
          />

          {/* Panel */}
          <Animated.View
            style={[
              {
                height: PANEL_HEIGHT,
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderColor: 'rgba(220, 38, 38, 0.3)',
              },
              panelStyle,
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-800">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-red-600/20 items-center justify-center mr-3">
                    <Bot size={22} color="#DC2626" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-lg">AXIS</Text>
                    <Text className="text-zinc-500 text-xs font-mono">
                      {screenContext.module.toUpperCase()} • {sportMode || 'MODO'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  className="w-10 h-10 rounded-full bg-zinc-900 items-center justify-center"
                >
                  <ChevronDown size={24} color="#A1A1AA" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: 8,
                }}
                renderItem={({ item }) => <MessageBubble message={item} />}
                ListFooterComponent={
                  <>
                    {isProcessing && <ThinkingIndicator />}
                    {pendingExecution && (
                      <ConfirmationButtons
                        onConfirm={handleConfirmExecution}
                        onCancel={handleCancelExecution}
                        isLoading={isProcessing}
                      />
                    )}
                  </>
                }
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }}
              />

              {/* Input Area */}
              <View className="flex-row items-center px-4 py-3 border-t border-zinc-800 bg-black">
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={
                    isRecording
                      ? '🎤 Grabando...'
                      : isTranscribing
                        ? '⏳ Transcribiendo...'
                        : 'Escribe un comando...'
                  }
                  placeholderTextColor={isRecording ? '#DC2626' : '#71717A'}
                  className="flex-1 bg-zinc-900 rounded-full px-5 py-3 text-white text-base mr-2"
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  editable={!isProcessing && !isRecording && !isTranscribing && !pendingExecution}
                />

                {/* Mic Button */}
                <TouchableOpacity
                  onPress={handleMicPress}
                  disabled={isProcessing || isTranscribing || !!pendingExecution}
                  className={`w-11 h-11 rounded-full items-center justify-center mr-2 ${
                    isRecording ? 'bg-red-600' : 'bg-zinc-900'
                  }`}
                >
                  {isRecording ? (
                    <MicOff size={20} color="#FFFFFF" />
                  ) : isTranscribing ? (
                    <Mic size={20} color="#DC2626" />
                  ) : (
                    <Mic size={20} color="#A1A1AA" />
                  )}
                </TouchableOpacity>

                {/* Send Button */}
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!inputText.trim() || isProcessing}
                  className={`w-11 h-11 rounded-full items-center justify-center ${
                    inputText.trim() && !isProcessing && !pendingExecution
                      ? 'bg-red-600'
                      : 'bg-zinc-800'
                  }`}
                >
                  <Send
                    size={20}
                    color={
                      inputText.trim() && !isProcessing && !pendingExecution ? '#FFFFFF' : '#71717A'
                    }
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

export default AxisOverlay;
