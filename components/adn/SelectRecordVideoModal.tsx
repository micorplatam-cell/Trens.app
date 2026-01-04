import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Image, PanResponder } from 'react-native';
import { ChevronDown, Check, Play, Trophy, Dumbbell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// ============================================================================
// TIPOS
// ============================================================================
interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url?: string;
  cloudflare_video_id?: string;
  is_public: boolean;
  created_at: string;
  source: 'asset' | 'pro';
  exercise_name?: string;
  weight_kg?: number;
  reps?: number;
  free_text?: string;
}

interface SelectRecordVideoModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (video: Video) => void;
  publicVideos: Video[];
  existingRecordVideoIds: string[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function SelectRecordVideoModal({
  visible,
  onClose,
  onSelect,
  publicVideos,
  existingRecordVideoIds,
}: SelectRecordVideoModalProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Animated value para cierre por gesto
  const translateY = useSharedValue(0);

  const animatedPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Filtrar videos que ya están en récords y que tienen datos válidos
  const availableVideos = publicVideos.filter(
    (v) => !existingRecordVideoIds.includes(v.id) && v.exercise_name && v.weight_kg && v.reps
  );

  // -------------------------------------------------------------------------
  // PAN RESPONDER - Cerrar deslizando hacia abajo (estilo Hank)
  // -------------------------------------------------------------------------
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          // Cerrar directamente
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleClose();
        } else {
          // Volver arriba
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          translateY.value = withTiming(0, { duration: 200 });
        }
      },
    })
  ).current;

  // Resetear translateY cuando el modal se abre
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible, translateY]);

  const handleSelect = () => {
    if (!selectedVideo) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(selectedVideo);
    setSelectedVideo(null);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVideo(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-transparent justify-end">
        <Animated.View
          className="bg-black rounded-t-3xl"
          style={[{ height: '85%', backgroundColor: '#000' }, animatedPanelStyle]}
        >
          {/* Header con PanResponder para cerrar deslizando */}
          <View
            {...panResponder.panHandlers}
            className="flex-row items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-800"
          >
            {/* Indicador de drag */}
            <View className="absolute top-2 left-0 right-0 items-center">
              <View className="w-10 h-1 bg-zinc-600 rounded-full" />
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-fire-orange/20 items-center justify-center mr-3">
                <Trophy size={22} color="#F97316" />
              </View>
              <View>
                <Text className="text-white font-bold text-lg">ELEGIR RÉCORD</Text>
                <Text className="text-zinc-500 text-xs font-mono">
                  {availableVideos.length} VIDEOS DISPONIBLES
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-zinc-900 items-center justify-center"
            >
              <ChevronDown size={24} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Instrucciones */}
          <View className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
            <Text className="text-zinc-400 text-xs text-center">
              Selecciona un video <Text className="text-fire-orange font-bold">PÚBLICO</Text> de tu
              bóveda para agregarlo como récord personal.
            </Text>
          </View>

          {/* Lista de videos */}
          <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
            {availableVideos.length === 0 ? (
              <View className="items-center justify-center py-20">
                <Dumbbell size={48} color="#3f3f46" />
                <Text className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-4">
                  Sin videos disponibles
                </Text>
                <Text className="text-zinc-600 text-xs text-center mt-2 px-8">
                  Graba videos con ejercicio, peso y reps definidos y hazlos públicos para poder
                  agregarlos como récords.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {availableVideos.map((video) => {
                  const isSelected = selectedVideo?.id === video.id;

                  return (
                    <TouchableOpacity
                      key={video.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedVideo(video);
                      }}
                      className="rounded-xl overflow-hidden"
                      style={{
                        borderWidth: 2,
                        borderColor: isSelected ? '#F97316' : '#27272a',
                        backgroundColor: isSelected ? 'rgba(249, 115, 22, 0.1)' : '#0a0a0a',
                      }}
                    >
                      <View className="flex-row">
                        {/* Thumbnail 9:16 */}
                        <View className="w-20 bg-zinc-900" style={{ aspectRatio: 9 / 16 }}>
                          {video.thumbnail_url ? (
                            <Image
                              source={{ uri: video.thumbnail_url }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-full items-center justify-center">
                              <Play size={24} color="#52525b" />
                            </View>
                          )}
                          {/* Fire Gradient overlay */}
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            className="absolute bottom-0 left-0 right-0 h-8"
                          />
                          {/* Check mark for selected */}
                          {isSelected && (
                            <View
                              className="absolute top-2 right-2 w-6 h-6 rounded-full items-center justify-center"
                              style={{ backgroundColor: '#F97316' }}
                            >
                              <Check size={14} color="#fff" strokeWidth={3} />
                            </View>
                          )}
                        </View>

                        {/* Info */}
                        <View className="flex-1 p-3 justify-center">
                          {/* Ejercicio */}
                          <Text
                            className="text-white font-bold uppercase tracking-wide text-sm mb-1"
                            numberOfLines={1}
                          >
                            {video.exercise_name}
                          </Text>

                          {/* Peso y Reps - ED HARDY FIRE STYLE */}
                          <View className="flex-row items-baseline gap-3">
                            <View className="flex-row items-baseline gap-1">
                              <Text
                                className="text-2xl font-mono font-black"
                                style={{ color: '#F97316' }}
                              >
                                {video.weight_kg}
                              </Text>
                              <Text className="text-[10px] font-bold text-zinc-500">KG</Text>
                            </View>

                            <Text className="text-zinc-600">•</Text>

                            <Text className="text-zinc-400 font-bold text-sm">
                              {video.reps === 1 ? '1RM' : `${video.reps} REPS`}
                            </Text>
                          </View>

                          {/* Fecha */}
                          <Text className="text-zinc-600 text-[10px] mt-2 font-mono">
                            {new Date(video.created_at).toLocaleDateString('es', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer con botón */}
          <View className="p-4 border-t border-zinc-800">
            <TouchableOpacity
              disabled={!selectedVideo}
              onPress={handleSelect}
              className="py-4 items-center rounded-lg overflow-hidden"
              style={{
                backgroundColor: selectedVideo ? '#F97316' : '#27272a',
              }}
            >
              {selectedVideo ? (
                <LinearGradient
                  colors={['#DC2626', '#F97316', '#FBBF24']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="absolute inset-0"
                />
              ) : null}
              <Text
                className={`font-black uppercase tracking-[0.2em] text-sm z-10 ${
                  selectedVideo ? 'text-white' : 'text-zinc-500'
                }`}
                style={
                  selectedVideo
                    ? {
                        textShadowColor: 'rgba(0,0,0,0.5)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }
                    : {}
                }
              >
                FIJAR COMO RÉCORD
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
