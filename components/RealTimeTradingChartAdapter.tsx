import React, { useEffect, useState } from 'react';
import RealTimeTradingChart from './RealTimeTradingChart';
import { getHistoricalData } from '../services/ccxtService';
import { ChartCandlestickData, DataSource, GeminiAnalysisResult, MarketType, MovingAverageConfig } from '../types';
import { UTCTimestamp, CandlestickData } from 'lightweight-charts';

// Definir estructura de fuentes de datos disponibles
interface DataSourceConfig {
  id: string;
  name: string;
  compatibleMarketTypes: MarketType[];
}

// Lista de fuentes de datos disponibles (definición temporal)
const AVAILABLE_DATA_SOURCES: DataSourceConfig[] = [
  { id: 'binance', name: 'Binance', compatibleMarketTypes: ['crypto'] },
  { id: 'bingx', name: 'BingX', compatibleMarketTypes: ['crypto'] },
  { id: 'alphavantage', name: 'Alpha Vantage', compatibleMarketTypes: ['stocks', 'forex', 'indices', 'commodities'] },
  { id: 'oanda', name: 'OANDA', compatibleMarketTypes: ['forex'] }
];

// Lista de proveedores nativos (con WebSockets) que mantienen su implementación original
const NATIVE_PROVIDERS = ['binance', 'bingx'];

interface RealTimeTradingChartAdapterProps {
  dataSource: DataSource;
  symbol: string;
  timeframe: string;
  analysisResult: GeminiAnalysisResult | null;
  onLatestChartInfoUpdate: (info: { price: number | null; volume?: number | null }) => void;
  onChartLoadingStateChange: (isLoading: boolean) => void;
  movingAverages: MovingAverageConfig[];
  theme: 'dark' | 'light';
  chartPaneBackgroundColor: string;
  volumePaneHeight: number;
  showAiAnalysisDrawings: boolean;
  wSignalColor: string;
  wSignalOpacity: number;
  showWSignals: boolean;
}

const RealTimeTradingChartAdapter: React.FC<RealTimeTradingChartAdapterProps> = (props) => {
  const { dataSource, symbol, timeframe } = props;
  const [adaptedData, setAdaptedData] = useState<CandlestickData<UTCTimestamp>[]>([]);
  // El estado de carga se gestiona directamente con props.onChartLoadingStateChange
  
  // Determinamos el tipo de mercado basado en el dataSource
  const getMarketTypeForDataSource = (ds: DataSource): MarketType => {
    const dsConfig = AVAILABLE_DATA_SOURCES.find(src => src.id === ds);
    if (!dsConfig) return 'crypto'; // Default
    return dsConfig.compatibleMarketTypes[0];
  };
  
  // Si es un proveedor nativo, usamos el componente original directamente
  if (NATIVE_PROVIDERS.includes(dataSource)) {
    return <RealTimeTradingChart {...props} />;
  }
  
  // Para los demás proveedores, usamos CCXT adaptado
  useEffect(() => {
    const loadData = async () => {
      try {
        props.onChartLoadingStateChange(true);
        
        const marketType = getMarketTypeForDataSource(dataSource);
        console.log(`Loading ${marketType} data for ${symbol} using CCXT (${dataSource})`);
        
        const data = await getHistoricalData(symbol, timeframe, marketType, dataSource);
        
        // Convertir los datos al formato UTCTimestamp que espera el componente
        const formattedData = data.map(candle => ({
          time: candle.time as UTCTimestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        }));
        
        setAdaptedData(formattedData);
        
        // Actualizamos la información de precio más reciente
        if (data.length > 0) {
          const lastCandle = data[data.length - 1];
          props.onLatestChartInfoUpdate({
            price: lastCandle.close,
            volume: lastCandle.volume
          });
        }
      } catch (error) {
        console.error("Error loading data with CCXT:", error);
      } finally {
        props.onChartLoadingStateChange(false);
      }
    };
    
    loadData();
    
    // Configurar un intervalo para actualizar datos (similar a WebSocket pero usando polling)
    const intervalTimeMs = 30000; // 30 segundos
    const intervalId = setInterval(loadData, intervalTimeMs);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [dataSource, symbol, timeframe, props]);
  
  // Creamos datos adaptados para el componente original
  const adaptedProps = {
    ...props,
    // Pasamos una función que simula el histórico de Binance/BingX
    providerOverride: {
      type: 'static',
      name: `${dataSource} (via CCXT)`,
      historicalApi: () => '', // No se usa porque enviamos datos directamente
      formatSymbol: (s: string) => s,
      parseHistorical: () => adaptedData,
      parseKline: () => ({ time: 0, open: 0, high: 0, low: 0, close: 0 }),
      parseTicker: () => ({})
    }
  };
  
  return <RealTimeTradingChart {...adaptedProps} staticData={adaptedData} />;
};

export default RealTimeTradingChartAdapter;
