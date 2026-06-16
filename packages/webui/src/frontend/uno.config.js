import { defineConfig, presetUno, presetIcons, presetWebFonts } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/'
    }),
    presetWebFonts({
      fonts: {
        sans: 'Inter:400,500,600,700',
        mono: 'JetBrains Mono:400,500'
      }
    })
  ],
  theme: {
    colors: {
      primary: {
        DEFAULT: '#8B5CF6',
        50: '#F5F3FF',
        100: '#EDE9FE',
        200: '#DDD6FE',
        300: '#C4B5FD',
        400: '#A78BFA',
        500: '#8B5CF6',
        600: '#7C3AED',
        700: '#6D28D9',
        800: '#5B21B6',
        900: '#4C1D95'
      },
      surface: {
        DEFAULT: '#0F0F14',
        50: '#FAFAFA',
        100: '#1A1A24',
        200: '#252532',
        300: '#303040',
        400: '#404050'
      },
      border: {
        DEFAULT: '#2A2A3A',
        light: '#3A3A4A'
      }
    }
  },
  shortcuts: {
    'btn-primary': 'bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-secondary': 'bg-surface-200 text-white font-medium px-4 py-2 rounded-lg hover:bg-surface-300 transition-all duration-200 cursor-pointer border border-border',
    'btn-ghost': 'text-gray-300 font-medium px-4 py-2 rounded-lg hover:bg-surface-200 transition-all duration-200 cursor-pointer',
    'card': 'bg-surface-100 border border-border rounded-xl p-5',
    'card-hover': 'bg-surface-100 border border-border rounded-xl p-5 hover:border-primary-500/50 transition-all duration-200',
    'input-base': 'w-full bg-surface-200 border border-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all',
    'link': 'text-primary-400 hover:text-primary-300 transition-colors'
  },
  rules: [
    [/^gradient-text$/, () => ({
      'background': 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #C4B5FD 100%)',
      '-webkit-background-clip': 'text',
      '-webkit-text-fill-color': 'transparent',
      'background-clip': 'text'
    })]
  ]
});