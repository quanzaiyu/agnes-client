import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';

// @agnes/workflow — self-contained: ships its own mini Express backend
// (./server.js on :4100) that handles /api/*. Vite dev proxies /api → :4100.
// Run `npm run dev` (which spawns both via concurrently) and the frontend is
// fully functional on its own.
export default defineConfig({
  plugins: [react(), UnoCSS()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
