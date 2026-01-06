import React from 'react';
import { View, Modal, TouchableOpacity, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ZoomIn, SlideInUp } from 'react-native-reanimated';
import { X } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PREMIUM = {
  fireRed: '#DC2626',
  fireOrange: '#F97316',
  fireYellow: '#FBBF24',
};

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  animation?: 'zoom' | 'slide';
}

export function PremiumModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  animation = 'zoom',
}: PremiumModalProps) {
  const getWidth = () => {
    switch (size) {
      case 'sm':
        return Math.min(320, SCREEN_WIDTH - 48);
      case 'md':
        return Math.min(400, SCREEN_WIDTH - 32);
      case 'lg':
        return Math.min(500, SCREEN_WIDTH - 24);
      case 'full':
        return SCREEN_WIDTH - 16;
    }
  };

  const entering =
    animation === 'zoom' ? ZoomIn.duration(300).springify() : SlideInUp.duration(400);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      >
        {/* Backdrop press */}
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="absolute inset-0" />

        {/* Modal Content */}
        <Animated.View entering={entering} style={{ width: getWidth() }} className="relative">
          {/* Glow effect */}
          <View
            style={{
              position: 'absolute',
              top: -20,
              left: -20,
              right: -20,
              bottom: -20,
              borderRadius: 48,
              backgroundColor: PREMIUM.fireRed,
              opacity: 0.08,
            }}
            className="blur-3xl"
          />

          {/* Card */}
          <View className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 rounded-[28px] overflow-hidden">
            {/* Gradient top border */}
            <LinearGradient
              colors={[PREMIUM.fireRed, PREMIUM.fireOrange, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 2,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
            />

            {/* Close button */}
            {showCloseButton && (
              <TouchableOpacity
                onPress={onClose}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-zinc-800/80 items-center justify-center"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <X size={18} color="#A1A1AA" />
              </TouchableOpacity>
            )}

            {/* Header */}
            {(title || subtitle) && (
              <View className="px-6 pt-6 pb-2">
                {title && (
                  <Text
                    className="text-white text-xl font-bold"
                    style={{
                      textShadowColor: 'rgba(220, 38, 38, 0.2)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 8,
                    }}
                  >
                    {title}
                  </Text>
                )}
                {subtitle && <Text className="text-zinc-400 text-sm mt-1">{subtitle}</Text>}
              </View>
            )}

            {/* Content */}
            <View className="px-6 pb-6 pt-4">{children}</View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
