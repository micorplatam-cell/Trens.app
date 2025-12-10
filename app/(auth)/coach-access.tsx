import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';

export default function CoachAccessScreen() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleAccess = () => {
    // Logic for verifying code would go here
    if (code === 'SAVAGE') { // Dummy check
        router.replace('/(tabs)/nucleo');
    } else {
        alert('Invalid Code');
    }
  };

  return (
    <View className="flex-1 bg-savage-black justify-center items-center p-6">
      <Text className="text-savage-text text-2xl font-bold mb-8 italic">COACH ACCESS</Text>

      <TextInput
        placeholder="INVITATION CODE"
        placeholderTextColor="#666"
        value={code}
        onChangeText={setCode}
        className="w-full bg-savage-dark text-savage-text p-4 rounded mb-6 border border-zinc-800 text-center text-xl tracking-widest"
        autoCapitalize="characters"
      />

      <TouchableOpacity
        onPress={handleAccess}
        className="w-full bg-savage-red p-4 rounded items-center"
      >
        <Text className="text-savage-text font-bold text-lg">VERIFY</Text>
      </TouchableOpacity>
    </View>
  );
}
