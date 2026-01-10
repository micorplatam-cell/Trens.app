// ============================================================================
// DRAGGABLE WORKOUT BLOCK - Implementación Profesional
// Patrón usado: Single DOM element con CSS transforms
// El drag se activa con long-press en el header "BLOQUE ENTRENO"
// ============================================================================

import React, { useState, useRef, useEffect, useCallback, RefObject } from 'react';
import { Platform, ScrollView, Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Haptics } from '../../lib/haptics';
import { WorkoutBlock } from './WorkoutBlock';

// Constantes
const AUTO_SCROLL_THRESHOLD = 80;
const AUTO_SCROLL_SPEED = 5; // Reducido de 8 para scroll más suave
const LONG_PRESS_DELAY = 400;
const ITEM_HEIGHT_COMPRESSED = 85;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  scrollRef?: RefObject<ScrollView | null>;
}

// ============================================================================
// WEB DRAGGABLE COMPONENT
// Principios: Sin render condicional, mismo DOM siempre, CSS transforms
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
}) => {
  // Estado mínimo
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  // Refs - Nunca cambian durante el ciclo de vida del componente
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDraggingRef = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const dragStartPointerY = useRef<number>(0); // Posición Y donde inició el drag (para ignorar auto-scroll inicial)
  const dragStartIndex = useRef(currentIndex);
  const lastReportedIndex = useRef(currentIndex);
  const pressStartY = useRef(0);
  const dragStartY = useRef(0);
  const currentPointerY = useRef(0);
  const scrollableParent = useRef<HTMLElement | null>(null);
  const initialScrollTop = useRef(0);
  const initialCompressionOffset = useRef(0); // Offset inicial por compresión de tarjetas anteriores

  // Sincronizar cuando cambia el índice (solo si no estamos arrastrando)
  useEffect(() => {
    if (!isDraggingRef.current) {
      dragStartIndex.current = currentIndex;
      lastReportedIndex.current = currentIndex;
    }
  }, [currentIndex]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, []);

  // Encontrar scrollable parent
  const findScrollableParent = useCallback((): HTMLElement | null => {
    if (!containerRef.current) return null;

    // Buscar por data attribute primero
    const dataScroll = containerRef.current.closest('[data-scroll-container]') as HTMLElement;
    if (dataScroll) return dataScroll;

    // Buscar por overflow
    let parent = containerRef.current.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }, []);

  // Calcular índice objetivo
  const calculateTargetIndex = useCallback((): number => {
    if (!isDraggingRef.current) return currentIndex;

    const fingerMovement = currentPointerY.current - dragStartY.current;
    const scrollDelta = (scrollableParent.current?.scrollTop || 0) - initialScrollTop.current;
    // IMPORTANTE: Incluir el offset de compresión para que las tarjetas
    // reaccionen a la posición VISUAL del bloque (donde está el dedo)
    const totalMovement = initialCompressionOffset.current + fingerMovement + scrollDelta;

    const positions = Math.round(totalMovement / ITEM_HEIGHT_COMPRESSED);
    const newIndex = dragStartIndex.current + positions;

    return Math.max(0, Math.min(totalItems - 1, newIndex));
  }, [currentIndex, totalItems]);

  // Actualizar translateY para seguir al dedo
  const updateTranslateY = useCallback(() => {
    const fingerMovement = currentPointerY.current - dragStartY.current;
    const scrollDelta = (scrollableParent.current?.scrollTop || 0) - initialScrollTop.current;
    // Incluir el offset inicial de compresión para mantener el bloque en el dedo
    setTranslateY(initialCompressionOffset.current + fingerMovement + scrollDelta);
  }, []);

  // Parar auto-scroll
  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, []);

  // Iniciar auto-scroll
  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) return;

    autoScrollTimer.current = setInterval(() => {
      if (!isDraggingRef.current || !scrollableParent.current) {
        stopAutoScroll();
        return;
      }

      const pointerY = currentPointerY.current;
      const headerHeight = 140;
      const bottomPadding = 100;
      const topZone = headerHeight + AUTO_SCROLL_THRESHOLD;
      const bottomZone = window.innerHeight - bottomPadding - AUTO_SCROLL_THRESHOLD;

      // IMPORTANTE: Solo activar auto-scroll si el usuario ha MOVIDO el dedo
      // hacia la zona de scroll (no si empezó el drag ahí)
      const fingerMovement = Math.abs(pointerY - dragStartPointerY.current);
      const MIN_MOVEMENT_FOR_AUTOSCROLL = 30; // Mínimo 30px de movimiento
      
      if (fingerMovement < MIN_MOVEMENT_FOR_AUTOSCROLL) {
        return; // No hacer auto-scroll hasta que el usuario mueva el dedo
      }

      let scrollDelta = 0;

      if (pointerY < topZone && pointerY > headerHeight) {
        const intensity = 1 - (pointerY - headerHeight) / AUTO_SCROLL_THRESHOLD;
        scrollDelta = -AUTO_SCROLL_SPEED * Math.max(0.3, intensity);
      } else if (pointerY > bottomZone) {
        const intensity = (pointerY - bottomZone) / AUTO_SCROLL_THRESHOLD;
        scrollDelta = AUTO_SCROLL_SPEED * Math.max(0.3, intensity);
      }

      if (scrollDelta !== 0) {
        const oldScrollTop = scrollableParent.current.scrollTop;
        const maxScroll = scrollableParent.current.scrollHeight - scrollableParent.current.clientHeight;
        
        // Limitar el scroll para no ir más allá del contenido
        const newScrollTop = Math.max(0, Math.min(maxScroll, oldScrollTop + scrollDelta));
        scrollableParent.current.scrollTop = newScrollTop;

        // Si realmente scrolleó, actualizar
        if (scrollableParent.current.scrollTop !== oldScrollTop) {
          updateTranslateY();

          const targetIndex = calculateTargetIndex();
          if (targetIndex !== lastReportedIndex.current) {
            lastReportedIndex.current = targetIndex;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onPositionChange) onPositionChange(targetIndex);
          }
        }
      }
    }, 16);
  }, [calculateTargetIndex, onPositionChange, stopAutoScroll, updateTranslateY]);

  // Limpiar todo
  const cleanup = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    stopAutoScroll();
  }, [stopAutoScroll]);

  // Finalizar drag
  const finishDrag = useCallback(() => {
    if (!isDraggingRef.current) return;

    stopAutoScroll();

    const finalIndex = calculateTargetIndex();
    const startIndex = dragStartIndex.current;

    // Resetear estado
    isDraggingRef.current = false;
    setIsDragging(false);
    setTranslateY(0);
    activePointerId.current = null;

    // Callback
    if (finalIndex !== startIndex) {
      onDragEnd(finalIndex);
    } else if (onDragCancel) {
      onDragCancel();
    }
  }, [calculateTargetIndex, onDragCancel, onDragEnd, stopAutoScroll]);

  // POINTER DOWN en el handle
  const handlePointerDownOnHandle = useCallback(
    (e: React.PointerEvent) => {
      // Prevenir comportamiento por defecto
      e.stopPropagation();
      e.preventDefault();

      // Si ya hay un pointer activo, ignorar
      if (activePointerId.current !== null) return;

      activePointerId.current = e.pointerId;
      const pointerY = e.clientY;
      pressStartY.current = pointerY;
      currentPointerY.current = pointerY;

      // Preparar scroll tracking
      scrollableParent.current = findScrollableParent();
      initialScrollTop.current = scrollableParent.current?.scrollTop || 0;

      // Sincronizar índices
      dragStartIndex.current = currentIndex;
      lastReportedIndex.current = currentIndex;

      // Capturar pointer inmediatamente en el container
      if (containerRef.current) {
        try {
          containerRef.current.setPointerCapture(e.pointerId);
        } catch {
          // Ignorar errores de captura
        }
      }

      // Timer de long-press
      longPressTimer.current = setTimeout(() => {
        // Verificar que seguimos con el mismo pointer
        if (activePointerId.current !== e.pointerId) return;

        // Activar drag ANTES de onDragStart para que el estado local esté listo
        isDraggingRef.current = true;
        setIsDragging(true);

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Llamar onDragStart - esto causa que el padre comprima las tarjetas
        if (onDragStart) onDragStart();

        // CRÍTICO: Esperar a que React re-renderice después de la compresión
        // Usamos DOBLE requestAnimationFrame para asegurar que el DOM está actualizado
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // IMPORTANTE: Después de la compresión, el elemento puede haber SUBIDO
            // porque las tarjetas anteriores se encogieron.
            // Necesitamos calcular el offset inicial para que el bloque
            // aparezca EXACTAMENTE donde está el dedo.
            
            if (!containerRef.current) return;
            
            // Obtener la posición REAL del elemento después de la compresión
            const elementRect = containerRef.current.getBoundingClientRect();
            const elementCenterY = elementRect.top + elementRect.height / 2;
            
            // El dedo está en currentPointerY.current
            // El elemento está en elementCenterY
            // El offset inicial es la diferencia (para que el centro del elemento
            // esté donde está el dedo)
            const initialOffset = currentPointerY.current - elementCenterY;
            
            // Guardar el offset inicial de compresión para usarlo en updateTranslateY
            initialCompressionOffset.current = initialOffset;
            
            // Establecer dragStartY
            dragStartY.current = currentPointerY.current;
            
            // Guardar posición inicial para control de auto-scroll
            dragStartPointerY.current = currentPointerY.current;

            // Actualizar scroll inicial
            initialScrollTop.current = scrollableParent.current?.scrollTop || 0;

            // CLAVE: Empezar con el offset inicial para que el bloque
            // aparezca donde está el dedo, no donde quedó después de comprimir
            setTranslateY(initialOffset);

            // Iniciar auto-scroll
            startAutoScroll();
          });
        });
      }, LONG_PRESS_DELAY);
    },
    [currentIndex, findScrollableParent, onDragStart, startAutoScroll]
  );

  // POINTER MOVE (en el container para capturar todo el movimiento)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Solo procesar nuestro pointer
      if (activePointerId.current !== e.pointerId) return;

      currentPointerY.current = e.clientY;

      // Si estamos arrastrando
      if (isDraggingRef.current) {
        e.preventDefault();
        updateTranslateY();

        const targetIndex = calculateTargetIndex();
        if (targetIndex !== lastReportedIndex.current) {
          lastReportedIndex.current = targetIndex;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (onPositionChange) onPositionChange(targetIndex);
        }
        return;
      }

      // Si aún no arrastramos, cancelar si se movió mucho
      if (longPressTimer.current) {
        const moved = Math.abs(e.clientY - pressStartY.current);
        if (moved > 15) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;

          // Liberar pointer
          if (containerRef.current) {
            try {
              containerRef.current.releasePointerCapture(e.pointerId);
            } catch {
              // Ignorar
            }
          }
          activePointerId.current = null;
        }
      }
    },
    [calculateTargetIndex, onPositionChange, updateTranslateY]
  );

  // POINTER UP
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerId.current !== e.pointerId) return;

      cleanup();

      // Liberar pointer
      if (containerRef.current) {
        try {
          containerRef.current.releasePointerCapture(e.pointerId);
        } catch {
          // Ignorar
        }
      }

      if (isDraggingRef.current) {
        finishDrag();
      } else {
        activePointerId.current = null;
      }
    },
    [cleanup, finishDrag]
  );

  // POINTER CANCEL
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      handlePointerUp(e);
    },
    [handlePointerUp]
  );

  // Estilos del handle
  const handleStyle: React.CSSProperties = {
    cursor: isDragging ? 'grabbing' : isHoveringHandle ? 'grab' : 'default',
    touchAction: 'none',
  };

  // Estilos del container
  const containerStyle: React.CSSProperties = {
    transform: isDragging ? `translateY(${translateY}px) scale(0.98)` : 'none',
    zIndex: isDragging ? 1000 : 1,
    position: 'relative',
    opacity: isDragging ? 0.95 : 1,
    boxShadow: isDragging ? '0 10px 40px rgba(220, 38, 38, 0.5)' : 'none',
    transition: isDragging ? 'none' : 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
    willChange: isDragging ? 'transform' : 'auto',
    userSelect: 'none',
    touchAction: isDragging ? 'none' : 'auto',
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={containerStyle}
    >
      <WorkoutBlock
        data={data}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        isFirst={currentIndex === 0}
        isLast={currentIndex >= totalItems - 1}
        onPressRoutine={onPressRoutine}
        isCompressed={isDragging}
        dragHandleProps={{
          onPointerDown: handlePointerDownOnHandle,
          onPointerEnter: () => setIsHoveringHandle(true),
          onPointerLeave: () => setIsHoveringHandle(false),
          style: handleStyle,
          isDragging,
        }}
      />
    </div>
  );
};

// ============================================================================
// NATIVE DRAGGABLE COMPONENT
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
  scrollRef,
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDraggingShared = useSharedValue(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const lastReportedIndex = useSharedValue(currentIndex);
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAbsoluteYRef = useRef(0);
  const scrollOffsetRef = useRef(0);

  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  const startAutoScroll = () => {
    if (autoScrollIntervalRef.current || !scrollRef?.current) return;

    autoScrollIntervalRef.current = setInterval(() => {
      if (!isDraggingState || !scrollRef?.current) {
        if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current);
          autoScrollIntervalRef.current = null;
        }
        return;
      }

      const absoluteY = currentAbsoluteYRef.current;
      const headerHeight = 140;
      const bottomPadding = 100;

      const topZone = headerHeight + AUTO_SCROLL_THRESHOLD;
      const bottomZone = SCREEN_HEIGHT - bottomPadding - AUTO_SCROLL_THRESHOLD;

      let scrollDelta = 0;

      if (absoluteY < topZone && absoluteY > headerHeight) {
        const intensity = 1 - (absoluteY - headerHeight) / AUTO_SCROLL_THRESHOLD;
        scrollDelta = -AUTO_SCROLL_SPEED * Math.max(0.3, intensity);
      } else if (absoluteY > bottomZone) {
        const intensity = (absoluteY - bottomZone) / AUTO_SCROLL_THRESHOLD;
        scrollDelta = AUTO_SCROLL_SPEED * Math.max(0.3, intensity);
      }

      if (scrollDelta !== 0) {
        scrollOffsetRef.current += scrollDelta;
        scrollRef.current.scrollTo({
          y: scrollOffsetRef.current,
          animated: false,
        });
      }
    }, 16);
  };

  const stopAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  const triggerHaptic = (style: 'heavy' | 'light') => {
    Haptics.impactAsync(
      style === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
    );
  };

  const gesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_DELAY)
    .onStart(() => {
      'worklet';
      isDraggingShared.value = true;
      scale.value = withSpring(0.98);
      zIndex.value = 1000;
      lastReportedIndex.value = currentIndex;
      runOnJS(triggerHaptic)('heavy');
      runOnJS(setIsDraggingState)(true);
      if (onDragStart) runOnJS(onDragStart)();
      runOnJS(startAutoScroll)();
    })
    .onUpdate((event) => {
      'worklet';
      translateY.value = event.translationY;
      runOnJS((y: number) => {
        currentAbsoluteYRef.current = y;
      })(event.absoluteY);

      const positions = Math.round(event.translationY / itemHeight);
      const newIndex = Math.max(0, Math.min(totalItems - 1, currentIndex + positions));

      if (newIndex !== lastReportedIndex.value) {
        lastReportedIndex.value = newIndex;
        runOnJS(triggerHaptic)('light');
        if (onPositionChange) runOnJS(onPositionChange)(newIndex);
      }
    })
    .onEnd((event) => {
      'worklet';
      runOnJS(stopAutoScroll)();

      const positions = Math.round(event.translationY / itemHeight);
      const newIndex = Math.max(0, Math.min(totalItems - 1, currentIndex + positions));

      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      zIndex.value = 1;
      isDraggingShared.value = false;
      runOnJS(setIsDraggingState)(false);

      if (newIndex !== currentIndex) {
        runOnJS(onDragEnd)(newIndex);
      } else if (onDragCancel) {
        runOnJS(onDragCancel)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    zIndex: zIndex.value,
    opacity: isDraggingShared.value ? 0.95 : 1,
  }));

  return (
    <Animated.View
      style={[
        {
          shadowColor: '#DC2626',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDraggingState ? 0.4 : 0,
          shadowRadius: 15,
          elevation: isDraggingState ? 10 : 0,
        },
        animatedStyle,
      ]}
    >
      <WorkoutBlock
        data={data}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        isFirst={currentIndex === 0}
        isLast={currentIndex >= totalItems - 1}
        onPressRoutine={onPressRoutine}
        isCompressed={isDraggingState}
        nativeGesture={gesture}
      />
    </Animated.View>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export const DraggableWorkoutBlock: React.FC<DraggableWorkoutBlockProps> = (props) => {
  if (Platform.OS === 'web') {
    return <WebDraggableWorkoutBlock {...props} />;
  }
  return <NativeDraggableWorkoutBlock {...props} />;
};
