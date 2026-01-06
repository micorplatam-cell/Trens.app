// ============================================================================
// PREMIUM INPUT COMPONENT
// Styled input with glow focus effect
// ============================================================================

import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface PremiumInputProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  isPassword?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const PremiumInput: React.FC<PremiumInputProps> = ({
  label,
  icon,
  error,
  isPassword = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    borderOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    glowOpacity.value = withTiming(0.15, { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderOpacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
    glowOpacity.value = withTiming(0, { duration: 200 });
  };

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? 'rgba(239, 68, 68, 0.5)'
      : `rgba(220, 38, 38, ${borderOpacity.value * 0.5})`,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <View className="mb-5">
      {label && (
        <Text className="text-zinc-400 text-xs mb-2.5 tracking-[0.2em] font-medium uppercase">
          {label}
        </Text>
      )}

      <AnimatedView
        style={[
          borderStyle,
          glowStyle,
          {
            shadowColor: error ? '#EF4444' : '#DC2626',
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 15,
            elevation: isFocused ? 5 : 0,
          },
        ]}
        className="flex-row items-center bg-zinc-900/50 backdrop-blur-xl rounded-2xl px-4 border border-zinc-800/50"
      >
        {icon && <View className="mr-2">{icon}</View>}

        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            handleFocus();
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            handleBlur();
            props.onBlur?.(e);
          }}
          placeholderTextColor="#52525b"
          className="flex-1 text-white py-4 text-base"
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
            {showPassword ? (
              <EyeOff size={20} color="#71717a" />
            ) : (
              <Eye size={20} color="#71717a" />
            )}
          </TouchableOpacity>
        )}
      </AnimatedView>

      {error && <Text className="text-red-400 text-xs mt-2 ml-1">{error}</Text>}
    </View>
  );
};

export default PremiumInput;
