// ============================================================================
// GARAJE MODULE - Inventario de Vehículos (MOTO/AUTO)
// Gestión de motos, autos, cascos, neumáticos y mantenimiento
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
} from 'react-native';
import { Alert } from '../../../lib/alert';
import { Image } from 'expo-image';
import {
  Plus,
  Bike,
  Car,
  Wrench,
  HardHat,
  Gauge,
  Clock,
  ChevronRight,
  X,
  Camera,
  AlertCircle,
  CheckCircle,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from '../../../lib/haptics';
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
  year?: number;
  photo_url?: string;
  attributes: Record<string, any>;
  is_primary: boolean;
  status: 'ACTIVE' | 'SOLD' | 'BROKEN' | 'STORED';
  purchase_date?: string;
  last_service_date?: string;
}

interface MaintenanceLog {
  id: string;
  item_id: string;
  type: string;
  title: string;
  description?: string;
  at_km?: number;
  at_hours?: number;
  cost?: number;
  next_due_km?: number;
  next_due_hours?: number;
  next_due_date?: string;
  performed_at: string;
}

// ============================================================================
// VEHICLE CARD COMPONENT
// ============================================================================

const VehicleCard = ({
  item,
  sportCode,
  onPress,
}: {
  item: InventoryItem;
  sportCode: string;
  onPress: () => void;
}) => {
  const isMoto = sportCode === 'MOTO';
  const Icon = isMoto ? Bike : Car;
  const sportColor = isMoto ? '#F97316' : '#EAB308';

  const engineHours = item.attributes?.engine_hours || 0;
  const km = item.attributes?.km || 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-zinc-900 rounded-2xl p-4 mb-4 border border-zinc-800"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        {/* Imagen o placeholder */}
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            className="w-20 h-20 rounded-xl"
            contentFit="cover"
          />
        ) : (
          <View
            className="w-20 h-20 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${sportColor}20` }}
          >
            <Icon size={32} color={sportColor} />
          </View>
        )}

        {/* Info */}
        <View className="flex-1 ml-4">
          <View className="flex-row items-center">
            {item.is_primary && (
              <View
                className="px-2 py-0.5 rounded-full mr-2"
                style={{ backgroundColor: sportColor }}
              >
                <Text className="text-white text-xs font-bold">PRINCIPAL</Text>
              </View>
            )}
            <Text className="text-white font-bold text-lg" numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <Text className="text-zinc-400 text-sm mt-1">
            {item.brand} {item.model} {item.year ? `(${item.year})` : ''}
          </Text>

          {/* Stats */}
          <View className="flex-row mt-2 space-x-4">
            {isMoto && engineHours > 0 && (
              <View className="flex-row items-center">
                <Clock size={14} color="#A1A1AA" />
                <Text className="text-zinc-400 text-sm ml-1">{engineHours}h</Text>
              </View>
            )}
            {km > 0 && (
              <View className="flex-row items-center ml-3">
                <Gauge size={14} color="#A1A1AA" />
                <Text className="text-zinc-400 text-sm ml-1">{km.toLocaleString()} km</Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={20} color="#A1A1AA" />
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// EQUIPMENT CARD (Cascos, botas, etc)
// ============================================================================

const EquipmentCard = ({ item, onPress }: { item: InventoryItem; onPress: () => void }) => {
  const categoryIcons: Record<string, any> = {
    HELMETS: HardHat,
    BOOTS: () => <Text className="text-2xl">🥾</Text>,
    PROTECTION: () => <Text className="text-2xl">🛡️</Text>,
    TIRES: () => <Text className="text-2xl">⚫</Text>,
  };

  const IconComponent = categoryIcons[item.category_code] || Wrench;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-zinc-900 rounded-xl p-3 mr-3 w-32"
      activeOpacity={0.7}
    >
      <View className="items-center">
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            className="w-16 h-16 rounded-lg"
            contentFit="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-lg bg-zinc-800 items-center justify-center">
            {typeof IconComponent === 'function' && IconComponent.prototype ? (
              <IconComponent size={24} color="#A1A1AA" />
            ) : (
              <IconComponent />
            )}
          </View>
        )}
        <Text className="text-white text-sm font-medium mt-2 text-center" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-zinc-500 text-xs mt-0.5">{item.brand}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// MAINTENANCE ALERT
// ============================================================================

const MaintenanceAlert = ({ log, itemName }: { log: MaintenanceLog; itemName: string }) => {
  const isOverdue = log.next_due_date && new Date(log.next_due_date) < new Date();

  return (
    <View
      className={`flex-row items-center p-3 rounded-xl mb-2 ${
        isOverdue
          ? 'bg-red-900/30 border border-red-500/50'
          : 'bg-yellow-900/30 border border-yellow-500/50'
      }`}
    >
      <AlertCircle size={20} color={isOverdue ? '#EF4444' : '#EAB308'} />
      <View className="flex-1 ml-3">
        <Text className="text-white font-medium">{log.title}</Text>
        <Text className="text-zinc-400 text-sm">{itemName}</Text>
      </View>
      {log.next_due_date && (
        <Text className={`text-sm ${isOverdue ? 'text-red-400' : 'text-yellow-400'}`}>
          {new Date(log.next_due_date).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
};

// ============================================================================
// ADD VEHICLE MODAL
// ============================================================================

const AddVehicleModal = ({
  visible,
  onClose,
  sportCode,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  sportCode: string;
  onSave: (data: Partial<InventoryItem>) => void;
}) => {
  const isMoto = sportCode === 'MOTO';
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para tu vehículo');
      return;
    }

    onSave({
      category_code: isMoto ? 'BIKES' : 'CARS',
      name: name.trim(),
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      year: year ? parseInt(year) : undefined,
      is_primary: false,
      status: 'ACTIVE',
      attributes: {},
    });

    // Reset
    setName('');
    setBrand('');
    setModel('');
    setYear('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-transparent justify-end">
        <View
          className="rounded-t-3xl p-6"
          style={{
            backgroundColor: '#0a0a0a',
            borderTopWidth: 2,
            borderTopColor: isMoto ? 'rgba(249, 115, 22, 0.5)' : 'rgba(234, 179, 8, 0.5)',
            overflow: 'hidden',
          }}
        >
          {/* Línea de acento superior */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: isMoto ? '#F97316' : '#EAB308',
              shadowColor: isMoto ? '#F97316' : '#EAB308',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 10,
              zIndex: 10,
            }}
          />

          {/* Drag Indicator */}
          <View className="items-center mb-4">
            <View className="w-12 h-1.5 bg-zinc-600 rounded-full" />
          </View>

          {/* Header */}
          <View className="items-center mb-6">
            <Text className="text-white text-xl font-bold">
              {isMoto ? 'Agregar Moto' : 'Agregar Auto'}
            </Text>
            <Text className="text-zinc-500 text-sm mt-1">Desliza para cerrar</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-zinc-400 text-sm mb-2">Nombre *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={isMoto ? 'Mi KTM 450' : 'Mi BMW M3'}
                placeholderTextColor="#52525B"
                className="bg-zinc-800 text-white p-4 rounded-xl"
              />
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-zinc-400 text-sm mb-2">Marca</Text>
                <TextInput
                  value={brand}
                  onChangeText={setBrand}
                  placeholder={isMoto ? 'KTM' : 'BMW'}
                  placeholderTextColor="#52525B"
                  className="bg-zinc-800 text-white p-4 rounded-xl"
                />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 text-sm mb-2">Modelo</Text>
                <TextInput
                  value={model}
                  onChangeText={setModel}
                  placeholder={isMoto ? '450 SX-F' : 'M3 Competition'}
                  placeholderTextColor="#52525B"
                  className="bg-zinc-800 text-white p-4 rounded-xl ml-3"
                />
              </View>
            </View>

            <View>
              <Text className="text-zinc-400 text-sm mb-2">Año</Text>
              <TextInput
                value={year}
                onChangeText={setYear}
                placeholder="2024"
                placeholderTextColor="#52525B"
                keyboardType="number-pad"
                className="bg-zinc-800 text-white p-4 rounded-xl"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            className="mt-6 p-4 rounded-xl items-center"
            style={{ backgroundColor: isMoto ? '#F97316' : '#EAB308' }}
          >
            <Text className="text-white font-bold text-lg">Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GarajeScreen() {
  const { activeSport } = useSport();
  const { user } = useUserRoleContext();

  const [vehicles, setVehicles] = useState<InventoryItem[]>([]);
  const [equipment, setEquipment] = useState<InventoryItem[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const sportCode = activeSport?.code || 'MOTO';
  const sportColor = activeSport?.color_primary || '#F97316';
  const isMoto = sportCode === 'MOTO';

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  const loadInventory = useCallback(async () => {
    if (!user?.id || !activeSport?.id) return;

    try {
      // Cargar vehículos
      const vehicleCategory = isMoto ? 'BIKES' : 'CARS';
      const { data: vehiclesData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_id', activeSport.id)
        .eq('category_code', vehicleCategory)
        .eq('status', 'ACTIVE')
        .order('is_primary', { ascending: false });

      setVehicles(vehiclesData || []);

      // Cargar equipamiento
      const equipmentCategories = isMoto
        ? ['HELMETS', 'BOOTS', 'PROTECTION', 'GOGGLES', 'TOOLS']
        : ['TIRES', 'MODS', 'SAFETY', 'HELMET', 'SUIT'];

      const { data: equipmentData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_id', activeSport.id)
        .in('category_code', equipmentCategories)
        .eq('status', 'ACTIVE');

      setEquipment(equipmentData || []);

      // Cargar mantenimientos próximos
      const { data: maintenanceData } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('user_id', user.id)
        .not('next_due_date', 'is', null)
        .gte('next_due_date', new Date().toISOString().split('T')[0])
        .order('next_due_date', { ascending: true })
        .limit(5);

      setUpcomingMaintenance(maintenanceData || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, activeSport?.id, isMoto]);

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

  const handleAddVehicle = async (data: Partial<InventoryItem>) => {
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
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'No se pudo agregar el vehículo');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!activeSport || (sportCode !== 'MOTO' && sportCode !== 'AUTO')) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-zinc-500">Este módulo es solo para MOTO o AUTO</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header con gradiente */}
      <LinearGradient colors={[`${sportColor}30`, 'transparent']} className="pt-16 pb-6 px-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">GARAJE</Text>
            <Text className="text-zinc-400 mt-1">
              {vehicles.length} {isMoto ? 'moto' : 'auto'}
              {vehicles.length !== 1 ? 's' : ''} • {equipment.length} items
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
        {/* Alertas de mantenimiento */}
        {upcomingMaintenance.length > 0 && (
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-3">⚠️ Próximo Mantenimiento</Text>
            {upcomingMaintenance.map((log) => {
              const vehicle = vehicles.find((v) => v.id === log.item_id);
              return (
                <MaintenanceAlert key={log.id} log={log} itemName={vehicle?.name || 'Vehículo'} />
              );
            })}
          </View>
        )}

        {/* Vehículos */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">
            {isMoto ? '🏍️ Mis Motos' : '🚗 Mis Autos'}
          </Text>

          {vehicles.length === 0 ? (
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="bg-zinc-900 rounded-2xl p-8 items-center border border-dashed border-zinc-700"
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${sportColor}20` }}
              >
                <Plus size={32} color={sportColor} />
              </View>
              <Text className="text-white font-bold text-lg">
                Agrega tu primer{isMoto ? 'a moto' : ' auto'}
              </Text>
              <Text className="text-zinc-500 text-center mt-2">
                Registra tus vehículos para llevar control del mantenimiento
              </Text>
            </TouchableOpacity>
          ) : (
            vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                item={vehicle}
                sportCode={sportCode}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // TODO: Navegar al detalle del vehículo
                }}
              />
            ))
          )}
        </View>

        {/* Equipamiento */}
        {equipment.length > 0 && (
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-3">🛠️ Equipamiento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {equipment.map((item) => (
                <EquipmentCard
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

        {/* Herramientas rápidas */}
        <View className="mb-20">
          <Text className="text-white text-lg font-bold mb-3">⚡ Herramientas</Text>
          <View className="flex-row flex-wrap">
            {[
              { icon: '🛢️', label: 'Cambio Aceite', code: 'OIL_CHANGE' },
              { icon: '⏱️', label: 'Horas Motor', code: 'ENGINE_HOURS' },
              { icon: '🔧', label: 'Mantenimiento', code: 'MAINTENANCE' },
              { icon: '📋', label: 'Checklist', code: 'CHECKLIST' },
            ].map((tool) => (
              <TouchableOpacity
                key={tool.code}
                className="w-1/2 p-2"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // TODO: Implementar herramientas
                }}
              >
                <View className="bg-zinc-900 rounded-xl p-4 items-center border border-zinc-800">
                  <Text className="text-2xl mb-2">{tool.icon}</Text>
                  <Text className="text-white text-sm font-medium">{tool.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal Agregar Vehículo */}
      <AddVehicleModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        sportCode={sportCode}
        onSave={handleAddVehicle}
      />
    </View>
  );
}
