import { Redirect } from 'expo-router';
import { useAuth } from './_layout';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  // Mientras carga la sesión, mostrar loading
  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  // Si hay usuario autenticado, ir a tabs
  if (user) {
    return <Redirect href="/(tabs)/nucleo" />;
  }

  // Si no hay sesión, ir a login
  return <Redirect href="/(auth)/login" />;
}
