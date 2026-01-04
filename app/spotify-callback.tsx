// ============================================================================
// SPOTIFY CALLBACK HANDLER
// Esta ruta captura el callback de OAuth de Spotify y lo procesa
// Funciona tanto en native como en web
// ============================================================================

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import spotify from '../services/spotify/spotify';

// Intentar completar la sesión de auth (solo en native)
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export default function SpotifyCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      console.log('🎵 Spotify callback recibido, params:', params);

      // En web, necesitamos procesar el código OAuth aquí
      if (Platform.OS === 'web') {
        try {
          // Obtener parámetros de la URL
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const error = urlParams.get('error');

          if (error) {
            console.error('🎵 Spotify OAuth error:', error);
            setStatus('error');
            setErrorMessage('Autenticación cancelada o denegada');
            setTimeout(() => redirectToSavedPath(), 2000);
            return;
          }

          if (code) {
            console.log('🎵 Spotify: Código recibido en web, procesando...');
            // Procesar el código OAuth usando el servicio de Spotify
            const success = await spotify.processWebAuthCode(code);

            if (success) {
              console.log('🎵 Spotify: ✅ Conectado exitosamente desde web');
              setStatus('success');
            } else {
              console.error('🎵 Spotify: Error procesando código');
              setStatus('error');
              setErrorMessage('Error al conectar con Spotify');
            }
          }
        } catch (e) {
          console.error('🎵 Spotify callback web error:', e);
          setStatus('error');
          setErrorMessage('Error inesperado');
        }
      }

      // Pequeño delay para mostrar estado y luego redirigir
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await redirectToSavedPath();
    };

    const redirectToSavedPath = async () => {
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
      router.replace(returnPath as any);
    };

    processCallback();
  }, [params, router]);

  return (
    <View className="flex-1 bg-black items-center justify-center">
      {status === 'processing' && (
        <>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text className="text-white text-lg font-bold mt-4">Conectando con Spotify...</Text>
          <Text className="text-zinc-500 text-sm mt-2">Espera un momento</Text>
        </>
      )}
      {status === 'success' && (
        <>
          <View className="w-16 h-16 rounded-full bg-[#1DB954] items-center justify-center mb-4">
            <Text className="text-white text-3xl">✓</Text>
          </View>
          <Text className="text-white text-lg font-bold">¡Conectado!</Text>
          <Text className="text-zinc-500 text-sm mt-2">Redirigiendo...</Text>
        </>
      )}
      {status === 'error' && (
        <>
          <View className="w-16 h-16 rounded-full bg-red-600 items-center justify-center mb-4">
            <Text className="text-white text-3xl">✕</Text>
          </View>
          <Text className="text-white text-lg font-bold">Error</Text>
          <Text className="text-zinc-500 text-sm mt-2">{errorMessage}</Text>
        </>
      )}
    </View>
  );
}
