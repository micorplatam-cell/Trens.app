import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LucideIcon } from 'lucide-react-native';

interface PremiumBadgeProps {
  label: string;
  variant?: 'fire' | 'success' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  animated?: boolean;
}

const VARIANTS = {
  fire: {
    gradient: ['#DC2626', '#B91C1C'],
    glow: '#DC2626',
    text: 'white',
  },
  success: {
    gradient: ['#22C55E', '#16A34A'],
    glow: '#22C55E',
    text: 'white',
  },
  warning: {
    gradient: ['#F97316', '#EA580C'],
    glow: '#F97316',
    text: 'white',
  },
  info: {
    gradient: ['#3B82F6', '#2563EB'],
    glow: '#3B82F6',
    text: 'white',
  },
  neutral: {
    gradient: ['#3F3F46', '#27272A'],
    glow: '#52525B',
    text: '#A1A1AA',
  },
};

const SIZES = {
  sm: {
    paddingX: 8,
    paddingY: 3,
    fontSize: 10,
    iconSize: 10,
    borderRadius: 8,
  },
  md: {
    paddingX: 12,
    paddingY: 4,
    fontSize: 11,
    iconSize: 12,
    borderRadius: 10,
  },
  lg: {
    paddingX: 16,
    paddingY: 6,
    fontSize: 12,
    iconSize: 14,
    borderRadius: 12,
  },
};

export function PremiumBadge({
  label,
  variant = 'fire',
  size = 'md',
  icon: Icon,
  animated = false,
}: PremiumBadgeProps) {
  const config = VARIANTS[variant];
  const sizeConfig = SIZES[size];
  const glowOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    if (animated) {
      glowOpacity.value = withRepeat(
        withTiming(0.6, { duration: 1500 }),
        -1,
        true
      );
    }
  }, [animated]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View className="relative">
      {/* Glow effect */}
      {animated && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -4,
              left: -4,
              right: -4,
              bottom: -4,
              borderRadius: sizeConfig.borderRadius + 4,
              backgroundColor: config.glow,
            },
            glowStyle,
          ]}
          className="blur-xl"
        />
      )}

      <LinearGradient
        colors={config.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: sizeConfig.paddingX,
          paddingVertical: sizeConfig.paddingY,
          borderRadius: sizeConfig.borderRadius,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          shadowColor: config.glow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 6,
        }}
      >
        {Icon && <Icon size={sizeConfig.iconSize} color={config.text} />}
        <Text
          style={{
            fontSize: sizeConfig.fontSize,
            fontWeight: '700',
            color: config.text,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </View>
  );
}
