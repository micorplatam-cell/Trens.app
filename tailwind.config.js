/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // TRENS CORE (SAVAGE MODE)
        'savage-black': '#000000',
        'savage-dark': '#111111',
        'savage-darker': '#0A0A0A',
        'savage-red': '#DC2626',
        'savage-red-dark': '#B91C1C',
        'savage-text': '#FFFFFF',
        'savage-steel': '#333333',

        // GLASS LAYERS (INDUSTRIAL TRANSPARENCY)
        'glass-light': 'rgba(255, 255, 255, 0.03)',
        'glass-medium': 'rgba(255, 255, 255, 0.05)',
        'glass-strong': 'rgba(255, 255, 255, 0.1)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',

        // ZINC PALETTE (SECONDARY)
        zinc: {
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },

        // MACRO COLORS (NUTRITION MODULE)
        'macro-protein': '#A855F7',
        'macro-protein-bg': 'rgba(168, 85, 247, 0.2)',
        'macro-carbs': '#3B82F6',
        'macro-carbs-bg': 'rgba(59, 130, 246, 0.2)',
        'macro-fats': '#FBBF24',
        'macro-fats-bg': 'rgba(251, 191, 36, 0.2)',
      },
      fontFamily: {
        // TRENS TYPEFACES
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        savage: '20px',
        pill: '100px',
      },
      backdropBlur: {
        savage: '25px',
      },
    },
  },
  plugins: [],
};
