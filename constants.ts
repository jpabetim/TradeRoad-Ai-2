// En tu archivo constants.ts

import { DataSource, MarketType } from './types';

// --- VALORES POR DEFECTO DE LA APLICACIÓN ---
export const DEFAULT_MARKET_TYPE: MarketType = 'crypto';
export const DEFAULT_DATA_SOURCE: DataSource = 'binance';
export const DEFAULT_TIMEFRAME: string = '1h';

// --- CONFIGURACIÓN DE PROVEEDORES Y SÍMBOLOS ---

export const AVAILABLE_DATA_SOURCES: { value: DataSource; label: string; marketTypes: MarketType[] }[] = [
  { value: 'binance', label: 'Binance Futures', marketTypes: ['crypto'] },
  { value: 'bingx', label: 'BingX Futures', marketTypes: ['crypto'] },
  // --- SOLUCIÓN: AÑADIDA LA LÍNEA QUE FALTABA PARA FMP ---
  { value: 'fmp', label: 'Financial Modeling Prep', marketTypes: ['stocks', 'crypto', 'forex', 'indices'] },
  { value: 'alphavantage', label: 'Alpha Vantage', marketTypes: ['stocks', 'forex', 'indices'] },
];

export const DEFAULT_SYMBOLS: Record<MarketType, string> = {
  crypto: 'BTCUSDT',
  stocks: 'AAPL',
  indices: 'SPY',
  forex: 'EURUSD',
  commodities: 'XAUUSD',
};

// Map display timeframes to API timeframes
export const mapTimeframeToApi = (timeframe: string): string => {
  return timeframe.toLowerCase();
};

// --- PROMPT MAESTRO PARA EL ANÁLISIS AUTOMÁTICO DE IA (UNIFICADO) ---
export const getAutoAnalysisPrompt = (symbol: string, timeframe: string, currentPrice: number | null, userQuestion: string): string => {

  // Determina si el usuario ha hecho una pregunta específica o si es un análisis automático.
  const isSpecificQuestion = userQuestion && userQuestion.trim().length > 1;

  const requestInstructions = isSpecificQuestion
    ? `Primero, considera todo el contexto de mercado que puedas inferir. Luego, responde a la siguiente pregunta específica del usuario de forma directa: "${userQuestion}"`
    : `Realiza un análisis técnico completo y automático siguiendo los principios de SMC y Wyckoff. Identifica la estructura de mercado, la liquidez, los POIs, los escenarios probables y los puntos clave para dibujar en el gráfico.`;

  // Este es el prompt completo que se envía a la IA.
  // Combina el rol, la tarea y el formato de salida en un solo lugar.
  return `
    Eres "TradeRoad AI Analyst", un analista técnico de élite especializado en Smart Money Concepts (SMC) y la metodología Wyckoff. Tu conocimiento es profundo y tus análisis son precisos y accionables.

    Tu tarea es analizar el gráfico de ${symbol} en la temporalidad de ${timeframe}. El precio actual es aproximadamente ${currentPrice || 'desconocido'}.

    ${requestInstructions}

    IMPORTANTE: Tu respuesta debe ser SIEMPRE un único bloque de código JSON, sin explicaciones antes o después. La estructura del JSON debe ser la siguiente:
    {
      "analisis_general": {
        "estructura_mercado_resumen": { "1D": "...", "4H": "...", "1H": "..." },
        "sesgo_direccional_general": "alcista" | "bajista" | "lateral"
      },
      "escenarios_probables": [
        {
          "nombre_escenario": "Escenario Principal: ...",
          "probabilidad": "alta",
          "descripcion_detallada": "...",
          "trade_setup_asociado": { "tipo": "CORTO" | "LARGO" | "NINGUNO", "punto_entrada_ideal": 123.45, ... }
        }
      ],
      "proyeccion_precio_visual": {
        "path": [123.45, 122.50, ...],
        "descripcion_camino_1": "..."
      },
      "puntos_clave_grafico": [
        {
          "id": "poi-oferta-4h-1",
          "label": "Bearish OB 4H",
          "tipo": "poi oferta",
          "zona": [2600.00, 2630.00],
          "temporalidad": "4H",
          "importancia": "alta",
          "color": "#FF5252",
          "lineStyle": 2
        }
      ]
    }
  `;
};