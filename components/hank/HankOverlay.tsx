// ============================================================================
// HANK OVERLAY - Interfaz Visual del Agente HANK
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
  PanResponder,
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
import {
  GitlabIcon as Bot,
  Send,
  Mic,
  MicOff,
  Sparkles,
  ChevronDown,
  Check,
  X,
} from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { useHank } from '../../context/HankContext';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { callGemini } from '../../services/hank/gemini';
import { supabase } from '../../lib/supabase';
import type { HankToolResult, HankToolCall } from '../../types/hank';

// ============================================================================
// TYPES
// ============================================================================
interface ChatMessage {
  id: string;
  role: 'user' | 'hank';
  content: string;
  timestamp: Date;
  results?: HankToolResult[];
  pendingConfirmation?: boolean;
  pendingToolCalls?: HankToolCall[];
}

// Tipo para mensajes de la base de datos
interface DBUIMessage {
  id: string;
  user_id: string;
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.8;
const LONG_PRESS_DURATION = 400; // ms para activar long press

// ============================================================================
// HELPERS
// ============================================================================
const getDefaultWelcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  role: 'hank',
  content: 'Qué onda. ¿En qué te ayudo hoy? 💪 Mantén presionado 🎤 para voz.',
  timestamp: new Date(),
});

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// FAB BUTTON (Floating Action Button) con Long Press
// ============================================================================
const HankFAB: React.FC<{
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
        {isUser ? 'TÚ' : 'HANK'}
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
      <Text className="text-xs font-mono mb-1 text-red-500">HANK</Text>
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
// HANK TAKEOVER - Efecto de pantalla completa cuando HANK toma el control
// ============================================================================
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HankTakeover: React.FC<{ isActive: boolean; statusText: string }> = ({
  isActive,
  statusText,
}) => {
  // Animaciones
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const ringScale1 = useSharedValue(1);
  const ringScale2 = useSharedValue(1);
  const ringScale3 = useSharedValue(1);
  const ringOpacity1 = useSharedValue(0.8);
  const ringOpacity2 = useSharedValue(0.6);
  const ringOpacity3 = useSharedValue(0.4);
  const glitchX = useSharedValue(0);
  const scanlineY = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Fade in
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      textOpacity.value = withTiming(1, { duration: 400 });

      // Anillos pulsantes que emanan del centro
      ringScale1.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(8, { duration: 1500, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
      ringOpacity1.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 0 }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );

      // Ring 2 con delay
      setTimeout(() => {
        ringScale2.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(8, { duration: 1500, easing: Easing.out(Easing.ease) })
          ),
          -1,
          false
        );
        ringOpacity2.value = withRepeat(
          withSequence(
            withTiming(0.6, { duration: 0 }),
            withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) })
          ),
          -1,
          false
        );
      }, 500);

      // Ring 3 con más delay
      setTimeout(() => {
        ringScale3.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(8, { duration: 1500, easing: Easing.out(Easing.ease) })
          ),
          -1,
          false
        );
        ringOpacity3.value = withRepeat(
          withSequence(
            withTiming(0.4, { duration: 0 }),
            withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) })
          ),
          -1,
          false
        );
      }, 1000);

      // Efecto glitch
      glitchX.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 50 }),
          withTiming(3, { duration: 50 }),
          withTiming(-2, { duration: 50 }),
          withTiming(0, { duration: 50 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        false
      );

      // Scanline
      scanlineY.value = withRepeat(
        withTiming(SCREEN_HEIGHT, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      // Fade out
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.8, { duration: 300 });
      textOpacity.value = withTiming(0, { duration: 200 });
      cancelAnimation(ringScale1);
      cancelAnimation(ringScale2);
      cancelAnimation(ringScale3);
      cancelAnimation(ringOpacity1);
      cancelAnimation(ringOpacity2);
      cancelAnimation(ringOpacity3);
      cancelAnimation(glitchX);
      cancelAnimation(scanlineY);
    }
  }, [isActive]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale1.value }],
    opacity: ringOpacity1.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale2.value }],
    opacity: ringOpacity2.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale3.value }],
    opacity: ringOpacity3.value,
  }));

  const glitchStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glitchX.value }],
  }));

  const scanlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanlineY.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  if (!isActive) return null;

  return (
    <Modal visible={isActive} transparent animationType="none">
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            justifyContent: 'center',
            alignItems: 'center',
          },
          containerStyle,
        ]}
      >
        {/* Scanline effect */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: 'rgba(220, 38, 38, 0.3)',
            },
            scanlineStyle,
          ]}
        />

        {/* Grid pattern overlay */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <View
              key={`h-${i}`}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: i * (SCREEN_HEIGHT / 20),
                height: 1,
                backgroundColor: '#DC2626',
              }}
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <View
              key={`v-${i}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: i * (SCREEN_WIDTH / 10),
                width: 1,
                backgroundColor: '#DC2626',
              }}
            />
          ))}
        </View>

        {/* Pulsing rings from center */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 100,
              height: 100,
              borderRadius: 50,
              borderWidth: 2,
              borderColor: '#DC2626',
            },
            ring1Style,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 100,
              height: 100,
              borderRadius: 50,
              borderWidth: 2,
              borderColor: '#DC2626',
            },
            ring2Style,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 100,
              height: 100,
              borderRadius: 50,
              borderWidth: 2,
              borderColor: '#DC2626',
            },
            ring3Style,
          ]}
        />

        {/* Central HANK icon with glitch */}
        <Animated.View
          style={[
            {
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#000000',
              borderWidth: 3,
              borderColor: '#DC2626',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 30,
              elevation: 20,
            },
            glitchStyle,
          ]}
        >
          <Bot size={50} color="#DC2626" />
        </Animated.View>

        {/* Status text */}
        <Animated.View style={[{ marginTop: 40 }, textStyle]}>
          <Text
            style={{
              color: '#DC2626',
              fontSize: 14,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            HANK TAKEOVER
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontFamily: 'monospace',
              textAlign: 'center',
              marginTop: 8,
              opacity: 0.7,
            }}
          >
            {statusText}
          </Text>
        </Animated.View>

        {/* Corner decorations */}
        <View style={{ position: 'absolute', top: 40, left: 20 }}>
          <Text style={{ color: '#DC2626', fontFamily: 'monospace', fontSize: 10, opacity: 0.5 }}>
            {'<SYSTEM>'}
          </Text>
        </View>
        <View style={{ position: 'absolute', top: 40, right: 20 }}>
          <Text style={{ color: '#DC2626', fontFamily: 'monospace', fontSize: 10, opacity: 0.5 }}>
            {'{OVERRIDE}'}
          </Text>
        </View>
        <View style={{ position: 'absolute', bottom: 60, left: 20 }}>
          <Text style={{ color: '#DC2626', fontFamily: 'monospace', fontSize: 10, opacity: 0.5 }}>
            {'[EXECUTING]'}
          </Text>
        </View>
        <View style={{ position: 'absolute', bottom: 60, right: 20 }}>
          <Text style={{ color: '#DC2626', fontFamily: 'monospace', fontSize: 10, opacity: 0.5 }}>
            {'//HANK.v1'}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT: HANK OVERLAY
// ============================================================================
export const HankOverlay: React.FC = () => {
  // IMPORTANTE: usePathname debe llamarse primero
  // Si el contexto de navegación no está disponible, no renderizar
  let pathname: string | null = null;
  try {
    pathname = usePathname();
  } catch {
    // Si falla usePathname, el contexto de navegación no está disponible
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLongPressProcessing, setIsLongPressProcessing] = useState(false);
  const [isTakeover, setIsTakeover] = useState(false);
  const [takeoverStatus, setTakeoverStatus] = useState('');
  const [pendingExecution, setPendingExecution] = useState<{
    text: string;
    toolCalls: HankToolCall[];
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([getDefaultWelcomeMessage()]);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesInitialized = useRef(false);
  const takeoverResultRef = useRef<HankToolResult[] | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Ocultar en Feed
  const isHiddenInFeed =
    pathname?.includes('feed') || pathname === '/feed/index' || pathname === '/feed';

  // Animated value para cierre por gesto
  const translateY = useSharedValue(0);

  const {
    executeCommand,
    executeTool,
    isProcessing,
    screenContext,
    sportMode,
    activeAsset,
    userProfile,
    availableExercises,
    clearConversation,
    saveMessageToSupabase,
  } = useHank();

  // Voice input hook
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error: voiceError,
  } = useVoiceInput();

  // -------------------------------------------------------------------------
  // PAN RESPONDER - Cerrar deslizando hacia abajo
  // -------------------------------------------------------------------------
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          setIsOpen(false);
          setTimeout(() => {
            translateY.value = 0;
          }, 300);
        } else {
          // Vibración cuando vuelve arriba
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          translateY.value = withTiming(0, { duration: 200 });
        }
      },
    })
  ).current;

  // -------------------------------------------------------------------------
  // HELPER: Verificar si debe limpiar la UI del chat
  // -------------------------------------------------------------------------
  const checkAndClearUIChat = useCallback(
    (results: HankToolResult[]) => {
      // Verificar si algún resultado tiene el flag clearUIChat
      const shouldClear = results.some(
        (r) => (r.data as { clearUIChat?: boolean })?.clearUIChat === true
      );
      if (shouldClear) {
        console.warn('🧹 HANK UI: Limpiando chat visual...');
        // Resetear mensajes con solo bienvenida + notificación
        const clearedNotification: ChatMessage = {
          id: `cleared-${Date.now()}`,
          role: 'hank',
          content: '🧹 Historial limpiado. Empezamos de cero. ¿En qué te puedo ayudar?',
          timestamp: new Date(),
        };
        setMessages([getDefaultWelcomeMessage(), clearedNotification]);
        // También limpiar el contexto de conversación
        clearConversation();
        return true;
      }
      return false;
    },
    [clearConversation]
  );

  // -------------------------------------------------------------------------
  // OBTENER USER ID
  // -------------------------------------------------------------------------
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  // -------------------------------------------------------------------------
  // CHAT UI MEMORY - Sistema de 24 horas con Supabase
  // -------------------------------------------------------------------------

  /**
   * Cargar mensajes de UI desde Supabase (sincronizado con el historial de contexto)
   */
  useEffect(() => {
    const initializeUIMessages = async () => {
      if (messagesInitialized.current || !userId) return;
      messagesInitialized.current = true;

      try {
        // La limpieza de medianoche ya se hace en HankContext con clean_old_hank_messages
        // Aquí solo cargamos los mensajes del día
        const { data: dbMessages, error } = await supabase
          .from('hank_chat_messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('⚠️ HANK UI: Error cargando mensajes:', error.message);
          return;
        }

        if (dbMessages && dbMessages.length > 0) {
          // Convertir de DB format a UI format
          const uiMessages: ChatMessage[] = dbMessages.map((msg: DBUIMessage) => ({
            id: msg.id,
            role: msg.role === 'model' ? 'hank' : 'user',
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }));

          // Agregar mensaje de bienvenida al inicio si no hay mensajes
          const allMessages = [getDefaultWelcomeMessage(), ...uiMessages];
          console.warn(`💬 HANK UI: Cargando ${uiMessages.length} mensajes desde Supabase`);
          setMessages(allMessages);
        }
      } catch (error) {
        console.warn('⚠️ HANK UI: Error inicializando mensajes:', error);
      }
    };

    initializeUIMessages();
  }, [userId]);

  /**
   * Verificar medianoche periódicamente (cada minuto)
   * La limpieza real se hace en HankContext, aquí solo refrescamos la UI
   */
  useEffect(() => {
    if (!userId) return;

    const checkMidnight = async () => {
      // Llamar a la función de limpieza de DB
      const { data: cleanedCount, error } = await supabase.rpc('clean_old_hank_messages', {
        p_user_id: userId,
      });

      if (!error && cleanedCount && cleanedCount > 0) {
        console.warn(`🧹 HANK UI: ¡Medianoche! Limpiados ${cleanedCount} mensajes`);
        setMessages([getDefaultWelcomeMessage()]);
      }
    };

    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  // Panel slide animation
  const panelY = useSharedValue(PANEL_HEIGHT);

  useEffect(() => {
    if (isOpen) {
      // Abrir sin rebote, con vibración al llegar arriba
      panelY.value = withTiming(0, { duration: 300 }, () => {
        // Vibración cuando llega arriba
        'worklet';
        // No podemos llamar Haptics directamente en worklet, usar runOnJS
      });
      // Vibración después de 300ms
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 300);
    } else {
      panelY.value = withTiming(PANEL_HEIGHT, { duration: 300 });
    }
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

    // Verificar si debe limpiar la UI del chat
    if (checkAndClearUIChat(results)) {
      return; // Ya se limpió, no agregar más mensajes
    }

    // Add Hank response
    const hankMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'hank',
      content:
        results.length > 0 && results[0].success
          ? '✅ Listo. ¿Algo más?'
          : results[0]?.message || 'Procesado.',
      timestamp: new Date(),
      results: results.length > 1 ? results : undefined,
    };

    // If the first result has a message, use it as the main content
    if (results.length === 1) {
      hankMessage.content = results[0].message;
    }

    setMessages((prev) => [...prev, hankMessage]);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleMicPress = async () => {
    if (isRecording) {
      // Detener grabación manualmente (cancelar auto-stop)
      console.log('🎤 Cancelando grabación...');
      await stopRecording();
      // No procesar nada, solo detener
    } else {
      // Iniciar grabación CON auto-stop (detección de silencio)
      console.log('🎤 Iniciando grabación con auto-stop...');
      await startRecording(true, async (transcription) => {
        // Callback ejecutado automáticamente cuando auto-stop se activa
        console.log('🎤 Auto-stop activado, procesando transcripción...');

        if (transcription) {
          // Agregar mensaje del usuario
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
            role: 'hank',
            content: '🎤 ' + transcription,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, thinkingMessage]);

          // Ejecutar comando
          const results = await executeCommand(transcription);

          // Remover thinking
          setMessages((prev) => prev.filter((m) => !m.id.startsWith('thinking-')));

          // Verificar si debe limpiar la UI del chat
          if (checkAndClearUIChat(results)) {
            setInputText('');
            return;
          }

          const hankMessage: ChatMessage = {
            id: `hank-${Date.now()}`,
            role: 'hank',
            content: results.length > 0 ? results[0].message : 'Comando ejecutado.',
            timestamp: new Date(),
            results: results.length > 1 ? results : undefined,
          };
          setMessages((prev) => [...prev, hankMessage]);
          setInputText('');

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else if (voiceError) {
          // Mostrar error
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'hank',
            content: `❌ ${voiceError}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      });
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

    // Iniciar grabación SIN auto-stop (modo manual)
    await startRecording(false);
  }, [startRecording]);

  const handleLongPressEnd = useCallback(async () => {
    console.log('🎤 Long press - Finalizando escucha...');
    setIsListening(false);

    // Vibración suave para indicar fin
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Detener grabación y transcribir
    const transcription = await stopRecording();

    if (transcription) {
      // Abrir el chat y mostrar indicador de procesamiento
      setIsOpen(true);
      setIsLongPressProcessing(true);

      // Agregar mensaje del usuario
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: `🎤 ${transcription}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Guardar mensaje de voz en Supabase
      await saveMessageToSupabase('user', transcription);

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
          // Separar herramientas de lectura (ejecutar directo) de escritura (pedir confirmación)
          const readOnlyTools = [
            // GYM
            'GYM_GET_TODAY_ROUTINE',
            'GYM_LIST_EXERCISES',
            // ASSET
            'ASSET_READ',
            'ASSET_GET_SCHEMA',
            // ADN
            'ADN_GET_PROFILE',
            'ADN_GET_RECORDS',
            // PLAN - Tools de lectura
            'PLAN_GET_MEALS',
            'PLAN_GET_MEAL_DETAILS',
            'PLAN_GET_STACK',
            'PLAN_ANALYZE_NUTRITION',
            'PLAN_CALCULATE_MACROS', // Solo lee y calcula, no modifica
            // Contexto OMNISCIENTE
            'GET_USER_CONTEXT',
            'GET_FULL_USER_CONTEXT',
            // Sistema - Ejecutar sin confirmación
            'HANK_CLEAR_HISTORY',
          ];

          const writeToolCalls = result.toolCalls.filter((tc) => !readOnlyTools.includes(tc.tool));
          const readToolCalls = result.toolCalls.filter((tc) => readOnlyTools.includes(tc.tool));

          // Ejecutar herramientas de lectura directamente y capturar resultados
          let readResults: HankToolResult[] = [];
          if (readToolCalls.length > 0) {
            console.log('✅ Ejecutando herramientas de lectura sin confirmación...');
            for (const tc of readToolCalls) {
              const toolResult = await executeTool(tc);
              if (toolResult.success) {
                readResults.push(toolResult);
              }
            }
          }

          // Verificar si algún resultado tiene flag de limpiar UI
          if (checkAndClearUIChat(readResults)) {
            setIsLongPressProcessing(false);
            return; // Ya se limpió, no agregar más mensajes
          }

          // Si hay herramientas de escritura, pedir confirmación
          if (writeToolCalls.length > 0) {
            const actionDescription = writeToolCalls
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
                  case 'ASSET_SET_SERIES':
                    return `Configurar todas las series`;
                  // ADN Tools
                  case 'ADN_UPDATE_PROFILE':
                    return `Actualizar ${tc.parameters.field}: ${tc.parameters.value}`;
                  case 'ADN_ADD_MEASUREMENT':
                    return `Agregar medida: ${tc.parameters.name} = ${tc.parameters.value}`;
                  case 'ADN_REMOVE_MEASUREMENT':
                    return `Eliminar medida: ${tc.parameters.measurementName}`;
                  // PLAN Tools
                  case 'PLAN_ADD_SUPPLEMENT':
                    return `Agregar suplemento: ${tc.parameters.name} (${tc.parameters.dose})`;
                  case 'PLAN_REMOVE_SUPPLEMENT':
                    return `Eliminar suplemento: ${tc.parameters.name}`;
                  case 'PLAN_UPDATE_SUPPLEMENT_TIME': {
                    // Convertir formato 24h a AM/PM
                    const time24s = tc.parameters.newTime as string;
                    const [hoursS, minsS] = time24s.split(':').map(Number);
                    const periodS = hoursS >= 12 ? 'PM' : 'AM';
                    const hours12S = hoursS % 12 || 12;
                    const timeFormattedS = `${hours12S}:${minsS.toString().padStart(2, '0')} ${periodS}`;
                    return `Cambiar hora de ${tc.parameters.name} a ${timeFormattedS}`;
                  }
                  case 'PLAN_ADD_MEAL':
                    return `Agregar comida a las ${tc.parameters.time}`;
                  case 'PLAN_EDIT_MEAL':
                    return `Editar comida`;
                  case 'PLAN_DELETE_MEAL':
                    return `Eliminar comida`;
                  case 'PLAN_UPDATE_MEAL_TIME': {
                    // Convertir formato 24h a AM/PM
                    const time24 = tc.parameters.newTime as string;
                    const [hours, mins] = time24.split(':').map(Number);
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const hours12 = hours % 12 || 12;
                    const timeFormatted = `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
                    // Determinar nombre de comida por position
                    let mealLabel = 'comida';
                    const pos = tc.parameters.position as string;
                    if (pos === 'first') mealLabel = 'desayuno';
                    else if (pos === 'last') mealLabel = 'cena';
                    else if (pos === '2' || pos === 'second') mealLabel = 'almuerzo';
                    return `Cambiar hora de ${mealLabel} a ${timeFormatted}`;
                  }
                  case 'PLAN_CALCULATE_MACROS':
                    return `Calcular macros de la comida`;
                  default:
                    return tc.tool;
                }
              })
              .join('\n• ');

            const confirmMessage: ChatMessage = {
              id: `confirm-${Date.now()}`,
              role: 'hank',
              content: `⚠️ ¿Ejecutar?\n\n• ${actionDescription}`,
              timestamp: new Date(),
              pendingConfirmation: true,
              pendingToolCalls: writeToolCalls,
            };

            setMessages((prev) => [...prev, confirmMessage]);
            setPendingExecution({
              text: transcription,
              toolCalls: writeToolCalls,
            });

            // Vibración de alerta
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else if (readResults.length > 0) {
            // Solo había herramientas de lectura - mostrar resultado directamente
            const toolResultContext = readResults.map((r) => r.message).join('\n\n');

            // Intentar respuesta natural con Gemini, pero con fallback al resultado directo
            let finalMessage = toolResultContext;
            try {
              const naturalResponse = await callGemini(
                `El usuario preguntó: "${transcription}"\n\nDatos obtenidos:\n${toolResultContext}\n\nResponde de forma BREVE y DIRECTA solo lo que preguntó. No repitas toda la información, solo lo relevante a su pregunta.`,
                geminiContext,
                GEMINI_API_KEY,
                [] // Sin historial para respuesta limpia
              );
              if (naturalResponse.message) {
                finalMessage = naturalResponse.message;
              }
            } catch (geminiError) {
              console.warn('⚠️ Gemini falló para respuesta natural, usando resultado directo');
            }

            const hankMessage: ChatMessage = {
              id: `hank-${Date.now()}`,
              role: 'hank',
              content: finalMessage,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, hankMessage]);
            await saveMessageToSupabase('model', finalMessage);
          } else {
            // Mostrar respuesta de Gemini si no hubo resultados de herramientas
            const hankMessage: ChatMessage = {
              id: `hank-${Date.now()}`,
              role: 'hank',
              content: result.message || 'Información obtenida.',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, hankMessage]);
            await saveMessageToSupabase('model', result.message || 'Información obtenida.');
          }
        } else {
          // Es solo una pregunta, mostrar respuesta directamente
          const hankMessage: ChatMessage = {
            id: `hank-${Date.now()}`,
            role: 'hank',
            content: result.message || 'No entendí tu comando.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, hankMessage]);
          await saveMessageToSupabase('model', result.message || 'No entendí tu comando.');
        }
      } catch (error) {
        console.error('Error analizando comando:', error);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'hank',
          content: '❌ Error al procesar tu comando.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        await saveMessageToSupabase('model', '❌ Error al procesar tu comando.');
      } finally {
        // Siempre apagar el indicador de procesamiento
        setIsLongPressProcessing(false);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [
    stopRecording,
    screenContext,
    sportMode,
    activeAsset,
    userProfile,
    availableExercises,
    checkAndClearUIChat,
    executeTool,
    saveMessageToSupabase,
  ]);

  // Confirmar ejecución pendiente - CON EFECTO HANK TAKEOVER
  const handleConfirmExecution = useCallback(async () => {
    if (!pendingExecution) return;

    console.log('✅ Ejecutando acciones confirmadas...');

    // Vibración de confirmación
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 1. CERRAR EL CHAT
    setIsOpen(false);

    // 2. ACTIVAR TAKEOVER MODE
    setTakeoverStatus('Aplicando cambios...');
    setIsTakeover(true);

    // Vibración fuerte para indicar takeover
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // 3. EJECUTAR LAS HERRAMIENTAS
    const results: HankToolResult[] = [];
    for (let i = 0; i < pendingExecution.toolCalls.length; i++) {
      const toolCall = pendingExecution.toolCalls[i];
      setTakeoverStatus(`Ejecutando ${i + 1}/${pendingExecution.toolCalls.length}...`);
      const result = await executeTool(toolCall);
      results.push(result);
      // Pequeña pausa para efecto visual
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Guardar resultados para después
    takeoverResultRef.current = results;

    // Mostrar mensaje de éxito
    setTakeoverStatus(results.every((r) => r.success) ? '¡Cambios aplicados!' : 'Completado');

    // Vibración de éxito
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 4. ESPERAR UN MOMENTO PARA EL EFECTO
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 5. DESACTIVAR TAKEOVER Y ABRIR CHAT
    setIsTakeover(false);

    // Pequeña pausa antes de abrir el chat
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 6. ABRIR EL CHAT Y MOSTRAR RESULTADO
    setIsOpen(true);

    // Verificar si debe limpiar la UI del chat
    if (checkAndClearUIChat(results)) {
      setPendingExecution(null);
      takeoverResultRef.current = null;
      return;
    }

    // Agregar resultado al chat
    const resultMessage: ChatMessage = {
      id: `result-${Date.now()}`,
      role: 'hank',
      content: results.every((r) => r.success)
        ? '✅ ¡Hecho! Los cambios fueron aplicados.'
        : '⚠️ Algunas acciones fallaron.',
      timestamp: new Date(),
      results: results.length > 1 ? results : undefined,
    };

    // Si solo hay un resultado, mostrar su mensaje
    if (results.length === 1 && results[0].message) {
      resultMessage.content = `✅ ${results[0].message}`;
    }

    setMessages((prev) => prev.filter((m) => !m.pendingConfirmation).concat(resultMessage));
    await saveMessageToSupabase('model', resultMessage.content);
    setPendingExecution(null);
    takeoverResultRef.current = null;

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [pendingExecution, executeTool, checkAndClearUIChat, saveMessageToSupabase]);

  // Cancelar ejecución pendiente
  const handleCancelExecution = useCallback(async () => {
    console.log('❌ Ejecución cancelada');

    // Vibración de error
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const cancelMessage: ChatMessage = {
      id: `cancel-${Date.now()}`,
      role: 'hank',
      content: '🚫 Acción cancelada.',
      timestamp: new Date(),
    };

    setMessages((prev) => prev.filter((m) => !m.pendingConfirmation).concat(cancelMessage));
    setPendingExecution(null);
  }, []);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  // No renderizar en Feed
  if (isHiddenInFeed) {
    return null;
  }

  return (
    <>
      {/* HANK TAKEOVER - Efecto fullscreen cuando ejecuta cambios */}
      <HankTakeover isActive={isTakeover} statusText={takeoverStatus} />

      {/* FAB Button - Always visible (oculto durante takeover) */}
      {!isTakeover && (
        <HankFAB
          onPress={handleOpen}
          onLongPressStart={handleLongPressStart}
          onLongPressEnd={handleLongPressEnd}
          isProcessing={isProcessing || isTranscribing}
          isListening={isListening || isRecording}
        />
      )}

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
                transform: [{ translateY: translateY }],
              },
              panelStyle,
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
            >
              {/* Header con PanResponder para cerrar deslizando */}
              <View
                {...panResponder.panHandlers}
                className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-800"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-red-600/20 items-center justify-center mr-3">
                    <Bot size={22} color="#DC2626" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-lg">HANK</Text>
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
                    {(isProcessing || isLongPressProcessing) && <ThinkingIndicator />}
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

export default HankOverlay;
