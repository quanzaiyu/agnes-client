import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import UnoCSS from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import VueMacros from 'vue-macros/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      VueMacros({
        defineModels: true,
        defineProps: true,
        hoistStatic: true,
        reactivityTransform: true
      }),
      uni(),
      AutoImport({
        imports: ['vue', 'pinia'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: { enabled: false }
      }),
      UnoCSS()
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') }
    },
    define: {
      __APP_ENV__: JSON.stringify(env)
    }
  };
});