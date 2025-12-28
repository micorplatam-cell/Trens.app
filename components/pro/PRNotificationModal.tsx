// =============================================================================
// PR NOTIFICATION MODAL - Celebración de récords personales
// Estilo SAVAGE: Agresivo, impactante, motivador
// =============================================================================

import React, { useEffect, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Flame, Trophy, Zap, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { DetectedRecord, RecordDetectionResult, RecordType } from '../../types/records';

// =============================================================================
// TIPOS
// =============================================================================

interface PRNotificationModalProps {
  visible: boolean;
  result: RecordDetectionResult | null;
  onClose: () => void;
}

// =============================================================================
// CONFIGURACIÓN VISUAL POR TIPO DE RÉCORD
// =============================================================================

const RECORD_STYLES: Record<
  RecordType,
  {
    Icon: React.ComponentType<{ color: string; size: number }>;
    gradientColors: readonly [string, string, string];
    glowColor: string;
    iconBgColor: string;
  }
> = {
  DOMINANT: {
    Icon: Flame,
    gradientColors: ['#DC2626', '#991B1B', '#450A0A'] as const,
    glowColor: '#DC2626',
    iconBgColor: '#7F1D1D',
  },
  MAX_WEIGHT: {
    Icon: Trophy,
    gradientColors: ['#F59E0B', '#D97706', '#78350F'] as const,
    glowColor: '#F59E0B',
    iconBgColor: '#92400E',
  },
  ESTIMATED_1RM: {
    Icon: Zap,
    gradientColors: ['#8B5CF6', '#7C3AED', '#4C1D95'] as const,
    glowColor: '#8B5CF6',
    iconBgColor: '#5B21B6',
  },
  MAX_REPS_AT_WEIGHT: {
    Icon: RefreshCw,
    gradientColors: ['#10B981', '#059669', '#064E3B'] as const,
    glowColor: '#10B981',
    iconBgColor: '#047857',
  },
};

// =============================================================================
// COMPONENTE: TARJETA DE RÉCORD
// =============================================================================

interface RecordCardProps {
  record: DetectedRecord;
  isPrimary: boolean;
  delay?: number;
}

const RecordCard = ({ record, isPrimary, delay = 0 }: RecordCardProps) => {
  const styles = RECORD_STYLES[record.type];

  // Animación de escala para impacto
  const scale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, {
        damping: 8,
        stiffness: 150,
        mass: 0.8,
      })
    );

    glowOpacity.value = withDelay(
      delay + 200,
      withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0.4, { duration: 300 })
      )
    );
  }, [delay, scale, glowOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={cardStyle} className={isPrimary ? 'mb-4' : 'mb-2'}>
      {/* Glow effect */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            borderRadius: 28,
            backgroundColor: styles.glowColor,
            shadowColor: styles.glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 30,
          },
        ]}
      />

      <LinearGradient
        colors={styles.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className={`rounded-2xl overflow-hidden ${isPrimary ? 'p-6' : 'p-4'}`}
        style={{
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      >
        {/* Header: Emoji + Title */}
        <View className="flex-row items-center mb-3">
          <View
            className={`rounded-full items-center justify-center mr-3 ${isPrimary ? 'w-14 h-14' : 'w-10 h-10'}`}
            style={{ backgroundColor: styles.iconBgColor }}
          >
            <Text className={isPrimary ? 'text-3xl' : 'text-xl'}>{record.emoji}</Text>
          </View>
          <View className="flex-1">
            <Text
              className={`text-white font-black tracking-wider ${isPrimary ? 'text-xl' : 'text-sm'}`}
            >
              {record.title}
            </Text>
          </View>
        </View>

        {/* Subtitle: Peso × Reps */}
        <Text
          className={`text-white font-mono font-black ${isPrimary ? 'text-4xl mb-4' : 'text-2xl mb-2'}`}
        >
          {record.subtitle}
        </Text>

        {/* Comparison: Antes vs Ahora */}
        {record.comparison && isPrimary && (
          <View className="flex-row items-center justify-between bg-black/30 rounded-xl p-3">
            <View className="items-center flex-1">
              <Text className="text-zinc-400 text-xs font-bold uppercase mb-1">ANTES</Text>
              <Text className="text-zinc-300 font-mono text-lg">{record.comparison.previous}</Text>
            </View>
            <View className="w-px h-10 bg-zinc-600 mx-3" />
            <View className="items-center flex-1">
              <Text className="text-white text-xs font-bold uppercase mb-1">AHORA</Text>
              <Text className="text-white font-mono text-lg font-bold">
                {record.comparison.current}
              </Text>
            </View>
          </View>
        )}

        {/* Improvement message */}
        {record.comparison && (
          <Text
            className={`text-white/80 font-bold text-center mt-3 ${isPrimary ? 'text-base' : 'text-xs'}`}
          >
            {record.comparison.improvement}
          </Text>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PRNotificationModal({ visible, result, onClose }: PRNotificationModalProps) {
  // Animaciones
  const backdropOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.8);
  const contentOpacity = useSharedValue(0);

  // Trigger haptics on show
  const triggerHaptics = useCallback(() => {
    if (result?.hasRecord) {
      // Heavy impact para récord dominante, medium para otros
      if (result.primaryRecord?.type === 'DOMINANT') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
      }
    }
  }, [result]);

  useEffect(() => {
    if (visible) {
      triggerHaptics();

      backdropOpacity.value = withTiming(1, { duration: 200 });
      contentOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));
      contentScale.value = withDelay(
        100,
        withSpring(1, {
          damping: 12,
          stiffness: 180,
        })
      );
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      contentOpacity.value = withTiming(0, { duration: 100 });
      contentScale.value = withTiming(0.8, { duration: 150 });
    }
  }, [visible, triggerHaptics, backdropOpacity, contentOpacity, contentScale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  // No renderizar si no hay resultado
  if (!result || !result.hasRecord) return null;

  const { primaryRecord, secondaryRecord } = result;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {/* Backdrop con blur */}
      <Animated.View
        style={[backdropStyle, { flex: 1 }]}
        className="bg-black/80 items-center justify-center px-6"
      >
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Cerrar notificación"
        />

        {/* Content */}
        <Animated.View style={[contentStyle, { width: '100%', maxWidth: 400 }]}>
          {/* Header decorativo */}
          <View className="items-center mb-6">
            <Text className="text-white/40 text-xs font-bold tracking-[0.3em] uppercase">
              PERSONAL RECORD DETECTED
            </Text>
          </View>

          {/* Primary Record */}
          {primaryRecord && <RecordCard record={primaryRecord} isPrimary delay={200} />}

          {/* Secondary Record (opcional) */}
          {secondaryRecord && <RecordCard record={secondaryRecord} isPrimary={false} delay={400} />}

          {/* Close button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            className="bg-white/10 rounded-full py-4 mt-4 items-center border border-white/20"
            activeOpacity={0.7}
          >
            <Text className="text-white font-bold text-base tracking-wide">CONTINUAR 💪</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default PRNotificationModal;
