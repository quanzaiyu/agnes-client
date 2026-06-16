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
        serif: 'Hedvig Letters Serif:400,700'
      }
    })
  ],
  theme: {
    colors: {
      // Ditto Light Theme from DESIGN.md
      'canvas': '#f9fbf2',        // Page background
      'meadow': '#eff2e5',       // Card surface
      'ink': '#130e30',          // Primary text, buttons
      'yellow': '#ffe228',        // Primary CTA
      'green': '#59e25d',        // Success, decorative
      'fuchsia': '#e261e5',      // Decorative
      'slate': '#5f5c6e',        // Secondary text
      'pearl': '#ffffff',         // White
      'violet': '#5046e4',       // Secondary accent
    }
  },
  shortcuts: {
    // Base
    'page': 'bg-canvas text-ink min-h-screen',

    // Cards - 24px radius, soft surface
    'card': 'bg-meadow rounded-[24px] p-6 border border-ink/10',
    'card-hover': 'bg-meadow rounded-[24px] p-6 border border-ink/10 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer',

    // Buttons - pill radius
    'btn-primary': 'bg-yellow text-ink font-500 px-6 py-3 rounded-[1440px] hover:bg-yellow/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-secondary': 'bg-ink text-pearl font-500 px-6 py-3 rounded-[1440px] hover:bg-ink/80 transition-all cursor-pointer',
    'btn-ghost': 'bg-transparent text-slate font-500 px-4 py-2 rounded-[1440px] border border-ink/15 hover:bg-meadow hover:text-ink transition-all cursor-pointer',

    // Inputs - smaller radius
    'input-base': 'w-full bg-pearl text-ink placeholder-slate px-4 py-3 rounded-[12px] border border-ink/20 focus:outline-none focus:ring-2 focus:ring-yellow transition-all',

    // Links
    'link': 'text-ink hover:text-slate transition-colors cursor-pointer',

    // Gradient text
    'gradient-text': 'bg-gradient-to-r from-ink to-violet bg-clip-text text-transparent',

    // Nav
    'nav-pill': 'bg-meadow rounded-[1440px] px-6 py-2',
  },
  rules: [
    // Subtle shadow
    ['shadow-card', { 'box-shadow': '0 2px 8px rgba(19, 14, 48, 0.06)' }],
    ['shadow-card-hover', { 'box-shadow': '0 4px 16px rgba(19, 14, 48, 0.1)' }],
  ]
});
