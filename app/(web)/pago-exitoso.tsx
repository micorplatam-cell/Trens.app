// ============================================================================
// PAGO EXITOSO - Post-payment success page
// Instrucciones para instalar la PWA
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle,
  Download,
  Smartphone,
  Share,
  Menu,
  Monitor,
  ArrowDown,
  Dumbbell,
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
  canShowInstallPrompt,
  getDeviceOS,
  getInstallInstructions,
  triggerInstallPrompt,
  getDeferredPrompt,
} from '../../lib/pwaDetection';
import * as Haptics from 'expo-haptics';

// ============================================================================
// INSTRUCTION STEP COMPONENT
// ============================================================================
const InstructionStep = ({
  number,
  text,
  icon: Icon,
  delay = 0,
}: {
  number: number;
  text: string;
  icon?: any;
  delay?: number;
}) => (
  <Animated.View
    entering={FadeInUp.delay(delay).duration(500)}
    className="flex-row items-start gap-4 mb-4"
  >
    <View className="w-8 h-8 rounded-full bg-red-600 items-center justify-center">
      <Text className="text-white font-bold">{number}</Text>
    </View>
    <View className="flex-1 pt-1">
      <Text className="text-white text-base leading-relaxed">{text}</Text>
    </View>
    {Icon && <Icon size={24} color="#DC2626" />}
  </Animated.View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PagoExitosoScreen() {
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Animation for the install button
  const pulseAnim = useSharedValue(1);
  const bounceAnim = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setDeviceOS(getDeviceOS());
      setCanInstall(canShowInstallPrompt());
      setIsInstalled(isPWA());

      // Listen for beforeinstallprompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setCanInstall(true);
        (window as any).deferredInstallPrompt = e;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // Listen for app installed
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setCanInstall(false);
      };

      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  useEffect(() => {
    // Pulse animation for install button
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Bounce animation for arrow
    bounceAnim.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceAnim.value }],
  }));

  // Handle install button click
  const handleInstall = async () => {
    setInstalling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const installed = await triggerInstallPrompt();
      if (installed) {
        setIsInstalled(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Install error:', err);
    } finally {
      setInstalling(false);
    }
  };

  const instructions = getInstallInstructions();

  // Already installed - redirect to app
  if (isInstalled) {
    if (Platform.OS === 'web') {
      window.location.href = '/';
    }
    return null;
  }

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={['#16a34a', '#000000']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 400,
          opacity: 0.4,
        }}
      />

      <View className="flex-1 px-6 py-20 items-center justify-center">
        {/* Success Icon */}
        <Animated.View entering={FadeInDown.duration(600)} className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-green-600 items-center justify-center mb-6">
            <CheckCircle size={56} color="white" strokeWidth={2} />
          </View>
          <Text className="text-white text-3xl font-bold text-center">¡Pago exitoso!</Text>
          <Text className="text-zinc-400 text-lg text-center mt-2">
            Ya eres parte de TRENS PRO 🔥
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

          <Text className="text-white text-2xl font-bold text-center mb-2">Instala la app</Text>
          <Text className="text-zinc-400 text-center mb-8">
            Para acceder a tu cuenta, necesitas instalar TRENS en tu dispositivo
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
                  {installing ? 'Instalando...' : 'INSTALAR TRENS'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            /* Manual instructions */
            <View className="mb-8">
              <View className="bg-zinc-800/50 rounded-2xl p-6 mb-6">
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
                  <InstructionStep key={index} number={index + 1} text={step} delay={index * 100} />
                ))}
              </View>

              {/* iOS specific visual */}
              {deviceOS === 'ios' && (
                <View className="bg-zinc-800 rounded-xl p-4 flex-row items-center gap-4">
                  <View className="w-10 h-10 rounded-lg bg-blue-500 items-center justify-center">
                    <Share size={20} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">Busca este ícono</Text>
                    <Text className="text-zinc-400 text-sm">En la barra de Safari</Text>
                  </View>
                </View>
              )}

              {/* Android specific visual */}
              {deviceOS === 'android' && (
                <View className="bg-zinc-800 rounded-xl p-4 flex-row items-center gap-4">
                  <View className="w-10 h-10 rounded-lg bg-zinc-700 items-center justify-center">
                    <Menu size={20} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">Busca el menú (⋮)</Text>
                    <Text className="text-zinc-400 text-sm">Arriba a la derecha</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Note */}
          <View className="bg-red-600/10 border border-red-600/30 rounded-xl p-4">
            <Text className="text-red-400 text-sm text-center">
              ⚠️ Solo podrás acceder desde la app instalada.{'\n'}
              No es posible usar TRENS desde el navegador.
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
