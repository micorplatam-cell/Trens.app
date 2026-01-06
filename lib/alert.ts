// ============================================================================
// CROSS-PLATFORM ALERT - TRENS
// Alert.alert que funciona en Web y Native
// ============================================================================

import { Alert as RNAlert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

/**
 * Alert cross-platform que funciona en Web y Native
 * En web usa window.confirm/prompt, en native usa Alert.alert
 */
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ): void => {
    if (Platform.OS === 'web') {
      // En Web, usamos el sistema de diálogos del navegador
      webAlert(title, message, buttons);
    } else {
      // En Native, usamos Alert.alert normal
      RNAlert.alert(title, message, buttons, options);
    }
  },
};

/**
 * Implementación web del alert
 */
function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (typeof window === 'undefined') return;

  // Si no hay botones, solo mostrar un alert simple
  if (!buttons || buttons.length === 0) {
    window.alert(`${title}\n\n${message || ''}`);
    return;
  }

  // Si solo hay un botón (normalmente "OK")
  if (buttons.length === 1) {
    window.alert(`${title}\n\n${message || ''}`);
    buttons[0].onPress?.();
    return;
  }

  // Si hay 2 botones, buscar el cancel y el de acción
  if (buttons.length === 2) {
    const cancelBtn = buttons.find((b) => b.style === 'cancel') || buttons[0];
    const actionBtn = buttons.find((b) => b.style !== 'cancel') || buttons[1];

    const confirmed = window.confirm(`${title}\n\n${message || ''}`);

    if (confirmed) {
      actionBtn.onPress?.();
    } else {
      cancelBtn.onPress?.();
    }
    return;
  }

  // Si hay 3+ botones, usar un prompt más complejo
  // Para simplificar, mostramos las opciones numeradas
  if (buttons.length >= 3) {
    const optionsText = buttons.map((btn, idx) => `${idx + 1}. ${btn.text || 'Opción'}`).join('\n');

    const choice = window.prompt(
      `${title}\n\n${message || ''}\n\n${optionsText}\n\nEscribe el número de tu opción:`,
      '1'
    );

    if (choice === null) {
      // Usuario canceló
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      cancelBtn?.onPress?.();
      return;
    }

    const index = parseInt(choice, 10) - 1;
    if (index >= 0 && index < buttons.length) {
      buttons[index].onPress?.();
    }
    return;
  }
}

/**
 * Helper para mostrar un confirm simple
 * Retorna una Promise que resuelve a true si el usuario confirma
 */
export function confirm(title: string, message?: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmar', onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Helper para mostrar un alert destructivo (eliminar, etc)
 */
export function confirmDestructive(
  title: string,
  message: string,
  actionText: string = 'ELIMINAR'
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: actionText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default Alert;
