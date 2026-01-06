// ============================================================================
// LANDING PAGE - TRENS
// Solo visible desde web (no PWA). Página de venta y suscripción.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Dumbbell,
  Camera,
  Trophy,
  Gitlab,
  Music,
  Utensils,
  Pill,
  TrendingUp,
  Shield,
  CreditCard,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  Zap,
  Target,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import openpay, {
  formatCardNumber,
  formatExpiry,
  validateCardNumber,
  getCardBrand,
  getPlanDetails,
  getFormattedPrice,
} from '../../lib/openpay';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import {
  PhoneInput,
  getDefaultCountry,
  getFullPhoneNumber,
  Country,
} from '../../components/ui/PhoneInput';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// FEATURE CARD
// ============================================================================
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  delay?: number;
}) => (
  <Animated.View
    entering={FadeInUp.delay(delay).duration(600)}
    className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
    style={{ width: '100%', maxWidth: 350 }}
  >
    <View className="w-12 h-12 rounded-xl bg-red-600/20 items-center justify-center mb-4">
      <Icon size={24} color="#DC2626" />
    </View>
    <Text className="text-white font-bold text-lg mb-2">{title}</Text>
    <Text className="text-zinc-400 text-sm leading-relaxed">{description}</Text>
  </Animated.View>
);

// ============================================================================
// PRICING FEATURE ROW
// ============================================================================
const PricingFeature = ({ text }: { text: string }) => (
  <View className="flex-row items-center gap-3 py-2">
    <View className="w-5 h-5 rounded-full bg-red-600 items-center justify-center">
      <Check size={12} color="white" strokeWidth={3} />
    </View>
    <Text className="text-white text-base flex-1">{text}</Text>
  </View>
);

// ============================================================================
// MAIN LANDING COMPONENT
// ============================================================================
export default function LandingPage() {
  const scrollRef = useRef<ScrollView>(null);

  // Form state
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<Country>(getDefaultCountry());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Card info
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Animations
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Scroll to pricing section
  const scrollToPricing = () => {
    if (Platform.OS === 'web') {
      const element = document.getElementById('pricing-section');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Validate user info step
  const validateUserInfo = (): boolean => {
    if (!name.trim()) {
      setError('Ingresa tu nombre completo');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un email válido');
      return false;
    }
    if (!phone.trim() || phone.length < 9) {
      setError('Ingresa un número de celular válido');
      return false;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  };

  // Go to payment step
  const goToPayment = () => {
    if (validateUserInfo()) {
      setError(null);
      setStep('payment');
      setCardName(name.toUpperCase());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle card number formatting
  const handleCardNumberChange = (value: string) => {
    setCardNumber(formatCardNumber(value));
  };

  // Handle expiry formatting
  const handleExpiryChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      setExpiry(formatExpiry(cleaned));
    }
  };

  // Process subscription
  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate card
      if (!validateCardNumber(cardNumber)) {
        throw new Error('Número de tarjeta inválido');
      }

      const [expMonth, expYear] = expiry.split('/');
      if (!expMonth || !expYear) {
        throw new Error('Fecha de expiración inválida');
      }

      if (!cvv || cvv.length < 3) {
        throw new Error('CVV inválido');
      }

      // 1. Create user in Supabase
      const fullPhoneNumber = getFullPhoneNumber(phoneCountry, phone);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: name,
            phone: fullPhoneNumber,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Error al crear usuario');
      }

      // 2. Tokenize card (client-side con llave pública)
      const token = await openpay.createCardToken({
        card_number: cardNumber.replace(/\s/g, ''),
        holder_name: cardName.toUpperCase(),
        expiration_month: expMonth.padStart(2, '0'),
        expiration_year: expYear.length === 4 ? expYear.slice(-2) : expYear, // Solo 2 dígitos: 27, no 2027
        cvv2: cvv,
      });

      // 3. Create customer + subscription via Edge Function (server-side con llave privada)
      const result = await openpay.createSubscription({
        tokenId: token.id,
        customer: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone_number: fullPhoneNumber,
        },
        userId: authData.user.id,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al procesar suscripción');
      }

      // 4. Create user profile (si no existe)
      await supabase.from('user_profiles').upsert(
        {
          user_id: authData.user.id,
          display_name: name,
        },
        { onConflict: 'user_id' }
      );

      // 5. Success!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Redirect to success page
      if (Platform.OS === 'web') {
        window.location.href = '/pago-exitoso';
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Error al procesar el pago');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const planDetails = getPlanDetails();

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* ================================================================== */}
      {/* HERO SECTION */}
      {/* ================================================================== */}
      <View className="min-h-screen justify-center items-center px-6 py-20">
        {/* Background gradient */}
        <LinearGradient
          colors={['#DC2626', '#000000']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: SCREEN_HEIGHT * 0.7,
            opacity: 0.3,
          }}
        />

        {/* Logo */}
        <Animated.View entering={FadeInDown.duration(800)} className="items-center mb-8">
          <View className="w-24 h-24 rounded-3xl bg-red-600 items-center justify-center mb-6 shadow-2xl">
            <Dumbbell size={48} color="white" strokeWidth={2.5} />
          </View>
          <Text className="text-white text-5xl font-bold tracking-tight">TRENS</Text>
          <Text className="text-red-500 text-lg font-mono tracking-widest mt-1">
            HIGH PERFORMANCE FITNESS
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(800)}
          className="items-center mb-12"
        >
          <Text className="text-white text-2xl md:text-4xl font-bold text-center max-w-2xl leading-tight">
            Entrena como un atleta profesional
          </Text>
          <Text className="text-zinc-400 text-lg text-center mt-4 max-w-xl leading-relaxed">
            Graba tus ejercicios, trackea tu progreso, registra tus récords personales y transforma
            tu cuerpo con tecnología de élite.
          </Text>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View style={pulseStyle}>
          <TouchableOpacity
            onPress={scrollToPricing}
            activeOpacity={0.9}
            className="bg-red-600 px-10 py-5 rounded-2xl flex-row items-center gap-3 shadow-2xl"
            style={{
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
            }}
          >
            <Zap size={24} color="white" fill="white" />
            <Text className="text-white text-xl font-bold">EMPIEZA AHORA</Text>
            <ChevronRight size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* Price tag */}
        <Animated.View entering={FadeInDown.delay(400).duration(800)} className="mt-6">
          <Text className="text-zinc-500 text-center">
            Solo <Text className="text-red-500 font-bold">{getFormattedPrice()}</Text> / mes
          </Text>
        </Animated.View>
      </View>

      {/* ================================================================== */}
      {/* FEATURES SECTION */}
      {/* ================================================================== */}
      <View className="px-6 py-20 bg-zinc-950">
        <Animated.View entering={FadeInUp.duration(600)} className="items-center mb-16">
          <Text className="text-red-500 font-mono text-sm tracking-widest mb-2">
            CARACTERÍSTICAS
          </Text>
          <Text className="text-white text-3xl md:text-4xl font-bold text-center">
            Todo lo que necesitas para entrenar
          </Text>
        </Animated.View>

        <View
          className="flex-row flex-wrap justify-center items-stretch"
          style={{ maxWidth: 1200, alignSelf: 'center', gap: 16, paddingHorizontal: 8 }}
        >
          <FeatureCard
            icon={Camera}
            title="Graba tus ejercicios"
            description="Cámara profesional optimizada para fitness. Graba sets, revisa tu técnica y guarda en tu bóveda personal."
            delay={100}
          />
          <FeatureCard
            icon={Trophy}
            title="Récords Personales"
            description="Registra automáticamente cuando superas tu mejor marca. PRs detectados con IA para cada ejercicio."
            delay={200}
          />
          <FeatureCard
            icon={TrendingUp}
            title="Progreso Visual"
            description="Fotos de progreso con timeline. Ve tu transformación mes a mes con comparativas lado a lado."
            delay={300}
          />
          <FeatureCard
            icon={Gitlab}
            title="Asistente HANK"
            description="IA integrada que te ayuda con rutinas, ajusta tu nutrición y responde cualquier duda de entrenamiento."
            delay={400}
          />
          <FeatureCard
            icon={Music}
            title="Spotify Sync"
            description="Conecta tu Spotify Premium. La música que suena durante tus sets se guarda con cada video."
            delay={500}
          />
          <FeatureCard
            icon={Utensils}
            title="Nutrición Inteligente"
            description="Planes de comidas personalizados según tus macros. Ajustados a tu peso, altura y objetivo."
            delay={600}
          />
          <FeatureCard
            icon={Pill}
            title="Stack de Suplementos"
            description="Gestiona tu suplementación diaria. Recordatorios y seguimiento de tu stack completo."
            delay={700}
          />
          <FeatureCard
            icon={Target}
            title="ADN Atlético"
            description="Tu perfil completo: métricas corporales, récords, volumen semanal y toda tu data de rendimiento."
            delay={800}
          />
        </View>
      </View>

      {/* ================================================================== */}
      {/* PRICING SECTION */}
      {/* ================================================================== */}
      <View id="pricing-section" className="px-6 py-20 bg-black">
        <Animated.View entering={FadeInUp.duration(600)} className="items-center mb-12">
          <Text className="text-red-500 font-mono text-sm tracking-widest mb-2">SUSCRIPCIÓN</Text>
          <Text className="text-white text-3xl md:text-4xl font-bold text-center">
            Un solo plan, todo incluido
          </Text>
        </Animated.View>

        <View
          className="flex-row flex-wrap justify-center gap-8"
          style={{ maxWidth: 1000, alignSelf: 'center' }}
        >
          {/* Plan Card */}
          <View className="bg-zinc-900 border-2 border-red-600 rounded-3xl p-8 flex-1 min-w-[320px] max-w-[400px]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-2xl font-bold">{planDetails.name}</Text>
              <View className="bg-red-600 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">POPULAR</Text>
              </View>
            </View>

            <View className="flex-row items-baseline mb-8">
              <Text className="text-white text-5xl font-bold">S/ 59</Text>
              <Text className="text-white text-2xl">.90</Text>
              <Text className="text-zinc-500 text-lg ml-2">/ mes</Text>
            </View>

            <View className="mb-8">
              {planDetails.features.map((feature, index) => (
                <PricingFeature key={index} text={feature} />
              ))}
            </View>

            <View className="bg-red-600/10 border border-red-600/30 rounded-xl p-4">
              <Text className="text-red-400 text-sm text-center">
                💳 Pago seguro con Openpay • Cancela cuando quieras
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex-1 min-w-[320px] max-w-[450px]">
            <Text className="text-white text-xl font-bold mb-6">
              {step === 'info' ? 'Crea tu cuenta' : 'Datos de pago'}
            </Text>

            {error && (
              <View className="bg-red-600/20 border border-red-600 rounded-xl p-4 mb-6">
                <Text className="text-red-400 text-sm text-center">{error}</Text>
              </View>
            )}

            {step === 'info' ? (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* Formulario de registro - NO es pago */}
                <View
                  // @ts-ignore - Web-only attribute
                  data-form-type="registration"
                >
                  {/* Name */}
                  <View className="mb-4">
                    <Text className="text-zinc-400 text-sm mb-2">Nombre completo</Text>
                    <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 border border-zinc-700">
                      <User size={20} color="#71717a" />
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Juan Pérez"
                        placeholderTextColor="#52525b"
                        className="flex-1 text-white py-4 px-3"
                        autoCapitalize="words"
                        autoComplete="name"
                        // @ts-ignore - Web-only attributes
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    </View>
                  </View>

                  {/* Email */}
                  <View className="mb-4">
                    <Text className="text-zinc-400 text-sm mb-2">Correo electrónico</Text>
                    <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 border border-zinc-700">
                      <Mail size={20} color="#71717a" />
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="tu@email.com"
                        placeholderTextColor="#52525b"
                        className="flex-1 text-white py-4 px-3"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        // @ts-ignore - Web-only attributes
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    </View>
                  </View>

                  {/* Phone */}
                  <View className="mb-4">
                    <Text className="text-zinc-400 text-sm mb-2">Celular</Text>
                    <PhoneInput
                      value={phone}
                      onChangeText={setPhone}
                      selectedCountry={phoneCountry}
                      onCountryChange={setPhoneCountry}
                      placeholder="999 999 999"
                      disabled={loading}
                    />
                  </View>

                  {/* Password */}
                  <View className="mb-6">
                    <Text className="text-zinc-400 text-sm mb-2">Contraseña</Text>
                    <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 border border-zinc-700">
                      <Lock size={20} color="#71717a" />
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Mínimo 6 caracteres"
                        placeholderTextColor="#52525b"
                        className="flex-1 text-white py-4 px-3"
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
                        // @ts-ignore - Web-only attributes
                        data-lpignore="true"
                        data-form-type="other"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <EyeOff size={20} color="#71717a" />
                        ) : (
                          <Eye size={20} color="#71717a" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  onPress={goToPayment}
                  activeOpacity={0.9}
                  className="bg-red-600 py-4 rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Text className="text-white text-lg font-bold">Continuar</Text>
                  <ChevronRight size={20} color="white" />
                </TouchableOpacity>
              </KeyboardAvoidingView>
            ) : (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* Formulario de PAGO - separado del registro */}
                <View
                  // @ts-ignore - Web-only attribute
                  data-form-type="payment"
                >
                  {/* Card Number */}
                  <View className="mb-4">
                    <Text className="text-zinc-400 text-sm mb-2">Número de tarjeta</Text>
                    <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 border border-zinc-700">
                      <CreditCard size={20} color="#71717a" />
                      <TextInput
                        value={cardNumber}
                        onChangeText={handleCardNumberChange}
                        placeholder="4111 1111 1111 1111"
                        placeholderTextColor="#52525b"
                        className="flex-1 text-white py-4 px-3 font-mono"
                        keyboardType="number-pad"
                        maxLength={19}
                        autoComplete="cc-number"
                        // @ts-ignore - Web-only attributes
                        inputMode="numeric"
                      />
                      {cardNumber.length > 0 && (
                        <Text className="text-zinc-500 text-xs uppercase">
                          {getCardBrand(cardNumber)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Card Holder */}
                  <View className="mb-4">
                    <Text className="text-zinc-400 text-sm mb-2">Nombre en la tarjeta</Text>
                    <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 border border-zinc-700">
                      <User size={20} color="#71717a" />
                      <TextInput
                        value={cardName}
                        onChangeText={(v) => setCardName(v.toUpperCase())}
                        placeholder="JUAN PEREZ"
                        placeholderTextColor="#52525b"
                        className="flex-1 text-white py-4 px-3"
                        autoCapitalize="characters"
                        autoComplete="cc-name"
                      />
                    </View>
                  </View>

                  {/* Expiry + CVV */}
                  <View className="flex-row gap-4 mb-6">
                    <View className="flex-1">
                      <Text className="text-zinc-400 text-sm mb-2">Vencimiento</Text>
                      <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 border border-zinc-700">
                        <TextInput
                          value={expiry}
                          onChangeText={handleExpiryChange}
                          placeholder="MM/YY"
                          placeholderTextColor="#52525b"
                          className="flex-1 text-white py-4 font-mono text-center"
                          keyboardType="number-pad"
                          maxLength={5}
                          autoComplete="cc-exp"
                          // @ts-ignore - Web-only attributes
                          inputMode="numeric"
                        />
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text className="text-zinc-400 text-sm mb-2">CVV</Text>
                      <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 border border-zinc-700">
                        <TextInput
                          value={cvv}
                          onChangeText={setCvv}
                          placeholder="123"
                          placeholderTextColor="#52525b"
                          className="flex-1 text-white py-4 font-mono text-center"
                          keyboardType="number-pad"
                          maxLength={4}
                          secureTextEntry
                          autoComplete="cc-csc"
                          // @ts-ignore - Web-only attributes
                          inputMode="numeric"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep('info')}
                  className="mb-4"
                  activeOpacity={0.7}
                >
                  <Text className="text-zinc-400 text-center">← Volver a mis datos</Text>
                </TouchableOpacity>

                {/* Subscribe Button */}
                <TouchableOpacity
                  onPress={handleSubscribe}
                  activeOpacity={0.9}
                  disabled={loading}
                  className={`py-4 rounded-xl flex-row items-center justify-center gap-2 ${
                    loading ? 'bg-zinc-700' : 'bg-red-600'
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Shield size={20} color="white" />
                      <Text className="text-white text-lg font-bold">
                        Pagar {getFormattedPrice()}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Security note */}
                <View className="flex-row items-center justify-center gap-2 mt-4">
                  <Lock size={14} color="#52525b" />
                  <Text className="text-zinc-500 text-xs">Pago seguro procesado por Openpay</Text>
                </View>
              </KeyboardAvoidingView>
            )}
          </View>
        </View>
      </View>

      {/* ================================================================== */}
      {/* FOOTER */}
      {/* ================================================================== */}
      <View className="px-6 py-12 bg-zinc-950 border-t border-zinc-800">
        <View className="flex-row flex-wrap justify-center gap-8 mb-8">
          <Link href="/terms" asChild>
            <TouchableOpacity>
              <Text className="text-zinc-400 text-sm">Términos y Condiciones</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/privacy" asChild>
            <TouchableOpacity>
              <Text className="text-zinc-400 text-sm">Política de Privacidad</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/contact" asChild>
            <TouchableOpacity>
              <Text className="text-zinc-400 text-sm">Contacto</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View className="items-center">
          <View className="flex-row items-center gap-2 mb-4">
            <Dumbbell size={20} color="#DC2626" />
            <Text className="text-white font-bold">TRENS</Text>
          </View>
          <Text className="text-zinc-500 text-xs text-center">
            © 2026 TRENS. Todos los derechos reservados.
          </Text>
          <Text className="text-zinc-600 text-xs text-center mt-2">Lima, Perú 🇵🇪</Text>
        </View>
      </View>
    </ScrollView>
  );
}
