import { DataSource, MovingAverageConfig } from '../types';
import { UTCTimestamp, CandlestickData } from 'lightweight-charts';

export interface RealTimeTradingChartProps {
  dataSource: DataSource;
  symbol: string;
  timeframe: string;
  theme: 'dark' | 'light';
  movingAverages: MovingAverageConfig[];
  chartPaneBackgroundColor: string;
  volumePaneHeight: number;
  showAiAnalysisDrawings: boolean;
  onLatestInfo: (info: { price: number | null; volume?: number | null }) => void;
  onChartLoading: (isLoading: boolean) => void;
  showWSignals: boolean;
  wSignalColor: string;
  wSignalOpacity: number;
  // Propiedades adicionales
  providerOverride?: Record<string, any> | null;
  rawSymbol?: string;
  rawTimeframe?: string;
  staticData?: CandlestickData<UTCTimestamp>[];
}

// Estas constantes son usadas por ambos componentes
export const NATIVE_PROVIDERS: DataSource[] = ['binance', 'bingx'];
export const INVALID_PROVIDERS: DataSource[] = ['oanda', 'quodd'];
export const FMP_PROVIDER: DataSource = 'fmp' as DataSource;
