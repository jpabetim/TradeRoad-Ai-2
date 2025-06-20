export type DataSource = 'binance' | 'bingx' | 'fmp' | 'alphavantage' | 'oanda' | 'quodd';
export type MarketType = 'crypto' | 'stocks' | 'indices' | 'forex' | 'commodities';

export enum AnalysisPointType {
  SOPORTE = 'soporte',
  RESISTENCIA = 'resistencia',
  POI_OFERTA = 'poi oferta',
  POI_DEMANDA = 'poi demanda',
  LIQUIDEZ_COMPRADORA = 'liquidez compradora',
  LIQUIDEZ_VENDEDORA = 'liquidez vendedora',
  FVG_BAJISTA = 'fvg bajista',
  FVG_ALCISTA = 'fvg alcista',
  EQUILIBRIUM = 'equilibrium',
  BOS = 'bos',
  CHOCH = 'choch',
}

export interface AnalysisPoint {
  id: string;
  label: string;
  tipo: AnalysisPointType;
  nivel?: number;
  zona?: [number, number];
  color: string;
  lineStyle: number; // 2 para Dashed, 3 para Dotted
  importancia: 'alta' | 'media' | 'baja';
  temporalidad: string;
  
  // Optional fields for direct chart markers
  marker_time?: number; // Unix timestamp (seconds) for the bar the marker should be on
  marker_position?: "aboveBar" | "belowBar" | "inBar";
  marker_shape?: string; // "arrowUp" | "arrowDown" | "circle" | "square" | "diamond";
  marker_text?: string; // Short text for the marker (e.g., "W", "R")
}

export interface PriceProjection {
  path: number[];
  descripcion_camino_1?: string;
}

export interface GeminiAnalysisResult {
  puntos_clave_grafico?: AnalysisPoint[];
  proyeccion_precio_visual?: PriceProjection;
  analisis_general?: any;
  escenarios_probables?: any[];
  conclusion_recomendacion?: any;
}

export interface PriceProjectionPoint {
  time: number;
  value: number;
}

export interface MovingAverageConfig {
  id: string;
  type: 'MA' | 'EMA';
  period: number;
  color: string;
  visible: boolean;
}

// Estructuras de datos adicionales para compatibilidad con la aplicación existente

export interface MarketDataPoint {
  time: number; // Unix timestamp (seconds) for Lightweight Charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ChartCandlestickData {
  time: number; // UTCTimestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number; // Optional volume data for candlestick series
}

export interface ChartLineData {
  time: number; // UTCTimestamp
  value: number;
}

export interface ChartHistogramData {
  time: number; // UTCTimestamp
  value: number;
  color?: string;
}

// Para interacción con API de Gemini
export interface GeminiRequestPayload {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  prompt: string;
  latestVolume?: number;
  historicalDataSummary?: string;
}

// Para compatibilidad con servicios existentes
export interface TickerData {
  provider: DataSource;
  symbol: string;
  marketType: MarketType;
  price?: number;
  changePercent?: number;
  volume?: number; 
  quoteVolume?: number;
  lastPriceChange?: 'up' | 'down' | 'none';
  displayName?: string;
}
