import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, Shield, Eye, Lock, UserCheck, Mail, Dumbbell, Database, Key, FileCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PREMIUM = {
  fireRed: '#DC2626',
  fireOrange: '#F97316',
  fireYellow: '#FBBF24',
  dragonBlue: '#0EA5E9',
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
        colors={[PREMIUM.dragonBlue, '#2563EB']}
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

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      {/* Background Effects */}
      <View
        style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: PREMIUM.dragonBlue,
          opacity: 0.05,
        }}
        className="blur-3xl"
      />
      <View
        style={{
          position: 'absolute',
          bottom: 100,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: PREMIUM.fireRed,
          opacity: 0.03,
        }}
        className="blur-3xl"
      />

      {/* Header */}
      <LinearGradient
        colors={['rgba(14, 165, 233, 0.08)', 'transparent']}
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
            <View className="flex-row items-center gap-2">
              <Shield size={18} color={PREMIUM.dragonBlue} />
              <Text
                className="text-white text-xl font-bold"
                style={{
                  textShadowColor: 'rgba(14, 165, 233, 0.3)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 10,
                }}
              >
                Política de Privacidad
              </Text>
            </View>
            <Text className="text-zinc-500 text-xs">Tu seguridad es nuestra prioridad</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Trust Badge */}
        <Animated.View entering={FadeInDown.duration(400)} className="mb-8">
          <View className="flex-row items-center gap-3 bg-blue-950/30 border border-blue-500/20 rounded-2xl p-4">
            <View className="w-12 h-12 rounded-full bg-blue-500/20 items-center justify-center">
              <Lock size={24} color={PREMIUM.dragonBlue} />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold">Datos protegidos con encriptación</Text>
              <Text className="text-blue-400/70 text-xs mt-0.5">HTTPS/TLS • Almacenamiento seguro • GDPR Compliant</Text>
            </View>
          </View>
        </Animated.View>

        {/* Date Badge */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mb-8">
          <View className="flex-row items-center gap-2 bg-zinc-900/50 border border-zinc-800/30 rounded-full px-4 py-2 self-start">
            <View className="w-2 h-2 rounded-full bg-green-500" />
            <Text className="text-zinc-400 text-sm">Última actualización: Enero 2026</Text>
          </View>
        </Animated.View>

        <Section number="01" title="Información que Recopilamos" icon={<Database size={18} color="white" />} delay={150}>
          TRENS recopila información que nos proporcionas directamente, incluyendo:{'\n\n'}
          • Información de cuenta (email, nombre){'\n'}
          • Datos de entrenamiento y progreso{'\n'}
          • Fotos de progreso (opcional){'\n'}
          • Preferencias de entrenamiento
        </Section>

        <Section number="02" title="Uso de la Información" icon={<Eye size={18} color="white" />} delay={200}>
          Utilizamos tu información para:{'\n\n'}
          • Proporcionar y mejorar nuestros servicios{'\n'}
          • Personalizar tu experiencia de entrenamiento{'\n'}
          • Comunicarnos contigo sobre tu cuenta{'\n'}
          • Generar insights de progreso
        </Section>

        <Section number="03" title="Seguridad" icon={<Key size={18} color="white" />} delay={250}>
          Implementamos medidas de seguridad diseñadas para proteger tu información personal. Todos
          los datos se transmiten de forma encriptada usando HTTPS/TLS. Utilizamos servicios de
          almacenamiento seguros con certificación SOC 2.
        </Section>

        <Section number="04" title="Tus Derechos" icon={<UserCheck size={18} color="white" />} delay={300}>
          Tienes derecho a:{'\n\n'}
          • Acceder a tu información personal{'\n'}
          • Solicitar la eliminación de tus datos{'\n'}
          • Exportar tus datos de entrenamiento{'\n'}
          • Revocar consentimientos otorgados
        </Section>

        <Section number="05" title="Contacto" icon={<Mail size={18} color="white" />} delay={350}>
          Para consultas sobre privacidad, contáctanos en:{'\n\n'}
          📧 privacy@trens.app{'\n'}
          🌐 https://trens.app/contact
        </Section>

        {/* Footer */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)} className="py-10 border-t border-zinc-800/50 mt-6 items-center">
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
