// ============================================================================
// (WEB) LAYOUT - Web-only routes (landing, payment success, etc.)
// ============================================================================

import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function WebLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
        animation: Platform.OS === 'web' ? 'none' : 'default',
      }}
    >
      <Stack.Screen name="landing" />
      <Stack.Screen name="pago-exitoso" />
      <Stack.Screen name="instalar" />
    </Stack>
  );
}
