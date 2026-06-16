import { defineConfig, presetWind3, presetIcons, presetTypography, transformerDirectives } from 'unocss';

export default defineConfig({
  presets: [
    presetWind3(),
    presetIcons({ scale: 1.2, warn: false }),
    presetTypography(),
  ],
  transformers: [transformerDirectives()],
  theme: {
    colors: {
      primary: {
        50: '#f5f3ff',
        100: '#ede9fe',
        200: '#ddd6fe',
        300: '#c4b5fd',
        400: '#a78bfa',
        500: '#7c3aed',
        600: '#6d28d9',
        700: '#5b21b6',
        800: '#4c1d95',
        900: '#2e1065',
      },
      surface: {
        DEFAULT: '#0f0f1a',
        raised: '#1a1a2e',
        sunken: '#0a0a12',
        border: '#2d2d44',
      },
    },
  },
  shortcuts: {
    'btn': 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
    'btn-primary': 'btn bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-ghost': 'btn bg-surface-raised text-gray-200 hover:bg-surface-border',
    'panel': 'bg-surface-raised border border-surface-border rounded',
    'input-base': 'bg-surface-sunken border border-surface-border rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-primary-500',
  },
});
