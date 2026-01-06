// ============================================================================
// WORKOUT BLOCK - Bloque de Entrenamiento Flotante
// PRE + Rutina + POST, cada uno expande independientemente
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Zap,
  Flame,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  GripHorizontal,
  Pill,
  Syringe,
  FlaskConical,
  Droplets,
  Dumbbell,
} from 'lucide-react-native';
import { useHankTarget } from '../../hooks/useHankTarget';
import { HankInlineHighlight } from '../hank/HankInlineHighlight';

// ============================================================================
// TYPES
// ============================================================================
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
  isExternalMode?: boolean; // True si usa modo personalizado (sin ejercicios detallados)
}

interface WorkoutBlockProps {
  data: WorkoutBlockData;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onPressRoutine?: () => void;
  isCompressed?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================
const getTypeIcon = (type: string, color: string) => {
  const iconProps = { size: 14, color };
  switch (type) {
    case 'pill':
      return <Pill {...iconProps} />;
    case 'syringe':
      return <Syringe {...iconProps} />;
    case 'liquid':
      return <Droplets {...iconProps} />;
    case 'powder':
      return <FlaskConical {...iconProps} />;
    default:
      return <Zap {...iconProps} />;
  }
};

// ============================================================================
// EXERCISE CARD - Muestra imagen o primer frame del video con nombre
// ============================================================================
interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  onPress?: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, index, onPress }) => {
  // Si tiene video, crear player pausado para mostrar primer frame
  const videoPlayer = useVideoPlayer(exercise.videoUrl || null, (player) => {
    player.loop = false;
    player.muted = true;
    player.pause();
  });

  return (
    <Pressable onPress={onPress} className="mr-3 items-center active:scale-95">
      {/* Thumbnail */}
      <View className="w-20 h-20 bg-zinc-900 rounded-xl items-center justify-center border-2 border-red-500/30 overflow-hidden">
        {exercise.imageUrl ? (
          <Image source={{ uri: exercise.imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : exercise.videoUrl ? (
          <VideoView
            player={videoPlayer}
            style={{ width: 80, height: 80 }}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
          />
        ) : (
          <View className="items-center justify-center">
            <Dumbbell size={28} color="#DC2626" />
          </View>
        )}
      </View>
      {/* Exercise Name */}
      <Text
        className="text-zinc-400 text-[10px] text-center mt-1.5 font-medium w-20"
        numberOfLines={2}
      >
        {exercise.name}
      </Text>
    </Pressable>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================
export const WorkoutBlock: React.FC<WorkoutBlockProps> = ({
  data,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onPressRoutine,
  isCompressed = false,
}) => {
  // ============================================================================
  // HOOKS - Siempre deben llamarse primero
  // ============================================================================
  const [preExpanded, setPreExpanded] = useState(false);
  const [postExpanded, setPostExpanded] = useState(false);

  const preProgress = useSharedValue(0);
  const postProgress = useSharedValue(0);

  // Hank Target - Registrar este bloque como target para animaciones
  const { targetRef, onLayout, isHighlighted, animationPhase } = useHankTarget({
    id: `workout-${data.id}`,
    type: 'custom',
    label: data.routineName,
  });

  const preHeight = Math.max(data.preStack.length * 48 + 24, 80);
  const postHeight = Math.max(data.postStack.length * 48 + 24, 80);

  const preExpandedStyle = useAnimatedStyle(() => ({
    height: interpolate(preProgress.value, [0, 1], [0, preHeight]),
    opacity: preProgress.value,
    marginTop: interpolate(preProgress.value, [0, 1], [0, 8]),
  }));

  const postExpandedStyle = useAnimatedStyle(() => ({
    height: interpolate(postProgress.value, [0, 1], [0, postHeight]),
    opacity: postProgress.value,
    marginTop: interpolate(postProgress.value, [0, 1], [0, 8]),
  }));

  const preChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(preProgress.value, [0, 1], [0, 90])}deg` }],
  }));

  const postChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(postProgress.value, [0, 1], [0, 90])}deg` }],
  }));

  // ============================================================================
  // MODO COMPRIMIDO - Para drag & drop - ED HARDY FIRE
  // ============================================================================
  if (isCompressed) {
    return (
      <View className="mb-3">
        <View
          className="rounded-xl px-4 py-4 flex-row items-center justify-between"
          style={{
            backgroundColor: '#0a0505',
            borderWidth: 2,
            borderColor: '#DC262660',
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View className="p-2 rounded-lg" style={{ backgroundColor: '#DC262630' }}>
              <GripHorizontal size={18} color="#F97316" />
            </View>
            <View>
              <Text
                style={{ color: '#F97316' }}
                className="text-xs font-bold tracking-widest uppercase"
              >
                🔥 BLOQUE ENTRENO
              </Text>
              <Text className="text-white font-bold text-base mt-0.5">{data.routineName}</Text>
            </View>
          </View>
          <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#F9731620' }}>
            <Text style={{ color: '#F97316' }} className="text-sm font-mono font-bold">
              {data.exercises?.length || 0} ejercicios
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const togglePre = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !preExpanded;
    setPreExpanded(newState);
    preProgress.value = withTiming(newState ? 1 : 0, { duration: 200 });
  };

  const togglePost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !postExpanded;
    setPostExpanded(newState);
    postProgress.value = withTiming(newState ? 1 : 0, { duration: 200 });
  };

  const handleMoveUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMoveUp();
  };

  const handleMoveDown = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMoveDown();
  };

  const hasExercises = data.exercises && data.exercises.length > 0;
  const isRestDay = data.routineName === 'DESCANSO' && !hasExercises;

  // ============================================================================
  // MODO DESCANSO - Sin ejercicios asignados
  // ============================================================================
  if (isRestDay) {
    return (
      <View ref={targetRef} onLayout={onLayout} className="mb-6">
        <HankInlineHighlight isActive={isHighlighted} phase={animationPhase} borderRadius={0} />
        <View className="bg-[#1a1a1a] border-y-2 border-zinc-700/50 shadow-lg">
          {/* Control Handle */}
          <View className="flex-row justify-between items-center bg-zinc-800/30 px-4 py-2 border-b border-white/5">
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleMoveUp}
                disabled={isFirst}
                className={`p-1 ${isFirst ? 'opacity-20' : ''}`}
              >
                <ChevronUp size={18} color={isFirst ? '#666' : '#FFF'} />
              </Pressable>
              <Pressable
                onPress={handleMoveDown}
                disabled={isLast}
                className={`p-1 ${isLast ? 'opacity-20' : ''}`}
              >
                <ChevronDown size={18} color={isLast ? '#666' : '#FFF'} />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-1">
              <GripHorizontal size={14} color="#71717A" />
              <Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase">
                BLOQUE ENTRENO
              </Text>
            </View>
          </View>

          {/* Rest Day Content */}
          <View className="p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl text-white font-black italic uppercase tracking-tight">
                DESCANSO
              </Text>
              <Text className="text-xl">😴</Text>
            </View>
            <Pressable
              onPress={onPressRoutine}
              className="bg-zinc-800/50 px-3 py-1.5 rounded-full active:bg-zinc-700/50"
            >
              <Text className="text-zinc-400 text-xs font-medium">Configurar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View ref={targetRef} onLayout={onLayout} className="mb-6">
      {/* Hank Inline Highlight - FUERA del contenedor */}
      <HankInlineHighlight isActive={isHighlighted} phase={animationPhase} borderRadius={0} />

      <View className="bg-[#1a1a1a] border-y-2 border-red-500/50 shadow-lg">
        {/* Control Handle */}
        <View className="flex-row justify-between items-center bg-red-500/10 px-4 py-2 border-b border-white/5">
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleMoveUp}
              disabled={isFirst}
              className={`p-1 ${isFirst ? 'opacity-20' : ''}`}
            >
              <ChevronUp size={18} color={isFirst ? '#666' : '#FFF'} />
            </Pressable>
            <Pressable
              onPress={handleMoveDown}
              disabled={isLast}
              className={`p-1 ${isLast ? 'opacity-20' : ''}`}
            >
              <ChevronDown size={18} color={isLast ? '#666' : '#FFF'} />
            </Pressable>
          </View>
          <View className="flex-row items-center gap-1">
            <GripHorizontal size={14} color="#DC2626" />
            <Text className="text-red-500 text-xs font-bold tracking-widest uppercase">
              BLOQUE ENTRENO
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View className="p-4">
          {/* ============================================ */}
          {/* PRE-WORKOUT - Expandible independiente */}
          {/* ============================================ */}
          <Pressable
            onPress={togglePre}
            className="flex-row items-center gap-3 p-3 bg-red-500/10 rounded-lg active:bg-red-500/20"
          >
            <View className="bg-red-500/30 p-2 rounded">
              <Zap size={16} color="#DC2626" />
            </View>
            <View className="flex-1">
              <Text className="text-red-500 font-bold text-sm">PRE-WORKOUT</Text>
              <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                {data.preStack.length > 0
                  ? data.preStack.map((i) => i.name).join(', ')
                  : 'Sin suplementos'}
              </Text>
            </View>
            <Animated.View style={preChevronStyle}>
              <ChevronRight size={18} color="#DC2626" />
            </Animated.View>
          </Pressable>

          {/* PRE Expanded Detail */}
          <Animated.View
            style={preExpandedStyle}
            className="overflow-hidden bg-red-500/5 rounded-b-lg mx-1"
          >
            <View className="p-3">
              {data.preStack.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center gap-3 p-2 bg-black/20 rounded-lg mb-2"
                >
                  <View className="bg-red-500/20 p-1.5 rounded">
                    {getTypeIcon(item.type, '#DC2626')}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-medium">{item.name}</Text>
                    <Text className="text-red-500/80 text-xs">{item.dose}</Text>
                  </View>
                  {item.notes && (
                    <Text className="text-zinc-500 text-xs italic max-w-[80px]" numberOfLines={1}>
                      {item.notes}
                    </Text>
                  )}
                </View>
              ))}
              {data.preStack.length === 0 && (
                <Text className="text-zinc-600 text-xs text-center py-2">
                  No hay suplementos pre-entreno
                </Text>
              )}
            </View>
          </Animated.View>

          {/* ============================================ */}
          {/* ROUTINE - Slider de ejercicios */}
          {/* ============================================ */}
          <View className="my-4 py-4 border-y border-red-500/20 bg-[#0a0505] -mx-4 px-4">
            {/* Header con nombre de rutina y contador */}
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View className="flex-row items-center gap-2">
                <Dumbbell size={18} color="#DC2626" />
                <Text className="text-xl text-white font-black italic uppercase tracking-tight">
                  {data.routineName || 'DÍA DE DESCANSO'}
                </Text>
              </View>
              {/* Badge: Ejercicios (modo GYM) o Personalizado */}
              {hasExercises && !data.isExternalMode && (
                <View className="bg-red-500/20 px-2 py-1 rounded-lg">
                  <Text className="text-red-500 text-xs font-mono font-bold">
                    {data.exercises!.length} ejercicios
                  </Text>
                </View>
              )}
              {data.isExternalMode && data.routineName !== 'DESCANSO' && (
                <View className="bg-purple-500/20 px-2 py-1 rounded-lg">
                  <Text className="text-purple-400 text-xs font-mono font-bold">⚡ PERSONALIZADO</Text>
                </View>
              )}
            </View>

            {/* Modo GYM: Slider de ejercicios */}
            {hasExercises && !data.isExternalMode ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-2"
                contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 4 }}
              >
                {data.exercises!.map((ex, index) => (
                  <ExerciseCard key={ex.id} exercise={ex} index={index} onPress={onPressRoutine} />
                ))}
              </ScrollView>
            ) : data.isExternalMode && data.routineName !== 'DESCANSO' ? (
              /* Modo PERSONALIZADO: Invitar a agregar ejercicios */
              <View className="items-center py-4">
                <Text className="text-zinc-400 text-xs font-mono text-center">
                  ⚡ Tu entrenamiento personalizado
                </Text>
                <Pressable onPress={onPressRoutine} className="mt-2 active:opacity-70">
                  <View className="flex-row items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full">
                    <Dumbbell size={14} color="#a855f7" />
                    <Text className="text-purple-400 text-xs font-medium">
                      Agregar ejercicios a mi rutina
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={onPressRoutine} className="items-center py-4 active:opacity-70">
                <View className="flex-row items-center gap-2 bg-red-500/10 px-4 py-2 rounded-full">
                  <Dumbbell size={14} color="#DC2626" />
                  <Text className="text-red-500 text-xs font-medium">
                    Toca para configurar rutina
                  </Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* ============================================ */}
          {/* POST-WORKOUT - Expandible independiente */}
          {/* ============================================ */}
          <Pressable
            onPress={togglePost}
            className="flex-row items-center gap-3 p-3 bg-green-500/10 rounded-lg active:bg-green-500/20"
          >
            <View className="bg-green-500/30 p-2 rounded">
              <Flame size={16} color="#22C55E" />
            </View>
            <View className="flex-1">
              <Text className="text-green-500 font-bold text-sm">POST-WORKOUT</Text>
              <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                {data.postStack.length > 0
                  ? data.postStack.map((i) => i.name).join(', ')
                  : 'Sin suplementos'}
              </Text>
            </View>
            <Animated.View style={postChevronStyle}>
              <ChevronRight size={18} color="#22C55E" />
            </Animated.View>
          </Pressable>

          {/* POST Expanded Detail */}
          <Animated.View
            style={postExpandedStyle}
            className="overflow-hidden bg-green-500/5 rounded-b-lg mx-1"
          >
            <View className="p-3">
              {data.postStack.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center gap-3 p-2 bg-black/20 rounded-lg mb-2"
                >
                  <View className="bg-green-500/20 p-1.5 rounded">
                    {getTypeIcon(item.type, '#22C55E')}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-medium">{item.name}</Text>
                    <Text className="text-green-500/80 text-xs">{item.dose}</Text>
                  </View>
                  {item.notes && (
                    <Text className="text-zinc-500 text-xs italic max-w-[80px]" numberOfLines={1}>
                      {item.notes}
                    </Text>
                  )}
                </View>
              ))}
              {data.postStack.length === 0 && (
                <Text className="text-zinc-600 text-xs text-center py-2">
                  No hay suplementos post-entreno
                </Text>
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

export default WorkoutBlock;
