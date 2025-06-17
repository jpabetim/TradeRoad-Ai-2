import React, { useEffect, useState } from 'react';
import RealTimeTradingChart from './RealTimeTradingChart';
import { getHistoricalData as getCcxtHistoricalData } from '../services/ccxtService';
import { authenticate, getHistoricalData as getQuoddHistoricalData, getCurrentPrice } from '../services/quoddService';
import { DataSource, GeminiAnalysisResult, MarketType, MovingAverageConfig } from '../types';
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
  { id: 'oanda', name: 'OANDA', compatibleMarketTypes: ['forex'] },
  { id: 'quodd', name: 'QUODD', compatibleMarketTypes: ['crypto', 'stocks', 'forex', 'indices', 'commodities'] }
];

// Lista de proveedores nativos (con WebSockets) que mantienen su implementación original
const NATIVE_PROVIDERS = ['binance', 'bingx'];

// Proveedor QUODD - implementación REST API personalizada
const QUODD_PROVIDER = 'quodd';

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
  
  // Si es el proveedor QUODD, usamos la implementación de QUODD API
  if (dataSource === QUODD_PROVIDER) {
    return <QuoddChartImplementation {...props} />;
  }
  
  // Para los demás proveedores, usamos CCXT adaptado
  useEffect(() => {
    const loadData = async () => {
      try {
        props.onChartLoadingStateChange(true);
        
        const marketType = getMarketTypeForDataSource(dataSource);
        console.log(`Loading ${marketType} data for ${symbol} using CCXT (${dataSource})`);
        
        const data = await getCcxtHistoricalData(symbol, timeframe, marketType, dataSource);
        
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

// Implementación específica para QUODD API
const QuoddChartImplementation: React.FC<RealTimeTradingChartAdapterProps> = (props) => {
  const { symbol, timeframe } = props;
  const [adaptedData, setAdaptedData] = useState<CandlestickData<UTCTimestamp>[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Inicialización y autenticación con QUODD
  useEffect(() => {
    const init = async () => {
      try {
        props.onChartLoadingStateChange(true);
        const authSuccess = await authenticate();
        setIsAuthenticated(authSuccess);
        if (!authSuccess) {
          console.error('No se pudo autenticar con QUODD API');
          return;
        }
      } catch (error) {
        console.error('Error durante la autenticación con QUODD:', error);
      } finally {
        props.onChartLoadingStateChange(false);
      }
    };
    
    init();
  }, []); // Ejecutar solo al montar el componente
  
  // Cargar datos históricos y manejar actualizaciones
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadQuoddData = async () => {
      try {
        props.onChartLoadingStateChange(true);
        console.log(`Loading data from QUODD API for ${symbol}`);
        
        // Obtener datos históricos desde QUODD
        const histData = await getQuoddHistoricalData(symbol, timeframe);
        
        // Adaptar formato para lighthouse-charts
        const formattedData = histData.map(candle => ({
          time: new Date(candle.timestamp).getTime() / 1000 as UTCTimestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        }));
        
        setAdaptedData(formattedData);
        
        // Actualizar información del último precio
        if (formattedData.length > 0) {
          const lastCandle = formattedData[formattedData.length - 1];
          props.onLatestChartInfoUpdate({
            price: lastCandle.close,
            volume: lastCandle.volume
          });
          
          // También obtener el precio actual en tiempo real
          const currentPrice = await getCurrentPrice(symbol);
          if (currentPrice) {
            props.onLatestChartInfoUpdate({
              price: currentPrice,
              volume: lastCandle.volume // Mantener el último volumen conocido
            });
          }
        }
      } catch (error) {
        console.error("Error loading data from QUODD:", error);
      } finally {
        props.onChartLoadingStateChange(false);
      }
    };
    
    loadQuoddData();
    
    // Configurar polling para actualizar precios cada 10 segundos (similar a WebSocket)
    const intervalId = setInterval(async () => {
      try {
        const currentPrice = await getCurrentPrice(symbol);
        if (currentPrice && adaptedData.length > 0) {
          const lastCandle = adaptedData[adaptedData.length - 1];
          props.onLatestChartInfoUpdate({
            price: currentPrice,
            volume: 'volume' in lastCandle ? (lastCandle as any).volume : null
          });
        }
      } catch (error) {
        console.error("Error updating price from QUODD:", error);
      }
    }, 10000); // 10 segundos
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, symbol, timeframe]);
  
  // Configurar el proveedor personalizado QUODD
  const quoddProviderConf = {
    type: 'static',
    name: 'QUODD API',
    historicalApi: () => '', // No se usa directamente
    formatSymbol: (s: string) => s,
    parseHistorical: () => adaptedData,
    parseKline: () => ({ time: 0, open: 0, high: 0, low: 0, close: 0 }),
    parseTicker: () => ({})
  };

  return (
    <RealTimeTradingChart 
      {...props} 
      providerOverride={quoddProviderConf} 
      staticData={adaptedData} 
    />
  );
};

export default RealTimeTradingChartAdapter;
