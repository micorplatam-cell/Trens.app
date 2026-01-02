import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function EjercicioDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <Text className="text-white">Detalle de Ejercicio: {id}</Text>
    </View>
  );
}
