// Script para inyectar la API key directamente en el HTML durante el proceso de build
const fs = require('fs');
const path = require('path');

console.log('[generate-config.js] Script iniciado.');

let envApiKey;
try {
  // Intentar leer las variables de entorno
  envApiKey = process.env.API_KEY || 
              process.env.GEMINI_API_KEY || 
              process.env.VITE_API_KEY || 
              process.env.REACT_APP_API_KEY;
} catch (error) {
  console.error('[generate-config.js] CRITICAL: Error al intentar acceder a process.env. Esto no debería ocurrir en un entorno Node.js estándar.', error);
  process.exit(1); // Salir con error para fallar el build
}

console.log('[generate-config.js] Variables de entorno evaluadas:');
console.log(`  process.env.API_KEY: ${process.env.API_KEY ? `presente (longitud: ${process.env.API_KEY.length})` : 'no disponible'}`);
console.log(`  process.env.GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? `presente (longitud: ${process.env.GEMINI_API_KEY.length})` : 'no disponible'}`);
console.log(`  process.env.VITE_API_KEY: ${process.env.VITE_API_KEY ? `presente (longitud: ${process.env.VITE_API_KEY.length})` : 'no disponible'}`);
console.log(`  process.env.REACT_APP_API_KEY: ${process.env.REACT_APP_API_KEY ? `presente (longitud: ${process.env.REACT_APP_API_KEY.length})` : 'no disponible'}`);

// Determinar la API key a inyectar. Si se encuentra una, usarla; de lo contrario, usar el placeholder de 'no encontrada'.
const apiKeyToInject = envApiKey && envApiKey.trim() !== '' ? envApiKey.trim() : 'NO_API_KEY_FOUND_FROM_ENV_VARS';
console.log(`[generate-config.js] API key seleccionada para inyección: '${apiKeyToInject}' (longitud: ${apiKeyToInject.length})`);

// --- Modificación de index.html --- 
const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
console.log(`[generate-config.js] Ruta de index.html objetivo: ${indexHtmlPath}`);

if (!fs.existsSync(indexHtmlPath)) {
  console.error(`[generate-config.js] CRITICAL ERROR: index.html no encontrado en la ruta esperada: ${indexHtmlPath}. Asegúrate de que el archivo existe en la raíz del proyecto antes de ejecutar este script.`);
  process.exit(1); 
}

let indexHtmlContent;
try {
  indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  console.log('[generate-config.js] index.html leído exitosamente.');
} catch (error) {
  console.error(`[generate-config.js] CRITICAL ERROR: No se pudo leer index.html desde ${indexHtmlPath}:`, error);
  process.exit(1);
}

const placeholderString = 'const injectedApiKey = "ENV_API_KEY_PLACEHOLDER";';
if (indexHtmlContent.includes(placeholderString)) {
  indexHtmlContent = indexHtmlContent.replace(placeholderString, `const injectedApiKey = "${apiKeyToInject}";`);
  console.log('[generate-config.js] Placeholder de API Key encontrado y reemplazado en index.html.');
} else {
  // Si el placeholder no se encuentra, podría ser un problema o podría significar que el archivo ya fue procesado.
  // Es importante que el placeholder sea exacto.
  console.warn(`[generate-config.js] ADVERTENCIA: El placeholder ('${placeholderString}') no fue encontrado en index.html. El archivo podría no ser el esperado o ya haber sido modificado. Verifique el contenido de index.html.`);
  // No se falla el build aquí, pero es una advertencia crítica para la depuración.
}

try {
  fs.writeFileSync(indexHtmlPath, indexHtmlContent);
  console.log('[generate-config.js] index.html modificado guardado exitosamente.');
} catch (error) {
  console.error(`[generate-config.js] CRITICAL ERROR: No se pudo escribir el index.html modificado en ${indexHtmlPath}:`, error);
  process.exit(1);
}
console.log('[generate-config.js] Proceso de inyección en index.html completado.');

// --- Generación de public/config.js (para compatibilidad) ---
console.log('[generate-config.js] Iniciando generación de public/config.js (para compatibilidad)...');
const buildTime = new Date().toISOString();
const fallbackConfigContent = `// Fallback configuration - Direct injection into index.html is the primary method.
console.log('[public/config.js] Fallback config.js script ejecutado.');
window.CONFIG = window.CONFIG || {}; // Asegurar que window.CONFIG exista
window.CONFIG.API_KEY = "${apiKeyToInject}";
window.CONFIG.BUILD_TIME = "${buildTime}";

// Exponer también en variables globales directas para máxima compatibilidad
window.API_KEY = window.CONFIG.API_KEY;
window.GEMINI_API_KEY = window.CONFIG.API_KEY;
window.VITE_API_KEY = window.CONFIG.API_KEY;
window.REACT_APP_API_KEY = window.CONFIG.API_KEY;

console.log('[public/config.js] Fallback config cargada. API Key (longitud: ${apiKeyToInject.length}), Build Time: ${buildTime}');
`;

const publicDir = path.resolve(process.cwd(), 'public');
const publicConfigFilePath = path.resolve(publicDir, 'config.js');

try {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log(`[generate-config.js] Directorio 'public' creado en ${publicDir}.`);
  }
  fs.writeFileSync(publicConfigFilePath, fallbackConfigContent.trim());
  console.log(`[generate-config.js] Archivo public/config.js (compatibilidad) generado en ${publicConfigFilePath}.`);
} catch (error) {
  console.error(`[generate-config.js] ADVERTENCIA: Error al generar public/config.js (compatibilidad) en ${publicConfigFilePath}. Esto es secundario si la inyección en index.html funcionó. Error:`, error);
  // No se falla el build por esto, ya que es un fallback.
}

console.log('[generate-config.js] Script finalizado.');
