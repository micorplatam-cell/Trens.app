// ============================================================================
// AXIS OVERLAY - Interfaz Visual del Agente AXIS
// FAB flotante + Modal de Chat con estilo Savage Mode
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native-reanimated';
import { Bot, Send, Mic, Sparkles, ChevronDown } from 'lucide-react-native';
import { useAxis } from '../../context/AxisContext';
import type { AxisToolResult } from '../../types/axis';

// ============================================================================
// TYPES
// ============================================================================
interface ChatMessage {
  id: string;
  role: 'user' | 'axis';
  content: string;
  timestamp: Date;
  results?: AxisToolResult[];
}

// ============================================================================
// CONSTANTS
// ============================================================================
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.55;

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ============================================================================
// FAB BUTTON (Floating Action Button)
// ============================================================================
const AxisFAB: React.FC<{
  onPress: () => void;
  isProcessing: boolean;
}> = ({ onPress, isProcessing }) => {
  // Breathing animation
  const breathe = useSharedValue(0);
  // Processing spin animation
  const spin = useSharedValue(0);

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

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(breathe.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(breathe.value, [0, 1], [8, 20]),
    transform: [{ scale: interpolate(breathe.value, [0, 1], [1, 1.05]) }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#DC2626',
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
          zIndex: 1000,
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
            borderColor: '#DC2626',
            borderStyle: 'solid',
            borderTopColor: isProcessing ? '#DC2626' : '#DC2626',
            borderRightColor: isProcessing ? 'transparent' : '#DC2626',
            borderBottomColor: isProcessing ? 'transparent' : '#DC2626',
            borderLeftColor: isProcessing ? 'transparent' : '#DC2626',
          },
          borderStyle,
        ]}
      />

      {/* Icon */}
      {isProcessing ? <Sparkles size={28} color="#DC2626" /> : <Bot size={28} color="#DC2626" />}
    </AnimatedTouchable>
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'axis',
      content:
        '¿Qué necesitas? Puedo modificar tu rutina, ajustar calorías, o ejecutar comandos. Solo dime.',
      timestamp: new Date(),
    },
  ]);

  const flatListRef = useRef<FlatList>(null);
  const { executeCommand, isProcessing, screenContext, sportMode } = useAxis();

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
  const handleClose = () => setIsOpen(false);

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

  const handleMicPress = () => {
    // TODO: Implementar reconocimiento de voz
    console.warn('🎤 Voice input not implemented yet');
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <>
      {/* FAB Button - Always visible */}
      <AxisFAB onPress={handleOpen} isProcessing={isProcessing} />

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
                ListFooterComponent={isProcessing ? <ThinkingIndicator /> : null}
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }}
              />

              {/* Input Area */}
              <View className="flex-row items-center px-4 py-3 border-t border-zinc-800 bg-black">
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Escribe un comando..."
                  placeholderTextColor="#71717A"
                  className="flex-1 bg-zinc-900 rounded-full px-5 py-3 text-white text-base mr-2"
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  editable={!isProcessing}
                />

                {/* Mic Button */}
                <TouchableOpacity
                  onPress={handleMicPress}
                  className="w-11 h-11 rounded-full bg-zinc-900 items-center justify-center mr-2"
                >
                  <Mic size={20} color="#A1A1AA" />
                </TouchableOpacity>

                {/* Send Button */}
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!inputText.trim() || isProcessing}
                  className={`w-11 h-11 rounded-full items-center justify-center ${
                    inputText.trim() && !isProcessing ? 'bg-red-600' : 'bg-zinc-800'
                  }`}
                >
                  <Send
                    size={20}
                    color={inputText.trim() && !isProcessing ? '#FFFFFF' : '#71717A'}
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
