import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Definir variables globales y de entorno
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'global': 'globalThis'
    },
    // Configurar alias para importaciones
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Alias para ccxt (sin especificar un archivo específico)
        'ccxt': 'ccxt'
      }
    },
    plugins: [
      react(),
      // Plugin para polyfills de Node.js en el navegador
      nodePolyfills({
        // Habilitar polyfills específicos para CCXT
        protocolImports: true,
        globals: {
          Buffer: true, // Necesario para algunas funciones de CCXT
          process: true, // Emular process.env
          global: true // Emular variable global
        }
      }),
      // Plugin para manejar módulos CommonJS
      viteCommonjs(),
    ],
    optimizeDeps: {
      // Excluir CCXT porque ya lo estamos cargando como script global
      exclude: ['ccxt'],
      esbuildOptions: {
        // Definir global como globalThis para esbuild
        define: {
          global: 'globalThis'
        }
      }
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        // Excluir módulos de Node.js que no son necesarios en el navegador
        exclude: [
          'fs', 'path', 'os', 'crypto', 'stream', 'http', 'https', 'zlib', 'net', 'tls',
          'events', 'url', 'util', 'buffer', 'querystring', 'assert', 'timers',
        ]
      },
      rollupOptions: {
        // Marcar como externos los módulos que no deben ser incluidos en el bundle
        external: [
          'http-proxy-agent', 'https-proxy-agent', 'socks-proxy-agent',
          'node:http', 'node:https', 'node:zlib', 'node:stream', 'node:buffer', 'node:url',
          'node:util', 'node:net', 'http', 'https', 'net', 'tls', 'events', 'assert', 'ws',
          // Tratar ccxt como externo ya que lo cargamos globalmente en index.html
          'ccxt'
        ],
        output: {
          manualChunks: (id) => {
            // Ya no necesitamos un chunk separado para CCXT ya que lo cargamos como script global
            // Librerías comunes en otros chunks
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      },
      // Asegurar que no hay warnings sobre módulos de Node.js
      // y que el código es compatible con el navegador
      target: 'esnext',
      minify: true,
      sourcemap: true
    }
  };
});
