import { View, Text } from 'react-native';
import { CreditCard, Clock, AlertCircle } from 'lucide-react-native';

// ============================================================================
// PAGOS PLACEHOLDER
// ============================================================================
export default function AdminPagosScreen() {
  return (
    <View className="flex-1 bg-black items-center justify-center p-8">
      <View className="w-20 h-20 bg-zinc-800 rounded-full items-center justify-center mb-6">
        <CreditCard size={40} color="#3B82F6" />
      </View>

      <Text className="text-white font-bold text-xl text-center mb-2">Módulo de Pagos</Text>

      <Text className="text-zinc-400 text-center font-mono text-sm mb-6">
        Integración con Openpay para ver transacciones en tiempo real.
      </Text>

      <View className="bg-zinc-900 rounded-lg p-4 w-full border border-zinc-800">
        <View className="flex-row items-center mb-3">
          <Clock size={16} color="#F97316" />
          <Text className="text-orange-400 font-mono text-sm ml-2">PRÓXIMAMENTE</Text>
        </View>

        <Text className="text-zinc-400 text-xs font-mono">
          • Lista de transacciones{'\n'}• Estado de pagos (pendiente, completado, fallido){'\n'}•
          Historial por usuario{'\n'}• Reembolsos y disputas{'\n'}• Exportar a CSV
        </Text>
      </View>

      <View className="flex-row items-center mt-6 bg-blue-600/20 p-3 rounded-lg">
        <AlertCircle size={16} color="#3B82F6" />
        <Text className="text-blue-400 text-xs font-mono ml-2">
          API Keys de Openpay configuradas ✓
        </Text>
      </View>
    </View>
  );
}
