// Definición de tipos para la API de Gemini
import { GeminiRequestPayload } from '../types';

// Resultado del análisis de Gemini
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

// Exportar el tipo desde types.ts para uso en otros archivos
export type { GeminiRequestPayload } from '../types';
export type { ExtendedGeminiRequestPayload } from '../services/geminiService';
