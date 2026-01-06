import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter, Link } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Globe,
  MapPin,
  Shield,
  Dumbbell,
  MessageCircle,
  Clock,
  ChevronRight,
  Flame,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';

const PREMIUM = {
  fireRed: '#DC2626',
  fireOrange: '#F97316',
  fireYellow: '#FBBF24',
  dragonGreen: '#22C55E',
};

interface ContactCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  delay: number;
}

const ContactCard = ({ icon, title, subtitle, onPress, delay }: ContactCardProps) => (
  <Animated.View entering={FadeInUp.delay(delay).duration(400)}>
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.8 : 1}
      className="mb-4"
    >
      <View className="flex-row items-center p-5 bg-zinc-900/50 backdrop-blur rounded-2xl border border-zinc-800/30">
        <LinearGradient
          colors={[PREMIUM.fireRed, PREMIUM.fireOrange]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-14 h-14 rounded-xl items-center justify-center mr-4"
          style={{
            shadowColor: PREMIUM.fireRed,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          {icon}
        </LinearGradient>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{title}</Text>
          <Text className="text-zinc-400 text-sm mt-0.5">{subtitle}</Text>
        </View>
        {onPress && <ChevronRight size={20} color="#52525B" />}
      </View>
    </TouchableOpacity>
  </Animated.View>
);

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 1500 }), withTiming(1, { duration: 1500 })),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleEmail = () => {
    Linking.openURL('mailto:soporte@trens.app');
  };

  const handleWebsite = () => {
    Linking.openURL('https://trens.app');
  };

  return (
    <View className="flex-1 bg-black">
      {/* Background Effects */}
      <View
        style={{
          position: 'absolute',
          top: 100,
          left: -100,
          width: 350,
          height: 350,
          borderRadius: 175,
          backgroundColor: PREMIUM.fireRed,
          opacity: 0.06,
        }}
        className="blur-3xl"
      />
      <View
        style={{
          position: 'absolute',
          bottom: 100,
          right: -80,
          width: 250,
          height: 250,
          borderRadius: 125,
          backgroundColor: PREMIUM.fireOrange,
          opacity: 0.04,
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
              Contacto
            </Text>
            <Text className="text-zinc-500 text-xs">Estamos aquí para ayudarte</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <Animated.View entering={FadeInDown.duration(500)} className="items-center mb-10 py-6">
          <Animated.View style={pulseStyle}>
            <LinearGradient
              colors={[PREMIUM.fireRed, PREMIUM.fireOrange]}
              className="w-20 h-20 rounded-3xl items-center justify-center mb-5"
              style={{
                shadowColor: PREMIUM.fireRed,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
              }}
            >
              <Dumbbell size={40} color="white" />
            </LinearGradient>
          </Animated.View>
          <Text
            className="text-white text-4xl font-bold"
            style={{
              textShadowColor: 'rgba(220, 38, 38, 0.5)',
              textShadowOffset: { width: 0, height: 4 },
              textShadowRadius: 15,
            }}
          >
            TRENS
          </Text>
          <Text className="text-zinc-500 text-sm tracking-[0.3em] mt-2">
            HIGH PERFORMANCE FITNESS
          </Text>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} className="mb-8">
          <View className="relative overflow-hidden bg-zinc-900/40 backdrop-blur rounded-3xl border border-zinc-800/30 p-6">
            <LinearGradient
              colors={['rgba(220, 38, 38, 0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 24,
              }}
            />
            <View className="flex-row items-center mb-4">
              <Flame size={18} color={PREMIUM.fireOrange} />
              <Text className="text-white text-lg font-bold ml-2">Sobre TRENS</Text>
            </View>
            <Text className="text-zinc-400 text-base leading-7">
              TRENS es una aplicación de fitness diseñada para atletas y entusiastas del
              entrenamiento de alto rendimiento. Nuestra misión es proporcionar herramientas
              profesionales para el seguimiento del progreso, planes de entrenamiento personalizados
              y conexión con coaches certificados.
            </Text>
          </View>
        </Animated.View>

        {/* Response Time Badge */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)} className="mb-6">
          <View className="flex-row items-center gap-2 bg-green-950/30 border border-green-500/20 rounded-full px-4 py-2 self-start">
            <Clock size={14} color={PREMIUM.dragonGreen} />
            <Text className="text-green-400 text-sm font-medium">
              Respondemos en menos de 24 horas
            </Text>
          </View>
        </Animated.View>

        {/* Contact Methods */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} className="mb-2">
          <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4">
            Contáctanos
          </Text>
        </Animated.View>

        <ContactCard
          icon={<Mail size={24} color="white" />}
          title="Email de Soporte"
          subtitle="soporte@trens.app"
          onPress={handleEmail}
          delay={250}
        />

        <ContactCard
          icon={<Globe size={24} color="white" />}
          title="Sitio Web"
          subtitle="https://trens.app"
          onPress={handleWebsite}
          delay={300}
        />

        <ContactCard
          icon={<MapPin size={24} color="white" />}
          title="Ubicación"
          subtitle="Ciudad de México, México"
          delay={350}
        />

        {/* Security Badge */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)} className="mb-8 mt-4">
          <View className="p-6 bg-green-950/20 rounded-3xl border border-green-500/20">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl bg-green-500/20 items-center justify-center mr-3">
                <Shield size={22} color={PREMIUM.dragonGreen} />
              </View>
              <Text className="text-green-400 text-lg font-bold">Sitio Verificado y Seguro</Text>
            </View>
            <Text className="text-green-400/60 text-sm leading-6">
              TRENS utiliza encriptación SSL/TLS para proteger toda la información transmitida. Tus
              datos personales y de entrenamiento están seguros con nosotros.
            </Text>
          </View>
        </Animated.View>

        {/* Legal Links */}
        <Animated.View
          entering={FadeInUp.delay(450).duration(400)}
          className="flex-row justify-center gap-8 mb-8"
        >
          <Link href={'/privacy' as any} asChild>
            <TouchableOpacity className="px-4 py-2">
              <Text className="text-zinc-400 text-sm font-medium">Privacidad</Text>
            </TouchableOpacity>
          </Link>
          <View className="w-px h-6 bg-zinc-800" />
          <Link href={'/terms' as any} asChild>
            <TouchableOpacity className="px-4 py-2">
              <Text className="text-zinc-400 text-sm font-medium">Términos</Text>
            </TouchableOpacity>
          </Link>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          className="py-8 border-t border-zinc-800/50"
        >
          <Text className="text-zinc-600 text-xs text-center">
            © 2026 TRENS - Todos los derechos reservados
          </Text>
          <Text className="text-zinc-700 text-xs text-center mt-2 flex-row">
            Hecho con <Text className="text-red-500">🔥</Text> para atletas de alto rendimiento
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
