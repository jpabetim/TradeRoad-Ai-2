import React, { useEffect, useState, useMemo } from 'react';
import RealTimeTradingChart from './RealTimeTradingChart';
import { getHistoricalData as getFmpHistoricalData } from '../services/fmpService';
import { DataSource, MovingAverageConfig } from '../types';
import { UTCTimestamp, CandlestickData } from 'lightweight-charts';

// NATIVE_PROVIDERS are those with a direct WebSocket connection handled by RealTimeTradingChart
const NATIVE_PROVIDERS: DataSource[] = ['binance', 'bingx'];

// INVALID_PROVIDERS que no tienen implementación y deben usar fallback
const INVALID_PROVIDERS: DataSource[] = ['oanda', 'quodd'];

// FMP_PROVIDER is for Financial Modeling Prep REST API
const FMP_PROVIDER: DataSource = 'fmp' as DataSource;

interface RealTimeTradingChartAdapterProps {
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
  showIndicators?: boolean;
  analysisDrawings?: any[];
  priceProjectionPath?: number[];
  // Propiedades para las funciones de análisis
  onAnalyzeClick?: () => void;
  onAutoAnalyzeClick?: () => void;
}

/**
 * This component fetches historical data from FMP API and passes it to the main chart.
 * It acts as a bridge for non-native (REST-based) data sources.
 */
const FmpChartImplementation: React.FC<RealTimeTradingChartAdapterProps> = (props) => {
  const {
    symbol,
    timeframe,
    onChartLoading,
    onLatestInfo,
  } = props;

  const [adaptedData, setAdaptedData] = useState<CandlestickData<UTCTimestamp>[]>([]);

  useEffect(() => {
    const loadData = async () => {
      onChartLoading(true);
      setAdaptedData([]); // Clear previous data

      try {
        const data = await getFmpHistoricalData(symbol, timeframe);
        
        // The service already returns data in the correct format, but we ensure the timestamp type
        const formattedData = data.map((candle: any) => ({
          ...candle,
          time: candle.time as UTCTimestamp,
        }));

        setAdaptedData(formattedData);

        if (formattedData.length > 0) {
          const lastCandle = formattedData[formattedData.length - 1];
          onLatestInfo({
            price: lastCandle.close,
            volume: lastCandle.volume,
          });
        } else {
          onLatestInfo({ price: null, volume: null });
        }
      } catch (error) {
        console.error(`Error loading FMP historical data for ${symbol}:`, error);
        setAdaptedData([]); // Ensure data is cleared on error
        onLatestInfo({ price: null, volume: null });
      } finally {
        onChartLoading(false);
      }
    };

    if (symbol && timeframe) {
      loadData();
    }
  }, [symbol, timeframe, onChartLoading, onLatestInfo]);

  return <RealTimeTradingChart {...props} staticData={adaptedData} providerOverride={null} />;
};

/**
 * The Adapter's main responsibility is to select the correct component implementation
 * based on the chosen data source.
 * - For 'binance' or 'bingx', it uses the original RealTimeTradingChart which has its own WebSocket logic.
 * - For 'fmp', it uses a specific implementation (FmpChartImplementation) that fetches data via REST API.
 */
const RealTimeTradingChartAdapter: React.FC<RealTimeTradingChartAdapterProps> = (props) => {
  const modifiedProps = useMemo(() => ({
    ...props
  }), [props]);

  // Select implementation based on data source
  const chartComponent = useMemo(() => {
    // Si es un proveedor inválido o no implementado todavía
    if (INVALID_PROVIDERS.includes(props.dataSource)) {
      const mockData = {
        ...props,
        dataSource: FMP_PROVIDER, // Usar FMP como proveedor provisional
        symbol: props.symbol || 'SPY' // Mantener el símbolo original o usar uno por defecto
      };
      return <FmpChartImplementation {...mockData} />;
    } else if (NATIVE_PROVIDERS.includes(props.dataSource)) {
      // Para los nativos como Binance, usar el componente principal
      return <RealTimeTradingChart {...modifiedProps} />;
    } else if (props.dataSource === FMP_PROVIDER) {
      return <FmpChartImplementation {...modifiedProps} />;
    } else {
      // Fallback seguro para cualquier otro proveedor no conocido
      console.error(`Unknown data source: ${props.dataSource}. Falling back to basic chart.`);
      const fallbackProps = {
        ...modifiedProps,
        dataSource: 'binance' as DataSource, // Forzar a usar binance como fallback
        symbol: 'BTCUSDT', // Símbolo válido para binance
        providerOverride: null // Eliminar cualquier override que pueda causar errores
      };
      return <RealTimeTradingChart {...fallbackProps} />;
    }
  }, [props.dataSource, modifiedProps]);

  return (
    <div className="relative w-full h-full">
      {chartComponent}
    </div>
  );
};

export default RealTimeTradingChartAdapter;
