import axios from 'axios';
import { GeminiRequestPayload } from '../types';
import { getFullAnalysisPrompt } from '../constants';

// Extender propiedades de window para TypeScript
declare global {
  interface Window {
    CONFIG?: { API_KEY?: string, BUILD_TIME?: string };
    API_KEY?: string;
    GEMINI_API_KEY?: string;
    VITE_API_KEY?: string;
    REACT_APP_API_KEY?: string;
    process?: {
      env?: {
        API_KEY?: string;
        // Añadir otras variables de entorno según sea necesario
      };
    };
  }
}

// Interfaces para la integración con la API de Gemini
export interface GeminiAnalysisResult {
  marketAnalysis: string;
  tradingRecommendation: string;
  technicalIndicators: {
    name: string;
    value: string;
    interpretation: string;
  }[];
  supportResistanceLevels: {
    type: 'support' | 'resistance';
    price: number;
    strength: 'weak' | 'moderate' | 'strong';
  }[];
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  potentialEntryPoints: {
    price: number;
    type: 'buy' | 'sell';
    stopLoss?: number;
    takeProfit?: number;
    rationale: string;
  }[];
  confidenceScore: number;
  shortTermOutlook: string;
}

// Extendemos la interfaz del payload de Gemini para incluir volumen y (opcionalmente) API key
export interface ExtendedGeminiRequestPayload extends GeminiRequestPayload {
  latestVolume?: number | null;
  apiKey?: string; // API key opcional ya que ahora se maneja en el backend
}

/**
 * Sanitiza una cadena JSON para eliminar caracteres de control que podrían causar errores al parsear.
 * Esta función resuelve específicamente varios errores comunes de sintaxis JSON.
 */
const sanitizeJsonString = (jsonStr: string): string => {
  // Imprimir los primeros 50 caracteres para depuración
  console.log(`Primeros 50 caracteres antes de sanitizar: "${jsonStr.substring(0, 50)}"`);
  
  // ESTRATEGIA SIMPLE PERO RADICAL: Utilizaremos un enfoque drástico pero efectivo
  try {
    // Intenta una estrategia radical: Normaliza completamente la cadena JSON 
    // Usando JSON.parse y luego JSON.stringify para recrearlo limpio
    
    // 1. Eliminar espacios en blanco, BOM y otros caracteres invisibles al inicio
    let preparada = jsonStr.trim();
    
    // 2. Manejar el problema de saltos de línea dentro del JSON de manera agresiva
    // Primero, convertir la cadena a objeto usando eval para permitir caracteres no válidos
    // NOTA: Normalmente eval es peligroso, pero aquí lo usamos en un contexto controlado para parsing
    try {
      console.log("Intento 1: Usando JSON.parse directo");
      // Intento directo con JSON.parse (poco probable que funcione con los errores actuales)
      const parsed = JSON.parse(preparada);
      return JSON.stringify(parsed);
    } catch (parseError) {
      try {
        console.log("Intento 2: Usando estrategia de normalización fuerte");
        
        // Reemplazar todos los saltos de línea con espacios
        preparada = preparada.replace(/\n/g, ' ');
        preparada = preparada.replace(/\r/g, ' ');
        
        // Eliminar todos los espacios en blanco entre caracteres que no son necesarios en JSON
        preparada = preparada.replace(/\s+(?=[\{\}\[\]\,\:\"\'])/g, '');
        
        // Asegurar que el JSON comienza correctamente
        if (!preparada.startsWith('{') && !preparada.startsWith('[')) {
          const validStart = Math.max(preparada.indexOf('{'), preparada.indexOf('['));
          if (validStart > 0) {
            preparada = preparada.substring(validStart);
          }
        }
        
        // Intentar reparar comillas sin escapar
        preparada = preparada.replace(/([^\\])"([^"]*?[^\\])"(?=[^:]*[\,\}])/g, '$1\\\'$2\\\'')
        
        // Log para depuración
        console.log(`Cadena preparada para JSON.parse: "${preparada.substring(0, 50)}..."`);
        
        // Intento final con JSON.parse
        const parsedObject = JSON.parse(preparada);
        return JSON.stringify(parsedObject);
      } catch (finalError) {
        console.error("Todos los intentos de reparar el JSON fallaron:", finalError);
        // Intento final desesperado: eliminar todos los saltos de línea y normalizar el JSON manualmente
        // Si esto falla, no hay mucho más que podamos hacer automáticamente
        
        // Si llegamos aquí, intentamos devolver la cadena original para permitir
        // que otros mecanismos de errores la manejen
        console.warn("Devolviendo JSON sanitizado con método de respaldo");
        
        // Último intento - limpieza básica
        let lastResort = jsonStr.trim();
        // Reemplazar saltos de línea con nada
        lastResort = lastResort.replace(/\n|\r/g, '');
        // Eliminar espacios en blanco excesivos
        lastResort = lastResort.replace(/\s+/g, ' ');
        // Remover cualquier caracter Unicode de control
        lastResort = lastResort.replace(/[\u0000-\u001F]/g, '');
        
        console.log(`Últimos 50 caracteres después de limpieza de emergencia: "${lastResort.substring(lastResort.length - 50)}"`);
        
        return lastResort;
      }
    }
  } catch (error) {
    console.error("Error crítico en sanitizeJsonString:", error);
    // En caso de error catastrófico, devolver la cadena original
    return jsonStr;
  }
};

export const analyzeChartWithGemini = async (
  payload: ExtendedGeminiRequestPayload
): Promise<GeminiAnalysisResult> => {
  console.log('🔄 Starting Gemini analysis through backend proxy');

  if (!payload) {
    throw new Error('No payload provided for Gemini analysis');
  }

  try {
    // Construir el prompt completo
    const promptText = getFullAnalysisPrompt(
      payload.symbol,
      payload.timeframe,
      payload.currentPrice,
      payload.latestVolume
    );
    const currentTimestamp = new Date().toISOString();
    const finalPrompt = `${promptText}\n\nTimestamp: ${currentTimestamp}`;
    
    console.log(`Prompt length: ${finalPrompt.length} chars`);
    console.log('🔄 Calling backend proxy for Gemini API...');
    
    // Llamamos al endpoint del backend
    const response = await axios.post('/api/analyze-chart', {
      prompt: finalPrompt
    });
    
    console.log(`✅ Received response from backend (${response.data.analysis.length} chars)`);
    
    // La respuesta viene como un string JSON que necesitamos parsear
    const jsonStr = response.data.analysis.trim();
    
    try {
      console.log('🔄 Parsing JSON response from backend...');
      const parsedData = JSON.parse(jsonStr) as GeminiAnalysisResult;
      console.log('✅ JSON parsed successfully');
      return parsedData;
    } catch (parseError) {
      console.error('❌ Error al analizar JSON de la respuesta:', parseError);
      
      // Intento de sanitización
      console.log('🔄 Trying JSON sanitization on backend response...');
      const sanitized = sanitizeJsonString(jsonStr);
      
      try {
        const parsedData = JSON.parse(sanitized) as GeminiAnalysisResult;
        console.log('✅ JSON parsed successfully after sanitization');
        return parsedData;
      } catch (secondParseError: unknown) {
        const errorMessage = secondParseError instanceof Error ? secondParseError.message : String(secondParseError);
        console.error("Error en el segundo intento de parseo JSON:", errorMessage);
        throw new Error(`No se pudo analizar la respuesta JSON: ${errorMessage}. La respuesta recibida fue: ${sanitized}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error calling backend proxy:', error);
    
    // Mejorar el mensaje de error para el usuario
    if (error.response?.data?.error) {
      throw new Error(`Backend error: ${error.response.data.error}`);
    } else {
      throw new Error(`Analysis failed: ${error.message || 'Unknown error'}`);
    }
  }
};
