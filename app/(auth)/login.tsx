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
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
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
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-savage-black"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo/Brand */}
        <View className="items-center mb-12">
          <Text className="text-savage-red text-6xl font-bold italic tracking-tighter">TRENS</Text>
          <Text className="text-zinc-500 text-lg tracking-widest mt-2">HIGH PERFORMANCE</Text>
        </View>

        {/* Error Message */}
        {error && (
          <View className="bg-red-900/30 border border-red-800 rounded-2xl p-4 mb-6">
            <Text className="text-red-400 text-center">{error}</Text>
          </View>
        )}

        {/* Form */}
        <View className="gap-4">
          <View>
            <Text className="text-zinc-500 text-sm mb-2 tracking-wider">EMAIL</Text>
            <TextInput
              placeholder="tu@email.com"
              placeholderTextColor="#52525b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 text-lg"
            />
          </View>

          <View>
            <Text className="text-zinc-500 text-sm mb-2 tracking-wider">CONTRASEÑA</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
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
        </View>

        {/* Links */}
        <View className="mt-8 items-center gap-4">
          <Link href="/(auth)/coach-access" asChild>
            <TouchableOpacity>
              <Text className="text-zinc-600 text-sm">Acceso Coach →</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
