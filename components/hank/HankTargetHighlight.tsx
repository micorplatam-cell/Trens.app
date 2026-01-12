// ============================================================================
// HANK TARGET HIGHLIGHT - Overlay fullscreen cuando Hank trabaja
// 🔥 SAVAGE MODE ULTIMATE - Efectos visuales épicos de próxima generación
// ============================================================================

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GitlabIcon as Bot } from 'lucide-react-native';
import { useHank } from '../../context/HankContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Altura de la barra de tabs (navegación inferior)
const TAB_BAR_HEIGHT = 85;

// ============================================================================
// 🌟 ENERGY PARTICLE - Partículas de energía flotantes
// ============================================================================
interface ParticleConfig {
  id: number;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  delay: number;
  angle: number;
  distance: number;
  color: string;
}

const EnergyParticle: React.FC<{ config: ParticleConfig; isActive: boolean }> = ({
  config,
  isActive,
}) => {
  const progress = useSharedValue(0);
  const flicker = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      const timeout = setTimeout(() => {
        progress.value = withRepeat(
          withSequence(
            withTiming(1, { duration: config.duration, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 100 })
          ),
          -1,
          false
        );
        flicker.value = withRepeat(
          withSequence(
            withTiming(0.3, { duration: 100 }),
            withTiming(1, { duration: 100 }),
            withTiming(0.7, { duration: 80 }),
            withTiming(1, { duration: 120 })
          ),
          -1,
          true
        );
      }, config.delay);
      return () => {
        clearTimeout(timeout);
        cancelAnimation(progress);
        cancelAnimation(flicker);
      };
    }
  }, [isActive, config.delay, config.duration, progress, flicker]);

  const particleStyle = useAnimatedStyle(() => {
    const radians = (config.angle * Math.PI) / 180;
    const moveX = Math.cos(radians) * config.distance * progress.value;
    const moveY = Math.sin(radians) * config.distance * progress.value;
    const scale = interpolate(progress.value, [0, 0.3, 0.7, 1], [0, 1.2, 1, 0]);
    const opacity = interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 0.8, 0]) * flicker.value;

    return {
      opacity,
      transform: [
        { translateX: config.startX + moveX },
        { translateY: config.startY + moveY },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          shadowColor: config.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: config.size * 2,
        },
        particleStyle,
      ]}
    />
  );
};

// ============================================================================
// 🔴 PULSE RING - Ondas de energía expandibles
// ============================================================================
const PulseRing: React.FC<{
  delay: number;
  duration: number;
  color: string;
  maxSize: number;
  isActive: boolean;
}> = ({ delay, duration, color, maxSize, isActive }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      const timeout = setTimeout(() => {
        scale.value = withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
          ),
          -1,
          false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 100 }),
            withTiming(0, { duration: duration - 100, easing: Easing.in(Easing.quad) })
          ),
          -1,
          false
        );
      }, delay);
      return () => {
        clearTimeout(timeout);
        cancelAnimation(scale);
        cancelAnimation(opacity);
      };
    }
  }, [isActive, delay, duration, scale, opacity]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: maxSize,
          height: maxSize,
          borderRadius: maxSize / 2,
          borderWidth: 2,
          borderColor: color,
          left: SCREEN_WIDTH / 2 - maxSize / 2,
          top: (SCREEN_HEIGHT - TAB_BAR_HEIGHT) / 2 - maxSize / 2,
        },
        ringStyle,
      ]}
    />
  );
};

// ============================================================================
// ⚡ ENERGY BEAM - Rayos de energía desde el centro
// ============================================================================
const EnergyBeam: React.FC<{
  angle: number;
  delay: number;
  length: number;
  isActive: boolean;
}> = ({ angle, delay, length, isActive }) => {
  const beamOpacity = useSharedValue(0);
  const beamScale = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      const timeout = setTimeout(() => {
        beamOpacity.value = withRepeat(
          withSequence(
            withTiming(0.9, { duration: 150 }),
            withTiming(0.2, { duration: 300 }),
            withTiming(0.7, { duration: 200 }),
            withTiming(0.1, { duration: 350 })
          ),
          -1,
          true
        );
        beamScale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 200, easing: Easing.out(Easing.exp) }),
            withTiming(0.7, { duration: 400 }),
            withTiming(1, { duration: 300 })
          ),
          -1,
          true
        );
      }, delay);
      return () => {
        clearTimeout(timeout);
        cancelAnimation(beamOpacity);
        cancelAnimation(beamScale);
      };
    }
  }, [isActive, delay, beamOpacity, beamScale]);

  const beamStyle = useAnimatedStyle(() => ({
    opacity: beamOpacity.value,
    transform: [{ rotate: `${angle}deg` }, { scaleY: beamScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: SCREEN_WIDTH / 2 - 2,
          top: (SCREEN_HEIGHT - TAB_BAR_HEIGHT) / 2,
          width: 4,
          height: length,
          transformOrigin: 'top center',
          borderRadius: 2,
        },
        beamStyle,
      ]}
    >
      {/* Gradient effect with multiple layers */}
      <View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: '#DC2626',
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 2,
          height: '80%',
          left: 1,
          backgroundColor: '#F97316',
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 1,
          height: '60%',
          left: 1.5,
          backgroundColor: '#FBBF24',
          borderRadius: 0.5,
        }}
      />
    </Animated.View>
  );
};

// ============================================================================
// 🔲 GRID LINE - Líneas de grid futurista
// ============================================================================
const GridLine: React.FC<{
  orientation: 'horizontal' | 'vertical';
  position: number;
  delay: number;
  isActive: boolean;
}> = ({ orientation, position, delay, isActive }) => {
  const lineOpacity = useSharedValue(0);
  const glowIntensity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      const timeout = setTimeout(() => {
        lineOpacity.value = withRepeat(
          withSequence(withTiming(0.15, { duration: 800 }), withTiming(0.05, { duration: 1200 })),
          -1,
          true
        );
        glowIntensity.value = withRepeat(
          withSequence(withTiming(1, { duration: 600 }), withTiming(0.3, { duration: 900 })),
          -1,
          true
        );
      }, delay);
      return () => {
        clearTimeout(timeout);
        cancelAnimation(lineOpacity);
        cancelAnimation(glowIntensity);
      };
    }
  }, [isActive, delay, lineOpacity, glowIntensity]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
    shadowOpacity: glowIntensity.value * 0.5,
  }));

  const isHorizontal = orientation === 'horizontal';

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          backgroundColor: '#F97316',
          shadowColor: '#F97316',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 8,
          ...(isHorizontal
            ? { left: 0, right: 0, height: 1, top: position }
            : { top: 0, bottom: TAB_BAR_HEIGHT, width: 1, left: position }),
        },
        lineStyle,
      ]}
    />
  );
};

// ============================================================================
// 🌀 ROTATING HANK LOGO - Logo central giratorio
// ============================================================================
const RotatingHankLogo: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      rotation.value = withRepeat(
        withTiming(360, { duration: 4000, easing: Easing.linear }),
        -1,
        false
      );
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(rotation);
      cancelAnimation(glowPulse);
      scale.value = withTiming(0, { duration: 300 });
    }
  }, [isActive, rotation, scale, glowPulse]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(glowPulse.value, [0, 1], [0.5, 1]),
    shadowRadius: interpolate(glowPulse.value, [0, 1], [15, 40]),
  }));

  const innerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    borderColor: `rgba(249, 115, 22, ${interpolate(glowPulse.value, [0, 1], [0.5, 1])})`,
  }));

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotation.value * 0.5}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: SCREEN_WIDTH / 2 - 50,
          top: (SCREEN_HEIGHT - TAB_BAR_HEIGHT) / 2 - 50,
          width: 100,
          height: 100,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#F97316',
          shadowOffset: { width: 0, height: 0 },
        },
        containerStyle,
      ]}
    >
      {/* Outer rotating ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: '#DC2626',
            borderStyle: 'dashed',
          },
          outerRingStyle,
        ]}
      />

      {/* Inner rotating ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 3,
            borderTopColor: '#FBBF24',
            borderRightColor: 'transparent',
            borderBottomColor: '#F97316',
            borderLeftColor: 'transparent',
          },
          innerRingStyle,
        ]}
      />

      {/* Center logo container */}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: 'rgba(10, 5, 5, 0.95)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: '#F97316',
        }}
      >
        <Bot size={32} color="#F97316" strokeWidth={2} />
      </View>
    </Animated.View>
  );
};

// ============================================================================
// 📊 SCANNING BAR - Barra de escaneo horizontal
// ============================================================================
const ScanningBar: React.FC<{ isActive: boolean; contentHeight: number }> = ({
  isActive,
  contentHeight,
}) => {
  const scanY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      opacity.value = withTiming(1, { duration: 300 });
      scanY.value = withRepeat(
        withSequence(
          withTiming(contentHeight, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(scanY);
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, contentHeight, scanY, opacity]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: scanY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          height: 60,
          top: 0,
        },
        barStyle,
      ]}
    >
      {/* Main scan line */}
      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: 30,
          height: 2,
          backgroundColor: '#F97316',
          shadowColor: '#F97316',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 15,
        }}
      />
      {/* Gradient fade above */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 30,
          backgroundColor: 'transparent',
          borderBottomWidth: 0,
          opacity: 0.3,
        }}
      >
        {[...Array(10)].map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: i * 3,
              height: 3,
              backgroundColor: '#F97316',
              opacity: i * 0.03,
            }}
          />
        ))}
      </View>
      {/* Gradient fade below */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 28,
        }}
      >
        {[...Array(10)].map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: i * 3,
              height: 3,
              backgroundColor: '#F97316',
              opacity: i * 0.03,
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
};

// ============================================================================
// 🏷️ STATUS BADGE - Badge de estado con efecto glitch
// ============================================================================
const StatusBadge: React.FC<{ phase: string; isWorking: boolean }> = ({ phase, isWorking }) => {
  const glitchX = useSharedValue(0);
  const glitchOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isWorking) {
      // Glitch effect
      glitchX.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 50 }),
          withTiming(2, { duration: 50 }),
          withTiming(0, { duration: 50 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        false
      );
      glitchOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 30 }),
          withTiming(1, { duration: 30 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      );
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.02, { duration: 400 }), withTiming(0.98, { duration: 400 })),
        -1,
        true
      );
    }
  }, [isWorking, glitchX, glitchOpacity, pulseScale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glitchX.value }, { scale: pulseScale.value }],
    opacity: glitchOpacity.value,
  }));

  const isSuccess = phase === 'success';

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 20,
          left: 0,
          right: 0,
          alignItems: 'center',
        },
        badgeStyle,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(10, 5, 5, 0.95)',
          borderWidth: 2,
          borderColor: isSuccess ? '#22C55E' : '#F97316',
          borderRadius: 12,
          paddingHorizontal: 20,
          paddingVertical: 12,
          shadowColor: isSuccess ? '#22C55E' : '#F97316',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 20,
          elevation: 15,
        }}
      >
        {isWorking && (
          <View style={{ marginRight: 12 }}>
            <Bot size={24} color="#F97316" strokeWidth={2.5} />
          </View>
        )}
        <Text
          style={{
            color: isSuccess ? '#22C55E' : '#F97316',
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: 2,
            fontFamily: 'monospace',
          }}
        >
          {isSuccess ? '✅ COMPLETADO' : 'HANK PROCESANDO'}
        </Text>
        {isWorking && (
          <View style={{ marginLeft: 8, flexDirection: 'row' }}>
            {[0, 1, 2].map((i) => (
              <AnimatedDot key={i} delay={i * 200} />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// Animated loading dots
const AnimatedDot: React.FC<{ delay: number }> = ({ delay }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1,
        true
      )
    );
  }, [delay, opacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: '#F97316',
          marginLeft: 4,
        },
        dotStyle,
      ]}
    />
  );
};

// ============================================================================
// 🔲 CORNER BRACKETS - Esquinas tecnológicas animadas
// ============================================================================
const CornerBracket: React.FC<{
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  isActive: boolean;
  color: string;
}> = ({ position, isActive, color }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      opacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0.5, { duration: 600 })),
        -1,
        true
      );
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, scale, opacity]);

  const bracketStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const positionStyles = {
    topLeft: { top: 8, left: 8, borderTopWidth: 4, borderLeftWidth: 4 },
    topRight: { top: 8, right: 8, borderTopWidth: 4, borderRightWidth: 4 },
    bottomLeft: { bottom: TAB_BAR_HEIGHT + 8, left: 8, borderBottomWidth: 4, borderLeftWidth: 4 },
    bottomRight: {
      bottom: TAB_BAR_HEIGHT + 8,
      right: 8,
      borderBottomWidth: 4,
      borderRightWidth: 4,
    },
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 40,
          height: 40,
          borderColor: color,
          ...positionStyles[position],
        },
        bracketStyle,
      ]}
    />
  );
};

// ============================================================================
// 🎆 MAIN FULLSCREEN EFFECT COMPONENT
// ============================================================================
const FullscreenOverlay: React.FC<{
  phase: 'flying' | 'working' | 'success' | 'idle';
  bottomInset: number;
}> = ({ phase, bottomInset }) => {
  const containerOpacity = useSharedValue(0);
  const contentHeight = SCREEN_HEIGHT - TAB_BAR_HEIGHT - bottomInset;

  const isWorking = phase === 'working';
  const isSuccess = phase === 'success';
  const isActive = phase === 'flying' || phase === 'working' || phase === 'success';

  // Generate particles configuration
  const particles = useMemo<ParticleConfig[]>(() => {
    const colors = ['#FBBF24', '#F97316', '#DC2626', '#FFFFFF'];
    const result: ParticleConfig[] = [];
    const centerX = SCREEN_WIDTH / 2;
    const centerY = (SCREEN_HEIGHT - TAB_BAR_HEIGHT) / 2;

    for (let i = 0; i < 40; i++) {
      result.push({
        id: i,
        startX: centerX - 4 + (Math.random() - 0.5) * 40,
        startY: centerY - 4 + (Math.random() - 0.5) * 40,
        size: 4 + Math.random() * 6,
        duration: 1500 + Math.random() * 1500,
        delay: Math.random() * 2000,
        angle: Math.random() * 360,
        distance: 100 + Math.random() * 200,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return result;
  }, []);

  // Generate grid lines
  const horizontalLines = useMemo(() => {
    const lines = [];
    const spacing = contentHeight / 8;
    for (let i = 1; i < 8; i++) {
      lines.push({ position: i * spacing, delay: i * 100 });
    }
    return lines;
  }, [contentHeight]);

  const verticalLines = useMemo(() => {
    const lines = [];
    const spacing = SCREEN_WIDTH / 6;
    for (let i = 1; i < 6; i++) {
      lines.push({ position: i * spacing, delay: i * 150 });
    }
    return lines;
  }, []);

  useEffect(() => {
    if (phase === 'flying') {
      containerOpacity.value = withTiming(0.9, { duration: 400 });
    } else if (phase === 'working') {
      containerOpacity.value = withTiming(1, { duration: 200 });
    } else if (phase === 'success') {
      containerOpacity.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(0, { duration: 600 })
      );
    } else {
      containerOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [phase, containerOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const cornerColor = isSuccess ? '#22C55E' : '#FBBF24';

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: contentHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
        },
        containerStyle,
      ]}
      pointerEvents="none"
    >
      {/* Grid lines background */}
      {isWorking && (
        <>
          {horizontalLines.map((line, idx) => (
            <GridLine
              key={`h-${idx}`}
              orientation="horizontal"
              position={line.position}
              delay={line.delay}
              isActive={isWorking}
            />
          ))}
          {verticalLines.map((line, idx) => (
            <GridLine
              key={`v-${idx}`}
              orientation="vertical"
              position={line.position}
              delay={line.delay}
              isActive={isWorking}
            />
          ))}
        </>
      )}

      {/* Pulse rings from center */}
      {isWorking && (
        <>
          <PulseRing
            delay={0}
            duration={2000}
            color="#DC262650"
            maxSize={300}
            isActive={isWorking}
          />
          <PulseRing
            delay={500}
            duration={2000}
            color="#F9731640"
            maxSize={400}
            isActive={isWorking}
          />
          <PulseRing
            delay={1000}
            duration={2000}
            color="#FBBF2430"
            maxSize={500}
            isActive={isWorking}
          />
        </>
      )}

      {/* Energy beams from center */}
      {isWorking && (
        <>
          <EnergyBeam angle={0} delay={0} length={contentHeight / 2} isActive={isWorking} />
          <EnergyBeam angle={45} delay={100} length={contentHeight / 3} isActive={isWorking} />
          <EnergyBeam angle={90} delay={200} length={SCREEN_WIDTH / 2} isActive={isWorking} />
          <EnergyBeam angle={135} delay={300} length={contentHeight / 3} isActive={isWorking} />
          <EnergyBeam angle={180} delay={400} length={contentHeight / 2} isActive={isWorking} />
          <EnergyBeam angle={225} delay={500} length={contentHeight / 3} isActive={isWorking} />
          <EnergyBeam angle={270} delay={600} length={SCREEN_WIDTH / 2} isActive={isWorking} />
          <EnergyBeam angle={315} delay={700} length={contentHeight / 3} isActive={isWorking} />
        </>
      )}

      {/* Floating particles */}
      {isWorking &&
        particles.map((particle) => (
          <EnergyParticle key={particle.id} config={particle} isActive={isWorking} />
        ))}

      {/* Scanning bar */}
      <ScanningBar isActive={isWorking} contentHeight={contentHeight} />

      {/* Rotating center logo */}
      <RotatingHankLogo isActive={isWorking} />

      {/* Corner brackets */}
      <CornerBracket position="topLeft" isActive={isActive} color={cornerColor} />
      <CornerBracket position="topRight" isActive={isActive} color={cornerColor} />
      <CornerBracket position="bottomLeft" isActive={isActive} color={cornerColor} />
      <CornerBracket position="bottomRight" isActive={isActive} color={cornerColor} />

      {/* Status badge */}
      {(isWorking || isSuccess) && <StatusBadge phase={phase} isWorking={isWorking} />}
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT - Overlay global fullscreen
// ============================================================================
export const HankTargetHighlight: React.FC = () => {
  const { targetState } = useHank();
  const { animationPhase } = targetState;
  const insets = useSafeAreaInsets();

  // Solo mostrar cuando está en una fase activa
  if (animationPhase !== 'flying' && animationPhase !== 'working' && animationPhase !== 'success') {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <FullscreenOverlay
        phase={animationPhase as 'flying' | 'working' | 'success' | 'idle'}
        bottomInset={insets.bottom}
      />
    </View>
  );
};

export default HankTargetHighlight;
