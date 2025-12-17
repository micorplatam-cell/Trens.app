import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Dumbbell, Bike, Waves, ChevronRight, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';

const SPORTS = [
  { id: 'gym', name: 'GYM', icon: Dumbbell, description: 'FUERZA & HIPERTROFIA' },
  { id: 'moto', name: 'MOTO', icon: Bike, description: 'ENDURO & MOTOCROSS' },
  { id: 'surf', name: 'SURF', icon: Waves, description: 'OLAS & FREESTYLE' },
];

export default function NucleoScreen() {
  const router = useRouter();

  const handleSportSelect = (sportId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (sportId === 'gym') {
      router.push('/(tabs)/gym');
    }
  };

  return (
    <View className="flex-1 bg-savage-black">
      {/* Header */}
      <View className="px-6 pt-16 pb-6">
        <Text className="text-savage-text text-4xl font-bold italic mb-2">NUCLEO</Text>
        <Text className="text-zinc-400 text-lg tracking-wider">SELECCIONA TU ARENA</Text>
      </View>

      {/* Sports Grid */}
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {SPORTS.map((sport) => {
          const IconComponent = sport.icon;
          const isAvailable = sport.id === 'gym';

          return (
            <TouchableOpacity
              key={sport.id}
              onPress={() => handleSportSelect(sport.id)}
              disabled={!isAvailable}
              className={`mb-4 p-6 rounded-2xl border ${
                isAvailable
                  ? 'bg-glass-strong border-savage-red'
                  : 'bg-glass-light border-zinc-800 opacity-50'
              }`}
              style={{
                shadowColor: isAvailable ? '#DC2626' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isAvailable ? 0.3 : 0,
                shadowRadius: 8,
                elevation: isAvailable ? 4 : 0,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    className={`w-16 h-16 rounded-2xl items-center justify-center mr-4 ${
                      isAvailable ? 'bg-savage-red' : 'bg-zinc-800'
                    }`}
                  >
                    <IconComponent color="#FFFFFF" size={32} />
                  </View>
                  <View>
                    <Text className="text-savage-text text-2xl font-bold tracking-wider">
                      {sport.name}
                    </Text>
                    <Text className="text-zinc-500 text-sm tracking-wide">{sport.description}</Text>
                    {!isAvailable && (
                      <Text className="text-zinc-600 text-xs mt-1">PRÓXIMAMENTE</Text>
                    )}
                  </View>
                </View>
                {isAvailable && <ChevronRight color="#DC2626" size={28} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Logout Button */}
        <TouchableOpacity
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await supabase.auth.signOut();
            router.replace('/');
          }}
          className="mt-10 mb-20 flex-row items-center justify-center py-3 px-6 bg-zinc-900 rounded-xl border border-zinc-800"
        >
          <LogOut color="#DC2626" size={18} />
          <Text className="text-savage-red text-sm font-bold ml-2">CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
