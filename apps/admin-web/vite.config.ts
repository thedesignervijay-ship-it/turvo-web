import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Admin web (Turvo Phase 1). Dev server proxies /api and /health to the
 * backend so the browser only talks to the same origin; production builds
 * deploy behind a reverse proxy that routes /api/v1 to the Node API.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
