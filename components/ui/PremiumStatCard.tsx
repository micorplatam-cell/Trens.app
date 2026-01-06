import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInUp,
} from 'react-native-reanimated';
import { LucideIcon } from 'lucide-react-native';

// Colors defined in VARIANTS

interface PremiumStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  variant?: 'fire' | 'success' | 'warning' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
  animated?: boolean;
}

const VARIANTS = {
  fire: {
    gradient: ['rgba(220, 38, 38, 0.12)', 'rgba(220, 38, 38, 0.03)'],
    iconBg: 'rgba(220, 38, 38, 0.2)',
    iconColor: '#DC2626',
    border: 'rgba(220, 38, 38, 0.2)',
    glow: '#DC2626',
  },
  success: {
    gradient: ['rgba(34, 197, 94, 0.12)', 'rgba(34, 197, 94, 0.03)'],
    iconBg: 'rgba(34, 197, 94, 0.2)',
    iconColor: '#22C55E',
    border: 'rgba(34, 197, 94, 0.2)',
    glow: '#22C55E',
  },
  warning: {
    gradient: ['rgba(249, 115, 22, 0.12)', 'rgba(249, 115, 22, 0.03)'],
    iconBg: 'rgba(249, 115, 22, 0.2)',
    iconColor: '#F97316',
    border: 'rgba(249, 115, 22, 0.2)',
    glow: '#F97316',
  },
  neutral: {
    gradient: ['rgba(63, 63, 70, 0.3)', 'rgba(39, 39, 42, 0.2)'],
    iconBg: 'rgba(82, 82, 91, 0.3)',
    iconColor: '#A1A1AA',
    border: 'rgba(63, 63, 70, 0.3)',
    glow: '#52525B',
  },
};

const SIZES = {
  sm: { iconSize: 18, iconBg: 36, valueSize: 20, labelSize: 11, padding: 12 },
  md: { iconSize: 22, iconBg: 44, valueSize: 28, labelSize: 12, padding: 16 },
  lg: { iconSize: 28, iconBg: 56, valueSize: 36, labelSize: 13, padding: 20 },
};

export function PremiumStatCard({
  icon: Icon,
  label,
  value,
  unit,
  subtext,
  variant = 'fire',
  size = 'md',
  delay = 0,
  animated = false,
}: PremiumStatCardProps) {
  const config = VARIANTS[variant];
  const sizeConfig = SIZES[size];
  const glowOpacity = useSharedValue(0.2);

  React.useEffect(() => {
    if (animated) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 2000 }),
          withTiming(0.15, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [animated]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500).springify()}
      className="relative"
    >
      {/* Glow effect */}
      {animated && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -10,
              left: -10,
              right: -10,
              bottom: -10,
              borderRadius: 24,
              backgroundColor: config.glow,
            },
            glowStyle,
          ]}
          className="blur-2xl"
        />
      )}

      <LinearGradient
        colors={config.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: sizeConfig.padding,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: config.border,
        }}
      >
        <View className="flex-row items-center gap-3 mb-3">
          <View
            style={{
              width: sizeConfig.iconBg,
              height: sizeConfig.iconBg,
              borderRadius: sizeConfig.iconBg / 2.5,
              backgroundColor: config.iconBg,
            }}
            className="items-center justify-center"
          >
            <Icon size={sizeConfig.iconSize} color={config.iconColor} />
          </View>
          <Text
            style={{ fontSize: sizeConfig.labelSize }}
            className="text-zinc-400 font-medium uppercase tracking-wider"
          >
            {label}
          </Text>
        </View>

        <View className="flex-row items-baseline">
          <Text
            style={{
              fontSize: sizeConfig.valueSize,
              textShadowColor: config.glow,
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: animated ? 10 : 0,
            }}
            className="text-white font-bold font-mono"
          >
            {value}
          </Text>
          {unit && (
            <Text
              style={{ fontSize: sizeConfig.valueSize * 0.5 }}
              className="text-zinc-500 ml-1"
            >
              {unit}
            </Text>
          )}
        </View>

        {subtext && (
          <Text className="text-zinc-600 text-xs mt-1">{subtext}</Text>
        )}
      </LinearGradient>
    </Animated.View>
  );
}
