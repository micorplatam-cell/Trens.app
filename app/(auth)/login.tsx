import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import { Shield, Lock } from 'lucide-react-native';

// FormWrapper FUERA del componente para evitar re-renders
const WebFormWrapper = React.memo(
  ({ children, onSubmit }: { children: React.ReactNode; onSubmit: () => void }) => {
    if (Platform.OS !== 'web') {
      return <View className="gap-4">{children}</View>;
    }

    return (
      <form
        onSubmit={(e: any) => {
          e.preventDefault();
          e.stopPropagation();
          onSubmit();
          return false;
        }}
        autoComplete="on"
        name="trens-login-form"
        id="trens-login-form"
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {children}
      </form>
    );
  }
);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Refs para mantener focus en inputs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Callbacks estables para evitar re-renders que cierran el teclado
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  // Configurar meta tags para la barra de URL negra (solo web)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Asegurar theme-color negro
      let themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) {
        themeColor.setAttribute('content', '#000000');
      }
      // Agregar meta para Safari
      let statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (statusBar) {
        statusBar.setAttribute('content', 'black');
      }
    }
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-savage-black"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo/Brand - Más prominente */}
        <View className="items-center mb-10">
          <Text className="text-savage-red text-6xl font-bold italic tracking-tighter">TRENS</Text>
          <Text className="text-zinc-500 text-lg tracking-widest mt-2">
            HIGH PERFORMANCE FITNESS
          </Text>
          <Text className="text-zinc-700 text-xs mt-3">Aplicación oficial de entrenamiento</Text>
        </View>

        {/* Security Badge */}
        <View className="flex-row items-center justify-center mb-6 py-2 px-4 bg-zinc-900/50 rounded-full self-center">
          <Lock size={14} color="#22c55e" />
          <Text className="text-green-500 text-xs ml-2">Conexión segura SSL</Text>
        </View>

        {/* Error Message */}
        {error && (
          <View className="bg-red-900/30 border border-red-800 rounded-2xl p-4 mb-6">
            <Text className="text-red-400 text-center">{error}</Text>
          </View>
        )}

        {/* Form - Wrapper nativo <form> para web que indica al navegador que es un login seguro */}
        <WebFormWrapper onSubmit={handleLogin}>
          <View>
            <Text className="text-zinc-500 text-sm mb-2 tracking-wider">EMAIL</Text>
            <TextInput
              ref={emailRef}
              placeholder="tu@email.com"
              placeholderTextColor="#52525b"
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
              nativeID="email"
              className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 text-lg"
            />
          </View>

          <View>
            <Text className="text-zinc-500 text-sm mb-2 tracking-wider">CONTRASEÑA</Text>
            <TextInput
              ref={passwordRef}
              placeholder="••••••••"
              placeholderTextColor="#52525b"
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
              nativeID="password"
              className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 text-lg"
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className={`p-5 rounded-2xl items-center mt-4 ${loading ? 'bg-zinc-800' : 'bg-savage-red'}`}
            style={{
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: loading ? 0 : 0.4,
              shadowRadius: 8,
              elevation: loading ? 0 : 6,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-lg tracking-widest">ENTRAR</Text>
            )}
          </TouchableOpacity>
        </WebFormWrapper>

        {/* Links */}
        <View className="mt-8 items-center gap-4">
          <Link href="/(auth)/coach-access" asChild>
            <TouchableOpacity>
              <Text className="text-zinc-600 text-sm">Acceso Coach →</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Legal Links */}
        <View className="flex-row justify-center gap-4 mt-6">
          <Link href="/privacy" asChild>
            <TouchableOpacity>
              <Text className="text-zinc-600 text-xs underline">Privacidad</Text>
            </TouchableOpacity>
          </Link>
          <Text className="text-zinc-700 text-xs">•</Text>
          <Link href="/terms" asChild>
            <TouchableOpacity>
              <Text className="text-zinc-600 text-xs underline">Términos</Text>
            </TouchableOpacity>
          </Link>
          <Text className="text-zinc-700 text-xs">•</Text>
          <Link href="/contact" asChild>
            <TouchableOpacity>
              <Text className="text-zinc-600 text-xs underline">Contacto</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Footer de legitimidad */}
        <View className="mt-auto pb-6 items-center">
          <View className="flex-row items-center mb-2">
            <Shield size={14} color="#22c55e" />
            <Text className="text-green-600 text-xs ml-1">Sitio verificado y seguro</Text>
          </View>
          <Text className="text-zinc-700 text-xs text-center">
            © 2026 TRENS - High Performance Fitness
          </Text>
          <Text className="text-zinc-800 text-xs text-center mt-1">
            Ciudad de México, México | soporte@trens.app
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
