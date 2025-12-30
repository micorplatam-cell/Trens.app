// ============================================================================
// USE HANK TARGET - Hook para registrar componentes como targets de Hank
// Permite que cualquier componente sea "targeteable" por las animaciones
// ============================================================================

import { useRef, useCallback, useEffect } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { useHank } from '../context/HankContext';
import type { HankTarget } from '../types/hank';

export type HankTargetType = HankTarget['type'];

interface UseHankTargetOptions {
  id: string;
  type: HankTargetType;
  label: string;
  enabled?: boolean;
}

interface UseHankTargetReturn {
  /**
   * Ref to attach to the target View component
   */
  targetRef: React.RefObject<View | null>;

  /**
   * onLayout handler to capture position updates
   */
  onLayout: (event: LayoutChangeEvent) => void;

  /**
   * Manually trigger animation to this target
   */
  highlightTarget: () => void;

  /**
   * Check if this target is currently being highlighted
   */
  isHighlighted: boolean;

  /**
   * Current animation phase when this target is highlighted
   */
  animationPhase: 'idle' | 'flying' | 'working' | 'success' | 'returning';
}

/**
 * Hook to register a component as a Hank target
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { targetRef, onLayout, isHighlighted } = useHankTarget({
 *     id: 'meal-123',
 *     type: 'meal',
 *     label: 'Desayuno',
 *   });
 *
 *   return (
 *     <View ref={targetRef} onLayout={onLayout}>
 *       {/* Your component content *\/}
 *     </View>
 *   );
 * };
 * ```
 */
export function useHankTarget(options: UseHankTargetOptions): UseHankTargetReturn {
  const { id, type, label, enabled = true } = options;
  const targetRef = useRef<View>(null);
  const positionRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const hasRegistered = useRef(false);

  const { targetState } = useHank();
  const { registerTarget, unregisterTarget, currentTarget, startAnimation, animationPhase } =
    targetState;

  // Función para medir y registrar
  const measureAndRegister = useCallback(() => {
    if (!enabled || !targetRef.current) return;

    targetRef.current.measureInWindow((x, y, width, height) => {
      if (x !== undefined && y !== undefined && width > 0 && height > 0) {
        positionRef.current = { x, y, width, height };

        // Register with updated position
        registerTarget(id, {
          type,
          label,
          position: { x, y, width, height },
        });
        hasRegistered.current = true;
        console.warn(
          `🎯 Target registrado: ${id} (${label}) en x:${x.toFixed(0)}, y:${y.toFixed(0)}`
        );
      }
    });
  }, [id, type, label, enabled, registerTarget]);

  // Register/unregister on mount/unmount
  useEffect(() => {
    if (!enabled) return;

    // Intentar registrar después de un pequeño delay (para que el componente esté montado)
    const timer = setTimeout(() => {
      measureAndRegister();
    }, 100);

    return () => {
      clearTimeout(timer);
      unregisterTarget(id);
      hasRegistered.current = false;
    };
  }, [id, enabled, unregisterTarget, measureAndRegister]);

  // Handle layout changes - también actualizar posición
  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      measureAndRegister();
    },
    [measureAndRegister]
  );

  // Manually trigger highlight
  const highlightTarget = useCallback(() => {
    if (!enabled || !positionRef.current.width) return;

    startAnimation({
      id,
      type,
      label,
      position: positionRef.current,
    });
  }, [id, type, label, enabled, startAnimation]);

  // Check if this target is highlighted
  const isHighlighted = currentTarget?.id === id;

  // Get the animation phase for this target (only relevant when highlighted)
  const targetAnimationPhase = isHighlighted ? animationPhase : 'idle';

  return {
    targetRef,
    onLayout,
    highlightTarget,
    isHighlighted,
    animationPhase: targetAnimationPhase,
  };
}

export default useHankTarget;
