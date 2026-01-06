// ============================================================================
// GLOW ORB COMPONENT
// Animated ambient glow effect for backgrounds
// ============================================================================

import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface GlowOrbProps {
  color?: string;
  size?: number;
  top?: string | number;
  left?: string | number;
  delay?: number;
  intensity?: 'low' | 'medium' | 'high';
}

export const GlowOrb: React.FC<GlowOrbProps> = ({
  color = '#DC2626',
  size = 300,
  top = '20%',
  left = '50%',
  delay = 0,
  intensity = 'medium',
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(getInitialOpacity(intensity));

  function getInitialOpacity(level: string): number {
    switch (level) {
      case 'low':
        return 0.1;
      case 'high':
        return 0.4;
      default:
        return 0.2;
    }
  }

  function getMaxOpacity(level: string): number {
    switch (level) {
      case 'low':
        return 0.2;
      case 'high':
        return 0.6;
      default:
        return 0.4;
    }
  }

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(getMaxOpacity(intensity), { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(getInitialOpacity(intensity), { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [delay, intensity]);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={{
        position: 'absolute',
        top: top as any,
        left: left as any,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      className="blur-3xl pointer-events-none"
    >
      <Animated.View
        style={[{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }, orbStyle]}
      />
    </View>
  );
};

export default GlowOrb;
