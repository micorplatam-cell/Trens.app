// ============================================================================
// PLATFORM UTILS - TRENS
// Utilities for handling platform-specific code
// ============================================================================

import { Platform } from 'react-native';

/**
 * Check if running on web
 */
export const isWeb = Platform.OS === 'web';

/**
 * Check if running on native (iOS or Android)
 */
export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Check if running on iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Check if running on Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Check if running as installed PWA
 */
export const isPWA = (): boolean => {
  if (!isWeb) return false;

  if (typeof window === 'undefined') return false;

  // Check display-mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // Check iOS Safari
  const isIOSPWA = (window.navigator as any)?.standalone === true;

  return isStandalone || isIOSPWA;
};

/**
 * Check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  if (!isWeb) return true;
  if (typeof window === 'undefined') return false;

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Register service worker for PWA
 */
export const registerServiceWorker = async (): Promise<void> => {
  if (!isWeb) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[PWA] Service worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New content available, please refresh');
            // Could show a toast here to prompt user to refresh
          }
        });
      }
    });
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
  }
};

/**
 * Check if a feature requires native app
 */
export type NativeFeature =
  | 'camera'
  | 'video-recording'
  | 'haptics'
  | 'file-system'
  | 'media-library'
  | 'spotify-remote'
  | 'push-notifications';

const NATIVE_ONLY_FEATURES: NativeFeature[] = [
  'camera',
  'video-recording',
  'haptics',
  'file-system',
  'media-library',
  'spotify-remote',
];

const WEB_LIMITED_FEATURES: NativeFeature[] = [
  'push-notifications', // Works with permission
];

/**
 * Check if feature is available on current platform
 */
export const isFeatureAvailable = (feature: NativeFeature): boolean => {
  if (isNative) return true;

  if (NATIVE_ONLY_FEATURES.includes(feature)) return false;
  if (WEB_LIMITED_FEATURES.includes(feature)) return true;

  return true;
};

/**
 * Get user-friendly message for unavailable features
 */
export const getFeatureUnavailableMessage = (feature: NativeFeature): string => {
  const messages: Record<NativeFeature, string> = {
    camera: 'La cámara está disponible en la app nativa',
    'video-recording': 'La grabación de video está disponible en la app nativa',
    haptics: 'Vibración no disponible en web',
    'file-system': 'Acceso a archivos limitado en web',
    'media-library': 'Galería de fotos disponible en la app nativa',
    'spotify-remote': 'Control de Spotify disponible en la app nativa',
    'push-notifications': 'Activa las notificaciones para recibir alertas',
  };

  return messages[feature];
};

/**
 * Open app store for native download
 */
export const openAppStore = (): void => {
  if (!isWeb) return;

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);

  if (isIOSDevice) {
    // iOS App Store (update with actual URL when available)
    window.open('https://apps.apple.com/app/trens/id123456789', '_blank');
  } else {
    // Google Play Store (update with actual URL when available)
    window.open('https://play.google.com/store/apps/details?id=com.trens.app', '_blank');
  }
};

/**
 * Share functionality with web fallback
 */
export const shareContent = async (data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> => {
  if (typeof navigator === 'undefined') return false;

  // Try native share first
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      // User cancelled or error
      console.log('[Share] Cancelled or failed:', error);
    }
  }

  // Fallback: copy to clipboard
  if (navigator.clipboard && data.url) {
    try {
      await navigator.clipboard.writeText(data.url);
      return true;
    } catch (error) {
      console.error('[Share] Clipboard failed:', error);
    }
  }

  return false;
};
