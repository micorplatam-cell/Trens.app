// ============================================================================
// DRAGGABLE WORKOUT BLOCK - Wrapper con Drag & Drop
// ============================================================================

import React from 'react';
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
  onPressRoutine,
  itemHeight = 150, // Altura estimada de cada item
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerLightHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDragEnd = (newIndex: number) => {
    onDragEnd(newIndex);
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(400) // Activar después de 400ms de mantener presionado
    .onStart(() => {
      isDragging.value = true;
      zIndex.value = 100;
      scale.value = withSpring(1.02);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;

      // Calcular cuántas posiciones se ha movido
      const movedPositions = Math.round(event.translationY / itemHeight);

      // Haptic feedback cuando cruza umbral de posición
      if (Math.abs(movedPositions) > 0 && Math.abs(event.translationY % itemHeight) < 20) {
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
      isDragging.value = false;

      // Si cambió de posición, notificar
      if (newIndex !== currentIndex) {
        runOnJS(handleDragEnd)(newIndex);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    zIndex: zIndex.value,
    opacity: isDragging.value ? 0.95 : 1,
    shadowOpacity: isDragging.value ? 0.3 : 0,
    shadowRadius: isDragging.value ? 10 : 0,
    shadowOffset: { width: 0, height: isDragging.value ? 10 : 0 },
    shadowColor: '#DC2626',
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
        />
      </Animated.View>
    </GestureDetector>
  );
};
