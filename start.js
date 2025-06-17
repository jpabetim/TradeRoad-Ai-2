// Este script inicia el servidor Express que sirve tanto la API como los archivos estáticos del frontend
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Definir rutas
const serverPath = path.join(__dirname, 'server');
const serverScript = path.join(serverPath, 'index.js');

// Verificar que el servidor existe
if (!fs.existsSync(serverScript)) {
  console.error(`❌ ERROR: No se encontró el archivo del servidor en ${serverScript}`);
  process.exit(1);
}

console.log('🚀 Iniciando servidor TradeRoad-Ai...');

// Configurar variables de entorno para producción
const env = { ...process.env, NODE_ENV: 'production' };

// Si estamos en Render, verificamos que existe la API key
if (process.env.RENDER) {
  if (!process.env.GEMINI_API_KEY && process.env.API_KEY) {
    console.log('✅ API_KEY encontrada, copiando a GEMINI_API_KEY para compatibilidad');
    env.GEMINI_API_KEY = process.env.API_KEY;
  } else if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ No se encontró GEMINI_API_KEY ni API_KEY en variables de entorno');
    console.warn('⚠️ La funcionalidad de análisis AI no estará disponible');
  }
}

// Iniciar el servidor
const server = spawn('node', [serverScript], { 
  env,
  cwd: __dirname,
  stdio: 'inherit' 
});

// Manejar salida limpia
const handleShutdown = () => {
  console.log('🛑 Recibida señal de apagado, cerrando servidor...');
  server.kill();
  process.exit(0);
};

// Escuchar señales para apagado limpio
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// En caso de error en el servidor
server.on('error', (err) => {
  console.error('❌ Error en servidor:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ El servidor se cerró con código de salida ${code}`);
    process.exit(code);
  }
  console.log('✅ Servidor finalizado correctamente');
});

console.log(`✅ Servidor iniciado con PID ${server.pid}`);
