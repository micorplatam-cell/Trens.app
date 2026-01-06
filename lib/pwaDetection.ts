// ============================================================================
// PWA DETECTION - Detectar si se está ejecutando como PWA instalada
// ============================================================================

import { Platform } from 'react-native';

/**
 * Detecta si la app se está ejecutando como PWA instalada (standalone)
 * Retorna true si está en modo PWA, false si está en navegador normal
 */
export function isPWA(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;

  // Detectar display-mode: standalone (Chrome, Edge, Firefox)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // Detectar iOS Safari "Add to Home Screen"
  const isIOSPWA = (window.navigator as any).standalone === true;

  // Detectar Android TWA (Trusted Web Activity)
  const isTWA = document.referrer.includes('android-app://');

  return isStandalone || isIOSPWA || isTWA;
}

/**
 * Detecta si el navegador soporta instalación de PWA
 */
export function canInstallPWA(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;

  // Chrome/Edge en Android y Desktop soportan beforeinstallprompt
  return (
    'BeforeInstallPromptEvent' in window ||
    // Verificar si ya hay un prompt guardado
    !!(window as any).deferredInstallPrompt
  );
}

/**
 * Detecta el sistema operativo para instrucciones de instalación
 */
export function getDeviceOS(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (Platform.OS !== 'web') return 'unknown';
  if (typeof window === 'undefined') return 'unknown';

  const ua = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua)) return 'desktop';

  return 'unknown';
}

/**
 * Detecta el navegador actual
 */
export function getBrowser(): 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'other' {
  if (Platform.OS !== 'web') return 'other';
  if (typeof window === 'undefined') return 'other';

  const ua = window.navigator.userAgent.toLowerCase();

  if (/edg/.test(ua)) return 'edge';
  if (/chrome/.test(ua) && !/edg/.test(ua)) return 'chrome';
  if (/safari/.test(ua) && !/chrome/.test(ua)) return 'safari';
  if (/firefox/.test(ua)) return 'firefox';
  if (/samsungbrowser/.test(ua)) return 'samsung';

  return 'other';
}

/**
 * Verifica si se puede mostrar el prompt de instalación automático
 */
export function canShowInstallPrompt(): boolean {
  if (Platform.OS !== 'web') return false;

  const os = getDeviceOS();
  const browser = getBrowser();

  // Chrome/Edge en Android y Desktop soportan el prompt automático
  if (os === 'android' && (browser === 'chrome' || browser === 'samsung' || browser === 'edge')) {
    return true;
  }

  if (os === 'desktop' && (browser === 'chrome' || browser === 'edge')) {
    return true;
  }

  return false;
}

/**
 * Obtiene instrucciones de instalación según el dispositivo
 */
export function getInstallInstructions(): {
  title: string;
  steps: string[];
  icon: string;
} {
  const os = getDeviceOS();
  const browser = getBrowser();

  if (os === 'ios') {
    return {
      title: 'Instalar en iPhone/iPad',
      steps: [
        'Toca el botón de Compartir (□↑)',
        'Desliza hacia abajo',
        'Toca "Añadir a pantalla de inicio"',
        'Confirma tocando "Añadir"',
      ],
      icon: 'share',
    };
  }

  if (os === 'android') {
    if (browser === 'chrome' || browser === 'edge') {
      return {
        title: 'Instalar en Android',
        steps: [
          'Toca el menú (⋮) arriba a la derecha',
          'Selecciona "Instalar aplicación" o "Añadir a pantalla de inicio"',
          'Confirma la instalación',
        ],
        icon: 'menu',
      };
    }
    return {
      title: 'Instalar en Android',
      steps: ['Abre esta página en Chrome', 'Toca el menú (⋮)', 'Selecciona "Instalar aplicación"'],
      icon: 'chrome',
    };
  }

  if (os === 'desktop') {
    return {
      title: 'Instalar en tu computadora',
      steps: [
        'Busca el ícono de instalación (⊕) en la barra de direcciones',
        'O ve al menú (⋮) y selecciona "Instalar TRENS"',
        'Confirma la instalación',
      ],
      icon: 'desktop',
    };
  }

  return {
    title: 'Instalar TRENS',
    steps: [
      'Abre el menú del navegador',
      'Busca "Añadir a pantalla de inicio" o "Instalar"',
      'Confirma la instalación',
    ],
    icon: 'app',
  };
}

/**
 * Guarda el evento de instalación para usarlo después
 */
let deferredPrompt: any = null;

export function saveDeferredPrompt(event: any): void {
  deferredPrompt = event;
  (window as any).deferredInstallPrompt = event;
}

export function getDeferredPrompt(): any {
  return deferredPrompt || (window as any).deferredInstallPrompt;
}

/**
 * Dispara el prompt de instalación guardado
 */
export async function triggerInstallPrompt(): Promise<boolean> {
  const prompt = getDeferredPrompt();
  if (!prompt) return false;

  prompt.prompt();
  const result = await prompt.userChoice;

  // Limpiar el prompt usado
  deferredPrompt = null;
  (window as any).deferredInstallPrompt = null;

  return result.outcome === 'accepted';
}
