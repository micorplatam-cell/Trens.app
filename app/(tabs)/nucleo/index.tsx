import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function NucleoScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-savage-black p-6 pt-16">
      <Text className="text-savage-text text-4xl font-bold italic mb-2">NUCLEO</Text>
      <Text className="text-zinc-500 text-lg mb-8">SELECT YOUR ARENA</Text>

      <View className="flex-row flex-wrap gap-4">
        {['SURF', 'MOTO', 'GYM'].map((sport) => (
          <TouchableOpacity
            key={sport}
            className="w-full bg-savage-dark p-6 rounded border border-zinc-800 mb-4"
          >
            <Text className="text-savage-text text-xl font-bold">{sport}</Text>
          </TouchableOpacity>
        ))}
      </View>

       <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="mt-10">
          <Text className="text-zinc-700">Back to Login (Dev)</Text>
      </TouchableOpacity>
    </View>
  );
}
