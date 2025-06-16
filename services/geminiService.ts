
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeminiAnalysisResult, GeminiRequestPayload } from "../types";
import { GEMINI_MODEL_NAME, getFullAnalysisPrompt } from "../constants";

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
  const { apiKey, ...restOfPayload } = payload; // Extract apiKey from payload

  if (!apiKey || apiKey === "TU_CLAVE_API_DE_GEMINI_AQUI") {
    console.error("API_KEY is not configured or is a placeholder. It was passed to analyzeChartWithGemini.");
    throw new Error("API Key is not configured or is a placeholder. AI analysis disabled.");
  }

  const ai = new GoogleGenAI({ apiKey }); // Use the apiKey from payload

  const fullPrompt = getFullAnalysisPrompt(
    restOfPayload.symbol,
    restOfPayload.timeframe,
    restOfPayload.currentPrice,
    restOfPayload.latestVolume
  );

  const finalPromptWithTimestamp = fullPrompt.replace("AUTO_GENERATED_TIMESTAMP_ISO8601", new Date().toISOString());

  let genAIResponse: GenerateContentResponse | undefined;

  try {
    genAIResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: finalPromptWithTimestamp,
      config: {
        responseMimeType: "application/json",
      },
    });

    let jsonStr = genAIResponse.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) { 
      jsonStr = match[2].trim();
    }
    
    // Sanitizar caracteres de control antes de analizar el JSON
    // Esta es una solución para el error "SyntaxError: Bad control character in string literal in JSON"
    jsonStr = sanitizeJsonString(jsonStr);

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
            if (genAIResponse && typeof genAIResponse.text === 'string') {
                console.error("Problematic JSON string from Gemini:", genAIResponse.text);
            }
        } else {
            errorMessage = `Gemini API error: ${error.message}`;
        }
    } else if (typeof error === 'string' && error.includes("```")) {
        errorMessage = "Received a malformed response from Gemini (likely unparsed markdown/JSON).";
    } else if (error && typeof error.toString === 'function') { 
        const errorString = error.toString();
        errorMessage = `Gemini API call failed: ${errorString.startsWith('[object Object]') ? 'Non-descriptive error object received.' : errorString}`;
    }

    throw new Error(errorMessage);
  }
};
