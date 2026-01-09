// =============================================================================
// SHARE MODAL - Modal profesional para compartir videos
// Estilo Savage Mode con cierre fluido y vibración
// =============================================================================

import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { Link2, Share2, MessageCircle, QrCode, Check } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import {
  ShareVideoOptions,
  copyVideoLink,
  shareVideo,
  shareToWhatsApp,
  generateQRCodeUrl,
  generateShareUrl,
} from '../../services/share/videoShare';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  title?: string;
  exerciseName?: string;
  weightKg?: number;
  reps?: number;
  thumbnailUrl?: string;
}

type ShareAction = 'idle' | 'loading' | 'success' | 'error';

export function ShareModal({
  visible,
  onClose,
  videoId,
  title,
  exerciseName,
  weightKg,
  reps,
  thumbnailUrl,
}: ShareModalProps) {
  const [action, setAction] = useState<ShareAction>('idle');
  const [showQR, setShowQR] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Reset state cuando se abre
  useEffect(() => {
    if (visible) {
      setAction('idle');
      setShowQR(false);
      setSuccessMessage('');
    }
  }, [visible]);

  const options: ShareVideoOptions = {
    videoId,
    title,
    exerciseName,
    weightKg,
    reps,
  };

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setAction('success');
    setTimeout(() => {
      setAction('idle');
      setSuccessMessage('');
    }, 2000);
  }, []);

  const handleCopyLink = useCallback(async () => {
    setAction('loading');
    const result = await copyVideoLink(videoId);
    if (result.success) {
      showSuccess('¡Enlace copiado!');
    } else {
      setAction('error');
    }
  }, [videoId, showSuccess]);

  const handleShare = useCallback(async () => {
    setAction('loading');
    await shareVideo(options);
    setAction('idle');
  }, [options]);

  const handleWhatsApp = useCallback(async () => {
    setAction('loading');
    await shareToWhatsApp(options);
    setAction('idle');
  }, [options]);

  const handleShowQR = useCallback(() => {
    setShowQR(true);
  }, []);

  const shareUrl = generateShareUrl(videoId);
  const qrUrl = generateQRCodeUrl(videoId, 280);

  // Formatear título del modal
  const displayTitle = exerciseName
    ? `${exerciseName} ${weightKg ? `${weightKg}kg` : ''} ${reps ? `x${reps}` : ''}`.trim()
    : title || 'Compartir video';

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Compartir"
      accentColor="#DC2626"
      height="auto"
      scrollable={false}
    >
      {/* Preview Card */}
      <View className="mx-5 my-4 bg-zinc-900/80 rounded-2xl overflow-hidden border border-zinc-800">
        <View className="flex-row items-center p-4">
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              className="w-16 h-16 rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <View className="w-16 h-16 rounded-xl bg-zinc-800 items-center justify-center">
              <Text className="text-2xl">🎬</Text>
            </View>
          )}
          <View className="flex-1 ml-4">
            <Text className="text-white font-bold text-base" numberOfLines={2}>
              {displayTitle}
            </Text>
            <Text className="text-zinc-500 text-sm mt-1 font-mono" numberOfLines={1}>
              {shareUrl.replace('https://', '')}
            </Text>
          </View>
        </View>
      </View>

      {/* QR Code View */}
      {showQR ? (
        <View className="items-center pb-8 px-5">
          <View className="bg-white p-4 rounded-2xl mb-4">
            <Image source={{ uri: qrUrl }} className="w-[280px] h-[280px]" resizeMode="contain" />
          </View>
          <Text className="text-zinc-400 text-sm text-center mb-4">
            Escanea el código para ver el video
          </Text>
          <Pressable
            onPress={() => setShowQR(false)}
            className="bg-zinc-800 px-6 py-3 rounded-xl active:bg-zinc-700"
          >
            <Text className="text-white font-semibold">Volver</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Share Options */}
          <View className="flex-row justify-center gap-6 px-5 mb-6">
            <ShareButton
              icon={<Link2 size={24} color="#FFFFFF" />}
              label="Copiar"
              onPress={handleCopyLink}
              isLoading={action === 'loading'}
            />
            <ShareButton
              icon={<Share2 size={24} color="#FFFFFF" />}
              label="Compartir"
              onPress={handleShare}
              isLoading={action === 'loading'}
            />
            <ShareButton
              icon={<MessageCircle size={24} color="#25D366" />}
              label="WhatsApp"
              onPress={handleWhatsApp}
              isLoading={action === 'loading'}
              iconBg="bg-zinc-800"
            />
            <ShareButton
              icon={<QrCode size={24} color="#FFFFFF" />}
              label="QR Code"
              onPress={handleShowQR}
              isLoading={action === 'loading'}
            />
          </View>

          {/* Success/Error Message */}
          {action === 'success' && successMessage && (
            <Animated.View
              entering={FadeIn}
              className="flex-row items-center justify-center gap-2 mb-4"
            >
              <View className="bg-green-500/20 p-2 rounded-full">
                <Check size={16} color="#22C55E" />
              </View>
              <Text className="text-green-500 font-semibold">{successMessage}</Text>
            </Animated.View>
          )}

          {/* Main CTA */}
          <View className="px-5 pb-4">
            <Pressable
              onPress={handleCopyLink}
              className="bg-savage-red py-4 rounded-2xl flex-row items-center justify-center gap-3 active:opacity-90"
              style={{
                shadowColor: '#DC2626',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              {action === 'loading' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Link2 size={20} color="#FFFFFF" />
                  <Text className="text-white font-bold text-base">Copiar enlace</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}

// =============================================================================
// SHARE BUTTON COMPONENT
// =============================================================================

interface ShareButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  iconBg?: string;
}

function ShareButton({
  icon,
  label,
  onPress,
  isLoading,
  iconBg = 'bg-zinc-800',
}: ShareButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className="items-center"
      style={({ pressed }) => ({
        opacity: pressed || isLoading ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      <View className={`w-14 h-14 rounded-2xl items-center justify-center ${iconBg}`}>{icon}</View>
      <Text className="text-zinc-400 text-xs mt-2 font-medium">{label}</Text>
    </Pressable>
  );
}

export default ShareModal;
