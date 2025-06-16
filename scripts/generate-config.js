// Script para generar el archivo config.js durante el proceso de build
const fs = require('fs');
const path = require('path');

// Obtener la API key desde las variables de entorno
const apiKey = process.env.API_KEY || '';

// Obtener el timestamp actual para el build
const buildTime = new Date().toISOString();

try {
  // Leer la plantilla desde el directorio public
  const templatePath = path.join(__dirname, '..', 'public', 'config-template.js');
  console.log(`Leyendo plantilla desde: ${templatePath}`);
  
  let templateContent = fs.readFileSync(templatePath, 'utf-8');
  
  // Reemplazar los marcadores con valores reales
  templateContent = templateContent
    .replace('API_KEY_PLACEHOLDER', apiKey)
    .replace('BUILD_TIME_PLACEHOLDER', buildTime);
  
  // Asegurarse de que los directorios destino existan
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Escribir el archivo config.js en dist y public para cubrir diferentes escenarios
  const distConfigPath = path.join(distDir, 'config.js');
  const publicConfigPath = path.join(__dirname, '..', 'public', 'config.js');
  
  fs.writeFileSync(distConfigPath, templateContent);
  fs.writeFileSync(publicConfigPath, templateContent); // También en public para desarrollo local
  
  console.log(`✅ Archivo config.js generado con éxito en ${distConfigPath} y ${publicConfigPath}`);
  console.log(`✅ API Key ${apiKey ? 'configurada' : 'NO configurada'} (longitud: ${apiKey ? apiKey.length : 0})`);
} catch (error) {
  console.error(`❌ Error al generar config.js: ${error.message}`);
  console.error(error);
  
  // Intentar generar un archivo básico de todos modos
  const fallbackContent = `// Archivo de configuración de emergencia
window.CONFIG = {
  API_KEY: "${apiKey}",
  BUILD_TIME: "${buildTime}",
  GENERATED_AS_FALLBACK: true
};
`;
  
  try {
    const distConfigPath = path.join(__dirname, '..', 'dist', 'config.js');
    fs.writeFileSync(distConfigPath, fallbackContent);
    console.log(`⚠️ Se ha generado un archivo config.js de emergencia en ${distConfigPath}`);
  } catch (fallbackError) {
    console.error(`❌ Error incluso al generar el archivo de emergencia: ${fallbackError.message}`);
  }
}
