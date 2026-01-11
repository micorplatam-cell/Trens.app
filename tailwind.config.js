/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Disable aspect-ratio utilities that cause issues with react-native-css-interop
  corePlugins: {
    aspectRatio: false,
  },
  theme: {
    extend: {
      colors: {
        // ============================================
        // TRENS "ED HARDY" PALETTE - SAVAGE TATTOO MODE
        // ============================================

        // CORE BLACKS (Fondo absoluto)
        'savage-black': '#000000',
        'savage-dark': '#0A0A0A',
        'savage-darker': '#050505',

        // 🔥 FIRE SPECTRUM (Tigre/Dragón flames)
        'fire-red': '#DC2626', // Rojo sangre
        'fire-orange': '#F97316', // Naranja llama
        'fire-gold': '#FBBF24', // Oro intenso
        'fire-yellow': '#FDE047', // Amarillo fuego

        // 🐉 DRAGON SPECTRUM (Escamas del dragón)
        'dragon-green': '#22C55E', // Verde esmeralda
        'dragon-teal': '#14B8A6', // Teal dragón
        'dragon-cyan': '#06B6D4', // Cyan eléctrico
        'dragon-blue': '#0EA5E9', // Azul océano

        // 💀 SKULL SPECTRUM (Elementos oscuros)
        'skull-bone': '#FEF3C7', // Hueso/crema
        'skull-purple': '#A855F7', // Púrpura veneno
        'skull-magenta': '#EC4899', // Magenta vibrante

        // ⚡ NEON ACCENTS (Bordes brillantes)
        'neon-red': '#FF3B3B',
        'neon-orange': '#FF8C00',
        'neon-green': '#39FF14',
        'neon-cyan': '#00FFFF',
        'neon-pink': '#FF10F0',

        // SPORT COLORS (Heredados pero más vibrantes)
        'sport-gym': '#DC2626', // Rojo tigre
        'sport-moto': '#F97316', // Naranja llama
        'sport-auto': '#EAB308', // Oro metálico
        'sport-surf': '#0EA5E9', // Azul dragón

        // LEGACY (Mantener compatibilidad)
        'savage-red': '#DC2626',
        'savage-red-dark': '#B91C1C',
        'savage-text': '#FFFFFF',
        'savage-steel': '#1A1A1A',

        // GLASS LAYERS (Industrial con tinte de color)
        'glass-light': 'rgba(255, 255, 255, 0.03)',
        'glass-medium': 'rgba(255, 255, 255, 0.06)',
        'glass-strong': 'rgba(255, 255, 255, 0.12)',
        'glass-border': 'rgba(255, 255, 255, 0.15)',
        'glass-fire': 'rgba(249, 115, 22, 0.1)',
        'glass-dragon': 'rgba(34, 197, 94, 0.1)',

        // ZINC PALETTE (Secondary grays)
        zinc: {
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#0F0F10',
        },

        // MACRO COLORS (Nutrition - más vibrantes)
        'macro-protein': '#A855F7',
        'macro-protein-bg': 'rgba(168, 85, 247, 0.25)',
        'macro-carbs': '#3B82F6',
        'macro-carbs-bg': 'rgba(59, 130, 246, 0.25)',
        'macro-fats': '#FBBF24',
        'macro-fats-bg': 'rgba(251, 191, 36, 0.25)',
      },
      fontFamily: {
        // TRENS TYPEFACES
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        savage: '20px',
        pill: '100px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      backdropBlur: {
        savage: '25px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      // ED HARDY SHADOWS (Glow effects)
      boxShadow: {
        fire: '0 0 20px rgba(249, 115, 22, 0.4)',
        'fire-intense': '0 0 30px rgba(220, 38, 38, 0.5)',
        'fire-glow': '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)',
        'fire-mega': '0 0 60px rgba(220, 38, 38, 0.6), 0 0 120px rgba(220, 38, 38, 0.3)',
        dragon: '0 0 20px rgba(34, 197, 94, 0.4)',
        'neon-red': '0 0 15px rgba(255, 59, 59, 0.6)',
        'neon-cyan': '0 0 15px rgba(0, 255, 255, 0.6)',
        'premium-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
        'premium-xl': '0 20px 60px -15px rgba(0, 0, 0, 0.6)',
        'inner-glow': 'inset 0 0 20px rgba(220, 38, 38, 0.1)',
        'card-hover': '0 10px 40px rgba(220, 38, 38, 0.15), 0 0 0 1px rgba(220, 38, 38, 0.2)',
      },
      // Premium Animations
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 15s ease infinite',
        glow: 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(220, 38, 38, 0.6)',
            transform: 'scale(1.02)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.1)' },
        },
      },
      // Premium transitions
      transitionDuration: {
        400: '400ms',
        600: '600ms',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
};
