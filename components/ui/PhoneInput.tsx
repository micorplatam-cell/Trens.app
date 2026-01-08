// ============================================================================
// PHONE INPUT WITH COUNTRY SELECTOR - TRENS
// Input de teléfono con selector de país y banderas
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Phone, ChevronDown, Search, X, Check } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';

// ============================================================================
// COUNTRIES DATA
// ============================================================================
export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾' },
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
  { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮' },
  { code: 'DO', name: 'Rep. Dominicana', dialCode: '+1', flag: '🇩🇴' },
  { code: 'PR', name: 'Puerto Rico', dialCode: '+1', flag: '🇵🇷' },
  { code: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺' },
];

// ============================================================================
// COLORS
// ============================================================================
const COLORS = {
  black: '#000000',
  red: '#DC2626',
  white: '#FFFFFF',
  zinc400: '#A1A1AA',
  zinc500: '#71717A',
  zinc600: '#52525B',
  zinc700: '#3F3F46',
  zinc800: '#27272A',
  zinc900: '#18181B',
};

// ============================================================================
// TYPES
// ============================================================================
interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function PhoneInput({
  value,
  onChangeText,
  selectedCountry,
  onCountryChange,
  placeholder = '999 999 999',
  disabled = false,
  error = false,
}: PhoneInputProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCountry = (country: Country) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCountryChange(country);
    setModalVisible(false);
    setSearchQuery('');
  };

  const openModal = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setModalVisible(true);
    }
  };

  return (
    <>
      <View
        className={`flex-row items-center bg-zinc-800 rounded-xl border ${
          error ? 'border-red-500' : 'border-zinc-700'
        }`}
      >
        {/* Country Selector */}
        <TouchableOpacity
          onPress={openModal}
          disabled={disabled}
          className="flex-row items-center px-3 py-4 border-r border-zinc-700"
          activeOpacity={0.7}
        >
          <Text className="text-2xl mr-1">{selectedCountry.flag}</Text>
          <Text className="text-zinc-400 font-mono text-sm">{selectedCountry.dialCode}</Text>
          <ChevronDown size={16} color={COLORS.zinc500} className="ml-1" />
        </TouchableOpacity>

        {/* Phone Input */}
        <View className="flex-1 flex-row items-center px-3">
          <Phone size={18} color={COLORS.zinc500} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.zinc600}
            className="flex-1 text-white py-4 px-3 font-mono"
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!disabled}
            // @ts-ignore - Web-only attributes
            data-lpignore="true"
            data-form-type="other"
          />
        </View>
      </View>

      {/* Country Selector Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-zinc-900 rounded-t-3xl max-h-[80%]">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-zinc-800">
              <Text className="text-white text-xl font-bold">Seleccionar país</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <X size={24} color={COLORS.zinc400} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="px-4 py-3">
              <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 py-3 border border-zinc-700">
                <Search size={18} color={COLORS.zinc500} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar país..."
                  placeholderTextColor={COLORS.zinc600}
                  className="flex-1 text-white ml-3"
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color={COLORS.zinc500} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Country List */}
            <ScrollView className="px-4" keyboardShouldPersistTaps="handled">
              {filteredCountries.map((country) => (
                <Pressable
                  key={country.code}
                  onPress={() => handleSelectCountry(country)}
                  className={`flex-row items-center py-4 px-3 rounded-xl mb-1 ${
                    selectedCountry.code === country.code ? 'bg-red-600/20' : 'active:bg-zinc-800'
                  }`}
                >
                  <Text className="text-3xl mr-4">{country.flag}</Text>
                  <View className="flex-1">
                    <Text className="text-white font-bold">{country.name}</Text>
                    <Text className="text-zinc-500 text-sm font-mono">{country.dialCode}</Text>
                  </View>
                  {selectedCountry.code === country.code && <Check size={20} color={COLORS.red} />}
                </Pressable>
              ))}
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ============================================================================
// UTILITY: Get full phone number with dial code
// ============================================================================
export function getFullPhoneNumber(country: Country, phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `${country.dialCode}${cleaned}`;
}

// ============================================================================
// UTILITY: Get default country (Peru)
// ============================================================================
export function getDefaultCountry(): Country {
  return COUNTRIES[0]; // Peru
}

export default PhoneInput;
