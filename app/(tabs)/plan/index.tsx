import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar, Clock, Utensils, Droplets, Moon, Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const SCHEDULE = [
  {
    time: '06:00',
    title: 'DESPERTAR',
    subtitle: 'Hidratación + Luz solar',
    icon: Sun,
    color: '#FBBF24',
  },
  {
    time: '07:00',
    title: 'ENTRENAMIENTO',
    subtitle: 'GYM - Día de Pecho',
    icon: Clock,
    color: '#DC2626',
  },
  {
    time: '09:00',
    title: 'DESAYUNO',
    subtitle: '650 kcal - Alto en proteína',
    icon: Utensils,
    color: '#22C55E',
  },
  {
    time: '13:00',
    title: 'ALMUERZO',
    subtitle: '800 kcal - Balanceado',
    icon: Utensils,
    color: '#22C55E',
  },
  {
    time: '16:00',
    title: 'SNACK',
    subtitle: '300 kcal - Pre-workout',
    icon: Droplets,
    color: '#3B82F6',
  },
  { time: '20:00', title: 'CENA', subtitle: '600 kcal - Ligera', icon: Utensils, color: '#22C55E' },
  {
    time: '22:00',
    title: 'DESCANSO',
    subtitle: 'Preparación para dormir',
    icon: Moon,
    color: '#8B5CF6',
  },
];

export default function PlanScreen() {
  return (
    <View className="flex-1 bg-savage-black">
      {/* Header */}
      <View className="px-6 pt-16 pb-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-savage-text text-4xl font-bold italic mb-2">PLAN</Text>
            <Text className="text-zinc-400 text-lg tracking-wider">RUTINA DIARIA</Text>
          </View>
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            className="bg-zinc-900 p-3 rounded-full border border-zinc-800"
          >
            <Calendar color="#71717a" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Timeline */}
        {SCHEDULE.map((item, index) => {
          const IconComponent = item.icon;
          const isLast = index === SCHEDULE.length - 1;

          return (
            <View key={index} className="flex-row mb-1">
              {/* Timeline Line */}
              <View className="items-center mr-4" style={{ width: 60 }}>
                <Text className="text-zinc-500 text-xs font-mono mb-2">{item.time}</Text>
                <View
                  className="w-4 h-4 rounded-full border-2"
                  style={{ borderColor: item.color, backgroundColor: `${item.color}33` }}
                />
                {!isLast && <View className="w-0.5 flex-1 bg-zinc-800 my-1" />}
              </View>

              {/* Content Card */}
              <TouchableOpacity
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                className="flex-1 bg-glass-strong p-4 rounded-2xl border border-glass-border mb-3"
              >
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${item.color}22` }}
                  >
                    <IconComponent color={item.color} size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-savage-text font-bold tracking-wider">{item.title}</Text>
                    <Text className="text-zinc-500 text-sm">{item.subtitle}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Bottom Spacing */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
