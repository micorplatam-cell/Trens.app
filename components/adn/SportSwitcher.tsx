import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, PanResponder } from 'react-native';
import {
  Dumbbell,
  Bike,
  Car,
  Waves,
  ChevronDown,
  Check,
  Plus,
  Lock,
  LucideIcon,
} from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSport, Sport } from '../../context/SportContext';
import { Alert } from '../../lib/alert';

// Deportes disponibles actualmente (los demás están "próximamente")
const AVAILABLE_SPORTS = ['GYM', 'SURF'];

// ============================================================================
// MAPA DE ICONOS POR DEPORTE
// ============================================================================
const SPORT_ICONS: Record<string, LucideIcon> = {
  GYM: Dumbbell,
  MOTO: Bike,
  AUTO: Car,
  SURF: Waves,
};

const SPORT_COLORS: Record<string, string> = {
  GYM: '#DC2626',
  MOTO: '#F97316',
  AUTO: '#EAB308',
  SURF: '#0EA5E9',
};

// ============================================================================
// SPORT PILL (Botón compacto para mostrar deporte activo)
// ============================================================================
interface SportPillProps {
  onPress: () => void;
}

export function SportPill({ onPress }: SportPillProps) {
  const { activeSport } = useSport();

  const sportCode = activeSport?.code || 'GYM';
  const SportIcon = SPORT_ICONS[sportCode] || Dumbbell;
  const sportColor = SPORT_COLORS[sportCode] || '#DC2626';

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="flex-row items-center px-3 py-2 rounded-full border"
      style={{ borderColor: sportColor, backgroundColor: `${sportColor}15` }}
    >
      <SportIcon color={sportColor} size={18} />
      <Text className="ml-2 font-bold text-sm" style={{ color: sportColor }}>
        {sportCode}
      </Text>
      <ChevronDown color={sportColor} size={16} className="ml-1" />
    </TouchableOpacity>
  );
}

// ============================================================================
// SPORT SWITCHER MODAL
// ============================================================================
interface SportSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SportSwitcherModal({ visible, onClose }: SportSwitcherModalProps) {
  const { activeSport, allSports, userSports, setActiveSport, addUserSport } = useSport();

  // -------------------------------------------------------------------------
  // PAN RESPONDER - Cerrar deslizando hacia abajo
  // -------------------------------------------------------------------------
  const translateY = useSharedValue(0);

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
          // Cerrar directamente - el translateY se resetea al abrir
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSelectSport = async (sport: Sport) => {
    // Verificar si el deporte está disponible
    if (!AVAILABLE_SPORTS.includes(sport.code)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        '🚧 Próximamente',
        `${sport.name} estará disponible muy pronto.\n\nEstamos trabajando para traerte la mejor experiencia en ${sport.name.toLowerCase()}.`,
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setActiveSport(sport.code);
    onClose();
  };

  const handleAddSport = async (sport: Sport) => {
    // Verificar si el deporte está disponible antes de agregar
    if (!AVAILABLE_SPORTS.includes(sport.code)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        '🚧 Próximamente',
        `${sport.name} estará disponible muy pronto.\n\nTe notificaremos cuando esté listo.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addUserSport(sport.id);
  };

  // Deportes que el usuario ya tiene
  const userSportIds = userSports.map((us) => us.sport_id);

  // Deportes disponibles para agregar
  const availableSports = allSports.filter((s) => !userSportIds.includes(s.id));

  // Deportes del usuario
  const mySports = allSports.filter((s) => userSportIds.includes(s.id));

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-transparent justify-end">
        <Animated.View
          className="bg-zinc-900 rounded-t-3xl"
          style={[{ height: '70%', backgroundColor: '#18181b' }, animatedStyle]}
        >
          {/* Header completo - Draggable para cerrar */}
          <View {...panResponder.panHandlers} className="border-b border-zinc-800">
            {/* Handle */}
            <View className="items-center py-3">
              <View className="w-10 h-1 bg-zinc-600 rounded-full" />
            </View>

            {/* Títulos */}
            <View className="px-6 pb-4">
              <Text className="text-white font-bold text-xl">Cambiar Deporte</Text>
              <Text className="text-zinc-500 text-sm mt-1">Selecciona tu deporte activo</Text>
            </View>
          </View>

          <ScrollView className="px-6 py-4">
            {/* Mis Deportes */}
            {mySports.length > 0 && (
              <View className="mb-6">
                <Text className="text-zinc-500 font-semibold text-xs mb-3 tracking-wider">
                  MIS DEPORTES
                </Text>
                {mySports.map((sport) => {
                  const SportIcon = SPORT_ICONS[sport.code] || Dumbbell;
                  const isActive = activeSport?.id === sport.id;
                  const sportColor = SPORT_COLORS[sport.code] || '#DC2626';
                  const isAvailable = AVAILABLE_SPORTS.includes(sport.code);

                  return (
                    <TouchableOpacity
                      key={sport.id}
                      onPress={() => handleSelectSport(sport)}
                      className="flex-row items-center p-4 rounded-xl mb-2"
                      style={{
                        backgroundColor: isActive ? `${sportColor}20` : '#27272a',
                        borderWidth: isActive ? 1 : 0,
                        borderColor: sportColor,
                        opacity: isAvailable ? 1 : 0.6,
                      }}
                    >
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${sportColor}30` }}
                      >
                        <SportIcon color={sportColor} size={24} />
                      </View>

                      <View className="flex-1 ml-4">
                        <View className="flex-row items-center">
                          <Text className="text-white font-bold text-base">{sport.name}</Text>
                          {!isAvailable && (
                            <View className="ml-2 px-2 py-0.5 bg-zinc-700 rounded">
                              <Text className="text-zinc-400 text-xs font-medium">PRONTO</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-zinc-500 text-sm">{sport.description}</Text>
                      </View>

                      {isActive && isAvailable && (
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center"
                          style={{ backgroundColor: sportColor }}
                        >
                          <Check color="white" size={18} strokeWidth={3} />
                        </View>
                      )}

                      {!isAvailable && (
                        <View className="w-8 h-8 rounded-full items-center justify-center bg-zinc-700">
                          <Lock color="#71717a" size={16} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Agregar Deporte */}
            {availableSports.length > 0 && (
              <View className="mb-6">
                <Text className="text-zinc-500 font-semibold text-xs mb-3 tracking-wider">
                  AGREGAR DEPORTE
                </Text>
                {availableSports.map((sport) => {
                  const SportIcon = SPORT_ICONS[sport.code] || Dumbbell;
                  const sportColor = SPORT_COLORS[sport.code] || '#DC2626';
                  const isAvailable = AVAILABLE_SPORTS.includes(sport.code);

                  return (
                    <TouchableOpacity
                      key={sport.id}
                      onPress={() => handleAddSport(sport)}
                      className="flex-row items-center p-4 rounded-xl mb-2 bg-zinc-800/50 border border-dashed border-zinc-700"
                      style={{ opacity: isAvailable ? 1 : 0.6 }}
                    >
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${sportColor}20` }}
                      >
                        <SportIcon color={sportColor} size={24} />
                      </View>

                      <View className="flex-1 ml-4">
                        <View className="flex-row items-center">
                          <Text className="text-zinc-400 font-bold text-base">{sport.name}</Text>
                          {!isAvailable && (
                            <View className="ml-2 px-2 py-0.5 bg-zinc-700 rounded">
                              <Text className="text-zinc-500 text-xs font-medium">PRONTO</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-zinc-600 text-sm">{sport.description}</Text>
                      </View>

                      {isAvailable ? (
                        <View className="w-8 h-8 rounded-full items-center justify-center bg-zinc-700">
                          <Plus color="#a1a1aa" size={18} />
                        </View>
                      ) : (
                        <View className="w-8 h-8 rounded-full items-center justify-center bg-zinc-800">
                          <Lock color="#52525b" size={16} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Espacio inferior */}
            <View className="h-8" />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================================
// SPORT SWITCHER COMPLETO (Pill + Modal)
// ============================================================================
export function SportSwitcher() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <SportPill onPress={() => setModalVisible(true)} />
      <SportSwitcherModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

export default SportSwitcher;
