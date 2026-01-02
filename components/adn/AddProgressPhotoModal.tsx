import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Camera, Image as ImageIcon, Upload } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { uploadProgressPhoto } from '../../services/progress/photos';

interface AddProgressPhotoModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddProgressPhotoModal({
  visible,
  userId,
  onClose,
  onSuccess,
}: AddProgressPhotoModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const resetState = () => {
    setSelectedImage(null);
    setNotes('');
    setIsUploading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const pickFromCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsUploading(true);

    // Extraer base64 sin el prefijo data:image/jpeg;base64,
    const base64Data = selectedImage.replace(/^data:image\/\w+;base64,/, '');

    const result = await uploadProgressPhoto(userId, {
      photo_base64: base64Data,
      notes: notes.trim() || undefined,
    });

    setIsUploading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetState();
      onSuccess();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', result.error || 'No se pudo subir la foto');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/90 justify-end">
        <View className="bg-[#0a0a0a] rounded-t-3xl border-t border-zinc-800">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-zinc-800">
            <Text className="text-white font-bold text-sm uppercase tracking-wider">
              📸 Nueva Foto de Progreso
            </Text>
            <TouchableOpacity onPress={handleClose} className="p-2">
              <X size={20} color="#71717a" />
            </TouchableOpacity>
          </View>

          <View className="p-4">
            {/* Preview de imagen o botones de selección */}
            {selectedImage ? (
              <View className="mb-4">
                <Image
                  source={{ uri: selectedImage }}
                  className="w-full h-80 rounded-lg"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 bg-black/70 p-2 rounded-full"
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity
                  onPress={pickFromCamera}
                  className="flex-1 py-6 bg-zinc-900 rounded-lg items-center border border-zinc-800"
                >
                  <Camera size={32} color="#DC2626" />
                  <Text className="text-white text-xs font-bold mt-2 uppercase">Cámara</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={pickFromGallery}
                  className="flex-1 py-6 bg-zinc-900 rounded-lg items-center border border-zinc-800"
                >
                  <ImageIcon size={32} color="#DC2626" />
                  <Text className="text-white text-xs font-bold mt-2 uppercase">Galería</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notas opcionales */}
            <View className="mb-4">
              <Text className="text-zinc-400 text-[10px] uppercase tracking-wider mb-2">
                Notas (opcional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej: Semana 8 de definición, sintiéndome más fuerte..."
                placeholderTextColor="#52525b"
                multiline
                numberOfLines={3}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white text-sm"
                style={{ textAlignVertical: 'top', minHeight: 80 }}
              />
            </View>

            {/* Info sobre snapshot */}
            <View className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 mb-4">
              <Text className="text-zinc-400 text-[10px] text-center">
                💾 Se guardará automáticamente tu peso, medidas, plan de entrenamiento y nutrición
                actuales junto con esta foto.
              </Text>
            </View>

            {/* Botón Subir */}
            <TouchableOpacity
              onPress={handleUpload}
              disabled={!selectedImage || isUploading}
              className={`py-4 rounded-lg flex-row items-center justify-center gap-2 ${
                selectedImage && !isUploading ? 'bg-savage-red' : 'bg-zinc-800'
              }`}
              style={{ marginBottom: Math.max(insets.bottom, 16) }}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Upload size={18} color="#fff" />
              )}
              <Text className="text-white font-black uppercase tracking-widest text-xs">
                {isUploading ? 'Subiendo...' : 'Guardar Foto'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
