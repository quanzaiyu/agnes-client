import { defineConfig, presetUno, presetIcons, presetWebFonts, transformerDirectives } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      collections: {
        carbon: () => import('@iconify-json/carbon/icons.json').then(i => i.default),
        mdi: () => import('@iconify-json/mdi/icons.json').then(i => i.default),
        ph: () => import('@iconify-json/ph/icons.json').then(i => i.default)
      }
    }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Inter:400,500,600,700',
        serif: 'DM Serif Display'
      }
    })
  ],
  theme: {
    colors: {
      canvas: '#f9fbf2',
      meadow: '#eff2e5',
      ink: '#130e30',
      yellow: '#ffe228',
      green: '#59e25d',
      fuchsia: '#e261e5',
      slate: '#5f5c6e',
      pearl: '#ffffff',
      violet: '#5046e4'
    },
    fontFamily: {
      serif: '"DM Serif Display", ui-serif, Georgia, serif',
      sans: 'Inter, ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    }
  },
  shortcuts: [
    ['page', 'bg-canvas text-ink min-h-screen'],
    ['card', 'bg-meadow rounded-3xl p-6 border border-ink/10'],
    ['card-hover', 'bg-meadow rounded-3xl p-6 border border-ink/10 transition-all duration-200 hover:shadow-lg'],
    ['btn-primary', 'bg-yellow text-ink font-medium px-6 py-3 rounded-full transition-all duration-200 active:opacity-80 disabled:opacity-50'],
    ['btn-secondary', 'bg-ink text-pearl font-medium px-6 py-3 rounded-full transition-all duration-200 active:opacity-80'],
    ['btn-ghost', 'bg-transparent text-slate font-medium px-4 py-2 rounded-full border border-ink/15 transition-all duration-200'],
    ['input-base', 'w-full bg-pearl text-ink placeholder-slate px-4 py-3 rounded-xl border border-ink/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow'],
    ['link', 'text-ink hover:text-slate transition-colors'],
    ['gradient-text', 'bg-gradient-to-r from-ink to-violet bg-clip-text text-transparent'],
    ['nav-pill', 'bg-meadow rounded-full px-6 py-2']
  ],
  transformers: [transformerDirectives()]
});