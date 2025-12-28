import { Tabs, usePathname } from 'expo-router';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Play,
  User,
  Crosshair,
  Dumbbell,
  Utensils,
  Warehouse,
  Flag,
  Sailboat,
  Waves,
  Music,
  LucideIcon,
} from 'lucide-react-native';
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
import { useAuth, useProRecording } from '../_layout';
import { useSport } from '../../context/SportContext';
import FloatingLoginButton from '../../components/auth/FloatingLoginButton';
import { HankOverlay } from '../../components/hank/HankOverlay';
import { SpotifyOverlay } from '../../components/spotify/SpotifyOverlay';

// ============================================================================
// ED HARDY COLORS
// ============================================================================
const ED_HARDY = {
  black: '#000000',
  fireRed: '#DC2626',
  fireOrange: '#F97316',
  fireGold: '#FBBF24',
  dragonGreen: '#22C55E',
  dragonBlue: '#0EA5E9',
  neonRed: '#FF3B3B',
  zinc800: '#27272a',
  zinc600: '#52525b',
};

// ============================================================================
// MAPA DE ICONOS POR NOMBRE
// ============================================================================
const ICON_MAP: Record<string, LucideIcon> = {
  Play,
  User,
  Crosshair,
  Dumbbell,
  Utensils,
  Warehouse,
  Flag,
  Sailboat,
  Waves,
};

const getIconComponent = (iconName: string): LucideIcon => {
  return ICON_MAP[iconName] || Dumbbell;
};

// Hook para detectar módulo anterior y si PRO está activo
function useProNavigation() {
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
  accentColor = '#DC2626',
}: {
  Icon: any;
  color: string;
  size: number;
  isSource: boolean;
  fill?: string;
  accentColor?: string;
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
    backgroundColor: accentColor,
    opacity: glowOpacity.value * 0.5,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={glowStyle} />
      <Icon
        color={isSource ? accentColor : color}
        size={size}
        fill={isSource ? accentColor : fill}
      />
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

// Componente para el icono PRO con indicadores dinámicos
function ProTabIcon({ focused }: { focused: boolean }) {
  const { isRecording, recordingTime, hasSpotify, exerciseName } = useProRecording();

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Botón principal */}
      <Animated.View style={animatedStyle}>
        <View
          style={{
            padding: 16,
            borderRadius: 999,
            backgroundColor: isRecording
              ? ED_HARDY.fireRed
              : focused
                ? ED_HARDY.fireRed
                : ED_HARDY.zinc800,
            marginBottom: 20,
            shadowColor: isRecording
              ? ED_HARDY.neonRed
              : focused
                ? ED_HARDY.neonRed
                : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isRecording ? 1 : focused ? 0.8 : 0,
            shadowRadius: isRecording ? 20 : 15,
            elevation: isRecording ? 20 : focused ? 15 : 0,
            borderWidth: isRecording ? 3 : focused ? 2 : 0,
            borderColor: isRecording ? '#fff' : ED_HARDY.fireOrange,
          }}
        >
          {isRecording ? (
            // Icono de STOP cuando está grabando
            <View
              style={{
                width: 28,
                height: 28,
                backgroundColor: '#fff',
                borderRadius: 4,
              }}
            />
          ) : (
            <Crosshair color="#FFFFFF" size={28} strokeWidth={2.5} />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  const { isProActive, previousModule } = useProNavigation();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isRecording, startRecording, stopRecording } = useProRecording();

  // Obtener configuración de tabs según deporte activo
  const { activeSport, getTabConfig } = useSport();
  const tabConfig = getTabConfig();

  // Iconos dinámicos para tabs 4 y 5
  const Tab4Icon = getIconComponent(tabConfig.tab4.icon);
  const Tab5Icon = getIconComponent(tabConfig.tab5.icon);
  const sportColor = tabConfig.color;

  // Determinar si mostrar el botón flotante de login
  // Solo mostrar si: NO hay usuario autenticado Y NO estamos en Feed o PRO
  const isFeedOrPro = pathname?.includes('feed') || pathname?.includes('pro');
  const showLoginButton = !loading && !user && !isFeedOrPro;
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

  // Altura dinámica del tab bar basada en safe area
  const tabBarHeight = 56 + insets.bottom;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: ED_HARDY.black,
            borderTopColor: ED_HARDY.zinc800,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom + 4,
            paddingTop: 8,
            overflow: 'visible',
            // ED HARDY: Subtle fire glow from bottom
            shadowColor: ED_HARDY.fireOrange,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 10,
          },
          tabBarActiveTintColor: sportColor,
          tabBarInactiveTintColor: ED_HARDY.zinc600,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={['#0a0505', '#000000', '#000000']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ flex: 1 }}
            >
              <ConnectionLine isVisible={isProActive} sourceIndex={getSourceIndex()} />
            </LinearGradient>
          ),
        }}
      >
        {/* TRENS - Pantalla principal (TikTok-style feed) */}
        <Tabs.Screen
          name="feed/index"
          options={{
            title: 'TRENS',
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
              <SyncedGlowIcon
                Icon={User}
                color={color}
                size={26}
                isSource={isSourceModule('adn')}
              />
            ),
          }}
        />

        {/* PRO - Botón central de cámara con indicadores dinámicos */}
        <Tabs.Screen
          name="pro/index"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => <ProTabIcon focused={focused} />,
          }}
          listeners={{
            tabPress: (e) => {
              // Si ya estamos en PRO, controlar grabación
              if (isProActive) {
                e.preventDefault(); // No navegar de nuevo
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }
              // Si no estamos en PRO, navegar normalmente (comportamiento por defecto)
            },
          }}
        />

        {/* GYM/GARAGE/QUIVER - Dinámico según deporte */}
        <Tabs.Screen
          name="gym/index"
          options={{
            title: tabConfig.tab4.name,
            tabBarIcon: ({ color }) => (
              <SyncedGlowIcon
                Icon={Tab4Icon}
                color={color}
                size={26}
                isSource={isSourceModule('gym')}
                accentColor={sportColor}
              />
            ),
          }}
        />

        {/* PLAN/TRACK/WAVES - Dinámico según deporte */}
        <Tabs.Screen
          name="plan/index"
          options={{
            title: tabConfig.tab5.name,
            tabBarIcon: ({ color }) => (
              <SyncedGlowIcon
                Icon={Tab5Icon}
                color={color}
                size={26}
                isSource={isSourceModule('plan')}
                accentColor={sportColor}
              />
            ),
          }}
        />

        {/* Rutas ocultas - Se renderizan condicionalmente desde gym/plan */}
        <Tabs.Screen
          name="garaje/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="race/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="tabla/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="spot/index"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Overlays globales - aquí tienen contexto de navegación */}
      <HankOverlay />
      <SpotifyOverlay />

      {/* Botón flotante de login (solo para usuarios no autenticados) */}
      <FloatingLoginButton visible={showLoginButton} />
    </>
  );
}
