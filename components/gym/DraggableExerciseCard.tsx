// ============================================================================
// DRAGGABLE EXERCISE CARD - Ejercicio con Drag & Drop y Swipe to Delete
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Trash2, GripVertical } from 'lucide-react-native';

// ============================================================================
// TYPES
// ============================================================================
interface SeriesConfig {
  id?: string;
  type: 'CALENTAMIENTO' | 'APROXIMACION' | 'EFECTIVA' | 'FALLO';
  reps: number | string;
  weight?: number | string;
  rest?: number;
  note?: string;
  notes?: string;
}

interface Exercise {
  id: string;
  name: string;
  image_url: string;
  video_url?: string;
  category?: string;
  series?: SeriesConfig[];
}

interface DraggableExerciseCardProps {
  exercise: Exercise;
  index: number;
  totalItems: number;
  onEdit: () => void;
  onDelete: () => void;
  onDragEnd: (newIndex: number) => void;
  onDragStart?: () => void;
  onDragCancel?: () => void;
  onPositionChange?: (targetIndex: number) => void;
  itemHeight?: number;
}

// ============================================================================
// SERIES TYPE COLORS - ESPAÑOL
// ============================================================================
const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  // Nombres en español
  CALENTAMIENTO: { bg: '#1e3a5f', border: '#3b82f6', text: '#60a5fa', label: 'C' },
  APROXIMACION: { bg: '#422006', border: '#f59e0b', text: '#fbbf24', label: 'A' },
  EFECTIVA: { bg: '#052e16', border: '#22c55e', text: '#4ade80', label: 'E' },
  FALLO: { bg: '#450a0a', border: '#ef4444', text: '#f87171', label: 'F' },
  // Fallback para datos legacy en inglés
  WARMUP: { bg: '#1e3a5f', border: '#3b82f6', text: '#60a5fa', label: 'C' },
  FEEDER: { bg: '#422006', border: '#f59e0b', text: '#fbbf24', label: 'A' },
  EFFECTIVE: { bg: '#052e16', border: '#22c55e', text: '#4ade80', label: 'E' },
  INTENSITY: { bg: '#450a0a', border: '#ef4444', text: '#f87171', label: 'I' },
};

// ============================================================================
// DELETE THRESHOLD
// ============================================================================
const DELETE_THRESHOLD = -100;

// ============================================================================
// COMPONENT
// ============================================================================
export const DraggableExerciseCard: React.FC<DraggableExerciseCardProps> = ({
  exercise,
  index,
  totalItems,
  onEdit,
  onDelete,
  onDragEnd,
  onDragStart,
  onDragCancel,
  onPositionChange,
  itemHeight = 88,
}) => {
  // Drag states
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDraggingShared = useSharedValue(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastReportedIndex = useSharedValue(index);

  // Swipe states
  const translateX = useSharedValue(0);
  const isSwipingShared = useSharedValue(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerLightHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const setDraggingState = (value: boolean) => {
    setIsDragging(value);
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

  const confirmDelete = () => {
    Alert.alert('🗑️ Eliminar ejercicio', `¿Eliminar "${exercise.name}" de este día?`, [
      {
        text: 'Cancelar',
        style: 'cancel',
        onPress: () => {
          translateX.value = withSpring(0);
        },
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete();
        },
      },
    ]);
  };

  // Pan gesture for reordering (long press + drag vertical)
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      isDraggingShared.value = true;
      lastReportedIndex.value = index;
      zIndex.value = 9999;
      scale.value = withSpring(1.05, { damping: 15 });
      runOnJS(setDraggingState)(true);
      runOnJS(triggerHaptic)();
      runOnJS(handleDragStart)();
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;

      const movedPositions = Math.round(event.translationY / itemHeight);
      let targetIndex = index + movedPositions;
      targetIndex = Math.max(0, Math.min(totalItems - 1, targetIndex));

      if (targetIndex !== lastReportedIndex.value) {
        lastReportedIndex.value = targetIndex;
        runOnJS(reportPositionChange)(targetIndex);
        runOnJS(triggerLightHaptic)();
      }
    })
    .onEnd((event) => {
      const movedPositions = Math.round(event.translationY / itemHeight);
      let newIndex = index + movedPositions;
      newIndex = Math.max(0, Math.min(totalItems - 1, newIndex));

      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      scale.value = withSpring(1);
      zIndex.value = 1;
      isDraggingShared.value = false;
      runOnJS(setDraggingState)(false);

      if (newIndex !== index) {
        runOnJS(handleDragEnd)(newIndex);
      } else {
        runOnJS(handleDragCancel)();
      }
    })
    .onFinalize(() => {
      if (isDraggingShared.value) {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        scale.value = withSpring(1);
        zIndex.value = 1;
        isDraggingShared.value = false;
        runOnJS(setDraggingState)(false);
        runOnJS(handleDragCancel)();
      }
    });

  // Swipe gesture for delete (horizontal swipe left)
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      isSwipingShared.value = true;
    })
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -150);
      }
    })
    .onEnd((event) => {
      isSwipingShared.value = false;
      if (event.translationX < DELETE_THRESHOLD) {
        translateX.value = withTiming(-100);
        runOnJS(triggerHaptic)();
        runOnJS(confirmDelete)();
      } else {
        translateX.value = withSpring(0, { damping: 20 });
      }
    });

  // Tap gesture for edit
  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(triggerLightHaptic)();
    runOnJS(onEdit)();
  });

  // Compose gestures
  const composedGesture = Gesture.Race(panGesture, Gesture.Simultaneous(tapGesture, swipeGesture));

  // Animated styles for main card
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  // Animated styles for delete background
  const deleteBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, DELETE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(translateX.value, [0, DELETE_THRESHOLD], [0.8, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const series = exercise.series || [];

  // Animated wrapper style - z-index debe aplicarse al contenedor exterior
  const wrapperAnimatedStyle = useAnimatedStyle(() => ({
    zIndex: zIndex.value,
    elevation: zIndex.value,
  }));

  return (
    <Animated.View className="mb-2" style={[wrapperAnimatedStyle, { position: 'relative' }]}>
      {/* DELETE BACKGROUND */}
      <Animated.View
        style={[
          deleteBackgroundStyle,
          {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 100,
            backgroundColor: '#DC2626',
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Trash2 size={24} color="#fff" />
        <Text className="text-white text-[10px] font-bold mt-1">ELIMINAR</Text>
      </Animated.View>

      {/* MAIN CARD */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle}>
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: isDragging ? '#1a1a1a' : '#0a0a0a',
              borderWidth: isDragging ? 2 : 1,
              borderColor: isDragging ? '#F97316' : '#27272a',
              shadowColor: isDragging ? '#F97316' : 'transparent',
              shadowOffset: { width: 0, height: isDragging ? 12 : 0 },
              shadowOpacity: isDragging ? 0.6 : 0,
              shadowRadius: isDragging ? 20 : 0,
              elevation: isDragging ? 20 : 0,
            }}
          >
            <View className="flex-row items-center p-3">
              {/* DRAG HANDLE */}
              <View className="mr-2 opacity-30">
                <GripVertical size={16} color="#71717a" />
              </View>

              {/* EXERCISE IMAGE */}
              <Image
                source={{ uri: exercise.image_url }}
                className="w-12 h-12 rounded-xl mr-3"
                contentFit="cover"
                style={{
                  borderWidth: 1,
                  borderColor: '#27272a',
                }}
              />

              {/* EXERCISE INFO */}
              <View className="flex-1">
                <Text className="text-white font-bold text-sm mb-1" numberOfLines={1}>
                  {exercise.name}
                </Text>

                {/* SERIES PILLS */}
                {series.length > 0 ? (
                  <View className="flex-row flex-wrap gap-1">
                    {series.map((s, idx) => {
                      const typeConfig = TYPE_COLORS[s.type] || TYPE_COLORS.EFECTIVA;
                      return (
                        <View
                          key={String(idx)}
                          className="rounded-md px-1.5 py-0.5 flex-row items-center gap-0.5"
                          style={{
                            backgroundColor: typeConfig.bg,
                            borderWidth: 1,
                            borderColor: typeConfig.border,
                          }}
                        >
                          <Text className="text-[8px] font-bold" style={{ color: typeConfig.text }}>
                            {typeConfig.label}
                          </Text>
                          <Text className="text-white text-[9px] font-mono">{s.reps}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-zinc-600 text-[10px]">Toca para configurar</Text>
                )}
              </View>

              {/* CHEVRON */}
              <View className="opacity-30">
                <Text className="text-zinc-500 text-lg">›</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};
