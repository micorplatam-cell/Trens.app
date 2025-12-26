// ============================================================================
// TABLA MODULE - Quiver de Tablas (SURF)
// Gestión de tablas, trajes, quillas y equipamiento de surf
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Plus,
  Sailboat,
  Waves,
  ChevronRight,
  X,
  Ruler,
  Droplet,
  Star,
  Triangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../../lib/supabase';
import { useSport } from '../../../context/SportContext';
import { useUserRoleContext } from '../../../context/UserRoleContext';

// ============================================================================
// TYPES
// ============================================================================

interface InventoryItem {
  id: string;
  category_code: string;
  name: string;
  brand?: string;
  model?: string;
  photo_url?: string;
  attributes: Record<string, any>;
  is_primary: boolean;
  status: 'ACTIVE' | 'SOLD' | 'BROKEN' | 'STORED';
}

// ============================================================================
// BOARD CARD - ED HARDY DRAGON STYLE
// ============================================================================

const BoardCard = ({
  item,
  sportColor,
  onPress,
}: {
  item: InventoryItem;
  sportColor: string;
  onPress: () => void;
}) => {
  const size = item.attributes?.size_ft || '';
  const liters = item.attributes?.liters || 0;
  const conditions = item.attributes?.ideal_conditions || '';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl p-4 mb-4 overflow-hidden"
      activeOpacity={0.7}
      style={{
        backgroundColor: '#0a0f15',
        borderWidth: 1,
        borderColor: '#0EA5E940',
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      <View className="flex-row items-center">
        {/* Imagen o placeholder */}
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            className="w-24 h-32 rounded-xl"
            contentFit="cover"
          />
        ) : (
          <View
            className="w-24 h-32 rounded-xl items-center justify-center"
            style={{ backgroundColor: '#0EA5E920' }}
          >
            <Text className="text-5xl">🏄</Text>
          </View>
        )}

        {/* Info */}
        <View className="flex-1 ml-4">
          <View className="flex-row items-center">
            {item.is_primary && (
              <View
                className="px-2 py-0.5 rounded-full mr-2"
                style={{
                  backgroundColor: '#0EA5E9',
                  shadowColor: '#0EA5E9',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 5,
                }}
              >
                <Text className="text-white text-xs font-bold">FAVORITA</Text>
              </View>
            )}
          </View>

          <Text className="text-white font-bold text-lg mt-1" numberOfLines={1}>
            {item.name}
          </Text>

          <Text className="text-zinc-400 text-sm mt-0.5">
            {item.brand} {item.model}
          </Text>

          {/* Specs */}
          <View className="flex-row mt-3 flex-wrap">
            {size && (
              <View className="flex-row items-center mr-4 mb-1">
                <Ruler size={14} color="#A1A1AA" />
                <Text className="text-zinc-400 text-sm ml-1">{size}</Text>
              </View>
            )}
            {liters > 0 && (
              <View className="flex-row items-center mr-4 mb-1">
                <Droplet size={14} color="#A1A1AA" />
                <Text className="text-zinc-400 text-sm ml-1">{liters}L</Text>
              </View>
            )}
          </View>

          {conditions && (
            <View className="mt-2">
              <Text className="text-zinc-500 text-xs">🌊 {conditions}</Text>
            </View>
          )}
        </View>

        <ChevronRight size={20} color="#A1A1AA" />
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// GEAR ITEM (Trajes, quillas, etc)
// ============================================================================

const GearItem = ({ item, onPress }: { item: InventoryItem; onPress: () => void }) => {
  const categoryEmojis: Record<string, string> = {
    WETSUITS: '🦭',
    FINS: '🔺',
    LEASHES: '🔗',
    WAX: '🧴',
    ACCESSORIES: '🎒',
  };

  const emoji = categoryEmojis[item.category_code] || '🏄';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-zinc-900 rounded-xl p-3 mr-3 w-28"
      activeOpacity={0.7}
    >
      <View className="items-center">
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            className="w-14 h-14 rounded-lg"
            contentFit="cover"
          />
        ) : (
          <View className="w-14 h-14 rounded-lg bg-zinc-800 items-center justify-center">
            <Text className="text-2xl">{emoji}</Text>
          </View>
        )}
        <Text className="text-white text-sm font-medium mt-2 text-center" numberOfLines={2}>
          {item.name}
        </Text>
        {item.attributes?.thickness && (
          <Text className="text-zinc-500 text-xs">{item.attributes.thickness}mm</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// ADD BOARD MODAL
// ============================================================================

const AddBoardModal = ({
  visible,
  onClose,
  sportColor,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  sportColor: string;
  onSave: (data: Partial<InventoryItem>) => void;
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [size, setSize] = useState('');
  const [liters, setLiters] = useState('');
  const [conditions, setConditions] = useState('');

  const boardTypes = [
    { type: 'SHORTBOARD', emoji: '🏄', label: 'Shortboard' },
    { type: 'LONGBOARD', emoji: '🛹', label: 'Longboard' },
    { type: 'FISH', emoji: '🐟', label: 'Fish' },
    { type: 'FUNBOARD', emoji: '😎', label: 'Funboard' },
  ];

  const [selectedType, setSelectedType] = useState('SHORTBOARD');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para tu tabla');
      return;
    }

    onSave({
      category_code: 'BOARDS',
      name: name.trim(),
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      is_primary: false,
      status: 'ACTIVE',
      attributes: {
        board_type: selectedType,
        size_ft: size.trim() || undefined,
        liters: liters ? parseFloat(liters) : undefined,
        ideal_conditions: conditions.trim() || undefined,
      },
    });

    // Reset
    setName('');
    setBrand('');
    setModel('');
    setSize('');
    setLiters('');
    setConditions('');
    setSelectedType('SHORTBOARD');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-zinc-900 rounded-t-3xl p-6 max-h-[85%]">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-xl font-bold">Agregar Tabla 🏄</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tipo de tabla */}
            <Text className="text-zinc-400 text-sm mb-2">Tipo de Tabla</Text>
            <View className="flex-row mb-4">
              {boardTypes.map((bt) => (
                <TouchableOpacity
                  key={bt.type}
                  onPress={() => setSelectedType(bt.type)}
                  className={`flex-1 p-3 rounded-xl mr-2 items-center ${
                    selectedType === bt.type ? 'border-2' : 'bg-zinc-800'
                  }`}
                  style={
                    selectedType === bt.type
                      ? { borderColor: sportColor, backgroundColor: `${sportColor}20` }
                      : undefined
                  }
                >
                  <Text className="text-xl">{bt.emoji}</Text>
                  <Text
                    className={`text-xs mt-1 ${selectedType === bt.type ? 'text-white' : 'text-zinc-400'}`}
                  >
                    {bt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nombre */}
            <View className="mb-4">
              <Text className="text-zinc-400 text-sm mb-2">Nombre *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Mi Shortboard de Olas Grandes"
                placeholderTextColor="#52525B"
                className="bg-zinc-800 text-white p-4 rounded-xl"
              />
            </View>

            {/* Marca/Shaper y Modelo */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-zinc-400 text-sm mb-2">Marca/Shaper</Text>
                <TextInput
                  value={brand}
                  onChangeText={setBrand}
                  placeholder="Channel Islands"
                  placeholderTextColor="#52525B"
                  className="bg-zinc-800 text-white p-4 rounded-xl"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-zinc-400 text-sm mb-2">Modelo</Text>
                <TextInput
                  value={model}
                  onChangeText={setModel}
                  placeholder="Sampler"
                  placeholderTextColor="#52525B"
                  className="bg-zinc-800 text-white p-4 rounded-xl"
                />
              </View>
            </View>

            {/* Tamaño y Litros */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-zinc-400 text-sm mb-2">Tamaño (pies)</Text>
                <TextInput
                  value={size}
                  onChangeText={setSize}
                  placeholder={'6\'2"'}
                  placeholderTextColor="#52525B"
                  className="bg-zinc-800 text-white p-4 rounded-xl"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-zinc-400 text-sm mb-2">Litros</Text>
                <TextInput
                  value={liters}
                  onChangeText={setLiters}
                  placeholder="32.5"
                  placeholderTextColor="#52525B"
                  keyboardType="decimal-pad"
                  className="bg-zinc-800 text-white p-4 rounded-xl"
                />
              </View>
            </View>

            {/* Condiciones ideales */}
            <View className="mb-6">
              <Text className="text-zinc-400 text-sm mb-2">Condiciones Ideales</Text>
              <TextInput
                value={conditions}
                onChangeText={setConditions}
                placeholder="Olas de 3-6 pies, bien formadas"
                placeholderTextColor="#52525B"
                className="bg-zinc-800 text-white p-4 rounded-xl"
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              className="p-4 rounded-xl items-center mb-6"
              style={{ backgroundColor: sportColor }}
            >
              <Text className="text-white font-bold text-lg">Guardar Tabla</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// QUIVER STATS
// ============================================================================

const QuiverStats = ({ boards, sportColor }: { boards: InventoryItem[]; sportColor: string }) => {
  const totalLiters = boards.reduce((acc, b) => acc + (b.attributes?.liters || 0), 0);
  const avgLiters = boards.length > 0 ? (totalLiters / boards.length).toFixed(1) : 0;

  const boardTypes = boards.reduce(
    (acc, b) => {
      const type = b.attributes?.board_type || 'OTHER';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <View className="flex-row mb-6">
      <View className="flex-1 bg-zinc-900 rounded-xl p-4 mr-2 items-center">
        <Text className="text-3xl">🏄</Text>
        <Text className="text-2xl font-bold text-white mt-1">{boards.length}</Text>
        <Text className="text-zinc-500 text-xs">Tablas</Text>
      </View>
      <View className="flex-1 bg-zinc-900 rounded-xl p-4 mx-1 items-center">
        <Droplet size={28} color={sportColor} />
        <Text className="text-2xl font-bold text-white mt-1">{avgLiters}</Text>
        <Text className="text-zinc-500 text-xs">Promedio L</Text>
      </View>
      <View className="flex-1 bg-zinc-900 rounded-xl p-4 ml-2 items-center">
        <Star size={28} color="#EAB308" />
        <Text className="text-2xl font-bold text-white mt-1">
          {boards.filter((b) => b.is_primary).length || '-'}
        </Text>
        <Text className="text-zinc-500 text-xs">Favoritas</Text>
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TablaScreen() {
  const { activeSport } = useSport();
  const { user } = useUserRoleContext();

  const [boards, setBoards] = useState<InventoryItem[]>([]);
  const [gear, setGear] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const sportCode = activeSport?.code || 'SURF';
  const sportColor = activeSport?.color_primary || '#0EA5E9';

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  const loadInventory = useCallback(async () => {
    if (!user?.id || !activeSport?.id) return;

    try {
      // Cargar tablas
      const { data: boardsData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_id', activeSport.id)
        .eq('category_code', 'BOARDS')
        .eq('status', 'ACTIVE')
        .order('is_primary', { ascending: false });

      setBoards(boardsData || []);

      // Cargar gear
      const gearCategories = ['WETSUITS', 'FINS', 'LEASHES', 'WAX', 'ACCESSORIES'];
      const { data: gearData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_id', activeSport.id)
        .in('category_code', gearCategories)
        .eq('status', 'ACTIVE');

      setGear(gearData || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, activeSport?.id]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInventory();
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddBoard = async (data: Partial<InventoryItem>) => {
    if (!user?.id || !activeSport?.id) return;

    try {
      const { error } = await supabase.from('inventory_items').insert({
        ...data,
        user_id: user.id,
        sport_id: activeSport.id,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadInventory();
    } catch (error) {
      console.error('Error adding board:', error);
      Alert.alert('Error', 'No se pudo agregar la tabla');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!activeSport || sportCode !== 'SURF') {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-zinc-500">Este módulo es solo para SURF</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <LinearGradient colors={[`${sportColor}30`, 'transparent']} className="pt-16 pb-6 px-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">TABLA</Text>
            <Text className="text-zinc-400 mt-1">
              {boards.length} tabla{boards.length !== 1 ? 's' : ''} en tu quiver
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: sportColor }}
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={sportColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <QuiverStats boards={boards} sportColor={sportColor} />

        {/* Tablas */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">🏄 Mi Quiver</Text>

          {boards.length === 0 ? (
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="bg-zinc-900 rounded-2xl p-8 items-center border border-dashed border-zinc-700"
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${sportColor}20` }}
              >
                <Text className="text-4xl">🏄</Text>
              </View>
              <Text className="text-white font-bold text-lg">Agrega tu primera tabla</Text>
              <Text className="text-zinc-500 text-center mt-2">
                Registra tus tablas para ver cuál usar según las condiciones
              </Text>
            </TouchableOpacity>
          ) : (
            boards.map((board) => (
              <BoardCard
                key={board.id}
                item={board}
                sportColor={sportColor}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ))
          )}
        </View>

        {/* Gear */}
        {gear.length > 0 && (
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-3">🦭 Equipamiento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {gear.map((item) => (
                <GearItem
                  key={item.id}
                  item={item}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Board Matcher Tool */}
        <View className="mb-20">
          <Text className="text-white text-lg font-bold mb-3">⚡ Herramientas</Text>
          <View className="flex-row flex-wrap">
            {[
              { icon: '🌊', label: 'Board Match', desc: 'Según condiciones' },
              { icon: '📏', label: 'Calculadora', desc: 'Litros ideales' },
              { icon: '🔧', label: 'Wax Guide', desc: 'Tipo de wax' },
              { icon: '🌡️', label: 'Wetsuit', desc: 'Según temperatura' },
            ].map((tool, idx) => (
              <TouchableOpacity
                key={idx}
                className="w-1/2 p-2"
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <View className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <Text className="text-2xl mb-2">{tool.icon}</Text>
                  <Text className="text-white font-medium">{tool.label}</Text>
                  <Text className="text-zinc-500 text-xs">{tool.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add Board Modal */}
      <AddBoardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        sportColor={sportColor}
        onSave={handleAddBoard}
      />
    </View>
  );
}
