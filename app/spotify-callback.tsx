// ============================================================================
// SPOTIFY CALLBACK HANDLER
// Esta ruta captura el callback de OAuth de Spotify y lo procesa
// ============================================================================

import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Intentar completar la sesión de auth
WebBrowser.maybeCompleteAuthSession();

export default function SpotifyCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Si llegamos aquí, el callback ya debería haberse procesado
    // por maybeCompleteAuthSession(). Solo redirigimos al usuario.
    console.log('🎵 Spotify callback recibido, params:', params);

    const redirectToSavedPath = async () => {
      // Pequeño delay para asegurar que el auth session se complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Leer la ruta guardada
      let returnPath = '/(tabs)/adn';
      try {
        const savedPath = await AsyncStorage.getItem('@spotify_return_path');
        if (savedPath) {
          returnPath = savedPath;
          await AsyncStorage.removeItem('@spotify_return_path');
        }
      } catch (e) {
        console.warn('No se pudo leer ruta de retorno:', e);
      }

      console.log('🎵 Redirigiendo a:', returnPath);

      // Redirigir a la pantalla donde estaba
      router.replace(returnPath as any);
    };

    redirectToSavedPath();
  }, [params, router]);

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <ActivityIndicator size="large" color="#1DB954" />
      <Text className="text-white text-lg font-bold mt-4">Conectando con Spotify...</Text>
      <Text className="text-zinc-500 text-sm mt-2">Espera un momento</Text>
    </View>
  );
}
