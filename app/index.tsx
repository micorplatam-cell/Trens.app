import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { useUserRoleContext } from '../context/UserRoleContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { loading, isPro } = useUserRoleContext();

  // Mientras carga la sesión, mostrar loading
  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  // TRENS NO pide login para usar la app
  // El contenido público es accesible sin cuenta
  // ============================================================================
  // REDIRECCIÓN SEGÚN TIPO DE USUARIO:
  // - PRO: Abre ADN por defecto (su perfil atlético)
  // - FREE/Invitado: Abre FEED por defecto (contenido público)
  // ============================================================================
  const defaultRoute = isPro ? '/(tabs)/adn' : '/(tabs)/feed';

  return <Redirect href={defaultRoute as Href} />;
}
