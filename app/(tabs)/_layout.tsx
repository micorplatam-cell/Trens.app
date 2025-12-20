import { Tabs, usePathname } from 'expo-router';
import { View, Text } from 'react-native';
import { Play, User, Crosshair, Dumbbell, Utensils } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect, useRef } from 'react';

// Hook para detectar módulo anterior y si PRO está activo
function useProContext() {
  const pathname = usePathname();
  const previousModuleRef = useRef<string | null>(null);
  const isProActive = pathname === '/pro' || pathname === '/pro/index';

  useEffect(() => {
    if (!isProActive && pathname) {
      previousModuleRef.current = pathname;
    }
  }, [pathname, isProActive]);

  return {
    isProActive,
    previousModule: previousModuleRef.current,
  };
}

// Componente de icono con glow pulsante sincronizado
function SyncedGlowIcon({
  Icon,
  color,
  size,
  isSource,
  fill,
}: {
  Icon: any;
  color: string;
  size: number;
  isSource: boolean;
  fill?: string;
}) {
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (isSource) {
      // Pulso sincronizado
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
      glowScale.value = withTiming(1, { duration: 300 });
    }
  }, [isSource]);

  const glowStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    opacity: glowOpacity.value * 0.5,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={glowStyle} />
      <Icon color={isSource ? '#DC2626' : color} size={size} fill={isSource ? '#DC2626' : fill} />
    </View>
  );
}

// Línea de conexión animada en el borde superior
function ConnectionLine({
  isVisible,
  sourceIndex,
}: {
  isVisible: boolean;
  sourceIndex: number; // 0=FEED, 1=ADN, 3=GYM, 4=PLAN (PRO es 2)
}) {
  const lineProgress = useSharedValue(0);
  const lineOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible && sourceIndex !== -1) {
      lineOpacity.value = withTiming(1, { duration: 200 });
      lineProgress.value = 0;
      lineProgress.value = withDelay(
        100,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
    } else {
      lineOpacity.value = withTiming(0, { duration: 200 });
      lineProgress.value = withTiming(0, { duration: 200 });
    }
  }, [isVisible, sourceIndex]);

  const lineStyle = useAnimatedStyle(() => {
    // Calcular posiciones (5 tabs, PRO está en posición 2)
    const tabWidth = 100 / 5;
    const proCenter = 2 * tabWidth + tabWidth / 2; // Centro de PRO en %
    const sourceCenter = sourceIndex * tabWidth + tabWidth / 2; // Centro del módulo origen

    const startX = Math.min(proCenter, sourceCenter);
    const endX = Math.max(proCenter, sourceCenter);
    const totalWidth = endX - startX;

    // La línea crece desde el origen hacia PRO
    const isLeftOfPro = sourceIndex < 2;
    const currentWidth = totalWidth * lineProgress.value;

    return {
      position: 'absolute',
      top: 0,
      left: isLeftOfPro ? `${startX + (totalWidth - currentWidth)}%` : `${startX}%`,
      width: `${currentWidth}%`,
      height: 2,
      backgroundColor: '#DC2626',
      opacity: lineOpacity.value,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    };
  });

  // Punto en el origen
  const dotStyle = useAnimatedStyle(() => {
    const tabWidth = 100 / 5;
    const sourceCenter = sourceIndex * tabWidth + tabWidth / 2;

    return {
      position: 'absolute',
      top: -3,
      left: `${sourceCenter}%`,
      marginLeft: -4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#DC2626',
      opacity: lineOpacity.value,
      transform: [{ scale: lineProgress.value }],
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 6,
    };
  });

  // Punto en PRO
  const proDotStyle = useAnimatedStyle(() => {
    const tabWidth = 100 / 5;
    const proCenter = 2 * tabWidth + tabWidth / 2;

    return {
      position: 'absolute',
      top: -3,
      left: `${proCenter}%`,
      marginLeft: -4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#DC2626',
      opacity: lineOpacity.value,
      transform: [{ scale: lineProgress.value }],
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 6,
    };
  });

  if (sourceIndex === -1) return null;

  return (
    <>
      <Animated.View style={lineStyle} />
      <Animated.View style={dotStyle} />
      <Animated.View style={proDotStyle} />
    </>
  );
}

export default function TabsLayout() {
  const { isProActive, previousModule } = useProContext();

  // Determinar índice del módulo origen
  const getSourceIndex = (): number => {
    if (!previousModule) return -1;
    if (previousModule.includes('feed')) return 0;
    if (previousModule.includes('adn')) return 1;
    if (previousModule.includes('gym')) return 3;
    if (previousModule.includes('plan')) return 4;
    return -1;
  };

  const isSourceModule = (routeName: string) => {
    if (!isProActive || !previousModule) return false;
    return previousModule.includes(routeName);
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#27272a',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
          overflow: 'visible',
        },
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: '#000000' }}>
            <ConnectionLine isVisible={isProActive} sourceIndex={getSourceIndex()} />
          </View>
        ),
      }}
    >
      {/* FEED - Pantalla principal (TikTok-style) */}
      <Tabs.Screen
        name="feed/index"
        options={{
          title: 'FEED',
          tabBarIcon: ({ color }) => (
            <SyncedGlowIcon
              Icon={Play}
              color={color}
              size={26}
              fill={color}
              isSource={isSourceModule('feed')}
            />
          ),
        }}
      />

      {/* ADN - Perfil + Bóveda + Configuración */}
      <Tabs.Screen
        name="adn/index"
        options={{
          title: 'ADN',
          tabBarIcon: ({ color }) => (
            <SyncedGlowIcon Icon={User} color={color} size={26} isSource={isSourceModule('adn')} />
          ),
        }}
      />

      {/* PRO - Botón central de cámara (sin efecto pulsante) */}
      <Tabs.Screen
        name="pro/index"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                padding: 16,
                borderRadius: 999,
                backgroundColor: focused ? '#DC2626' : '#27272a',
                marginBottom: 20,
                shadowColor: focused ? '#DC2626' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: focused ? 0.5 : 0,
                shadowRadius: 8,
                elevation: focused ? 8 : 0,
              }}
            >
              <Crosshair color="#FFFFFF" size={28} />
            </View>
          ),
        }}
      />

      {/* GYM - Ejercicios */}
      <Tabs.Screen
        name="gym/index"
        options={{
          title: 'GYM',
          tabBarIcon: ({ color }) => (
            <SyncedGlowIcon
              Icon={Dumbbell}
              color={color}
              size={26}
              isSource={isSourceModule('gym')}
            />
          ),
        }}
      />

      {/* PLAN - Nutrición */}
      <Tabs.Screen
        name="plan/index"
        options={{
          title: 'PLAN',
          tabBarIcon: ({ color }) => (
            <SyncedGlowIcon
              Icon={Utensils}
              color={color}
              size={26}
              isSource={isSourceModule('plan')}
            />
          ),
        }}
      />

      {/* NUCLEO - Oculto (integrado en ADN) */}
      <Tabs.Screen
        name="nucleo/index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
