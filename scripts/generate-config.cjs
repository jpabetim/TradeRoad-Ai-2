// scripts/generate-config.cjs
const fs = require('fs');
const path = require('path');

console.log('[generate-config.cjs] Starting API keys injection script...');

// --- 1. Define Paths ---
const projectRoot = path.resolve(__dirname, '..');
const indexHtmlPath = path.join(projectRoot, 'index.html');
console.log(`[generate-config.cjs] Target index.html path: ${indexHtmlPath}`);

// --- 2. Read API Keys from Environment Variables ---

// Gemini API Key
const geminiKeyEnvVars = ['API_KEY', 'GEMINI_API_KEY', 'VITE_API_KEY', 'REACT_APP_API_KEY'];
let geminiApiKey = '';

console.log('[generate-config.cjs] Searching for Gemini API Key in env vars...');

// Mostrar todas las variables de entorno disponibles (solo para desarrollo)
console.log('[generate-config.cjs] Available env vars:', 
  Object.keys(process.env)
    .filter(key => !key.includes('SECRET') && !key.includes('PASSWORD'))
    .join(', ')
);

for (const varName of geminiKeyEnvVars) {
  console.log(`[generate-config.cjs] Checking env var '${varName}': ${process.env[varName] ? 'FOUND' : 'NOT FOUND'}`);
  if (process.env[varName]) {
    geminiApiKey = process.env[varName].trim();
    console.log(`[generate-config.cjs] Found Gemini API key in env var: ${varName}`);
    break;
  }
}

// Para desarrollo, usar una clave dummy si no se encuentra
const geminiKeyToInject = geminiApiKey || 'dummy_gemini_api_key_for_development';

// Financial Modeling Prep (FMP) API Key
const fmpKeyEnvVars = ['FMP_API_KEY', 'VITE_FMP_API_KEY', 'REACT_APP_FMP_API_KEY'];
let fmpApiKey = '';

console.log('[generate-config.cjs] Searching for FMP API Key in env vars...');

for (const varName of fmpKeyEnvVars) {
  console.log(`[generate-config.cjs] Checking env var '${varName}': ${process.env[varName] ? 'FOUND' : 'NOT FOUND'}`);
  if (process.env[varName]) {
    fmpApiKey = process.env[varName].trim();
    console.log(`[generate-config.cjs] Found FMP API key in env var: ${varName}`);
    break;
  }
}

// Para desarrollo, usar una clave dummy si no se encuentra
const fmpKeyToInject = fmpApiKey || 'dummy_fmp_api_key_for_development';

// --- 3. Inject Keys into index.html ---

try {
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`[generate-config.cjs] CRITICAL ERROR: index.html not found at ${indexHtmlPath}`);
    process.exit(1); // Exit with error code
  }

  let indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  // Define el bloque de configuración que se va a inyectar
  const configBlock = `
    <script>
      window.CONFIG = {
        API_KEY: "${geminiKeyToInject}",
        FMP_API_KEY: "${fmpKeyToInject}"
      };
      // Log para verificar en el navegador
      console.log('TradeRoad AI Config:', {
        geminiKeyStatus: window.CONFIG.API_KEY.startsWith('NO_') ? 'NOT FOUND' : 'OK',
        fmpKeyStatus: window.CONFIG.FMP_API_KEY.startsWith('NO_') ? 'NOT FOUND' : 'OK',
      });
    </script>
`;

  // Utiliza un placeholder específico en index.html para reemplazarlo
  const placeholder = '<script id="env-config"></script>';
  const headEndMarker = '</head>';

  if (indexHtmlContent.includes(placeholder)) {
    // Método 1: Reemplaza el placeholder si existe
    indexHtmlContent = indexHtmlContent.replace(placeholder, configBlock);
    console.log('[generate-config.cjs] Successfully injected API keys configuration by replacing placeholder.');
  } else if (indexHtmlContent.includes(headEndMarker)) {
    // Método 2: Inserta antes del cierre de head si no hay placeholder
    indexHtmlContent = indexHtmlContent.replace(headEndMarker, configBlock + headEndMarker);
    console.log('[generate-config.cjs] Successfully injected API keys configuration before </head> tag.');
  } else {
    // Método 3: Fallback - añadir al principio del archivo
    indexHtmlContent = configBlock + indexHtmlContent;
    console.warn(`[generate-config.cjs] WARNING: Could not find appropriate insertion point in ${indexHtmlPath}.`);
    console.log('[generate-config.cjs] Injected API keys configuration at the beginning of the file.');
  }

  fs.writeFileSync(indexHtmlPath, indexHtmlContent, 'utf8');
  console.log('[generate-config.cjs] index.html has been updated.');

} catch (error) {
  console.error('[generate-config.cjs] An error occurred during the script execution:', error);
  process.exit(1);
}

console.log('[generate-config.cjs] Script finished successfully.');