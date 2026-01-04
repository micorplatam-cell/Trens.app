// ============================================================================
// NATIVE FEATURE GATE - TRENS
// Component that shows fallback UI for native-only features on web
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, Platform, Linking } from 'react-native';
import { Smartphone, Download, X } from 'lucide-react-native';
import type { NativeFeature } from '../../lib/platform';
import { isFeatureAvailable, getFeatureUnavailableMessage, isWeb } from '../../lib/platform';

interface NativeFeatureGateProps {
  feature: NativeFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDownloadPrompt?: boolean;
}

/**
 * Wraps content that requires native features
 * On web, shows a fallback UI prompting to download the app
 */
export function NativeFeatureGate({
  feature,
  children,
  fallback,
  showDownloadPrompt = true,
}: NativeFeatureGateProps) {
  // Always render children on native
  if (!isWeb || isFeatureAvailable(feature)) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback UI
  if (!showDownloadPrompt) {
    return null;
  }

  return <NativeFeatureFallback feature={feature} />;
}

interface NativeFeatureFallbackProps {
  feature: NativeFeature;
  onDismiss?: () => void;
}

/**
 * Fallback UI for native-only features
 */
export function NativeFeatureFallback({ feature, onDismiss }: NativeFeatureFallbackProps) {
  const message = getFeatureUnavailableMessage(feature);

  const openPlayStore = () => {
    Linking.openURL('https://play.google.com/store/apps/details?id=com.trens.app');
  };

  const openAppStore = () => {
    Linking.openURL('https://apps.apple.com/app/trens/id123456789');
  };

  return (
    <View className="flex-1 bg-savage-black items-center justify-center px-8">
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} className="absolute top-4 right-4 p-2">
          <X color="#71717A" size={24} />
        </TouchableOpacity>
      )}

      <View className="items-center">
        {/* Icon */}
        <View className="w-20 h-20 rounded-full bg-zinc-900 items-center justify-center mb-6">
          <Smartphone color="#DC2626" size={40} />
        </View>

        {/* Title */}
        <Text className="text-white text-xl font-bold text-center mb-2">
          Función Exclusiva de App
        </Text>

        {/* Message */}
        <Text className="text-zinc-400 text-center mb-8 max-w-xs">
          {message}. Descarga la app de TRENS para acceder a todas las funciones.
        </Text>

        {/* Download buttons */}
        <View className="w-full gap-3">
          <TouchableOpacity
            onPress={openPlayStore}
            className="bg-savage-red py-4 px-8 rounded-xl flex-row items-center justify-center"
          >
            <Download color="#FFFFFF" size={20} />
            <Text className="text-white font-bold ml-2 tracking-wider">GOOGLE PLAY</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openAppStore}
            className="bg-zinc-800 py-4 px-8 rounded-xl flex-row items-center justify-center"
          >
            <Download color="#FFFFFF" size={20} />
            <Text className="text-white font-bold ml-2 tracking-wider">APP STORE</Text>
          </TouchableOpacity>
        </View>

        {/* Skip option */}
        <TouchableOpacity onPress={onDismiss} className="mt-6 py-2">
          <Text className="text-zinc-500 text-sm">Continuar en web</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Hook to check if a feature is available
 */
export function useNativeFeature(feature: NativeFeature) {
  const available = !isWeb || isFeatureAvailable(feature);
  const message = getFeatureUnavailableMessage(feature);

  return {
    available,
    message,
    isWeb,
  };
}
