import { sveltekit } from '@sveltejs/kit/vite';
import UnoCSS from '@unocss/svelte-scoped/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    UnoCSS(),
    sveltekit()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/avatars': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});