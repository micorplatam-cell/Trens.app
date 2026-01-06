// ============================================================================
// INSTALAR PAGE - Redirect page for users trying to access from web
// ============================================================================

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Smartphone,
  Download,
  AlertTriangle,
  Dumbbell,
  Share,
  Menu,
  Monitor,
  ArrowDown,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import {
  isPWA,
  getDeviceOS,
  getInstallInstructions,
  triggerInstallPrompt,
  getDeferredPrompt,
  canShowInstallPrompt,
} from '../../lib/pwaDetection';
import * as Haptics from 'expo-haptics';

export default function InstalarScreen() {
  const router = useRouter();
  const [deviceOS, setDeviceOS] = React.useState<'ios' | 'android' | 'desktop' | 'unknown'>(
    'unknown'
  );
  const [canInstall, setCanInstall] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  const bounceAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // If already in PWA, redirect to home
      if (isPWA()) {
        router.replace('/');
        return;
      }

      setDeviceOS(getDeviceOS());
      setCanInstall(canShowInstallPrompt() && !!getDeferredPrompt());

      // Listen for install prompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setCanInstall(true);
        (window as any).deferredInstallPrompt = e;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  useEffect(() => {
    bounceAnim.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceAnim.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const handleInstall = async () => {
    setInstalling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const installed = await triggerInstallPrompt();
      if (installed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Install error:', err);
    } finally {
      setInstalling(false);
    }
  };

  const instructions = getInstallInstructions();

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={['#DC2626', '#000000']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 400,
          opacity: 0.3,
        }}
      />

      <View className="flex-1 px-6 py-20 items-center justify-center">
        {/* Warning Icon */}
        <Animated.View entering={FadeInDown.duration(600)} className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-orange-600 items-center justify-center mb-6">
            <AlertTriangle size={56} color="white" strokeWidth={2} />
          </View>
          <Text className="text-white text-3xl font-bold text-center">Acceso restringido</Text>
          <Text className="text-zinc-400 text-lg text-center mt-2 max-w-sm">
            TRENS solo funciona como app instalada. No es posible acceder desde el navegador.
          </Text>
        </Animated.View>

        {/* Install Card */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(600)}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md"
        >
          <View className="items-center mb-6">
            <Animated.View style={bounceStyle}>
              <ArrowDown size={32} color="#DC2626" />
            </Animated.View>
          </View>

          <Text className="text-white text-2xl font-bold text-center mb-2">Instala TRENS</Text>
          <Text className="text-zinc-400 text-center mb-8">
            Sigue estos pasos para instalar la app
          </Text>

          {/* Install Button (if supported) */}
          {canInstall && getDeferredPrompt() ? (
            <Animated.View style={pulseStyle} className="mb-8">
              <TouchableOpacity
                onPress={handleInstall}
                disabled={installing}
                activeOpacity={0.9}
                className="bg-red-600 py-5 rounded-2xl flex-row items-center justify-center gap-3"
                style={{
                  shadowColor: '#DC2626',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.5,
                  shadowRadius: 16,
                }}
              >
                <Download size={24} color="white" />
                <Text className="text-white text-xl font-bold">
                  {installing ? 'Instalando...' : 'INSTALAR AHORA'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            /* Manual instructions */
            <View className="mb-6">
              <View className="bg-zinc-800/50 rounded-2xl p-6">
                <View className="flex-row items-center gap-3 mb-4">
                  {deviceOS === 'ios' ? (
                    <Smartphone size={24} color="#DC2626" />
                  ) : deviceOS === 'android' ? (
                    <Smartphone size={24} color="#DC2626" />
                  ) : (
                    <Monitor size={24} color="#DC2626" />
                  )}
                  <Text className="text-white text-lg font-bold">{instructions.title}</Text>
                </View>

                {instructions.steps.map((step, index) => (
                  <View key={index} className="flex-row items-start gap-4 mb-4">
                    <View className="w-8 h-8 rounded-full bg-red-600 items-center justify-center">
                      <Text className="text-white font-bold">{index + 1}</Text>
                    </View>
                    <View className="flex-1 pt-1">
                      <Text className="text-white text-base leading-relaxed">{step}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Helper visuals */}
          {deviceOS === 'ios' && (
            <View className="bg-zinc-800 rounded-xl p-4 flex-row items-center gap-4 mb-4">
              <View className="w-10 h-10 rounded-lg bg-blue-500 items-center justify-center">
                <Share size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Busca este ícono</Text>
                <Text className="text-zinc-400 text-sm">En la barra de Safari</Text>
              </View>
            </View>
          )}

          {deviceOS === 'android' && (
            <View className="bg-zinc-800 rounded-xl p-4 flex-row items-center gap-4 mb-4">
              <View className="w-10 h-10 rounded-lg bg-zinc-700 items-center justify-center">
                <Menu size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Busca el menú (⋮)</Text>
                <Text className="text-zinc-400 text-sm">Arriba a la derecha</Text>
              </View>
            </View>
          )}

          {/* Note */}
          <View className="bg-red-600/10 border border-red-600/30 rounded-xl p-4">
            <Text className="text-red-400 text-sm text-center">
              ¿No tienes cuenta?{'\n'}
              <Text
                className="text-red-500 font-bold underline"
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = '/(web)/landing';
                  }
                }}
              >
                Suscríbete aquí
              </Text>
            </Text>
          </View>
        </Animated.View>

        {/* Logo */}
        <Animated.View entering={FadeInUp.delay(600).duration(600)} className="mt-12 items-center">
          <View className="flex-row items-center gap-2">
            <Dumbbell size={20} color="#DC2626" />
            <Text className="text-white font-bold">TRENS</Text>
          </View>
          <Text className="text-zinc-600 text-xs mt-2">High Performance Fitness</Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
