// scripts/generate-config.cjs
const fs = require('fs');
const path = require('path');

console.log('[generate-config.cjs] Starting API key injection script...');

// Define paths
const projectRoot = path.resolve(__dirname, '..'); // Assumes script is in /scripts
const indexHtmlPath = path.join(projectRoot, 'index.html');
const publicConfigPath = path.join(projectRoot, 'public', 'config.js');

console.log(`[generate-config.cjs] Project root: ${projectRoot}`);
console.log(`[generate-config.cjs] Target index.html path: ${indexHtmlPath}`);
console.log(`[generate-config.cjs] Target public/config.js path: ${publicConfigPath}`);

// Try to get API key from environment variables
const apiKeyEnvVars = ['API_KEY', 'GEMINI_API_KEY', 'VITE_API_KEY', 'REACT_APP_API_KEY'];
let envApiKey = '';

for (const varName of apiKeyEnvVars) {
  if (process.env[varName] && process.env[varName].trim() !== '') {
    envApiKey = process.env[varName].trim();
    console.log(`[generate-config.cjs] Found API key in environment variable: ${varName}`);
    break;
  }
}

const apiKeyToInject = envApiKey || 'NO_API_KEY_FOUND_FROM_ENV_VARS';

if (apiKeyToInject === 'NO_API_KEY_FOUND_FROM_ENV_VARS') {
  console.warn('[generate-config.cjs] WARNING: No API key found in any of the expected environment variables.');
  console.warn('[generate-config.cjs] Injecting placeholder: NO_API_KEY_FOUND_FROM_ENV_VARS');
} else {
  // Mask the API key for logging, showing only a small part if it's long enough
  const maskedKey = apiKeyToInject.length > 8 ? `${apiKeyToInject.substring(0, 4)}...${apiKeyToInject.substring(apiKeyToInject.length - 4)}` : 'MASKED_KEY';
  console.log(`[generate-config.cjs] API key to inject: ${maskedKey}`);
}

// --- 1. Inject into index.html ---
try {
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`[generate-config.cjs] CRITICAL ERROR: index.html not found at ${indexHtmlPath}`);
    process.exit(1);
  }
  console.log(`[generate-config.cjs] Reading content from ${indexHtmlPath}...`);
  let indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  
  const placeholder = 'const injectedApiKey = "ENV_API_KEY_PLACEHOLDER";';
  const replacementString = `const injectedApiKey = "${apiKeyToInject}";`;

  if (indexHtmlContent.includes(placeholder)) {
    indexHtmlContent = indexHtmlContent.replace(placeholder, replacementString);
    fs.writeFileSync(indexHtmlPath, indexHtmlContent, 'utf8');
    console.log(`[generate-config.cjs] Successfully injected API key into ${indexHtmlPath}.`);
    const maskedReplacement = apiKeyToInject.length > 8 ? `${apiKeyToInject.substring(0, 4)}...${apiKeyToInject.substring(apiKeyToInject.length - 4)}` : 'MASKED_KEY';
    console.log(`[generate-config.cjs] Replaced placeholder: "${placeholder}"`);
    console.log(`[generate-config.cjs] With: "const injectedApiKey = "${maskedReplacement}";" (masked)`);
  } else {
    console.warn(`[generate-config.cjs] WARNING: Placeholder "${placeholder}" not found in ${indexHtmlPath}.`);
    console.warn('[generate-config.cjs] API key was NOT injected into index.html. This might be an issue if the placeholder changed or was removed.');
    // If it's critical that this placeholder is replaced, uncomment the next line to fail the build:
    // process.exit(1); 
  }
} catch (error) {
  console.error(`[generate-config.cjs] CRITICAL ERROR processing ${indexHtmlPath}:`, error);
  process.exit(1);
}

// --- 2. Generate public/config.js (fallback/alternative method) ---
const configJsContent = `window.CONFIG = { API_KEY: "${apiKeyToInject}" };\nconsole.log('[public/config.js] API Key loaded via config.js:', window.CONFIG.API_KEY ? (window.CONFIG.API_KEY.length > 8 ? window.CONFIG.API_KEY.substring(0,4) + '...' + window.CONFIG.API_KEY.substring(window.CONFIG.API_KEY.length - 4) : 'MASKED_KEY') : 'NOT FOUND or Placeholder');`;
try {
  const publicDir = path.dirname(publicConfigPath);
  if (!fs.existsSync(publicDir)) {
    console.log(`[generate-config.cjs] Creating directory: ${publicDir}`);
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(publicConfigPath, configJsContent, 'utf8');
  console.log(`[generate-config.cjs] Successfully created/updated ${publicConfigPath} with API key.`);
} catch (error) {
  console.error(`[generate-config.cjs] ERROR creating ${publicConfigPath}:`, error);
}

console.log('[generate-config.cjs] API key injection script finished.');