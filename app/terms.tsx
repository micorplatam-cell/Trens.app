import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Dumbbell, FileText, Shield, Scale, Heart, Mail, Globe } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PREMIUM = {
  fireRed: '#DC2626',
  fireOrange: '#F97316',
  fireYellow: '#FBBF24',
};

interface SectionProps {
  number: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay: number;
}

const Section = ({ number, title, icon, children, delay }: SectionProps) => (
  <Animated.View
    entering={FadeInUp.delay(delay).duration(500)}
    className="mb-8"
  >
    <View className="flex-row items-center gap-3 mb-4">
      <LinearGradient
        colors={[PREMIUM.fireRed, PREMIUM.fireOrange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="w-10 h-10 rounded-xl items-center justify-center"
      >
        {icon}
      </LinearGradient>
      <View>
        <Text className="text-zinc-500 text-xs font-bold tracking-wider">SECCIÓN {number}</Text>
        <Text className="text-white text-lg font-bold">{title}</Text>
      </View>
    </View>
    <View className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl p-5">
      <Text className="text-zinc-400 text-base leading-7">{children}</Text>
    </View>
  </Animated.View>
);

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      {/* Background Effects */}
      <View
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: PREMIUM.fireRed,
          opacity: 0.05,
        }}
        className="blur-3xl"
      />

      {/* Header */}
      <LinearGradient
        colors={['rgba(220, 38, 38, 0.08)', 'transparent']}
        className="border-b border-zinc-800/50"
      >
        <View
          className="px-4 pb-4 flex-row items-center"
          style={{ paddingTop: Math.max(insets.top, 12) + 8 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-800/80 items-center justify-center mr-4"
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text
              className="text-white text-xl font-bold"
              style={{
                textShadowColor: 'rgba(220, 38, 38, 0.3)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 10,
              }}
            >
              Términos de Servicio
            </Text>
            <Text className="text-zinc-500 text-xs">TRENS High Performance Fitness</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Badge */}
        <Animated.View entering={FadeInDown.duration(400)} className="mb-8">
          <View className="flex-row items-center gap-2 bg-zinc-900/50 border border-zinc-800/30 rounded-full px-4 py-2 self-start">
            <View className="w-2 h-2 rounded-full bg-green-500" />
            <Text className="text-zinc-400 text-sm">Última actualización: 4 de enero de 2026</Text>
          </View>
        </Animated.View>

        <Section number="01" title="Aceptación de los Términos" icon={<FileText size={18} color="white" />} delay={100}>
          Al acceder y utilizar la aplicación TRENS ("la App"), aceptas estos Términos de
          Servicio. Si no estás de acuerdo con alguno de estos términos, no debes utilizar la App.
        </Section>

        <Section number="02" title="Descripción del Servicio" icon={<Dumbbell size={18} color="white" />} delay={150}>
          TRENS es una aplicación de fitness de alto rendimiento que ofrece:{'\n\n'}
          • Planes de entrenamiento personalizados{'\n'}
          • Seguimiento de progreso físico{'\n'}
          • Biblioteca de ejercicios{'\n'}
          • Herramientas de registro de récords personales{'\n'}
          • Conexión con coaches certificados
        </Section>

        <Section number="03" title="Registro de Cuenta" icon={<Shield size={18} color="white" />} delay={200}>
          Para utilizar TRENS, debes crear una cuenta proporcionando información precisa y
          actualizada. Eres responsable de mantener la confidencialidad de tu contraseña y de
          todas las actividades que ocurran bajo tu cuenta.
        </Section>

        <Section number="04" title="Uso Aceptable" icon={<Scale size={18} color="white" />} delay={250}>
          Te comprometes a:{'\n\n'}
          • No utilizar la App para fines ilegales{'\n'}
          • No intentar acceder a cuentas de otros usuarios{'\n'}
          • No distribuir malware o código malicioso{'\n'}
          • No interferir con el funcionamiento de la App{'\n'}
          • No suplantar la identidad de otras personas
        </Section>

        <Section number="05" title="Propiedad Intelectual" icon={<FileText size={18} color="white" />} delay={300}>
          Todo el contenido de TRENS, incluyendo pero no limitado a logos, diseños, textos,
          gráficos, videos, y software, es propiedad de TRENS o sus licenciantes y está protegido
          por leyes de propiedad intelectual.
        </Section>

        <Section number="06" title="Aviso de Salud" icon={<Heart size={18} color="white" />} delay={350}>
          TRENS proporciona información de fitness con fines educativos. Antes de comenzar
          cualquier programa de ejercicios, consulta con un profesional de la salud. No somos
          responsables de lesiones que puedan ocurrir durante el uso de la App.
        </Section>

        <Section number="07" title="Modificaciones" icon={<FileText size={18} color="white" />} delay={400}>
          Nos reservamos el derecho de modificar estos términos en cualquier momento. Las
          modificaciones entrarán en vigor inmediatamente después de su publicación en la App.
        </Section>

        <Section number="08" title="Contacto" icon={<Mail size={18} color="white" />} delay={450}>
          Para preguntas sobre estos términos, contáctanos en:{'\n\n'}
          📧 Email: legal@trens.app{'\n'}
          🌐 Web: https://trens.app
        </Section>

        {/* Footer */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)} className="py-10 border-t border-zinc-800/50 mt-6 items-center">
          <LinearGradient
            colors={[PREMIUM.fireRed, PREMIUM.fireOrange]}
            className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
            style={{
              shadowColor: PREMIUM.fireRed,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
            }}
          >
            <Dumbbell size={28} color="white" />
          </LinearGradient>
          <Text
            className="text-white text-2xl font-bold"
            style={{
              textShadowColor: 'rgba(220, 38, 38, 0.4)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 10,
            }}
          >
            TRENS
          </Text>
          <Text className="text-zinc-600 text-xs mt-1 tracking-widest">HIGH PERFORMANCE FITNESS</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
