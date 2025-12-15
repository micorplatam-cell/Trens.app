import { View, Text, TouchableOpacity } from 'react-native';
import { Camera, Video, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function ProScreen() {
  return (
    <View className="flex-1 bg-savage-black justify-center items-center p-6">
      {/* Glow Effect */}
      <View
        className="absolute w-64 h-64 rounded-full bg-savage-red opacity-10"
        style={{
          shadowColor: '#DC2626',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 100,
        }}
      />

      {/* Main Content */}
      <View className="items-center">
        <Text className="text-savage-text text-4xl font-bold italic tracking-widest mb-2">PRO</Text>
        <Text className="text-zinc-500 text-lg tracking-wider mb-12">MODO CÁMARA</Text>

        {/* Camera Button */}
        <TouchableOpacity
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
          className="w-32 h-32 rounded-full bg-savage-red items-center justify-center mb-8"
          style={{
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.6,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <Camera color="#FFFFFF" size={48} />
        </TouchableOpacity>

        {/* Mode Toggles */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            className="flex-row items-center bg-zinc-900 px-6 py-3 rounded-full border border-zinc-800"
          >
            <Camera color="#FFFFFF" size={20} />
            <Text className="text-white font-bold ml-2">FOTO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            className="flex-row items-center bg-zinc-900 px-6 py-3 rounded-full border border-zinc-800"
          >
            <Video color="#FFFFFF" size={20} />
            <Text className="text-white font-bold ml-2">VIDEO</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View className="flex-row items-center mt-8">
          <Zap color="#DC2626" size={16} />
          <Text className="text-zinc-600 text-sm ml-2">Próximamente: Análisis con IA</Text>
        </View>
      </View>
    </View>
  );
}
