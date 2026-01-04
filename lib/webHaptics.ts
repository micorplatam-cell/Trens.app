// ============================================================================
// WEB HAPTICS - TRENS
// Fallback for expo-haptics on web platform
// Provides no-op functions that match the expo-haptics API
// ============================================================================

import { Platform } from 'react-native';

// Impact feedback styles (matches expo-haptics)
export enum ImpactFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Rigid = 'rigid',
  Soft = 'soft',
}

// Notification feedback types (matches expo-haptics)
export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

// Selection feedback (matches expo-haptics)
export const selectionAsync = async (): Promise<void> => {
  // Web: Try vibration API if available
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
  // Native: no-op, use real expo-haptics
};

// Impact feedback (matches expo-haptics)
export const impactAsync = async (
  style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium
): Promise<void> => {
  if (Platform.OS !== 'web') return;

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const durations: Record<ImpactFeedbackStyle, number> = {
      [ImpactFeedbackStyle.Light]: 10,
      [ImpactFeedbackStyle.Medium]: 20,
      [ImpactFeedbackStyle.Heavy]: 30,
      [ImpactFeedbackStyle.Rigid]: 25,
      [ImpactFeedbackStyle.Soft]: 15,
    };
    navigator.vibrate(durations[style] || 20);
  }
};

// Notification feedback (matches expo-haptics)
export const notificationAsync = async (
  type: NotificationFeedbackType = NotificationFeedbackType.Success
): Promise<void> => {
  if (Platform.OS !== 'web') return;

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const patterns: Record<NotificationFeedbackType, number[]> = {
      [NotificationFeedbackType.Success]: [10, 50, 10],
      [NotificationFeedbackType.Warning]: [20, 30, 20],
      [NotificationFeedbackType.Error]: [30, 20, 30, 20, 30],
    };
    navigator.vibrate(patterns[type] || [20]);
  }
};

// Default export matching expo-haptics structure
export default {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  selectionAsync,
  impactAsync,
  notificationAsync,
};
