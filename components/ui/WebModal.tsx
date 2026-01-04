// ============================================================================
// WEB MODAL - Modal compatible con Web y Native
// Soluciona el problema de fondos transparentes en web
// ============================================================================

import React from 'react';
import { Modal, View, Platform, Pressable, ModalProps } from 'react-native';

interface WebModalProps extends Omit<ModalProps, 'transparent'> {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  transparent?: boolean;
  backdropColor?: string;
}

/**
 * Modal wrapper que funciona correctamente en Web y Native
 * En web, el backdrop transparente del Modal nativo no se renderiza,
 * así que agregamos un View con fondo absoluto
 */
export function WebModal({
  visible,
  onClose,
  children,
  transparent = true,
  backdropColor = 'rgba(0, 0, 0, 0.85)',
  animationType = 'slide',
  ...props
}: WebModalProps) {
  if (Platform.OS === 'web') {
    // En web, renderizamos un overlay fijo con backdrop
    if (!visible) return null;

    // Para fade/none usamos centrado, para slide usamos flex-end
    const isBottomSheet = animationType === 'slide';

    return (
      <View
        style={{
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isBottomSheet ? 'flex-end' : 'center',
          alignItems: 'stretch',
        }}
      >
        {/* Backdrop oscuro */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: backdropColor,
            zIndex: 1,
          }}
        />
        {/* Contenido del modal */}
        <View
          style={{
            flex: isBottomSheet ? undefined : 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isBottomSheet ? 'flex-end' : 'center',
            zIndex: 2,
          }}
          pointerEvents="box-none"
        >
          {children}
        </View>
      </View>
    );
  }

  // En Native, usar el Modal normal
  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onClose}
      {...props}
    >
      {children}
    </Modal>
  );
}

export default WebModal;
