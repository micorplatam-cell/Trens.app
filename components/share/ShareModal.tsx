// =============================================================================
// SHARE MODAL - Modal profesional para compartir videos
// =============================================================================

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import { Link2, Share2, MessageCircle, QrCode, Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from '../../lib/haptics';
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

  // -------------------------------------------------------------------------
  // PAN RESPONDER - Cerrar deslizando hacia abajo
  // -------------------------------------------------------------------------
  const panY = useRef(new RNAnimated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // Cerrar con animación fluida
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleClose();
        } else {
          // Volver arriba
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          RNAnimated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Resetear panY cuando el modal se abre
  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [visible, panY]);

  const animatedStyle = {
    transform: [{ translateY: panY }],
  };

  const options: ShareVideoOptions = {
    videoId,
    title,
    exerciseName,
    weightKg,
    reps,
  };

  const resetState = useCallback(() => {
    setAction('idle');
    setShowQR(false);
    setSuccessMessage('');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 bg-black/80 justify-end"
      >
        <Pressable className="flex-1" onPress={handleClose} />

        <RNAnimated.View
          style={[{ backgroundColor: '#18181b' }, animatedStyle]}
          className="rounded-t-3xl overflow-hidden"
        >
          {/* Header - Draggable para cerrar */}
          <View {...panResponder.panHandlers} className="px-5 pt-4 pb-4">
            {/* Indicador de drag */}
            <View className="items-center mb-3">
              <View className="w-10 h-1 bg-zinc-600 rounded-full" />
            </View>
            <Text className="text-white font-bold text-lg text-center">Compartir</Text>
          </View>

          {/* Preview Card */}
          <View className="mx-5 mb-5 bg-zinc-800 rounded-2xl overflow-hidden">
            <View className="flex-row items-center p-4">
              {thumbnailUrl ? (
                <Image
                  source={{ uri: thumbnailUrl }}
                  className="w-16 h-16 rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-xl bg-zinc-700 items-center justify-center">
                  <Text className="text-2xl">🎬</Text>
                </View>
              )}
              <View className="flex-1 ml-4">
                <Text className="text-white font-bold text-base" numberOfLines={2}>
                  {displayTitle}
                </Text>
                <Text className="text-zinc-400 text-sm mt-1 font-mono" numberOfLines={1}>
                  {shareUrl.replace('https://', '')}
                </Text>
              </View>
            </View>
          </View>

          {/* QR Code View */}
          {showQR ? (
            <View className="items-center pb-8 px-5">
              <View className="bg-white p-4 rounded-2xl mb-4">
                <Image
                  source={{ uri: qrUrl }}
                  className="w-[280px] h-[280px]"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-zinc-400 text-sm text-center mb-4">
                Escanea el código para ver el video
              </Text>
              <Pressable
                onPress={() => setShowQR(false)}
                className="bg-zinc-800 px-6 py-3 rounded-xl"
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
              <View className="px-5 pb-8">
                <Pressable
                  onPress={handleCopyLink}
                  className="bg-red-600 py-4 rounded-2xl flex-row items-center justify-center gap-3"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
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
        </RNAnimated.View>
      </Animated.View>
    </Modal>
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
