import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { ArrowLeft, Mail, Globe, MapPin, Shield } from 'lucide-react-native';

export default function ContactScreen() {
  const router = useRouter();

  const handleEmail = () => {
    Linking.openURL('mailto:soporte@trens.app');
  };

  const handleWebsite = () => {
    Linking.openURL('https://trens.app');
  };

  return (
    <View className="flex-1 bg-savage-black">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 flex-row items-center border-b border-zinc-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Contacto</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Brand Header */}
        <View className="items-center mb-10 py-6">
          <Text className="text-savage-red text-5xl font-bold italic tracking-tighter">TRENS</Text>
          <Text className="text-zinc-500 text-lg tracking-widest mt-2">
            HIGH PERFORMANCE FITNESS
          </Text>
        </View>

        {/* About Section */}
        <View className="mb-8 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <Text className="text-white text-lg font-bold mb-3">Sobre TRENS</Text>
          <Text className="text-zinc-400 text-base leading-6">
            TRENS es una aplicación de fitness diseñada para atletas y entusiastas del entrenamiento
            de alto rendimiento. Nuestra misión es proporcionar herramientas profesionales para el
            seguimiento del progreso, planes de entrenamiento personalizados y conexión con coaches
            certificados.
          </Text>
        </View>

        {/* Contact Methods */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Contáctanos</Text>

          <TouchableOpacity
            onPress={handleEmail}
            className="flex-row items-center p-4 bg-zinc-900 rounded-xl border border-zinc-800 mb-3"
          >
            <View className="w-12 h-12 bg-savage-red/20 rounded-full items-center justify-center mr-4">
              <Mail size={24} color="#DC2626" />
            </View>
            <View>
              <Text className="text-white font-bold">Email de Soporte</Text>
              <Text className="text-zinc-400">soporte@trens.app</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleWebsite}
            className="flex-row items-center p-4 bg-zinc-900 rounded-xl border border-zinc-800 mb-3"
          >
            <View className="w-12 h-12 bg-savage-red/20 rounded-full items-center justify-center mr-4">
              <Globe size={24} color="#DC2626" />
            </View>
            <View>
              <Text className="text-white font-bold">Sitio Web</Text>
              <Text className="text-zinc-400">https://trens.app</Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <View className="w-12 h-12 bg-savage-red/20 rounded-full items-center justify-center mr-4">
              <MapPin size={24} color="#DC2626" />
            </View>
            <View>
              <Text className="text-white font-bold">Ubicación</Text>
              <Text className="text-zinc-400">Ciudad de México, México</Text>
            </View>
          </View>
        </View>

        {/* Security Badge */}
        <View className="p-6 bg-green-900/20 rounded-2xl border border-green-800/50 mb-8">
          <View className="flex-row items-center mb-3">
            <Shield size={24} color="#22c55e" />
            <Text className="text-green-400 text-lg font-bold ml-2">Sitio Verificado y Seguro</Text>
          </View>
          <Text className="text-green-400/70 text-sm leading-5">
            TRENS utiliza encriptación SSL/TLS para proteger toda la información transmitida. Tus
            datos personales y de entrenamiento están seguros con nosotros.
          </Text>
        </View>

        {/* Legal Links */}
        <View className="flex-row justify-center gap-6 mb-6">
          <Link href={"/privacy" as any} asChild>
            <TouchableOpacity>
              <Text className="text-zinc-500 text-sm underline">Privacidad</Text>
            </TouchableOpacity>
          </Link>
          <Link href={"/terms" as any} asChild>
            <TouchableOpacity>
              <Text className="text-zinc-500 text-sm underline">Términos</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Footer */}
        <View className="py-8 border-t border-zinc-900">
          <Text className="text-zinc-600 text-xs text-center">
            © 2026 TRENS - Todos los derechos reservados
          </Text>
          <Text className="text-zinc-700 text-xs text-center mt-1">
            Hecho con 💪 para atletas de alto rendimiento
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
