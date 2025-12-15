import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function CoachAccessScreen() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAccess = () => {
    if (code.toUpperCase() === 'SAVAGE') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/nucleo');
    } else {
      setError('Código inválido');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-savage-black"
    >
      <View className="flex-1 justify-center items-center p-6">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-16 left-6 bg-zinc-900 p-3 rounded-full border border-zinc-800"
        >
          <ArrowLeft color="#71717a" size={24} />
        </TouchableOpacity>

        {/* Icon */}
        <View className="w-24 h-24 rounded-full bg-savage-red/20 items-center justify-center mb-8">
          <Shield color="#DC2626" size={48} />
        </View>

        <Text className="text-savage-text text-3xl font-bold italic mb-2">COACH ACCESS</Text>
        <Text className="text-zinc-500 text-center mb-8 tracking-wider">
          Ingresa tu código de invitación
        </Text>

        {/* Error */}
        {error && (
          <View className="bg-red-900/30 border border-red-800 rounded-2xl p-4 mb-6 w-full">
            <Text className="text-red-400 text-center">{error}</Text>
          </View>
        )}

        {/* Code Input */}
        <TextInput
          placeholder="CÓDIGO"
          placeholderTextColor="#52525b"
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setError(null);
          }}
          className="w-full bg-zinc-900 text-white p-5 rounded-2xl border border-zinc-800 text-center text-2xl tracking-[0.5em] font-mono mb-6"
          autoCapitalize="characters"
          maxLength={10}
        />

        <TouchableOpacity
          onPress={handleAccess}
          className="w-full bg-savage-red p-5 rounded-2xl items-center"
          style={{
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text className="text-white font-bold text-lg tracking-widest">VERIFICAR</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
