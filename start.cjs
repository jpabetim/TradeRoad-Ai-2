console.log('[START.JS] Script de inicio comenzado.');

const { spawn } = require('child_process');
const path = require('path');

// Log para verificar las rutas y el entorno
console.log(`[START.JS] Directorio actual de trabajo (cwd): ${process.cwd()}`);
console.log(`[START.JS] __dirname: ${__dirname}`);

const serverPath = path.join(__dirname, 'server', 'index.js');
const serverCwd = path.join(__dirname, 'server');

console.log(`[START.JS] Ruta del script del servidor (serverPath): ${serverPath}`);
console.log(`[START.JS] Directorio de trabajo para el servidor (serverCwd): ${serverCwd}`);

// Log de las variables de entorno para depuración
console.log(`[START.JS] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[START.JS] GEMINI_API_KEY está presente: ${!!process.env.GEMINI_API_KEY}`);

const serverProcess = spawn('node', [serverPath], {
  cwd: serverCwd, // ¡MUY IMPORTANTE! Cambia el directorio de trabajo al de la carpeta 'server'
  stdio: 'inherit', // Redirige stdout/stderr del hijo al padre para ver los logs en Render
  env: { ...process.env } // Hereda las variables de entorno
});

serverProcess.on('spawn', () => {
  console.log('✅ [START.JS] Evento "spawn": El proceso del servidor se ha iniciado correctamente.');
});

serverProcess.on('error', (err) => {
  console.error('❌ [START.JS] Evento "error": Fallo al iniciar el proceso del servidor:', err);
});

serverProcess.on('exit', (code, signal) => {
  if (code !== null) {
    console.log(`ℹ️ [START.JS] Evento "exit": Proceso del servidor terminó con código ${code}.`);
  } else {
    console.log(`ℹ️ [START.JS] Evento "exit": Proceso del servidor terminó debido a la señal ${signal}.`);
  }
});

console.log('[START.JS] Proceso del servidor lanzado. El script de inicio ha completado su tarea.');
