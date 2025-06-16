// Este archivo es una plantilla que será copiada y configurada durante el build
window.CONFIG = {
  API_KEY: "API_KEY_PLACEHOLDER",
  BUILD_TIME: "BUILD_TIME_PLACEHOLDER"
};

// Configurar también otras variables globales para máxima compatibilidad
window.API_KEY = window.CONFIG.API_KEY;
window.VITE_API_KEY = window.CONFIG.API_KEY;
window.REACT_APP_API_KEY = window.CONFIG.API_KEY;
window.GEMINI_API_KEY = window.CONFIG.API_KEY;

// Log para depuración
console.log("Config cargada:", {
  "window.CONFIG.API_KEY": window.CONFIG.API_KEY, 
  "window.API_KEY": window.API_KEY,
  "window.VITE_API_KEY": window.VITE_API_KEY,
  "window.REACT_APP_API_KEY": window.REACT_APP_API_KEY,
  "window.GEMINI_API_KEY": window.GEMINI_API_KEY
});
