// ============================================================================
// PREMIUM CARD COMPONENT
// Glassmorphic card with animated border glow effect
// ============================================================================

import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  variant?: 'default' | 'fire' | 'subtle' | 'glass';
  animated?: boolean;
  glowColor?: string;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  className = '',
  style,
  variant = 'default',
  animated = false,
  glowColor = '#DC2626',
}) => {
  const borderOpacity = useSharedValue(0.15);

  useEffect(() => {
    if (animated) {
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [animated]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(220, 38, 38, ${borderOpacity.value})`,
  }));

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'fire':
        return 'bg-zinc-900/60 border-2 border-red-600/30';
      case 'subtle':
        return 'bg-zinc-900/30 border border-zinc-800/50';
      case 'glass':
        return 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]';
      default:
        return 'bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50';
    }
  };

  const baseStyles = getVariantStyles();

  return (
    <Animated.View
      style={[animated ? animatedBorderStyle : undefined, style]}
      className={`rounded-3xl overflow-hidden ${baseStyles} ${className}`}
    >
      {/* Inner gradient overlay for fire variant */}
      {variant === 'fire' && (
        <LinearGradient
          colors={['rgba(220, 38, 38, 0.1)', 'transparent', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 24,
          }}
        />
      )}

      {children}
    </Animated.View>
  );
};

export default PremiumCard;
