import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyScreen() {
  return (
    <View className="flex-1 bg-savage-black">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-12 pb-4 border-b border-zinc-900">
        <Link href="/" asChild>
          <View className="p-2">
            <ArrowLeft size={24} color="#fff" />
          </View>
        </Link>
        <Text className="text-white text-xl font-bold ml-2">Política de Privacidad</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        <Text className="text-white text-2xl font-bold mb-6">TRENS - Política de Privacidad</Text>

        <Text className="text-zinc-400 text-base mb-4">Última actualización: Enero 2026</Text>

        <Text className="text-white text-lg font-bold mt-6 mb-2">
          1. Información que Recopilamos
        </Text>
        <Text className="text-zinc-300 text-base mb-4">
          TRENS recopila información que nos proporcionas directamente, incluyendo:
          {'\n'}• Información de cuenta (email, nombre)
          {'\n'}• Datos de entrenamiento y progreso
          {'\n'}• Fotos de progreso (opcional)
        </Text>

        <Text className="text-white text-lg font-bold mt-6 mb-2">2. Uso de la Información</Text>
        <Text className="text-zinc-300 text-base mb-4">
          Utilizamos tu información para:
          {'\n'}• Proporcionar y mejorar nuestros servicios
          {'\n'}• Personalizar tu experiencia de entrenamiento
          {'\n'}• Comunicarnos contigo sobre tu cuenta
        </Text>

        <Text className="text-white text-lg font-bold mt-6 mb-2">3. Seguridad</Text>
        <Text className="text-zinc-300 text-base mb-4">
          Implementamos medidas de seguridad diseñadas para proteger tu información personal. Todos
          los datos se transmiten de forma encriptada usando HTTPS/TLS.
        </Text>

        <Text className="text-white text-lg font-bold mt-6 mb-2">4. Tus Derechos</Text>
        <Text className="text-zinc-300 text-base mb-4">
          Tienes derecho a:
          {'\n'}• Acceder a tu información personal
          {'\n'}• Solicitar la eliminación de tus datos
          {'\n'}• Exportar tus datos de entrenamiento
        </Text>

        <Text className="text-white text-lg font-bold mt-6 mb-2">5. Contacto</Text>
        <Text className="text-zinc-300 text-base mb-4">
          Para consultas sobre privacidad, contáctanos en: privacy@trens.app
        </Text>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
