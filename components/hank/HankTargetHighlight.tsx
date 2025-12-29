// ============================================================================
// HANK TARGET HIGHLIGHT - Borde animado y engranaje cuando Hank trabaja
// Efecto visual ED HARDY SAVAGE MODE
// ============================================================================

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Settings2 } from 'lucide-react-native';
import { useHank } from '../../context/HankContext';

// ============================================================================
// ANIMATED GEAR COMPONENT
// ============================================================================
const AnimatedGear: React.FC<{
  size: number;
  isSpinning: boolean;
  color?: string;
}> = ({ size, isSpinning, color = '#F97316' }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isSpinning) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 300 });
    }
  }, [isSpinning, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Settings2 size={size} color={color} strokeWidth={2.5} />
    </Animated.View>
  );
};

// ============================================================================
// ANIMATED BORDER COMPONENT
// ============================================================================
const AnimatedBorder: React.FC<{
  position: { x: number; y: number; width: number; height: number };
  phase: 'working' | 'success' | 'idle';
}> = ({ position, phase }) => {
  const borderOpacity = useSharedValue(0);
  const borderScale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);
  const dashOffset = useSharedValue(0);

  useEffect(() => {
    if (phase === 'working') {
      // Entrada con spring
      borderOpacity.value = withSpring(1, { damping: 15 });
      borderScale.value = withSequence(
        withSpring(1.02, { damping: 10 }),
        withSpring(1, { damping: 15 })
      );
      // Glow pulsante
      glowIntensity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      // Dash animation
      dashOffset.value = withRepeat(
        withTiming(20, { duration: 500, easing: Easing.linear }),
        -1,
        false
      );
    } else if (phase === 'success') {
      // Flash verde de éxito
      glowIntensity.value = withSequence(
        withTiming(1.5, { duration: 150 }),
        withTiming(0, { duration: 300 })
      );
      borderOpacity.value = withTiming(0, { duration: 400 });
    } else {
      cancelAnimation(glowIntensity);
      cancelAnimation(dashOffset);
      borderOpacity.value = withTiming(0, { duration: 200 });
      borderScale.value = withTiming(1, { duration: 200 });
    }
  }, [phase, borderOpacity, borderScale, glowIntensity, dashOffset]);

  const containerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: position.x - 4,
    top: position.y - 4,
    width: position.width + 8,
    height: position.height + 8,
    opacity: borderOpacity.value,
    transform: [{ scale: borderScale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: phase === 'success' ? '#22C55E' : '#F97316',
    borderRadius: 12,
    borderStyle: 'solid',
    shadowColor: phase === 'success' ? '#22C55E' : '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowIntensity.value, [0, 1], [0.3, 0.9]),
    shadowRadius: interpolate(glowIntensity.value, [0, 1], [5, 20]),
    elevation: 10,
  }));

  // Esquinas decorativas ED HARDY
  const cornerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowIntensity.value, [0, 1], [0.5, 1]),
  }));

  return (
    <Animated.View style={containerStyle} pointerEvents="none">
      {/* Borde principal */}
      <Animated.View style={borderStyle} />

      {/* Esquinas con efecto */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -2,
            left: -2,
            width: 12,
            height: 12,
            borderTopWidth: 3,
            borderLeftWidth: 3,
            borderColor: phase === 'success' ? '#22C55E' : '#FBBF24',
            borderTopLeftRadius: 4,
          },
          cornerStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -2,
            right: -2,
            width: 12,
            height: 12,
            borderTopWidth: 3,
            borderRightWidth: 3,
            borderColor: phase === 'success' ? '#22C55E' : '#FBBF24',
            borderTopRightRadius: 4,
          },
          cornerStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -2,
            left: -2,
            width: 12,
            height: 12,
            borderBottomWidth: 3,
            borderLeftWidth: 3,
            borderColor: phase === 'success' ? '#22C55E' : '#FBBF24',
            borderBottomLeftRadius: 4,
          },
          cornerStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 12,
            height: 12,
            borderBottomWidth: 3,
            borderRightWidth: 3,
            borderColor: phase === 'success' ? '#22C55E' : '#FBBF24',
            borderBottomRightRadius: 4,
          },
          cornerStyle,
        ]}
      />

      {/* Engranaje girando en esquina superior derecha */}
      {phase === 'working' && (
        <View
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#0a0505',
            borderWidth: 2,
            borderColor: '#F97316',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <AnimatedGear size={16} isSpinning={true} />
        </View>
      )}

      {/* Check de éxito */}
      {phase === 'success' && (
        <View
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#22C55E',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#22C55E',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <View
            style={{
              width: 8,
              height: 14,
              borderRightWidth: 3,
              borderBottomWidth: 3,
              borderColor: '#fff',
              transform: [{ rotate: '45deg' }, { translateY: -2 }],
            }}
          />
        </View>
      )}
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT - Overlay global para highlights
// ============================================================================
export const HankTargetHighlight: React.FC = () => {
  const { targetState } = useHank();
  const { currentTarget, animationPhase } = targetState;

  // Solo renderizar cuando hay target activo y estamos en fase de trabajo/éxito
  if (!currentTarget || (animationPhase !== 'working' && animationPhase !== 'success')) {
    return null;
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <AnimatedBorder
        position={currentTarget.position}
        phase={animationPhase === 'success' ? 'success' : 'working'}
      />
    </View>
  );
};

export default HankTargetHighlight;
