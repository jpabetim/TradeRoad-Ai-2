window.CONFIG = { 
  API_KEY: "NO_API_KEY_FOUND_FROM_ENV_VARS", 
  FMP_API_KEY: "NO_FMP_API_KEY_FOUND_FROM_ENV_VARS" 
};

console.log('[public/config.js] Gemini API Key loaded:', window.CONFIG.API_KEY ? (window.CONFIG.API_KEY.length > 8 ? window.CONFIG.API_KEY.substring(0,4) + '...' + window.CONFIG.API_KEY.substring(window.CONFIG.API_KEY.length - 4) : 'MASKED_KEY') : 'NOT FOUND or Placeholder');

console.log('[public/config.js] FMP API Key loaded:', window.CONFIG.FMP_API_KEY ? (window.CONFIG.FMP_API_KEY.length > 8 ? window.CONFIG.FMP_API_KEY.substring(0,4) + '...' + window.CONFIG.FMP_API_KEY.substring(window.CONFIG.FMP_API_KEY.length - 4) : 'MASKED_KEY') : 'NOT FOUND or Placeholder');