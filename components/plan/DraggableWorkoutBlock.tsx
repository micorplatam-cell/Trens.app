// ============================================================================
// DRAGGABLE WORKOUT BLOCK - Wrapper con Drag & Drop
// Funciona en nativo con gesture-handler y en web con eventos de pointer
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Haptics } from '../../lib/haptics';
import { WorkoutBlock } from './WorkoutBlock';

interface StackItem {
  id: string;
  name: string;
  dose: string;
  type: 'pill' | 'syringe' | 'powder' | 'liquid';
  notes?: string;
}

interface Exercise {
  id: string;
  name: string;
  imageUrl?: string;
  videoUrl?: string;
  sets?: number;
  reps?: string;
}

interface WorkoutBlockData {
  id: string;
  routineName: string;
  preStack: StackItem[];
  postStack: StackItem[];
  exercises?: Exercise[];
  // Workout time estimation
  estimatedTime?: string | null;
  isFasted?: boolean;
  timeDescription?: string;
}

interface DraggableWorkoutBlockProps {
  data: WorkoutBlockData;
  currentIndex: number;
  totalItems: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragEnd: (newIndex: number) => void;
  onDragStart?: () => void;
  onDragCancel?: () => void;
  onPositionChange?: (targetIndex: number) => void;
  onPressRoutine?: () => void;
  itemHeight?: number;
}

// ============================================================================
// WEB DRAGGABLE COMPONENT - Usa eventos de pointer (mouse + touch)
// ============================================================================
const WebDraggableWorkoutBlock: React.FC<DraggableWorkoutBlockProps> = ({
  data,
  currentIndex,
  totalItems,
  onMoveUp,
  onMoveDown,
  onDragEnd,
  onDragStart,
  onDragCancel,
  onPositionChange,
  onPressRoutine,
  itemHeight = 150,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReportedIndexRef = useRef(currentIndex);
  const isDraggingRef = useRef(false);
  const currentTranslateRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null); // Guardar pointerId para capture

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Global pointer events for drag (works with mouse AND touch)
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      const deltaY = e.clientY - startYRef.current;
      currentTranslateRef.current = deltaY;
      setTranslateY(deltaY);

      // Calculate target position
      const movedPositions = Math.round(deltaY / itemHeight);
      let targetIndex = currentIndex + movedPositions;
      targetIndex = Math.max(0, Math.min(totalItems - 1, targetIndex));

      if (targetIndex !== lastReportedIndexRef.current) {
        lastReportedIndexRef.current = targetIndex;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPositionChange) onPositionChange(targetIndex);
      }
    };

    const handleGlobalPointerUp = () => {
      if (!isDraggingRef.current) return;

      // Calculate final position
      const movedPositions = Math.round(currentTranslateRef.current / itemHeight);
      let newIndex = currentIndex + movedPositions;
      newIndex = Math.max(0, Math.min(totalItems - 1, newIndex));

      // Reset state
      isDraggingRef.current = false;
      setIsDragging(false);
      setTranslateY(0);
      setScale(1);
      currentTranslateRef.current = 0;

      if (newIndex !== currentIndex) {
        onDragEnd(newIndex);
      } else if (onDragCancel) {
        onDragCancel();
      }
    };

    // Add global listeners
    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isDragging, currentIndex, totalItems, itemHeight, onDragEnd, onDragCancel, onPositionChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Guardar pointerId para usar en capture después del long-press
    pointerIdRef.current = e.pointerId;
    startYRef.current = e.clientY;

    // Long press detection (400ms)
    longPressTimerRef.current = setTimeout(() => {
      // Capturar pointer en el contenedor para recibir todos los eventos
      if (containerRef.current && pointerIdRef.current !== null) {
        containerRef.current.setPointerCapture(pointerIdRef.current);
      }
      isDraggingRef.current = true;
      setIsDragging(true);
      setScale(0.95);
      lastReportedIndexRef.current = currentIndex;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (onDragStart) onDragStart();
    }, 400);
  };

  // Ref para rastrear si estamos en modo scroll simulado
  const isScrollingRef = useRef(false);
  const lastScrollYRef = useRef(0);

  const handlePointerMove = (e: React.PointerEvent) => {
    // Si estamos arrastrando, manejar el movimiento aquí directamente
    if (isDraggingRef.current) {
      e.preventDefault();
      const deltaY = e.clientY - startYRef.current;
      currentTranslateRef.current = deltaY;
      setTranslateY(deltaY);

      // Calculate target position
      const movedPositions = Math.round(deltaY / itemHeight);
      let targetIndex = currentIndex + movedPositions;
      targetIndex = Math.max(0, Math.min(totalItems - 1, targetIndex));

      if (targetIndex !== lastReportedIndexRef.current) {
        lastReportedIndexRef.current = targetIndex;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPositionChange) onPositionChange(targetIndex);
      }
      return;
    }

    // Si aún no estamos arrastrando, verificar si debemos cancelar el long-press
    if (longPressTimerRef.current) {
      const deltaY = Math.abs(e.clientY - startYRef.current);
      if (deltaY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        // Activar modo scroll simulado
        isScrollingRef.current = true;
        lastScrollYRef.current = e.clientY;
      }
    }

    // Si estamos en modo scroll simulado, hacer scroll del contenedor padre
    if (isScrollingRef.current) {
      const scrollDelta = lastScrollYRef.current - e.clientY;
      lastScrollYRef.current = e.clientY;

      // Buscar el ScrollView padre y hacer scroll
      const scrollableParent = containerRef.current?.closest('[data-scroll-container]') as HTMLElement;
      if (scrollableParent) {
        scrollableParent.scrollTop += scrollDelta;
      } else {
        // Fallback: buscar cualquier contenedor con overflow scroll
        let parent = containerRef.current?.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            parent.scrollTop += scrollDelta;
            break;
          }
          parent = parent.parentElement;
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Reset scroll mode
    isScrollingRef.current = false;

    // Release pointer capture del contenedor
    if (containerRef.current && pointerIdRef.current !== null) {
      try {
        containerRef.current.releasePointerCapture(pointerIdRef.current);
      } catch {
        // Ignorar error si no hay capture activo
      }
    }
    pointerIdRef.current = null;

    // Cancelar long-press timer si existe
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Si estábamos arrastrando, finalizar el drag
    if (isDraggingRef.current) {
      const movedPositions = Math.round(currentTranslateRef.current / itemHeight);
      let newIndex = currentIndex + movedPositions;
      newIndex = Math.max(0, Math.min(totalItems - 1, newIndex));

      // Reset state
      isDraggingRef.current = false;
      setIsDragging(false);
      setTranslateY(0);
      setScale(1);
      currentTranslateRef.current = 0;

      if (newIndex !== currentIndex) {
        onDragEnd(newIndex);
      } else if (onDragCancel) {
        onDragCancel();
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    handlePointerUp(e);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.95 : 1,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
        position: 'relative',
        // Usar touch-action: none para tener control total, pero cancelar long-press si detectamos scroll
        touchAction: 'none',
        boxShadow: isDragging ? '0 8px 30px rgba(220, 38, 38, 0.4)' : 'none',
        transition: isDragging ? 'none' : 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
      }}
    >
      <WorkoutBlock
        data={data}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        isFirst={currentIndex === 0}
        isLast={currentIndex >= totalItems - 1}
        onPressRoutine={onPressRoutine}
        isCompressed={isDragging}
      />
    </div>
  );
};

// ============================================================================
// NATIVE DRAGGABLE COMPONENT - Usa react-native-gesture-handler
// ============================================================================
const NativeDraggableWorkoutBlock: React.FC<DraggableWorkoutBlockProps> = ({
  data,
  currentIndex,
  totalItems,
  onMoveUp,
  onMoveDown,
  onDragEnd,
  onDragStart,
  onDragCancel,
  onPositionChange,
  onPressRoutine,
  itemHeight = 150,
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDraggingShared = useSharedValue(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const lastReportedIndex = useSharedValue(currentIndex);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerLightHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const setDragging = (value: boolean) => {
    setIsDraggingState(value);
  };

  const handleDragStartInternal = () => {
    if (onDragStart) onDragStart();
  };

  const handleDragEndInternal = (newIndex: number) => {
    if (onDragCancel) onDragCancel();
    onDragEnd(newIndex);
  };

  const handleDragCancelInternal = () => {
    if (onDragCancel) onDragCancel();
  };

  const reportPositionChange = (targetIndex: number) => {
    if (onPositionChange) onPositionChange(targetIndex);
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(400)
    .onStart(() => {
      isDraggingShared.value = true;
      lastReportedIndex.value = currentIndex;
      zIndex.value = 100;
      scale.value = withSpring(0.95, { damping: 15 });
      runOnJS(setDragging)(true);
      runOnJS(triggerHaptic)();
      runOnJS(handleDragStartInternal)();
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;

      const movedPositions = Math.round(event.translationY / itemHeight);
      let targetIndex = currentIndex + movedPositions;
      targetIndex = Math.max(0, Math.min(totalItems - 1, targetIndex));

      if (targetIndex !== lastReportedIndex.value) {
        lastReportedIndex.value = targetIndex;
        runOnJS(reportPositionChange)(targetIndex);
        runOnJS(triggerLightHaptic)();
      }
    })
    .onEnd((event) => {
      const movedPositions = Math.round(event.translationY / itemHeight);
      let newIndex = currentIndex + movedPositions;
      newIndex = Math.max(0, Math.min(totalItems - 1, newIndex));

      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      scale.value = withSpring(1);
      zIndex.value = 1;
      isDraggingShared.value = false;
      runOnJS(setDragging)(false);

      if (newIndex !== currentIndex) {
        runOnJS(handleDragEndInternal)(newIndex);
      } else {
        runOnJS(handleDragCancelInternal)();
      }
    })
    .onFinalize(() => {
      if (isDraggingShared.value) {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        scale.value = withSpring(1);
        zIndex.value = 1;
        isDraggingShared.value = false;
        runOnJS(setDragging)(false);
        runOnJS(handleDragCancelInternal)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    zIndex: zIndex.value,
    opacity: isDraggingShared.value ? 0.95 : 1,
    shadowOpacity: isDraggingShared.value ? 0.4 : 0,
    shadowRadius: isDraggingShared.value ? 15 : 0,
    shadowOffset: { width: 0, height: isDraggingShared.value ? 8 : 0 },
    shadowColor: '#DC2626',
    elevation: isDraggingShared.value ? 10 : 0,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <WorkoutBlock
          data={data}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          isFirst={currentIndex === 0}
          isLast={currentIndex >= totalItems - 1}
          onPressRoutine={onPressRoutine}
          isCompressed={isDraggingState}
        />
      </Animated.View>
    </GestureDetector>
  );
};

// ============================================================================
// MAIN EXPORT - Platform-specific
// ============================================================================
export const DraggableWorkoutBlock: React.FC<DraggableWorkoutBlockProps> = (props) => {
  if (Platform.OS === 'web') {
    return <WebDraggableWorkoutBlock {...props} />;
  }
  return <NativeDraggableWorkoutBlock {...props} />;
};
