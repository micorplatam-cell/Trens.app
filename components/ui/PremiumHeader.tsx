import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Colors are defined inline for component use

interface PremiumHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showGlow?: boolean;
  variant?: 'default' | 'transparent' | 'gradient';
}

export function PremiumHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  showGlow = true,
  variant = 'default',
}: PremiumHeaderProps) {
  const insets = useSafeAreaInsets();

  const HeaderContent = () => (
    <View
      className="flex-row items-center justify-between px-4 py-3"
      style={{
        paddingTop: Math.max(insets.top, 12) + 8,
      }}
    >
      {/* Left - Back button or spacer */}
      <View className="w-12">
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            className="w-10 h-10 rounded-full bg-zinc-800/80 items-center justify-center"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <ChevronLeft size={22} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Center - Title */}
      <Animated.View entering={FadeInDown.duration(400)} className="flex-1 items-center">
        <Text
          className="text-white text-lg font-bold tracking-wider"
          style={
            showGlow
              ? {
                  textShadowColor: 'rgba(220, 38, 38, 0.4)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 10,
                }
              : undefined
          }
        >
          {title}
        </Text>
        {subtitle && <Text className="text-zinc-500 text-xs mt-0.5">{subtitle}</Text>}
      </Animated.View>

      {/* Right - Custom action or spacer */}
      <View className="w-12 items-end">{rightAction}</View>
    </View>
  );

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={['rgba(220, 38, 38, 0.1)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="border-b border-zinc-800/30"
      >
        <HeaderContent />
      </LinearGradient>
    );
  }

  if (variant === 'transparent') {
    return (
      <View className="absolute top-0 left-0 right-0 z-50">
        <HeaderContent />
      </View>
    );
  }

  return (
    <View className="bg-black border-b border-zinc-800/50">
      <HeaderContent />
    </View>
  );
}
