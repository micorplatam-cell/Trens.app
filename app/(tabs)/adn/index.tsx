import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { User, Trophy, Target, TrendingUp, Calendar, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATS = [
  { label: 'ENTRENAMIENTOS', value: '47', icon: Calendar },
  { label: 'RÉCORDS', value: '12', icon: Trophy },
  { label: 'RACHA ACTUAL', value: '5 días', icon: TrendingUp },
  { label: 'OBJETIVO', value: '80%', icon: Target },
];

export default function AdnScreen() {
  return (
    <View className="flex-1 bg-savage-black">
      {/* Header */}
      <View className="px-6 pt-16 pb-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-savage-text text-4xl font-bold italic mb-2">ADN</Text>
            <Text className="text-zinc-400 text-lg tracking-wider">IDENTIDAD & STATS</Text>
          </View>
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            className="bg-zinc-900 p-3 rounded-full border border-zinc-800"
          >
            <Settings color="#71717a" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View className="bg-glass-strong rounded-2xl p-6 border border-glass-border mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-20 h-20 rounded-full bg-savage-red items-center justify-center mr-4">
              <User color="#FFFFFF" size={40} />
            </View>
            <View className="flex-1">
              <Text className="text-savage-text text-2xl font-bold">ATLETA</Text>
              <Text className="text-zinc-500 tracking-wider">NIVEL INTERMEDIO</Text>
              <View className="flex-row items-center mt-2">
                <View className="bg-savage-red px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">GYM</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-6">
          {STATS.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View
                key={index}
                className="w-[48%] bg-glass-strong rounded-2xl p-4 border border-glass-border mb-3"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <IconComponent color="#DC2626" size={20} />
                </View>
                <Text className="text-savage-text text-3xl font-bold font-mono">{stat.value}</Text>
                <Text className="text-zinc-500 text-xs tracking-wider mt-1">{stat.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Placeholder for more content */}
        <View className="bg-zinc-900/50 rounded-2xl p-6 border border-dashed border-zinc-800 mb-20">
          <Text className="text-zinc-600 text-center">MÁS STATS PRÓXIMAMENTE</Text>
        </View>
      </ScrollView>
    </View>
  );
}
