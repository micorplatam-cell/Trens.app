import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Colors are defined in VARIANTS

interface PremiumProgressProps {
  progress: number; // 0-100
  height?: number;
  variant?: 'fire' | 'success' | 'gradient' | 'neutral';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  showGlow?: boolean;
}

const VARIANTS = {
  fire: {
    colors: ['#DC2626', '#B91C1C'],
    glow: '#DC2626',
    bg: '#27272A',
  },
  success: {
    colors: ['#22C55E', '#16A34A'],
    glow: '#22C55E',
    bg: '#27272A',
  },
  gradient: {
    colors: ['#DC2626', '#F97316', '#FBBF24'],
    glow: '#F97316',
    bg: '#27272A',
  },
  neutral: {
    colors: ['#52525B', '#3F3F46'],
    glow: '#52525B',
    bg: '#27272A',
  },
};

export function PremiumProgress({
  progress,
  height = 8,
  variant = 'fire',
  showLabel = false,
  label,
  animated = true,
  showGlow = true,
}: PremiumProgressProps) {
  const config = VARIANTS[variant];
  const shimmerPosition = useSharedValue(-1);

  React.useEffect(() => {
    if (animated && progress > 0) {
      shimmerPosition.value = withRepeat(
        withTiming(2, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [animated, progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerPosition.value * 100 }],
  }));

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View>
      {/* Label */}
      {showLabel && (
        <View className="flex-row justify-between mb-2">
          <Text className="text-zinc-400 text-sm">{label || 'Progreso'}</Text>
          <Text className="text-white text-sm font-mono">{Math.round(clampedProgress)}%</Text>
        </View>
      )}

      {/* Track */}
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: config.bg,
          overflow: 'hidden',
        }}
      >
        {/* Glow effect */}
        {showGlow && clampedProgress > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -height,
              left: 0,
              width: `${clampedProgress}%`,
              height: height * 3,
              backgroundColor: config.glow,
              opacity: 0.3,
              borderRadius: height / 2,
            }}
            className="blur-xl"
          />
        )}

        {/* Progress fill */}
        <LinearGradient
          colors={config.colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: `${clampedProgress}%`,
            height: '100%',
            borderRadius: height / 2,
            overflow: 'hidden',
          }}
        >
          {/* Shimmer effect */}
          {animated && (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '50%',
                  height: '100%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                },
                shimmerStyle,
              ]}
            />
          )}
        </LinearGradient>
      </View>
    </View>
  );
}
