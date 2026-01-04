import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, X, Zap, ChevronRight, Lock, Sparkles, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { Link } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FloatingLoginButtonProps {
  visible: boolean;
}

export default function FloatingLoginButton({ visible }: FloatingLoginButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para mantener focus en inputs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Callbacks estables para evitar re-renders
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  // Animaciones del botón flotante
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const shimmerPosition = useSharedValue(-1);
  const buttonY = useSharedValue(100);

  useEffect(() => {
    if (visible) {
      // Entrada del botón
      buttonY.value = withSpring(0, { damping: 15, stiffness: 100 });

      // Pulso sutil
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Glow pulsante
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Shimmer effect
      shimmerPosition.value = withRepeat(
        withDelay(2000, withTiming(2, { duration: 1000, easing: Easing.inOut(Easing.ease) })),
        -1,
        false
      );
    } else {
      buttonY.value = withSpring(100);
    }
  }, [visible]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonY.value }, { scale: pulseScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerPosition.value, [-1, 2], [-200, SCREEN_WIDTH]) }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
    setError(null);
    setEmail('');
    setPassword('');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa todos los campos');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError(null);
    console.warn('🔐 Intentando login con:', email.trim().toLowerCase());

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.warn('🔐 Respuesta login:', { data, error: authError });

      if (authError) {
        console.error('🔐 Error de auth:', authError.message);
        throw authError;
      }

      console.warn('🔐 Login exitoso:', data.user?.email);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      // El estado se actualizará automáticamente por el listener de auth
    } catch (err: any) {
      console.error('🔐 Error en catch:', err);
      // Traducir mensajes de error comunes
      let errorMessage = err.message || 'Error al iniciar sesión';
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Confirma tu email antes de iniciar sesión';
      } else if (errorMessage.includes('network')) {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      }
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* === BOTÓN FLOTANTE === */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 100,
            left: 20,
            right: 100, // Balance entre espacio para HANK/Spotify y contenido visible
            zIndex: 999,
          },
          buttonAnimatedStyle,
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.9}
          className="relative overflow-hidden rounded-full"
        >
          {/* Glow exterior */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: -10,
                left: -10,
                right: -10,
                bottom: -10,
                borderRadius: 999,
                backgroundColor: '#DC2626',
              },
              glowAnimatedStyle,
            ]}
          />

          {/* Contenedor principal con gradiente */}
          <LinearGradient
            colors={['#DC2626', '#991B1B', '#7F1D1D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-full p-[2px]"
          >
            <View className="bg-black/90 rounded-full px-5 py-3 flex-row items-center justify-between">
              {/* Icono y texto */}
              <View className="flex-row items-center gap-3">
                {/* Icono con glow */}
                <View className="relative">
                  <View className="absolute inset-0 bg-savage-red rounded-full blur-md opacity-50" />
                  <View className="bg-savage-red/20 p-2.5 rounded-full border border-savage-red/50">
                    <Crown color="#DC2626" size={20} fill="#DC2626" />
                  </View>
                </View>

                {/* Texto */}
                <View>
                  <Text className="text-white font-bold text-base tracking-wide">
                    ACCEDE A TU CUENTA
                  </Text>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <Sparkles color="#DC2626" size={10} />
                    <Text className="text-zinc-400 text-xs tracking-wider">DESBLOQUEA TODO</Text>
                  </View>
                </View>
              </View>

              {/* Flecha animada */}
              <View className="bg-savage-red rounded-full p-2">
                <ChevronRight color="#FFFFFF" size={20} />
              </View>
            </View>

            {/* Shimmer effect */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: 80,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: [{ skewX: '-20deg' }],
                },
                shimmerAnimatedStyle,
              ]}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* === MODAL DE LOGIN === */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
            className="flex-1 bg-black/80"
          >
            {/* Contenido del modal */}
            <Animated.View
              entering={SlideInDown.springify().damping(20)}
              exiting={SlideOutDown}
              className="absolute bottom-0 left-0 right-0"
            >
              <TouchableOpacity activeOpacity={1}>
                <LinearGradient
                  colors={['#18181B', '#09090B']}
                  className="rounded-t-3xl px-6 pt-6 pb-12"
                >
                  {/* Handle bar */}
                  <View className="w-12 h-1 bg-zinc-700 rounded-full self-center mb-6" />

                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-8">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-savage-red/20 p-3 rounded-xl border border-savage-red/30">
                        <Lock color="#DC2626" size={24} />
                      </View>
                      <View>
                        <Text className="text-white text-2xl font-bold tracking-tight">
                          INICIAR SESIÓN
                        </Text>
                        <Text className="text-zinc-500 text-sm">Accede a tu cuenta TRENS</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      className="bg-zinc-800 p-2 rounded-full"
                    >
                      <X color="#71717A" size={20} />
                    </TouchableOpacity>
                  </View>

                  {/* Error */}
                  {error && (
                    <View className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6">
                      <Text className="text-red-400 text-center">{error}</Text>
                    </View>
                  )}

                  {/* Form */}
                  <View className="gap-4 mb-6">
                    <View>
                      <Text className="text-zinc-500 text-xs mb-2 tracking-widest font-bold">
                        EMAIL
                      </Text>
                      <TextInput
                        ref={emailRef}
                        placeholder="tu@email.com"
                        placeholderTextColor="#52525B"
                        value={email}
                        onChangeText={handleEmailChange}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        textContentType="emailAddress"
                        inputMode="email"
                        blurOnSubmit={false}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        // @ts-ignore - Web specific
                        nativeID="modal-email"
                        className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 text-base"
                      />
                    </View>

                    <View>
                      <Text className="text-zinc-500 text-xs mb-2 tracking-widest font-bold">
                        CONTRASEÑA
                      </Text>
                      <TextInput
                        ref={passwordRef}
                        placeholder="••••••••"
                        placeholderTextColor="#52525B"
                        value={password}
                        onChangeText={handlePasswordChange}
                        secureTextEntry
                        autoComplete="current-password"
                        autoCorrect={false}
                        textContentType="password"
                        autoCapitalize="none"
                        blurOnSubmit={false}
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                        // @ts-ignore - Web specific
                        nativeID="modal-password"
                        className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 text-base"
                      />
                    </View>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.9}>
                    <LinearGradient
                      colors={loading ? ['#27272A', '#27272A'] : ['#DC2626', '#B91C1C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="rounded-xl p-5 flex-row items-center justify-center gap-2"
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Zap color="#FFFFFF" size={20} fill="#FFFFFF" />
                          <Text className="text-white font-bold text-lg tracking-wide">ENTRAR</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Footer */}
                  <View className="mt-6 items-center gap-3">
                    <Text className="text-zinc-600 text-xs">
                      ¿No tienes cuenta?{' '}
                      <Text className="text-savage-red font-bold">Regístrate en trens.app</Text>
                    </Text>

                    {/* Links de legitimidad */}
                    <View className="flex-row items-center gap-3 mt-2">
                      <Link href="/privacy" asChild>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                          <Text className="text-zinc-600 text-xs underline">Privacidad</Text>
                        </TouchableOpacity>
                      </Link>
                      <Text className="text-zinc-700 text-xs">•</Text>
                      <Link href="/terms" asChild>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                          <Text className="text-zinc-600 text-xs underline">Términos</Text>
                        </TouchableOpacity>
                      </Link>
                    </View>

                    {/* Badge de seguridad */}
                    <View className="flex-row items-center mt-2 py-2 px-4 bg-green-900/20 rounded-full">
                      <Shield size={12} color="#22c55e" />
                      <Text className="text-green-500 text-xs ml-2">Conexión segura SSL</Text>
                    </View>

                    <Text className="text-zinc-700 text-xs text-center mt-1">
                      © 2026 TRENS - High Performance Fitness
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
