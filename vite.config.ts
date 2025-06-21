import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // --- LÍNEA CLAVE AÑADIDA ---
  // Le decimos a Vite explícitamente que la raíz del proyecto es el directorio actual.
  // Esto fuerza a Vite a buscar el index.html aquí y resuelve problemas de caché.
  root: process.cwd(),

  plugins: [react()],
  
  resolve: {
    alias: {
      // Ajustamos el alias para que sea robusto
      '@': path.resolve(process.cwd()),
    },
  },

  server: {
    port: 3100,
    proxy: {
      '/api': {
        target: 'http://localhost:3101',
        changeOrigin: true,
      },
    },
  },
  
  build: {
    sourcemap: true,
  },
});