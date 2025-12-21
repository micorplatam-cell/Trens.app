// =============================================================================
// TRENS VIDEO SHARE SERVICE
// Genera enlaces compartibles para videos estilo TikTok/Instagram
// =============================================================================

import * as Clipboard from 'expo-clipboard';
import { Share, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

// Configuración del dominio de share
const SHARE_DOMAIN = 'https://share.trens.app';

export interface ShareVideoOptions {
  videoId: string;
  title?: string;
  exerciseName?: string;
  weightKg?: number;
  reps?: number;
}

export interface ShareResult {
  success: boolean;
  url?: string;
  error?: string;
}

// =============================================================================
// GENERAR URL DE SHARE
// =============================================================================
export function generateShareUrl(videoId: string): string {
  return `${SHARE_DOMAIN}/v/${videoId}`;
}

// =============================================================================
// GENERAR TEXTO PARA COMPARTIR
// =============================================================================
export function generateShareText(options: ShareVideoOptions): string {
  const { title, exerciseName, weightKg, reps } = options;
  
  // Formatear stats
  const stats = [
    weightKg ? `${weightKg}kg` : null,
    reps ? `x${reps}` : null,
  ].filter(Boolean).join(' ');
  
  if (exerciseName && stats) {
    return `🔥 ${exerciseName} ${stats}\n\n`;
  }
  
  if (title) {
    return `🔥 ${title}\n\n`;
  }
  
  return '🔥 Check out my lift on TRENS\n\n';
}

// =============================================================================
// COMPARTIR VIDEO - SHEET NATIVO
// =============================================================================
export async function shareVideo(options: ShareVideoOptions): Promise<ShareResult> {
  const url = generateShareUrl(options.videoId);
  const text = generateShareText(options);
  
  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? {
            url,
            message: text,
          }
        : {
            message: `${text}${url}`,
          },
      {
        dialogTitle: 'Compartir video',
        subject: options.title || 'Mi entrenamiento en TRENS',
      }
    );

    if (result.action === Share.sharedAction) {
      // Incrementar contador de shares
      await incrementShareCount(options.videoId);
      
      return { success: true, url };
    }
    
    return { success: false, error: 'cancelled' };
  } catch (error) {
    console.error('Error sharing video:', error);
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// COPIAR ENLACE AL CLIPBOARD
// =============================================================================
export async function copyVideoLink(videoId: string): Promise<ShareResult> {
  const url = generateShareUrl(videoId);
  
  try {
    await Clipboard.setStringAsync(url);
    
    // Incrementar contador de shares
    await incrementShareCount(videoId);
    
    return { success: true, url };
  } catch (error) {
    console.error('Error copying link:', error);
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// COMPARTIR A APPS ESPECÍFICAS
// =============================================================================

// Compartir a Instagram Stories (requiere que el video esté en el dispositivo)
export async function shareToInstagramStory(
  videoLocalUri: string,
  options: ShareVideoOptions
): Promise<ShareResult> {
  // Instagram Stories requiere el URI local del video
  // Este es un flow más complejo que requiere:
  // 1. Descargar el video al dispositivo
  // 2. Usar expo-sharing o react-native-share con Instagram específico
  
  // Por ahora, fallback al share general
  return shareVideo(options);
}

// Compartir a WhatsApp
export async function shareToWhatsApp(options: ShareVideoOptions): Promise<ShareResult> {
  const url = generateShareUrl(options.videoId);
  const text = generateShareText(options);
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(`${text}${url}`)}`;
  
  try {
    const { Linking } = require('react-native');
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      await incrementShareCount(options.videoId);
      return { success: true, url };
    } else {
      // Fallback al share general
      return shareVideo(options);
    }
  } catch (error) {
    console.error('Error sharing to WhatsApp:', error);
    return shareVideo(options);
  }
}

// =============================================================================
// ANALYTICS: INCREMENTAR CONTADOR DE SHARES
// =============================================================================
async function incrementShareCount(videoId: string): Promise<void> {
  try {
    // Usar RPC o update directo dependiendo de tu schema
    await supabase.rpc('increment_share_count', { asset_id: videoId });
  } catch (error) {
    // No es crítico si falla el analytics
    console.warn('Failed to increment share count:', error);
  }
}

// =============================================================================
// GENERAR QR CODE URL (para mostrar QR en la app)
// =============================================================================
export function generateQRCodeUrl(videoId: string, size: number = 200): string {
  const shareUrl = generateShareUrl(videoId);
  // Usar API de QR codes (ej: goqr.me)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(shareUrl)}&bgcolor=000000&color=DC2626`;
}

// =============================================================================
// HOOK: SHARE OPTIONS MODAL DATA
// =============================================================================
export interface ShareOption {
  id: string;
  icon: string;
  label: string;
  color?: string;
  action: () => Promise<void>;
}

export function getShareOptions(
  options: ShareVideoOptions,
  onSuccess?: (url: string) => void,
  onError?: (error: string) => void
): ShareOption[] {
  return [
    {
      id: 'copy',
      icon: 'link',
      label: 'Copiar enlace',
      action: async () => {
        const result = await copyVideoLink(options.videoId);
        if (result.success) {
          onSuccess?.(result.url!);
        } else {
          onError?.(result.error || 'Error');
        }
      },
    },
    {
      id: 'share',
      icon: 'share-2',
      label: 'Compartir',
      action: async () => {
        const result = await shareVideo(options);
        if (result.success) {
          onSuccess?.(result.url!);
        }
      },
    },
    {
      id: 'whatsapp',
      icon: 'message-circle',
      label: 'WhatsApp',
      color: '#25D366',
      action: async () => {
        const result = await shareToWhatsApp(options);
        if (result.success) {
          onSuccess?.(result.url!);
        }
      },
    },
    {
      id: 'qr',
      icon: 'qr-code',
      label: 'Código QR',
      action: async () => {
        // Este lo manejamos diferente - abrimos un modal con el QR
        const qrUrl = generateQRCodeUrl(options.videoId, 300);
        onSuccess?.(qrUrl);
      },
    },
  ];
}
