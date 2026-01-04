// ============================================================================
// DOWNLOAD APP BANNER - TRENS
// Prompts web users to download the native app
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { X, Smartphone, Zap } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeb, isPWA } from '../../lib/platform';

const DISMISS_KEY = '@trens_download_banner_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface DownloadAppBannerProps {
  variant?: 'bottom' | 'floating';
}

export function DownloadAppBanner({ variant = 'bottom' }: DownloadAppBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on web, not in PWA mode
    if (!isWeb || isPWA()) return;

    const checkDismissed = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
        if (dismissed) {
          const dismissedTime = parseInt(dismissed, 10);
          if (Date.now() - dismissedTime < DISMISS_DURATION) {
            return; // Still within dismiss period
          }
        }
        // Show banner after a delay
        setTimeout(() => setVisible(true), 5000);
      } catch (error) {
        console.log('[Banner] Error checking dismiss state:', error);
      }
    };

    checkDismissed();
  }, []);

  const handleDismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch (error) {
      console.log('[Banner] Error saving dismiss state:', error);
    }
  };

  const handleDownload = () => {
    // Detect platform and open appropriate store
    const userAgent = navigator?.userAgent?.toLowerCase() || '';
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (isIOS) {
      Linking.openURL('https://apps.apple.com/app/trens/id123456789');
    } else {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.trens.app');
    }
  };

  if (!visible) return null;

  if (variant === 'floating') {
    return (
      <View className="absolute bottom-24 left-4 right-4 bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-lg">
        <TouchableOpacity onPress={handleDismiss} className="absolute top-2 right-2 p-2">
          <X color="#71717A" size={18} />
        </TouchableOpacity>

        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-xl bg-savage-red items-center justify-center mr-4">
            <Smartphone color="#FFFFFF" size={24} />
          </View>

          <View className="flex-1">
            <Text className="text-white font-bold text-sm">⚡ Experiencia completa</Text>
            <Text className="text-zinc-400 text-xs mt-0.5">Cámara, Spotify y más en la app</Text>
          </View>

          <TouchableOpacity onPress={handleDownload} className="bg-savage-red py-2 px-4 rounded-lg">
            <Text className="text-white font-bold text-xs">DESCARGAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Bottom banner variant
  return (
    <View className="bg-gradient-to-t from-black to-zinc-900 border-t border-zinc-800 px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Zap color="#DC2626" size={20} />
          <Text className="text-white text-sm ml-2 flex-1" numberOfLines={1}>
            Descarga TRENS para la experiencia completa
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={handleDownload} className="bg-savage-red py-2 px-4 rounded-lg">
            <Text className="text-white font-bold text-xs">APP</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDismiss} className="p-2">
            <X color="#71717A" size={18} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
