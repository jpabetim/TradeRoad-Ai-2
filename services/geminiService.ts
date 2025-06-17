
import { GoogleGenAI } from "@google/genai";
import { GeminiAnalysisResult, GeminiRequestPayload } from "../types";
import { GEMINI_MODEL_NAME, getFullAnalysisPrompt } from "../constants";

// Función auxiliar para obtener la API key de múltiples fuentes posibles
const getApiKey = (): string => {
  // Lugares donde podemos encontrar la API key en el navegador
  const possibleSources = [
    // Objeto CONFIG global
    window.CONFIG?.API_KEY,
    // Variables de window directas
    window.API_KEY,
    window.GEMINI_API_KEY,
    window.VITE_API_KEY,
    window.REACT_APP_API_KEY,
    // Variables de process.env (a través de Vite o React)
    window.process?.env?.API_KEY,
    window.process?.env?.GEMINI_API_KEY,
    window.process?.env?.VITE_API_KEY,
    window.process?.env?.REACT_APP_API_KEY,
    // Como último recurso, buscar en localStorage
    localStorage.getItem('API_KEY'),
    localStorage.getItem('GEMINI_API_KEY')
  ];
  
  // Log de debug para todas las fuentes
  console.log('Fuentes de API key disponibles:', {
    'window.CONFIG?.API_KEY': window.CONFIG?.API_KEY || '(no disponible)',
    'window.API_KEY': window.API_KEY || '(no disponible)',
    'window.GEMINI_API_KEY': window.GEMINI_API_KEY || '(no disponible)',
    'window.VITE_API_KEY': window.VITE_API_KEY || '(no disponible)',
    'window.REACT_APP_API_KEY': window.REACT_APP_API_KEY || '(no disponible)',
    'process.env.API_KEY': window.process?.env?.API_KEY || '(no disponible)',
    'process.env.GEMINI_API_KEY': window.process?.env?.GEMINI_API_KEY || '(no disponible)',
    'localStorage API_KEY': localStorage.getItem('API_KEY') || '(no disponible)',
  });
  
  // Encontrar la primera API key válida
  for (const source of possibleSources) {
    if (source && typeof source === 'string' && source.length > 10) {
      // Es muy probable que sea una API key válida de Gemini si tiene más de 10 caracteres
      if (!isPlaceholder(source)) {
        console.log('API key válida encontrada, longitud:', source.length);
        return source;
      }
    }
  }
  
  // Si llegamos aquí, no encontramos ninguna API key válida
  console.error('No se encontró ninguna API key válida en ninguna fuente');
  return '';
};

// Verificar si una API key es un placeholder
const isPlaceholder = (key: string): boolean => {
  const placeholders = [
    'API_KEY_PLACEHOLDER',
    'TU_CLAVE_API_DE_GEMINI_AQUI',
    'YOUR_API_KEY_HERE',
    'GEMINI_API_KEY'
  ];
  
  // Verificar si la API key es uno de los placeholders conocidos
  if (placeholders.some(placeholder => key.includes(placeholder))) {
    return true;
  }
  
  // Verificar si la API key parece un placeholder por su patrón
  // Esto es útil para detectar cosas como "YOUR_API_KEY", "[[API_KEY]]", etc.
  const placeholderPattern = /\[|\]|YOUR|TU|CLAVE|KEY|PLACEHOLDER|AQUI|HERE/i;
  if (placeholderPattern.test(key)) {
    return true;
  }
  
  return false;
};

// Extender propiedades de window sin redeclarar process
declare global {
  interface Window {
    CONFIG?: { API_KEY?: string, BUILD_TIME?: string };
    API_KEY?: string;
    GEMINI_API_KEY?: string;
    VITE_API_KEY?: string;
    REACT_APP_API_KEY?: string;
  }
}

// getApiKey function is removed as apiKey will be passed directly.

export interface ExtendedGeminiRequestPayload extends GeminiRequestPayload {
  latestVolume?: number | null;
  apiKey: string; // API key is now part of the payload
}

/**
 * Sanitiza una cadena JSON para eliminar caracteres de control que podrían causar errores al parsear.
 * Esta función resuelve específicamente el error "SyntaxError: Bad control character in string literal in JSON"
 */
const sanitizeJsonString = (jsonStr: string): string => {
  // Reemplazar caracteres de control (ASCII del 0-31) excepto tabulaciones y saltos de línea comunes
  // que están permitidos en JSON si están correctamente escapados
  let sanitized = jsonStr;
  
  // Primero, escapar correctamente las tabulaciones, retornos de carro y saltos de línea
  sanitized = sanitized.replace(/\t/g, '\\t');
  sanitized = sanitized.replace(/\r/g, '\\r');
  sanitized = sanitized.replace(/\n/g, '\\n');
  
  // Luego, eliminar otros caracteres de control que no deberían estar en un string JSON
  sanitized = sanitized.replace(/[\u0000-\u001F]/g, '');
  
  // También manejar casos donde hay barras invertidas sin escapar
  sanitized = sanitized.replace(/([^\\])\\"/g, '$1\\\\"');
  
  return sanitized;
};

export const analyzeChartWithGemini = async (
  payload: ExtendedGeminiRequestPayload
): Promise<GeminiAnalysisResult> => {
  // Extraer apiKey del payload, pero también buscarla con getApiKey si no existe o es inválida
  const { apiKey: providedApiKey, ...restOfPayload } = payload;
  
  // Intentar usar la API key proporcionada en el payload, o buscar una válida con getApiKey
  // Esto nos da máxima flexibilidad: funcionará si la key está en el payload o en cualquiera de las otras ubicaciones
  let apiKey = providedApiKey;
  
  // Si la API key proporcionada no es válida, intentar encontrar una con getApiKey
  if (!apiKey || isPlaceholder(apiKey)) {
    console.log('API key en payload no válida, buscando en otras fuentes...');
    apiKey = getApiKey();
  }

  console.log(`Intento de uso de API key: ${apiKey ? `presente (longitud: ${apiKey.length})` : 'no disponible'}`);
  
  if (!apiKey || apiKey.length < 10) {
    console.error("API_KEY no se encontró en ninguna ubicación conocida o no es válida.");
    throw new Error("API Key no configurada. Análisis de IA deshabilitado.");
  }

  const ai = new GoogleGenAI({ apiKey }); // Use the apiKey from payload

  const fullPrompt = getFullAnalysisPrompt(
    restOfPayload.symbol,
    restOfPayload.timeframe,
    restOfPayload.currentPrice,
    restOfPayload.latestVolume
  );

  const finalPromptWithTimestamp = fullPrompt.replace("AUTO_GENERATED_TIMESTAMP_ISO8601", new Date().toISOString());

  try {
    // CAMBIO IMPORTANTE: Configurar para usar streaming
    const result = await ai.models.generateContentStream({
      model: GEMINI_MODEL_NAME,
      contents: finalPromptWithTimestamp,
      config: {
        responseMimeType: "application/json",
      },
    });

    // Concatenar todas las partes de la respuesta
    console.log("Recibiendo respuesta en streaming de Gemini...");
    let fullResponse = '';
    for await (const chunk of result) {
      // Acceder al texto como propiedad y verificar que existe
      const chunkText = chunk.text ? chunk.text : '';
      fullResponse += chunkText;
      // Log opcional para debug: console.log(`Recibido fragmento con ${chunkText.length} caracteres`);
    }
    console.log(`Respuesta completa recibida: ${fullResponse.length} caracteres`);

    // Continuar con el procesamiento normal del JSON
    let jsonStr = fullResponse.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) { 
      jsonStr = match[2].trim();
    }
    
    // Sanitizar caracteres de control antes de analizar el JSON
    jsonStr = sanitizeJsonString(jsonStr);
    
    // Logs para verificar que tenemos un JSON válido
    console.log(`Longitud del JSON procesado: ${jsonStr.length} caracteres`);
    // Verificar que el JSON termina correctamente (debe terminar con })
    console.log(`Últimos 50 caracteres: "${jsonStr.substring(jsonStr.length - 50)}"`); 

    const parsedData = JSON.parse(jsonStr) as GeminiAnalysisResult;

    if (!parsedData.analisis_general || !parsedData.escenarios_probables) {
        console.warn("Parsed Gemini response seems to be missing key fields.", parsedData);
    }

    return parsedData;

  } catch (error: any) {
    console.error("Error calling Gemini API or parsing response. Full error object:", error); 

    let errorMessage = "Failed to get analysis from Gemini. An unknown error occurred during the API call or response processing."; 

    if (error.message) {
        if (error.message.includes("API_KEY_INVALID") || error.message.includes("API key not valid")) {
             errorMessage = "Gemini API Key is invalid. Please check your API_KEY configuration in index.html.";
        } else if (error.message.includes("quota") || error.message.includes("Quota")) {
            errorMessage = "Gemini API quota exceeded. Please check your quota or try again later.";
        } else if (error.message.toLowerCase().includes("json")) {
            errorMessage = "Failed to parse the analysis from Gemini. The response was not valid JSON.";
            // Ya no necesitamos verificar genAIResponse.text porque ahora usamos streaming
            console.error("Problematic JSON string from Gemini (partial):", error.parsedJson || "No available JSON preview");
        } else {
            errorMessage = `Gemini API error: ${error.message}`;
        }
    } else if (typeof error === 'string' && error.includes("`")) {
        errorMessage = "Received a malformed response from Gemini (likely unparsed markdown/JSON).";
    } else if (error && typeof error.toString === 'function') { 
        const errorString = error.toString();
        errorMessage = `Gemini API call failed: ${errorString.startsWith('[object Object]') ? 'Non-descriptive error object received.' : errorString}`;
    }

    throw new Error(errorMessage);
  }
};
