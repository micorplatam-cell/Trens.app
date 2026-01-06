// ============================================================================
// PREMIUM SECTION HEADER
// Animated section header with decorative elements
// ============================================================================

import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface SectionHeaderProps {
  tag?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'center';
  delay?: number;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  tag,
  title,
  subtitle,
  icon,
  align = 'center',
  delay = 0,
}) => {
  const alignClass = align === 'center' ? 'items-center' : 'items-start';

  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(600)}
      className={`${alignClass} mb-8`}
    >
      {/* Tag with gradient */}
      {tag && (
        <View className="flex-row items-center gap-2 mb-3">
          {icon}
          <LinearGradient
            colors={['rgba(220, 38, 38, 0.2)', 'rgba(249, 115, 22, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="px-4 py-1.5 rounded-full"
          >
            <Text className="text-red-500 font-mono text-xs tracking-[0.25em] uppercase">
              {tag}
            </Text>
          </LinearGradient>
          {icon}
        </View>
      )}

      {/* Title */}
      <Text 
        className={`text-white text-3xl md:text-4xl font-bold ${align === 'center' ? 'text-center' : 'text-left'} leading-tight`}
        style={{
          textShadowColor: 'rgba(220, 38, 38, 0.3)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 10,
        }}
      >
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text 
          className={`text-zinc-400 text-base mt-3 ${align === 'center' ? 'text-center' : 'text-left'} max-w-xl leading-relaxed`}
        >
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );
};

export default SectionHeader;
