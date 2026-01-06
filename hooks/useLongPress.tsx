// ============================================================================
// useLongPress - Hook cross-platform para long press
// Funciona correctamente en Web (mouse) y Native (touch)
// ============================================================================

import { useRef, useCallback } from 'react';
import { Platform, GestureResponderEvent } from 'react-native';

interface UseLongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  delay?: number;
  disabled?: boolean;
}

interface LongPressHandlers {
  onPressIn?: (e: GestureResponderEvent) => void;
  onPressOut?: (e: GestureResponderEvent) => void;
  onPress?: (e: GestureResponderEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

/**
 * Hook para manejar long press de forma cross-platform
 * En Web usa mousedown/mouseup, en Native usa los eventos táctiles nativos
 */
export function useLongPress({
  onLongPress,
  onPress,
  delay = 500,
  disabled = false,
}: UseLongPressOptions): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (disabled) return;

    isLongPressRef.current = false;
    clearTimer();

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay, disabled, clearTimer]);

  const handleEnd = useCallback(() => {
    const wasLongPress = isLongPressRef.current;
    clearTimer();

    // Si no fue long press y hay onPress, ejecutarlo
    if (!wasLongPress && onPress) {
      onPress();
    }

    isLongPressRef.current = false;
  }, [clearTimer, onPress]);

  if (Platform.OS === 'web') {
    // En Web usamos eventos de mouse
    return {
      onMouseDown: (e: React.MouseEvent) => {
        // Solo click izquierdo
        if (e.button !== 0) return;
        startPosRef.current = { x: e.clientX, y: e.clientY };
        startTimer();
      },
      onMouseUp: () => {
        handleEnd();
      },
      onMouseLeave: () => {
        clearTimer();
        isLongPressRef.current = false;
      },
      // Prevenir menú contextual en long press
      onContextMenu: (e: React.MouseEvent) => {
        if (isLongPressRef.current) {
          e.preventDefault();
        }
      },
    };
  }

  // En Native usamos los eventos táctiles de React Native
  return {
    onPressIn: () => {
      startTimer();
    },
    onPressOut: () => {
      handleEnd();
    },
  };
}

// ============================================================================
// WebLongPressable - Componente wrapper para elementos con long press en web
// ============================================================================

import React from 'react';
import { View, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface WebLongPressableProps extends Omit<TouchableOpacityProps, 'onLongPress'> {
  onLongPress?: () => void;
  delayLongPress?: number;
  children: React.ReactNode;
}

/**
 * TouchableOpacity que funciona correctamente con long press en Web
 */
export const WebLongPressable: React.FC<WebLongPressableProps> = ({
  onPress,
  onLongPress,
  delayLongPress = 500,
  disabled,
  children,
  ...props
}) => {
  const longPressHandlers = useLongPress({
    onLongPress: onLongPress || (() => {}),
    onPress: onPress as (() => void) | undefined,
    delay: delayLongPress,
    disabled: disabled || !onLongPress,
  });

  if (Platform.OS === 'web') {
    // En web, usamos View con eventos de mouse
    return (
      <View
        {...(props as any)}
        {...longPressHandlers}
        style={[{ cursor: disabled ? 'default' : 'pointer' }, props.style]}
      >
        {children}
      </View>
    );
  }

  // En native, usamos TouchableOpacity normal
  return (
    <TouchableOpacity
      {...props}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
};

export default useLongPress;
