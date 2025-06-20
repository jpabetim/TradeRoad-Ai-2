// vite.config.ts
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Forma moderna y segura de obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // --- SOLUCIÓN PARA TU ESTRUCTURA ---
      // Apuntamos el alias '@' al directorio raíz del proyecto ('.')
      // porque tus carpetas 'components' y 'services' están ahí.
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true, // Habilita source maps para producción
  },
});