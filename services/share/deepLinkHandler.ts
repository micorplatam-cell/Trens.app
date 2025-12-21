// =============================================================================
// DEEP LINK HANDLER
// Maneja los enlaces entrantes de share.trens.app
// =============================================================================

import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import * as Linking from 'expo-linking';

/**
 * Parsea una URL de deep link y extrae la ruta de navegación
 */
export function parseDeepLink(url: string): {
  type: 'video' | 'profile' | 'workout' | 'unknown';
  id?: string;
  params?: Record<string, string>;
} {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path || '';

    // Video: /v/:videoId o trensdev://video/:videoId
    const videoMatch = path.match(/^v(?:ideo)?\/([a-zA-Z0-9-]+)$/);
    if (videoMatch) {
      return { type: 'video', id: videoMatch[1] };
    }

    // Profile: /p/:username o /profile/:username
    const profileMatch = path.match(/^p(?:rofile)?\/([a-zA-Z0-9_-]+)$/);
    if (profileMatch) {
      return { type: 'profile', id: profileMatch[1] };
    }

    // Workout: /w/:workoutId
    const workoutMatch = path.match(/^w(?:orkout)?\/([a-zA-Z0-9-]+)$/);
    if (workoutMatch) {
      return { type: 'workout', id: workoutMatch[1] };
    }

    return { type: 'unknown' };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return { type: 'unknown' };
  }
}

/**
 * Navega a la pantalla correspondiente según el deep link
 */
export function handleDeepLink(url: string): boolean {
  const parsed = parseDeepLink(url);
  // Deep link parsed - handled silently

  switch (parsed.type) {
    case 'video':
      // Navegar al ADN y abrir el video
      // Por ahora navegar a ADN, en el futuro podría abrir directamente el video
      router.push({
        pathname: '/(tabs)/adn',
        params: { videoId: parsed.id },
      });
      return true;

    case 'profile':
      // Navegar al perfil
      router.push({
        pathname: '/(tabs)/adn',
        params: { profileId: parsed.id },
      });
      return true;

    case 'workout':
      // Navegar al workout
      router.push({
        pathname: '/(tabs)/plan',
        params: { workoutId: parsed.id },
      });
      return true;

    default:
      return false;
  }
}

/**
 * Hook para manejar deep links entrantes
 * Úsalo en el _layout.tsx principal
 */
export function useDeepLinkHandler() {
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // No manejar si la navegación no está lista
    if (!navigationState?.key) return;

    // Handler para URLs iniciales (app abierta desde link)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        // Initial deep link received
        handleDeepLink(initialUrl);
      }
    };

    // Handler para URLs mientras la app está corriendo
    const subscription = Linking.addEventListener('url', ({ url }) => {
      // Incoming deep link received
      handleDeepLink(url);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, [navigationState?.key]);
}

/**
 * Crea una URL de deep link para la app
 */
export function createDeepLink(
  type: 'video' | 'profile' | 'workout',
  id: string
): string {
  const prefix = Linking.createURL('');
  
  switch (type) {
    case 'video':
      return `${prefix}video/${id}`;
    case 'profile':
      return `${prefix}profile/${id}`;
    case 'workout':
      return `${prefix}workout/${id}`;
    default:
      return prefix;
  }
}
