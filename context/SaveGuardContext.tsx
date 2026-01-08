import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Crown,
  Zap,
  Dumbbell,
  Utensils,
  Video,
  Camera,
  MessageCircle,
  BarChart3,
  Pill,
  Share2,
  Target,
  Flame,
  Trophy,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from '../lib/haptics';

// ============================================================================
// TIPOS DE FEATURES BLOQUEADAS
// ============================================================================
export type BlockedFeature =
  | 'save_record' // ADN - Guardar récord personal
  | 'save_measurement' // ADN - Guardar medida corporal
  | 'save_profile' // ADN - Guardar datos de perfil
  | 'save_video_pro' // PRO - Guardar video grabado
  | 'share_video' // PRO - Compartir video
  | 'save_exercise' // GYM - Guardar ejercicio en rutina
  | 'save_exercise_video' // GYM - Guardar video de ejercicio
  | 'save_set' // GYM - Guardar serie de entrenamiento
  | 'create_meal' // PLAN - Crear comida
  | 'save_meal' // PLAN - Guardar comida
  | 'add_supplement' // PLAN - Agregar suplemento al stack
  | 'talk_to_hank' // HANK - Hablar con el asistente
  | 'hank_spotify_insight' // HANK - Insight de Spotify con IA
  | 'save_workout' // GYM - Guardar entrenamiento
  | 'save_template'; // GYM - Guardar plantilla

// ============================================================================
// MENSAJES PERSUASIVOS POR FEATURE
// Diseñados con psicología de conversión para maximizar el deseo de upgrade
// ============================================================================
const FEATURE_CONFIG: Record<
  BlockedFeature,
  {
    icon: any;
    iconColor: string;
    title: string;
    subtitle: string;
    description: string;
    benefits: string[];
    cta: string;
    urgency?: string;
  }
> = {
  save_record: {
    icon: Trophy,
    iconColor: '#FFD700',
    title: 'TU LEGADO MERECE SER DOCUMENTADO',
    subtitle: 'Guarda tus récords personales',
    description:
      'Cada PR es un hito en tu camino. Los atletas de élite documentan su progreso. ¿Y tú?',
    benefits: [
      'Historial completo de PRs',
      'Gráficas de progresión',
      'Comparte tus logros',
      'Nunca olvides un récord',
    ],
    cta: 'DOCUMENTAR MI LEGADO',
    urgency: '🔥 El 90% de atletas que registran PRs progresan más rápido',
  },
  save_measurement: {
    icon: BarChart3,
    iconColor: '#22C55E',
    title: 'LO QUE NO SE MIDE, NO SE MEJORA',
    subtitle: 'Trackea tu transformación',
    description:
      'Tu cuerpo está cambiando. Sin datos, nunca sabrás cuánto has avanzado. Los campeones miden todo.',
    benefits: [
      'Medidas corporales ilimitadas',
      'Gráficas de evolución',
      'Fotos de progreso',
      'Análisis de composición',
    ],
    cta: 'TRACKEAR MI PROGRESO',
    urgency: '📊 Los usuarios PRO ven 3x más resultados',
  },
  save_profile: {
    icon: Target,
    iconColor: '#DC2626',
    title: 'CONSTRUYE TU IDENTIDAD ATLÉTICA',
    subtitle: 'Tu perfil, tu marca personal',
    description:
      'Tu perfil es tu carta de presentación en la comunidad. Los atletas serios tienen presencia.',
    benefits: [
      'Perfil personalizado',
      'Badge de atleta PRO',
      'Estadísticas públicas',
      'Conecta con otros atletas',
    ],
    cta: 'CREAR MI PERFIL PRO',
  },
  save_video_pro: {
    icon: Video,
    iconColor: '#DC2626',
    title: 'TU ESFUERZO MERECE SER INMORTALIZADO',
    subtitle: 'Guarda tus mejores levantamientos',
    description:
      'Ese levantamiento épico... sin guardarlo, se pierde para siempre. Los PROs archivan su grandeza.',
    benefits: [
      'Almacenamiento ilimitado',
      'Calidad 4K',
      'Bóveda privada',
      'Revive tus mejores momentos',
    ],
    cta: 'GUARDAR MI VIDEO',
    urgency: '⚡ No dejes que tu esfuerzo desaparezca',
  },
  share_video: {
    icon: Share2,
    iconColor: '#3B82F6',
    title: 'INSPIRA A MILES CON TU PROGRESO',
    subtitle: 'Comparte en el Feed global',
    description:
      'Tu video podría motivar a alguien que lo necesita. Los atletas PRO inspiran a la comunidad.',
    benefits: [
      'Publicar en Feed global',
      'Recibe likes y comentarios',
      'Construye tu audiencia',
      'Monetiza tu contenido',
    ],
    cta: 'COMPARTIR MI PODER',
    urgency: '🌍 Miles de atletas esperan ver tu progreso',
  },
  save_exercise: {
    icon: Dumbbell,
    iconColor: '#DC2626',
    title: 'ENTRENA COMO UN PROFESIONAL',
    subtitle: 'Personaliza tu rutina',
    description:
      'Los atletas de élite no improvisan. Tienen programas estructurados. Es hora de entrenar en serio.',
    benefits: [
      'Rutinas personalizadas',
      'Historial de ejercicios',
      'Progresión automática',
      'Plantillas de pros',
    ],
    cta: 'ESTRUCTURAR MI ENTRENAMIENTO',
    urgency: '💪 El 95% de los PROs tienen rutinas estructuradas',
  },
  save_exercise_video: {
    icon: Camera,
    iconColor: '#DC2626',
    title: 'ANALIZA TU TÉCNICA COMO UN PRO',
    subtitle: 'Videos de cada ejercicio',
    description:
      'La diferencia entre buenos y grandes atletas está en los detalles. Revisa y mejora tu técnica.',
    benefits: [
      'Video por ejercicio',
      'Análisis de forma',
      'Comparación temporal',
      'Feedback visual',
    ],
    cta: 'MEJORAR MI TÉCNICA',
  },
  save_set: {
    icon: Flame,
    iconColor: '#F97316',
    title: 'CADA SERIE CUENTA',
    subtitle: 'Registra tu volumen real',
    description:
      'Sin registro, no hay progresión. Los campeones saben exactamente cuánto levantan cada sesión.',
    benefits: [
      'Log de todas las series',
      'Cálculo de volumen',
      'PRs automáticos',
      'Estadísticas detalladas',
    ],
    cta: 'REGISTRAR MI PROGRESO',
    urgency: '📈 Progresa 2x más rápido con tracking',
  },
  create_meal: {
    icon: Utensils,
    iconColor: '#22C55E',
    title: 'LA NUTRICIÓN ES EL 80% DEL RESULTADO',
    subtitle: 'Planifica tu alimentación',
    description:
      'Puedes entrenar duro, pero sin nutrición correcta, estás dejando ganancias en la mesa.',
    benefits: ['Planes de comidas', 'Macros automáticos', 'Recetas fitness', 'Shopping list'],
    cta: 'OPTIMIZAR MI NUTRICIÓN',
    urgency: '🥗 Los atletas PRO planifican cada comida',
  },
  save_meal: {
    icon: Utensils,
    iconColor: '#22C55E',
    title: 'GUARDA TUS COMIDAS FAVORITAS',
    subtitle: 'Biblioteca de recetas personal',
    description: 'Crea tu arsenal de comidas perfectas. Repite lo que funciona, elimina lo que no.',
    benefits: [
      'Comidas guardadas',
      'Favoritos rápidos',
      'Copia y modifica',
      'Historial nutricional',
    ],
    cta: 'GUARDAR MI COMIDA',
  },
  add_supplement: {
    icon: Pill,
    iconColor: '#A855F7',
    title: 'OPTIMIZA TU STACK DE SUPLEMENTOS',
    subtitle: 'Gestiona tu suplementación',
    description:
      'Los suplementos correctos en el momento correcto. Maximiza cada gramo que consumes.',
    benefits: [
      'Stack personalizado',
      'Recordatorios de toma',
      'Timing óptimo',
      'Análisis de efectividad',
    ],
    cta: 'GESTIONAR MI STACK',
    urgency: '💊 El timing correcto mejora 40% la absorción',
  },
  talk_to_hank: {
    icon: MessageCircle,
    iconColor: '#DC2626',
    title: 'HANK ES TU COACH PERSONAL 24/7',
    subtitle: 'Asistente IA de entrenamiento',
    description:
      'Imagina tener un experto en fitness respondiendo tus dudas a cualquier hora. Eso es HANK.',
    benefits: [
      'Coach IA ilimitado',
      'Respuestas personalizadas',
      'Planes a medida',
      'Disponible 24/7',
    ],
    cta: 'ACTIVAR MI COACH',
    urgency: '🤖 HANK ha ayudado a +10,000 atletas',
  },
  hank_spotify_insight: {
    icon: Sparkles,
    iconColor: '#1DB954', // Spotify green
    title: 'MOTIVACIÓN PERSONALIZADA CON IA',
    subtitle: 'HANK + Spotify = Energía Pura',
    description:
      'Desliza hacia HANK mientras escuchas música y recibirás un mensaje SAVAGE personalizado que conecta tu canción con tu entrenamiento.',
    benefits: [
      'Mensajes motivacionales únicos',
      'Conecta música + entreno',
      'IA que entiende tu flow',
      'Energía personalizada',
    ],
    cta: 'ACTIVAR MOTIVACIÓN IA',
    urgency: '🎵 "Bad Bunny + Piernas = EXPLOSIÓN" - Ejemplo de insight',
  },
  save_workout: {
    icon: Dumbbell,
    iconColor: '#DC2626',
    title: 'GUARDA TU ENTRENAMIENTO',
    subtitle: 'Historial completo de sesiones',
    description:
      'Cada entrenamiento es un paso hacia tu mejor versión. No dejes que se pierda en el olvido.',
    benefits: [
      'Historial ilimitado',
      'Análisis de volumen',
      'Comparación semanal',
      'Estadísticas PRO',
    ],
    cta: 'GUARDAR ENTRENAMIENTO',
  },
  save_template: {
    icon: Target,
    iconColor: '#DC2626',
    title: 'CREA TUS PLANTILLAS PERSONALES',
    subtitle: 'Rutinas que puedes repetir',
    description: 'Los profesionales tienen sistemas. Crea plantillas y entrena con eficiencia.',
    benefits: [
      'Plantillas ilimitadas',
      'Compartir con otros',
      'Importar de pros',
      'Personalización total',
    ],
    cta: 'CREAR PLANTILLA',
  },
};

// ============================================================================
// CONTEXTO
// ============================================================================
interface SaveGuardContextType {
  // Función para verificar si puede guardar (y mostrar modal si no)
  canSave: (feature: BlockedFeature) => boolean;
  // Función para mostrar el modal manualmente
  showUpgradeModal: (feature: BlockedFeature) => void;
  // Estado del usuario
  isAuthenticated: boolean;
  isPro: boolean;
}

const SaveGuardContext = createContext<SaveGuardContextType>({
  canSave: () => true,
  showUpgradeModal: () => {},
  isAuthenticated: false,
  isPro: false,
});

export const useSaveGuard = () => useContext(SaveGuardContext);

// ============================================================================
// PROVIDER
// ============================================================================
interface SaveGuardProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isPro: boolean;
}

export function SaveGuardProvider({ children, isAuthenticated, isPro }: SaveGuardProviderProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<BlockedFeature>('save_record');

  const canSave = useCallback(
    (feature: BlockedFeature): boolean => {
      // Si es PRO, puede guardar todo
      if (isPro) return true;

      // Si no es PRO (o no está autenticado), mostrar modal
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setCurrentFeature(feature);
      setModalVisible(true);
      return false;
    },
    [isPro]
  );

  const showUpgradeModal = useCallback((feature: BlockedFeature) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentFeature(feature);
    setModalVisible(true);
  }, []);

  const config = FEATURE_CONFIG[currentFeature];
  const IconComponent = config.icon;

  return (
    <SaveGuardContext.Provider value={{ canSave, showUpgradeModal, isAuthenticated, isPro }}>
      {children}

      {/* Modal de Upgrade */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Animated.View entering={FadeIn.duration(200)} className="flex-1 bg-black/95 justify-end">
          {/* Tap to close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
            className="flex-1"
          />

          {/* Modal Content */}
          <Animated.View entering={SlideInDown.springify().damping(20)}>
            <LinearGradient
              colors={['#18181B', '#09090B']}
              className="rounded-t-[32px] px-6 pt-6 pb-10"
            >
              {/* Handle */}
              <View className="w-12 h-1 bg-zinc-700 rounded-full self-center mb-6" />

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-800 items-center justify-center z-10"
              >
                <X color="#71717A" size={20} />
              </TouchableOpacity>

              {/* Icon con Glow */}
              <View className="items-center mb-6">
                <View
                  className="w-24 h-24 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: `${config.iconColor}15`,
                    borderWidth: 2,
                    borderColor: `${config.iconColor}40`,
                    shadowColor: config.iconColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 20,
                    elevation: 10,
                  }}
                >
                  <IconComponent color={config.iconColor} size={40} />
                </View>
              </View>

              {/* Title */}
              <Text className="text-white text-2xl font-black text-center mb-2 tracking-tight">
                {config.title}
              </Text>

              {/* Subtitle */}
              <Text
                className="text-center text-sm font-bold mb-4 tracking-widest"
                style={{ color: config.iconColor }}
              >
                {config.subtitle.toUpperCase()}
              </Text>

              {/* Description */}
              <Text className="text-zinc-400 text-center text-base leading-relaxed mb-6 px-4">
                {config.description}
              </Text>

              {/* Urgency Badge */}
              {config.urgency && (
                <View className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 self-center mb-6">
                  <Text className="text-zinc-300 text-sm font-medium">{config.urgency}</Text>
                </View>
              )}

              {/* Benefits */}
              <View className="bg-zinc-900/50 rounded-2xl p-5 mb-6">
                {config.benefits.map((benefit, index) => (
                  <View
                    key={index}
                    className={`flex-row items-center ${index < config.benefits.length - 1 ? 'mb-3' : ''}`}
                  >
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${config.iconColor}20` }}
                    >
                      <Sparkles color={config.iconColor} size={12} />
                    </View>
                    <Text className="text-white text-sm flex-1">{benefit}</Text>
                  </View>
                ))}
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setModalVisible(false);
                  // Aquí podrías abrir el modal de login o ir a la pantalla de pago
                }}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#DC2626', '#B91C1C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="rounded-2xl p-5 flex-row items-center justify-center"
                  style={{
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    elevation: 8,
                  }}
                >
                  <Crown color="#FFFFFF" size={22} />
                  <Text className="text-white font-black text-lg ml-3 tracking-wide">
                    {config.cta}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* PRO Badge */}
              <View className="flex-row items-center justify-center mt-5 gap-2">
                <Zap color="#DC2626" size={14} fill="#DC2626" />
                <Text className="text-zinc-500 text-xs tracking-wider">
                  TRENS PRO • ACCESO ILIMITADO
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SaveGuardContext.Provider>
  );
}
