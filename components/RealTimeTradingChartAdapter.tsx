import React, { useMemo } from 'react';
import RealTimeTradingChart from './RealTimeTradingChart';
import { getHistoricalData as getFmpHistoricalData } from '../services/fmpService';
import { DataSource, MovingAverageConfig, AnalysisPoint } from '../types';
import { UTCTimestamp } from 'lightweight-charts';

type CandlestickData = { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume?: number; };

const NATIVE_PROVIDERS: DataSource[] = ['binance', 'bingx'];
const FMP_PROVIDER: DataSource = 'fmp';
const ALPHA_VANTAGE_PROVIDER: DataSource = 'alphavantage';

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
  analysisDrawings?: AnalysisPoint[];
  priceProjectionPath?: number[];
  isPanelVisible: boolean;
}

const DataFetchingImplementation: React.FC<RealTimeTradingChartAdapterProps & { fetcher: Function }> = ({ fetcher, symbol, timeframe, onChartLoading, onLatestInfo, ...rest }) => {
  const [staticData, setStaticData] = React.useState<CandlestickData[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      if (!symbol || !timeframe) return;
      onChartLoading(true);
      setStaticData([]);
      try {
        const data = await fetcher(symbol, timeframe);
        setStaticData(data);
        if (data.length > 0) {
          const last = data[data.length - 1];
          onLatestInfo({ price: last.close, volume: last.volume });
        } else {
          onLatestInfo({ price: null, volume: null });
        }
      } catch (error) {
        console.error(`Error loading data for ${symbol}:`, error);
        onLatestInfo({ price: null, volume: null });
      } finally {
        onChartLoading(false);
      }
    };
    loadData();
  }, [symbol, timeframe, fetcher, onChartLoading, onLatestInfo]);

  return <RealTimeTradingChart {...rest} symbol={symbol} timeframe={timeframe} staticData={staticData} />;
};

const RealTimeTradingChartAdapter: React.FC<RealTimeTradingChartAdapterProps> = (props) => {
  const chartComponent = useMemo(() => {
    if (NATIVE_PROVIDERS.includes(props.dataSource)) {
      return <RealTimeTradingChart {...props} />;
    }
    if (props.dataSource === FMP_PROVIDER) {
      return <DataFetchingImplementation {...props} fetcher={getFmpHistoricalData} />;
    }
    // Agrega el caso para Alpha Vantage aquí si es necesario
    // if (props.dataSource === ALPHA_VANTAGE_PROVIDER) {
    //   return <DataFetchingImplementation {...props} fetcher={getAlphaVantageData} />;
    // }
    
    // Fallback para proveedores desconocidos
    console.warn(`Data source no soportado: ${props.dataSource}. Usando fallback.`);
    return <RealTimeTradingChart {...props} dataSource="binance" symbol="BTCUSDT" />;

  }, [props]);

  return (
    <div className="relative w-full h-full">
      {chartComponent}
    </div>
  );
};

export default RealTimeTradingChartAdapter;