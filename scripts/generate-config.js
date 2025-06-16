// Script para generar el archivo config.js durante el proceso de build
const fs = require('fs');
const path = require('path');

// Obtener la API key desde las variables de entorno
const apiKey = process.env.API_KEY || '';

// Crear el contenido del archivo config.js
const configContent = `// Este archivo se genera automáticamente durante el build - NO EDITAR
window.CONFIG = {
  API_KEY: "${apiKey}",
  BUILD_TIME: "${new Date().toISOString()}"
};
`;

// Asegurarse de que el directorio dist existe
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Escribir el archivo config.js
const configPath = path.join(distDir, 'config.js');
fs.writeFileSync(configPath, configContent);

console.log(`✅ Archivo config.js generado con éxito en ${configPath}`);
