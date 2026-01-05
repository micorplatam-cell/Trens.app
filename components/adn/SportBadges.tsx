import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Dumbbell, Bike, Car, Waves, Plus, LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSport, Sport } from '../../context/SportContext';
import { SportSwitcherModal } from './SportSwitcher';

// ============================================================================
// MAPA DE ICONOS Y COLORES POR DEPORTE
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
// SPORT BADGE INDIVIDUAL
// ============================================================================
interface SportBadgeProps {
  sport: Sport;
  isActive: boolean;
  onPress: () => void;
}

function SportBadge({ sport, isActive, onPress }: SportBadgeProps) {
  const SportIcon = SPORT_ICONS[sport.code] || Dumbbell;
  const sportColor = SPORT_COLORS[sport.code] || '#DC2626';

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      className="flex-row items-center px-4 py-2 rounded-full mr-2"
      style={{
        backgroundColor: isActive ? sportColor : 'transparent',
        borderWidth: 2,
        borderColor: sportColor,
      }}
      activeOpacity={0.7}
    >
      <SportIcon color={isActive ? '#FFFFFF' : sportColor} size={16} />
      <Text
        className="ml-2 font-bold text-xs uppercase tracking-wide"
        style={{ color: isActive ? '#FFFFFF' : sportColor }}
      >
        {sport.code}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// ADD SPORT BADGE
// ============================================================================
interface AddSportBadgeProps {
  onPress: () => void;
}

function AddSportBadge({ onPress }: AddSportBadgeProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="flex-row items-center px-4 py-2 rounded-full border-2 border-dashed border-zinc-600"
      activeOpacity={0.7}
    >
      <Plus color="#71717a" size={16} />
      <Text className="ml-2 font-bold text-xs uppercase tracking-wide text-zinc-500">Agregar</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// SPORT BADGES CONTAINER
// ============================================================================
interface SportBadgesProps {
  vertical?: boolean;
}

export function SportBadges({ vertical = false }: SportBadgesProps) {
  const { activeSport, allSports, userSports, setActiveSport } = useSport();
  const [modalVisible, setModalVisible] = useState(false);

  // Obtener los deportes que el usuario tiene
  const userSportIds = userSports.map((us) => us.sport_id);
  const mySports = allSports.filter((s) => userSportIds.includes(s.id));

  // Verificar si hay deportes disponibles para agregar
  const availableSports = allSports.filter((s) => !userSportIds.includes(s.id));
  const canAddMore = availableSports.length > 0;

  const handleSelectSport = async (sport: Sport) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setActiveSport(sport.code);
  };

  return (
    <>
      <View className={vertical ? 'flex-col items-start gap-2' : 'flex-row items-center justify-center flex-wrap'}>
        {/* Insignias de deportes del usuario */}
        {mySports.map((sport) => (
          <SportBadge
            key={sport.id}
            sport={sport}
            isActive={activeSport?.id === sport.id}
            onPress={() => handleSelectSport(sport)}
          />
        ))}

        {/* Botón para agregar deporte */}
        {canAddMore && <AddSportBadge onPress={() => setModalVisible(true)} />}
      </View>

      {/* Modal de deportes */}
      <SportSwitcherModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

export default SportBadges;
