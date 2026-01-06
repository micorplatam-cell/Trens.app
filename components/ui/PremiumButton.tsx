// ============================================================================
// PREMIUM BUTTON COMPONENT
// High-quality button with gradient, glow and animations
// ============================================================================

import React, { useEffect } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface PremiumButtonProps {
  onPress: () => void;
  title: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  animated?: boolean;
  style?: ViewStyle;
  className?: string;
}

// Premium Colors
const COLORS = {
  fireRed: '#DC2626',
  fireRedDark: '#B91C1C',
  fireOrange: '#F97316',
  glowRed: 'rgba(220, 38, 38, 0.6)',
};

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  onPress,
  title,
  icon,
  iconRight,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  animated = false,
  style,
  className = '',
}) => {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (animated && !disabled) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [animated, disabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: 'py-3 px-5', text: 'text-sm', iconSize: 18 };
      case 'lg':
        return { padding: 'py-5 px-10', text: 'text-lg', iconSize: 24 };
      default:
        return { padding: 'py-4 px-8', text: 'text-base', iconSize: 22 };
    }
  };

  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || loading;

  // Render based on variant
  if (variant === 'primary') {
    return (
      <Animated.View style={[animated ? animatedStyle : undefined, style]}>
        <TouchableOpacity
          onPress={onPress}
          disabled={isDisabled}
          activeOpacity={0.9}
          className={`${fullWidth ? 'w-full' : ''} ${className}`}
        >
          <View
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              right: -8,
              bottom: -8,
              borderRadius: 24,
              backgroundColor: isDisabled ? 'transparent' : COLORS.fireRed,
              opacity: 0.25,
            }}
            className="blur-xl"
          />
          <LinearGradient
            colors={isDisabled ? ['#3f3f46', '#27272a'] : [COLORS.fireRed, COLORS.fireRedDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className={`${sizeStyles.padding} rounded-2xl flex-row items-center justify-center gap-3`}
            style={{
              shadowColor: isDisabled ? 'transparent' : COLORS.fireRed,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: isDisabled ? 0 : 10,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                {icon}
                <Text className={`text-white font-bold ${sizeStyles.text} tracking-wide`}>
                  {title}
                </Text>
                {iconRight}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={style}
        className={`${fullWidth ? 'w-full' : ''} ${className}`}
      >
        <View
          className={`${sizeStyles.padding} rounded-2xl flex-row items-center justify-center gap-3 bg-zinc-800/80 border border-zinc-700`}
        >
          {loading ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <>
              {icon}
              <Text className={`text-white font-bold ${sizeStyles.text}`}>{title}</Text>
              {iconRight}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={style}
        className={`${fullWidth ? 'w-full' : ''} ${className}`}
      >
        <View
          className={`${sizeStyles.padding} rounded-2xl flex-row items-center justify-center gap-3 border-2 border-red-600/50 bg-red-600/5`}
        >
          {loading ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <>
              {icon}
              <Text className={`text-red-500 font-bold ${sizeStyles.text}`}>{title}</Text>
              {iconRight}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Ghost variant
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={style}
      className={`${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <View className={`${sizeStyles.padding} flex-row items-center justify-center gap-2`}>
        {loading ? (
          <ActivityIndicator color="#71717a" />
        ) : (
          <>
            {icon}
            <Text className={`text-zinc-400 font-medium ${sizeStyles.text}`}>{title}</Text>
            {iconRight}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PremiumButton;
