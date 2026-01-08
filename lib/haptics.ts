// ============================================================================
// HAPTICS - TRENS
// Cross-platform haptics that works on native and web
// Professional implementation with full API compatibility
// ============================================================================

import { Platform } from 'react-native';
import * as WebHaptics from './webHaptics';

// Re-export types for convenience
export { ImpactFeedbackStyle, NotificationFeedbackType } from './webHaptics';

// ============================================================================
// CROSS-PLATFORM HAPTIC FUNCTIONS
// ============================================================================

/**
 * Triggers selection feedback (light tap)
 * Web: Uses navigator.vibrate if available
 * Native: Uses expo-haptics selectionAsync
 */
export const selectionAsync = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return WebHaptics.selectionAsync();
  }
  // Dynamic import for native only
  const ExpoHaptics = require('expo-haptics');
  return ExpoHaptics.selectionAsync();
};

/**
 * Triggers impact feedback with configurable intensity
 * Web: Uses navigator.vibrate with duration based on style
 * Native: Uses expo-haptics impactAsync
 */
export const impactAsync = async (
  style: WebHaptics.ImpactFeedbackStyle = WebHaptics.ImpactFeedbackStyle.Medium
): Promise<void> => {
  if (Platform.OS === 'web') {
    return WebHaptics.impactAsync(style);
  }
  const ExpoHaptics = require('expo-haptics');
  return ExpoHaptics.impactAsync(style);
};

/**
 * Triggers notification feedback (success, warning, error)
 * Web: Uses navigator.vibrate with pattern based on type
 * Native: Uses expo-haptics notificationAsync
 */
export const notificationAsync = async (
  type: WebHaptics.NotificationFeedbackType = WebHaptics.NotificationFeedbackType.Success
): Promise<void> => {
  if (Platform.OS === 'web') {
    return WebHaptics.notificationAsync(type);
  }
  const ExpoHaptics = require('expo-haptics');
  return ExpoHaptics.notificationAsync(type);
};

// ============================================================================
// MODULE EXPORTS - Compatible with `import * as Haptics from '...'`
// ============================================================================

const Haptics = {
  ImpactFeedbackStyle: WebHaptics.ImpactFeedbackStyle,
  NotificationFeedbackType: WebHaptics.NotificationFeedbackType,
  selectionAsync,
  impactAsync,
  notificationAsync,
};

export { Haptics };
export default Haptics;
