import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-savage-black">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-zinc-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Términos de Servicio</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        <Text className="text-zinc-400 text-sm mb-6">Última actualización: 4 de enero de 2026</Text>

        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-3">1. Aceptación de los Términos</Text>
          <Text className="text-zinc-400 text-base leading-6">
            Al acceder y utilizar la aplicación TRENS ("la App"), aceptas estos Términos de
            Servicio. Si no estás de acuerdo con alguno de estos términos, no debes utilizar la App.
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-3">2. Descripción del Servicio</Text>
          <Text className="text-zinc-400 text-base leading-6">
            TRENS es una aplicación de fitness de alto rendimiento que ofrece:{'\n\n'}• Planes de
            entrenamiento personalizados{'\n'}• Seguimiento de progreso físico{'\n'}• Biblioteca de
            ejercicios{'\n'}• Herramientas de registro de récords personales{'\n'}• Conexión con
            coaches certificados
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-3">3. Registro de Cuenta</Text>
          <Text className="text-zinc-400 text-base leading-6">
            Para utilizar TRENS, debes crear una cuenta proporcionando información precisa y
            actualizada. Eres responsable de mantener la confidencialidad de tu contraseña y de
            todas las actividades que ocurran bajo tu cuenta.
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-3">4. Uso Aceptable</Text>
          <Text className="text-zinc-400 text-base leading-6">
            Te comprometes a:{'\n\n'}• No utilizar la App para fines ilegales{'\n'}• No intentar
            acceder a cuentas de otros usuarios{'\n'}• No distribuir malware o código malicioso
            {'\n'}• No interferir con el funcionamiento de la App{'\n'}• No suplantar la identidad
            de otras personas
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-3">5. Propiedad Intelectual</Text>
          <Text className="text-zinc-400 text-base leading-6">
            Todo el contenido de TRENS, incluyendo pero no limitado a logos, diseños, textos,
            gráficos, videos, y software, es propiedad de TRENS o sus licenciantes y está protegido
            por leyes de propiedad intelectual.
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-3">6. Aviso de Salud</Text>
          <Text className="text-zinc-400 text-base leading-6">
            TRENS proporciona información de fitness con fines educativos. Antes de comenzar
            cualquier programa de ejercicios, consulta con un profesional de la salud. No somos
            responsables de lesiones que puedan ocurrir durante el uso de la App.
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-3">7. Modificaciones</Text>
          <Text className="text-zinc-400 text-base leading-6">
            Nos reservamos el derecho de modificar estos términos en cualquier momento. Las
            modificaciones entrarán en vigor inmediatamente después de su publicación en la App.
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-3">8. Contacto</Text>
          <Text className="text-zinc-400 text-base leading-6">
            Para preguntas sobre estos términos, contáctanos en:{'\n\n'}
            📧 Email: legal@trens.app{'\n'}
            🌐 Web: https://trens.app
          </Text>
        </View>

        {/* Footer */}
        <View className="py-8 border-t border-zinc-900 mt-4">
          <Text className="text-savage-red text-2xl font-bold italic text-center">TRENS</Text>
          <Text className="text-zinc-600 text-xs text-center mt-2">High Performance Fitness</Text>
        </View>
      </ScrollView>
    </View>
  );
}
