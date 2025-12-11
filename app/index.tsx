import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './_layout';

export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Usuario autenticado en pantalla de auth -> llevar a tabs
      router.replace('/(tabs)/nucleo');
    } else if (!session && !inAuthGroup) {
      // Usuario NO autenticado fuera de auth -> llevar a login
      router.replace('/(auth)/login');
    }
  }, [session, loading, segments]);

  return (
    <View className="flex-1 bg-savage-black justify-center items-center">
      <ActivityIndicator size="large" color="#DC2626" />
    </View>
  );
}
