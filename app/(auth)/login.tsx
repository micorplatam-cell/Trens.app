import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)/nucleo');
    }
  }

  return (
    <View className="flex-1 bg-savage-black justify-center items-center p-6">
      <Text className="text-savage-text text-3xl font-bold mb-8 italic">TRENS</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        className="w-full bg-savage-dark text-savage-text p-4 rounded mb-4 border border-zinc-800"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="w-full bg-savage-dark text-savage-text p-4 rounded mb-6 border border-zinc-800"
      />

      <TouchableOpacity
        onPress={signInWithEmail}
        disabled={loading}
        className="w-full bg-savage-red p-4 rounded items-center mb-6"
      >
        <Text className="text-savage-text font-bold text-lg">{loading ? 'LOADING...' : 'ENTER'}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/coach-access" asChild>
        <TouchableOpacity>
          <Text className="text-zinc-500 font-bold">ACCESO COACH</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
