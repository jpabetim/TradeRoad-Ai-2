// En tu archivo server/Analyze.ts

import { Request, Response } from 'express';
import { getAutoAnalysisPrompt } from '../constants'; // Asumo que esta función la tienes en tus constantes
import { GeminiAnalysisResult } from '../types';
const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symbol, timeframe, currentPrice, prompt } = req.body;

    if (!symbol || !timeframe || !prompt) {
      return res.status(400).json({ error: 'Faltan campos obligatorios en la petición.' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('[API] GEMINI_API_KEY no está configurada en el servidor de Render.');
      return res.status(500).json({ error: 'Error de configuración del servidor: falta la clave de API de Gemini.' });
    }

    // Usamos la función del prompt maestro para darle el rol de experto a la IA
    const finalPrompt = getAutoAnalysisPrompt(symbol, timeframe, currentPrice, prompt);
    
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // --- LA SOLUCIÓN ESTÁ AQUÍ ---
    // Usamos un nombre de modelo válido y moderno.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    console.log(`[API] Usando el modelo: gemini-1.5-flash-latest`);
    console.log(`[API] Enviando petición a Gemini para ${symbol}...`);

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const textResponse = response.text();
    
    // Extraemos el JSON de la respuesta
    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) {
      console.error('[API] La respuesta de Gemini no contenía un bloque JSON válido:', textResponse);
      return res.status(500).json({ error: 'Error al procesar la respuesta de la IA (formato inesperado).' });
    }

    const analysisResult: GeminiAnalysisResult = JSON.parse(jsonMatch[1]);
    
    console.log(`[API] Análisis para ${symbol} completado con éxito.`);
    return res.status(200).json(analysisResult);

  } catch (error: any) {
    console.error('[API] Error CRÍTICO en el manejador de análisis:', error);
    return res.status(500).json({
      error: `Error en el servidor de análisis: ${error.message || 'Error desconocido'}`
    });
  }
}