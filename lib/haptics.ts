// ============================================================================
// HAPTICS - TRENS
// Cross-platform haptics that works on native and web
// ============================================================================

import { Platform } from 'react-native';

// Re-export types for convenience
export { ImpactFeedbackStyle, NotificationFeedbackType } from './webHaptics';

let HapticsModule: typeof import('expo-haptics') | typeof import('./webHaptics');

// Dynamic import based on platform
if (Platform.OS === 'web') {
  // Use web fallback
  HapticsModule = require('./webHaptics');
} else {
  // Use native expo-haptics
  HapticsModule = require('expo-haptics');
}

export const Haptics = HapticsModule;
export default HapticsModule;
