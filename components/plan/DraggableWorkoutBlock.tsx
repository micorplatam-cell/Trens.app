// ============================================================================
// DRAGGABLE WORKOUT BLOCK - Wrapper con Drag & Drop
// ============================================================================

import React, { useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
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

export const DraggableWorkoutBlock: React.FC<DraggableWorkoutBlockProps> = ({
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
  itemHeight = 150, // Altura estimada de cada item
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

  const handleDragStart = () => {
    if (onDragStart) onDragStart();
  };

  const handleDragEnd = (newIndex: number) => {
    if (onDragCancel) onDragCancel();
    onDragEnd(newIndex);
  };

  const handleDragCancel = () => {
    if (onDragCancel) onDragCancel();
  };

  const reportPositionChange = (targetIndex: number) => {
    if (onPositionChange) onPositionChange(targetIndex);
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(400) // Activar después de 400ms de mantener presionado
    .onStart(() => {
      isDraggingShared.value = true;
      lastReportedIndex.value = currentIndex;
      zIndex.value = 100;
      scale.value = withSpring(0.95, { damping: 15 });
      runOnJS(setDragging)(true);
      runOnJS(triggerHaptic)();
      runOnJS(handleDragStart)();
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;

      // Calcular cuántas posiciones se ha movido
      const movedPositions = Math.round(event.translationY / itemHeight);
      let targetIndex = currentIndex + movedPositions;
      targetIndex = Math.max(0, Math.min(totalItems - 1, targetIndex));

      // Solo reportar si cambió el índice objetivo
      if (targetIndex !== lastReportedIndex.value) {
        lastReportedIndex.value = targetIndex;
        runOnJS(reportPositionChange)(targetIndex);
        runOnJS(triggerLightHaptic)();
      }
    })
    .onEnd((event) => {
      // Calcular nueva posición
      const movedPositions = Math.round(event.translationY / itemHeight);
      let newIndex = currentIndex + movedPositions;

      // Clamp al rango válido
      newIndex = Math.max(0, Math.min(totalItems - 1, newIndex));

      // Animar de vuelta
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      scale.value = withSpring(1);
      zIndex.value = 1;
      isDraggingShared.value = false;
      runOnJS(setDragging)(false);

      // Notificar fin del drag
      if (newIndex !== currentIndex) {
        runOnJS(handleDragEnd)(newIndex);
      } else {
        runOnJS(handleDragCancel)();
      }
    })
    .onFinalize(() => {
      // Asegurar que se resetea el estado si el gesto se cancela
      if (isDraggingShared.value) {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        scale.value = withSpring(1);
        zIndex.value = 1;
        isDraggingShared.value = false;
        runOnJS(setDragging)(false);
        runOnJS(handleDragCancel)();
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
