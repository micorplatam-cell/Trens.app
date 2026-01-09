// ============================================================================
// BOTTOM SHEET MODAL - Componente unificado para modales desde abajo
// Incluye: Cierre fluido con gestos, vibración al abrir, estilo Savage Mode
// ============================================================================

import React, { useRef, useEffect, useCallback, ReactNode } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '../../lib/haptics';
import { X } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================
interface BottomSheetModalProps {
  /** Si el modal está visible */
  visible: boolean;
  /** Callback para cerrar el modal */
  onClose: () => void;
  /** Título del modal (opcional) */
  title?: string;
  /** Subtítulo o descripción (opcional) */
  subtitle?: string;
  /** Icono a mostrar junto al título (ReactNode) */
  titleIcon?: ReactNode;
  /** Altura del modal: 'auto' | 'half' | 'full' | number (porcentaje 0-100) */
  height?: 'auto' | 'half' | 'full' | number;
  /** Si mostrar el botón X de cerrar */
  showCloseButton?: boolean;
  /** Si el contenido debe ser scrolleable */
  scrollable?: boolean;
  /** Color de acento para el borde superior */
  accentColor?: string;
  /** Children del modal */
  children: ReactNode;
  /** Header personalizado (reemplaza el header por defecto) */
  customHeader?: ReactNode;
  /** Si deshabilitar el cierre por gesto */
  disableGestureDismiss?: boolean;
  /** Umbral de deslizamiento para cerrar (px) - default 100 */
  dismissThreshold?: number;
  /** Si deshabilitar la vibración al abrir */
  disableOpenHaptic?: boolean;
  /** Estilo del contenedor del contenido */
  contentContainerClassName?: string;
  /** Footer fijo en la parte inferior */
  footer?: ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================
export function BottomSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  titleIcon,
  height = 'auto',
  showCloseButton = false,
  scrollable = true,
  accentColor = '#DC2626', // Savage Red por defecto
  children,
  customHeader,
  disableGestureDismiss = false,
  dismissThreshold = 100,
  disableOpenHaptic = false,
  contentContainerClassName = '',
  footer,
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets();

  // Animated value para el desplazamiento del panel
  const translateY = useSharedValue(0);
  const isClosing = useRef(false);

  // -------------------------------------------------------------------------
  // CALCULAR ALTURA DEL MODAL
  // -------------------------------------------------------------------------
  const getModalHeight = (): string | number => {
    if (height === 'auto') return 'auto';
    if (height === 'half') return SCREEN_HEIGHT * 0.5;
    if (height === 'full') return SCREEN_HEIGHT * 0.92;
    if (typeof height === 'number') return SCREEN_HEIGHT * (height / 100);
    return 'auto';
  };

  const modalHeight = getModalHeight();

  // -------------------------------------------------------------------------
  // VIBRACIÓN AL ABRIR
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (visible && !disableOpenHaptic) {
      // Pequeño delay para que coincida con el final de la animación de entrada
      const timer = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, disableOpenHaptic]);

  // -------------------------------------------------------------------------
  // RESET AL ABRIR/CERRAR
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      isClosing.current = false;
    }
  }, [visible, translateY]);

  // -------------------------------------------------------------------------
  // HANDLER DE CIERRE
  // -------------------------------------------------------------------------
  const handleClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  // -------------------------------------------------------------------------
  // PAN RESPONDER - Cierre deslizando hacia abajo
  // -------------------------------------------------------------------------
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disableGestureDismiss,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disableGestureDismiss && Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        // Solo permitir deslizar hacia abajo
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > dismissThreshold) {
          // Cerrar el modal
          handleClose();
        } else {
          // Volver a la posición original con spring
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        }
      },
    })
  ).current;

  // -------------------------------------------------------------------------
  // ANIMATED STYLE
  // -------------------------------------------------------------------------
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // -------------------------------------------------------------------------
  // RENDER HEADER
  // -------------------------------------------------------------------------
  const renderHeader = () => {
    if (customHeader) {
      return (
        <View {...panResponder.panHandlers}>
          {/* Indicador de drag */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 bg-zinc-600 rounded-full" />
          </View>
          {customHeader}
        </View>
      );
    }

    return (
      <View
        {...panResponder.panHandlers}
        className="px-5 pt-3 pb-4 border-b border-white/10 bg-[#141414] rounded-t-3xl"
      >
        {/* Indicador de drag - Siempre visible para feedback visual */}
        <View className="items-center mb-3">
          <View className="w-10 h-1 bg-zinc-600 rounded-full" />
        </View>

        {/* Título y controles */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            {titleIcon && <View className="mr-3">{titleIcon}</View>}
            <View className="flex-1">
              {title && <Text className="text-white font-bold text-lg">{title}</Text>}
              {subtitle && <Text className="text-zinc-500 text-xs mt-0.5">{subtitle}</Text>}
            </View>
          </View>

          {showCloseButton && (
            <Pressable
              onPress={handleClose}
              className="w-9 h-9 rounded-full bg-zinc-800/80 items-center justify-center ml-3"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
              }}
            >
              <X size={18} color="#A1A1AA" />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------------------
  // RENDER CONTENT
  // -------------------------------------------------------------------------
  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          className={`flex-1 ${contentContainerClassName}`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {children}
        </ScrollView>
      );
    }

    return <View className={`flex-1 ${contentContainerClassName}`}>{children}</View>;
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/80 justify-end">
        {/* Backdrop pressable para cerrar */}
        <Pressable className="flex-1" onPress={handleClose} />

        {/* Panel del modal */}
        <Animated.View
          style={[
            styles.modalPanel,
            {
              maxHeight: SCREEN_HEIGHT * 0.92,
              ...(modalHeight !== 'auto' && { height: modalHeight }),
              borderTopColor: `${accentColor}40`,
              shadowColor: accentColor,
            } as ViewStyle,
            animatedStyle,
          ]}
        >
          {/* Línea de acento superior */}
          <View style={[styles.accentLine, { backgroundColor: accentColor }]} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
            keyboardVerticalOffset={0}
          >
            {/* Header */}
            {renderHeader()}

            {/* Content */}
            {renderContent()}

            {/* Footer fijo */}
            {footer && (
              <View
                className="border-t border-white/10 bg-[#0a0a0a]"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
              >
                {footer}
              </View>
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  modalPanel: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: -1,
    left: 0,
    right: 0,
    height: 3,
    opacity: 1,
  },
});

// ============================================================================
// HOOK: useBottomSheet - Para controlar el estado del modal
// ============================================================================
export function useBottomSheet(initialState = false) {
  const [isVisible, setIsVisible] = React.useState(initialState);

  const open = useCallback(() => {
    setIsVisible(true);
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    isVisible,
    open,
    close,
    toggle,
  };
}

export default BottomSheetModal;
