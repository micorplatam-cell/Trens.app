import React from 'react';
import { View, Text, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Flame, Dumbbell, Activity } from 'lucide-react-native';

const PREMIUM = {
  fireRed: '#DC2626',
  fireOrange: '#F97316',
  fireYellow: '#FBBF24',
};

interface PremiumLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'fire' | 'pulse' | 'dumbbell';
}

export function PremiumLoader({
  size = 'md',
  text = 'Cargando...',
  variant = 'fire',
}: PremiumLoaderProps) {
  const rotateValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  const SIZES = {
    sm: { container: 48, icon: 24, text: 12 },
    md: { container: 72, icon: 36, text: 14 },
    lg: { container: 100, icon: 48, text: 16 },
  };

  const config = SIZES[size];

  React.useEffect(() => {
    if (variant === 'fire') {
      // Flame animation - scale pulse
      scaleValue.value = withRepeat(
        withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withTiming(0.6, { duration: 600 }),
        -1,
        true
      );
    } else if (variant === 'pulse') {
      // Pulse animation
      scaleValue.value = withRepeat(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else if (variant === 'dumbbell') {
      // Rotation animation
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [variant]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleValue.value },
      { rotate: `${rotateValue.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const getIcon = () => {
    switch (variant) {
      case 'fire':
        return <Flame size={config.icon} color={PREMIUM.fireOrange} fill={PREMIUM.fireRed} />;
      case 'pulse':
        return <Activity size={config.icon} color={PREMIUM.fireRed} />;
      case 'dumbbell':
        return <Dumbbell size={config.icon} color={PREMIUM.fireRed} />;
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="items-center justify-center py-10"
    >
      {/* Glow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: config.container * 1.5,
            height: config.container * 1.5,
            borderRadius: config.container,
            backgroundColor: PREMIUM.fireRed,
          },
          glowStyle,
        ]}
        className="blur-2xl"
      />

      {/* Icon container */}
      <View
        style={{
          width: config.container,
          height: config.container,
          borderRadius: config.container / 2,
        }}
        className="bg-zinc-900/80 border border-zinc-800/50 items-center justify-center mb-4"
      >
        <Animated.View style={iconStyle}>
          {getIcon()}
        </Animated.View>
      </View>

      {/* Text */}
      {text && (
        <Text
          style={{ fontSize: config.text }}
          className="text-zinc-500 font-medium"
        >
          {text}
        </Text>
      )}
    </Animated.View>
  );
}

interface PremiumSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function PremiumSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
}: PremiumSkeletonProps) {
  const shimmerPosition = useSharedValue(-1);

  React.useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerPosition.value * 100 }],
  }));

  return (
    <View
      style={{
        width: width as DimensionValue,
        height,
        borderRadius,
        backgroundColor: '#27272A',
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
          },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
