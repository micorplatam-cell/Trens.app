import { View, Text, ScrollView } from 'react-native';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Target,
} from 'lucide-react-native';

// ============================================================================
// COLORS
// ============================================================================
const COLORS = {
  blue: '#3B82F6',
  green: '#22C55E',
  red: '#DC2626',
  purple: '#8B5CF6',
  orange: '#F97316',
  white: '#FFFFFF',
  zinc400: '#A1A1AA',
};

// ============================================================================
// MOCK DATA FOR DEMO
// ============================================================================
const MOCK_STATS = {
  mrr: 0,
  arr: 0,
  totalUsers: 0,
  proUsers: 0,
  conversionRate: 0,
  churnRate: 0,
  avgLifetimeValue: 0,
  newUsersThisMonth: 0,
};

// ============================================================================
// FINANZAS PLACEHOLDER WITH DEMO UI
// ============================================================================
export default function AdminFinanzasScreen() {
  return (
    <ScrollView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-4 py-4 bg-zinc-900 border-b border-zinc-800">
        <View className="flex-row items-center gap-2">
          <BarChart3 size={20} color={COLORS.blue} />
          <Text className="text-white font-bold text-lg">Dashboard Financiero</Text>
        </View>
        <Text className="text-zinc-500 text-xs font-mono mt-1">
          Datos de demostración • Configurar con datos reales próximamente
        </Text>
      </View>

      {/* MRR / ARR Cards */}
      <View className="flex-row px-4 mt-4 gap-3">
        <View className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <View className="flex-row items-center gap-2 mb-2">
            <DollarSign size={16} color={COLORS.green} />
            <Text className="text-zinc-400 text-xs font-mono">MRR</Text>
          </View>
          <Text className="text-white text-2xl font-bold">S/. {MOCK_STATS.mrr}</Text>
          <View className="flex-row items-center mt-1">
            <TrendingUp size={12} color={COLORS.green} />
            <Text className="text-green-400 text-xs font-mono ml-1">+0% vs mes ant.</Text>
          </View>
        </View>

        <View className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <View className="flex-row items-center gap-2 mb-2">
            <DollarSign size={16} color={COLORS.purple} />
            <Text className="text-zinc-400 text-xs font-mono">ARR</Text>
          </View>
          <Text className="text-white text-2xl font-bold">S/. {MOCK_STATS.arr}</Text>
          <View className="flex-row items-center mt-1">
            <TrendingUp size={12} color={COLORS.purple} />
            <Text className="text-purple-400 text-xs font-mono ml-1">Proyectado</Text>
          </View>
        </View>
      </View>

      {/* User Stats */}
      <View className="flex-row px-4 mt-3 gap-3">
        <View className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <View className="flex-row items-center gap-2 mb-2">
            <Users size={16} color={COLORS.blue} />
            <Text className="text-zinc-400 text-xs font-mono">USUARIOS TOTALES</Text>
          </View>
          <Text className="text-white text-2xl font-bold">{MOCK_STATS.totalUsers}</Text>
          <Text className="text-zinc-500 text-xs font-mono mt-1">
            {MOCK_STATS.proUsers} PRO • {MOCK_STATS.totalUsers - MOCK_STATS.proUsers} FREE
          </Text>
        </View>

        <View className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <View className="flex-row items-center gap-2 mb-2">
            <Target size={16} color={COLORS.orange} />
            <Text className="text-zinc-400 text-xs font-mono">CONVERSIÓN</Text>
          </View>
          <Text className="text-white text-2xl font-bold">{MOCK_STATS.conversionRate}%</Text>
          <Text className="text-zinc-500 text-xs font-mono mt-1">Free → Pro</Text>
        </View>
      </View>

      {/* Additional Metrics */}
      <View className="px-4 mt-4">
        <Text className="text-zinc-400 text-xs font-mono mb-3">MÉTRICAS CLAVE</Text>

        <View className="bg-zinc-900 rounded-xl border border-zinc-800">
          <View className="flex-row items-center justify-between p-4 border-b border-zinc-800">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-red-600/20 rounded-lg items-center justify-center">
                <TrendingDown size={18} color={COLORS.red} />
              </View>
              <View>
                <Text className="text-white font-bold">Churn Rate</Text>
                <Text className="text-zinc-500 text-xs font-mono">Tasa de cancelación</Text>
              </View>
            </View>
            <Text className="text-white font-bold text-lg">{MOCK_STATS.churnRate}%</Text>
          </View>

          <View className="flex-row items-center justify-between p-4 border-b border-zinc-800">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-green-600/20 rounded-lg items-center justify-center">
                <DollarSign size={18} color={COLORS.green} />
              </View>
              <View>
                <Text className="text-white font-bold">LTV Promedio</Text>
                <Text className="text-zinc-500 text-xs font-mono">Lifetime Value</Text>
              </View>
            </View>
            <Text className="text-white font-bold text-lg">S/. {MOCK_STATS.avgLifetimeValue}</Text>
          </View>

          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-blue-600/20 rounded-lg items-center justify-center">
                <Users size={18} color={COLORS.blue} />
              </View>
              <View>
                <Text className="text-white font-bold">Nuevos Este Mes</Text>
                <Text className="text-zinc-500 text-xs font-mono">Registros</Text>
              </View>
            </View>
            <Text className="text-white font-bold text-lg">{MOCK_STATS.newUsersThisMonth}</Text>
          </View>
        </View>
      </View>

      {/* Coming Soon Notice */}
      <View className="mx-4 mt-6 mb-8 bg-blue-600/10 p-4 rounded-xl border border-blue-600/30">
        <View className="flex-row items-center gap-2 mb-2">
          <Clock size={16} color={COLORS.blue} />
          <Text className="text-blue-400 font-bold">Próximamente</Text>
        </View>
        <Text className="text-zinc-400 text-xs font-mono">
          • Gráficos de tendencias{'\n'}• Proyecciones de ingresos{'\n'}• Análisis de cohortes{'\n'}
          • Reportes exportables{'\n'}• Integración con Openpay
        </Text>
      </View>
    </ScrollView>
  );
}
