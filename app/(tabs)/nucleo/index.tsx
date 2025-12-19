import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Dumbbell, Bike, Waves, ChevronRight, LogOut, Settings, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { useUserRoleContext } from '../../../context/UserRoleContext';

const SPORTS = [
  { id: 'gym', name: 'GYM', icon: Dumbbell, description: 'FUERZA & HIPERTROFIA' },
  { id: 'moto', name: 'MOTO', icon: Bike, description: 'ENDURO & MOTOCROSS' },
  { id: 'surf', name: 'SURF', icon: Waves, description: 'OLAS & FREESTYLE' },
];

export default function NucleoScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPro, isFree } = useUserRoleContext();

  const handleSportSelect = (sportId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (sportId === 'gym') {
      router.push('/(tabs)/gym');
    }
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await supabase.auth.signOut();
    router.replace('/');
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)/login');
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

        {/* Separador */}
        <View className="h-px bg-zinc-800 my-6" />

        {/* Estado de cuenta */}
        <View className="bg-zinc-900 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                  isPro ? 'bg-savage-red' : 'bg-zinc-800'
                }`}
              >
                <User color="#FFFFFF" size={24} />
              </View>
              <View>
                {isAuthenticated ? (
                  <>
                    <Text className="text-white font-bold">
                      {user?.email?.split('@')[0]?.toUpperCase() || 'ATLETA'}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <View
                        className={`px-2 py-0.5 rounded ${isPro ? 'bg-savage-red' : 'bg-zinc-700'}`}
                      >
                        <Text className="text-white text-xs font-bold">
                          {isPro ? 'PRO' : 'FREE'}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-white font-bold">INVITADO</Text>
                    <Text className="text-zinc-500 text-xs">Sin cuenta</Text>
                  </>
                )}
              </View>
            </View>

            {isAuthenticated ? (
              <TouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center bg-zinc-800 rounded-xl px-3 py-2"
              >
                <LogOut color="#DC2626" size={16} />
                <Text className="text-savage-red text-xs font-bold ml-2">SALIR</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleLogin}
                className="flex-row items-center bg-savage-red rounded-xl px-4 py-2"
              >
                <Text className="text-white text-sm font-bold">ENTRAR</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Info para usuarios no autenticados */}
        {!isAuthenticated && (
          <View className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-4">
            <Text className="text-zinc-400 text-sm text-center">
              Inicia sesión para desbloquear todas las funciones de TRENS
            </Text>
          </View>
        )}

        {/* Info para usuarios FREE */}
        {isAuthenticated && isFree && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/pro')}
            className="bg-savage-red/10 border border-savage-red/30 rounded-2xl p-4 mb-4"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-savage-red font-bold">ACTIVAR PRO</Text>
                <Text className="text-zinc-500 text-xs mt-1">
                  Graba, publica y accede a tu bóveda
                </Text>
              </View>
              <ChevronRight color="#DC2626" size={24} />
            </View>
          </TouchableOpacity>
        )}

        {/* Espaciado inferior */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
