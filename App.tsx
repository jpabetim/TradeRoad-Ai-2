import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DataSource, MarketType, MovingAverageConfig, GeminiAnalysisResult } from './types';
import ControlsPanel from './components/ControlsPanel';
import RealTimeTradingChartAdapter from './components/RealTimeTradingChartAdapter';
import AiQueryPanel from './components/AiQueryPanel';
import MovingAverageControls from './components/MovingAverageControls';
import AutomatedAnalysisDisplay from './components/AutomatedAnalysisDisplay';
import { AVAILABLE_DATA_SOURCES, getAutoAnalysisPrompt, DEFAULT_SYMBOLS, DEFAULT_MARKET_TYPE, DEFAULT_TIMEFRAME } from './constants';
import { Button } from './components/ui/button';

interface LatestChartInfo { price: number | null; volume?: number | null; }
type Theme = 'dark' | 'light';

const initialMAs: MovingAverageConfig[] = [
  { id: 'ma1', type: 'EMA', period: 12, color: '#34D399', visible: true },
  { id: 'ma2', type: 'EMA', period: 20, color: '#F472B6', visible: true },
  { id: 'ma3', type: 'EMA', period: 200, color: '#FFFFFF', visible: true },
];

const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (e) { return defaultValue; }
};

const App: React.FC = () => {
  const [marketType, setMarketType] = useState<MarketType>(() => getLocalStorageItem('traderoad_marketType', DEFAULT_MARKET_TYPE));
  const getDefaultDataSourceForMarketType = (mType: MarketType): DataSource => (mType === 'crypto' ? 'binance' : 'fmp');
  const [dataSource, setDataSource] = useState<DataSource>(() => getLocalStorageItem('traderoad_dataSource', getDefaultDataSourceForMarketType(marketType)));
  const getDefaultSymbolForMarketType = (mType: MarketType) => DEFAULT_SYMBOLS[mType] || DEFAULT_SYMBOLS.crypto;
  const [actualSymbol, setActualSymbol] = useState<string>(() => getLocalStorageItem('traderoad_actualSymbol', getDefaultSymbolForMarketType(marketType)));
  const [symbolInput, setSymbolInput] = useState<string>(actualSymbol);
  const [timeframe, setTimeframe] = useState<string>(() => getLocalStorageItem('traderoad_timeframe', DEFAULT_TIMEFRAME));
  const [theme, setTheme] = useState<Theme>(() => getLocalStorageItem('traderoad_theme', 'dark'));
  const [movingAverages, setMovingAverages] = useState<MovingAverageConfig[]>(() => getLocalStorageItem('traderoad_movingAverages', initialMAs));
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(() => getLocalStorageItem('traderoad_isPanelVisible', true));
  
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChartLoading, setIsChartLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latestChartInfo, setLatestChartInfo] = useState<LatestChartInfo>({ price: null, volume: null });
  const [prompt, setPrompt] = useState<string>('');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [showIndicators, setShowIndicators] = useState(false);

  useEffect(() => {
    const fetchSymbols = async () => {
        if (!dataSource) return;
        try {
            const response = await fetch(`/api/symbols?exchange=${dataSource}`);
            if (!response.ok) throw new Error('No se pudieron cargar los símbolos');
            const data = await response.json();
            if (Array.isArray(data)) {
                setAvailableSymbols(data);
                if (!data.includes(actualSymbol)) {
                    const newSymbol = data[0] || '';
                    setActualSymbol(newSymbol);
                    setSymbolInput(newSymbol);
                }
            }
        } catch (error) {
            console.error("Error al cargar símbolos:", error);
            setAvailableSymbols([]);
        }
    };
    fetchSymbols();
  }, [dataSource]);

  useEffect(() => {
    const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 200); 
    return () => clearTimeout(timer);
  }, [isPanelVisible]);

  const handleAnalyze = useCallback(async (isAuto: boolean) => {
    const userPrompt = prompt.trim();
    if (!isAuto && !userPrompt) {
        setError("Por favor, introduce una pregunta para analizar.");
        return;
    }
    if (isChartLoading || !latestChartInfo.price) {
        setError("Espera a que los datos del gráfico carguen completamente.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const finalPrompt = getAutoAnalysisPrompt(actualSymbol, timeframe, latestChartInfo.price, isAuto ? '' : userPrompt);
      const payload = { symbol: actualSymbol, timeframe, currentPrice: latestChartInfo.price, prompt: finalPrompt };
      const response = await fetch('/api/analyze-chart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json()).error || 'Error en el servidor de análisis');
      setAnalysisResult(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [actualSymbol, timeframe, isChartLoading, latestChartInfo, prompt]);

  const chartAdapterProps = useMemo(() => ({
    dataSource, 
    symbol: actualSymbol, 
    timeframe, 
    theme,
    movingAverages,
    onLatestInfo: setLatestChartInfo, 
    onChartLoading: setIsChartLoading,
    isPanelVisible,
  }), [dataSource, actualSymbol, timeframe, theme, movingAverages, isPanelVisible]);

  return (
    <div className={`flex flex-col h-screen antialiased bg-slate-900 text-slate-100`}>
      <header className="p-3 shadow-md bg-slate-800">
        <div className="flex items-center justify-between gap-x-4 flex-wrap gap-y-2">
          <div className="flex items-center gap-x-4 flex-grow min-w-[400px]">
            <h1 className="text-xl font-bold text-sky-500 whitespace-nowrap">TradeRoad AI</h1>
            <div className="flex-grow">
              <AiQueryPanel 
                prompt={prompt} 
                onPromptChange={setPrompt} 
                onAnalyzeClick={() => handleAnalyze(false)} 
                onAutoAnalyzeClick={() => handleAnalyze(true)} 
                isLoading={isLoading} 
                theme={theme} 
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              onClick={() => setShowIndicators(p => !p)} 
              variant="outline" 
              size="sm" 
              className="bg-sky-800 text-sky-200 border-sky-700 hover:bg-sky-700"
            >
              Indicadores {showIndicators ? '▲' : '▼'}
            </Button>
            <Button 
              onClick={() => setIsPanelVisible(!isPanelVisible)} 
              variant="outline" 
              size="sm" 
              className="bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
            >
              {isPanelVisible ? 'Ocultar Panel' : 'Mostrar Panel'}
            </Button>
          </div>
        </div>
      </header>

      {showIndicators && (
        <div className="absolute top-20 right-4 z-50 p-4 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
            <MovingAverageControls movingAverages={movingAverages} setMovingAverages={setMovingAverages} />
        </div>
      )}

      <main className="flex-grow flex flex-row overflow-hidden">
        {isPanelVisible && (
            <aside className="w-full md:w-1/3 md:max-w-sm lg:max-w-md flex flex-col h-1/2 md:h-full">
              <div className="p-4 overflow-y-auto space-y-4">
                  <ControlsPanel
                      dataSource={dataSource} onDataSourceChange={setDataSource}
                      symbolInput={symbolInput} onSymbolInputChange={setSymbolInput}
                      onSymbolSubmit={() => setActualSymbol(symbolInput.toUpperCase())}
                      timeframe={timeframe} onTimeframeChange={setTimeframe}
                      theme={theme}
                      actualSymbol={actualSymbol} setActualSymbol={setActualSymbol}
                      availableSymbols={availableSymbols}
                  />
                  <AutomatedAnalysisDisplay analysisResult={analysisResult} error={error} isLoading={isLoading} />
              </div>
            </aside>
        )}
        <div className="flex-grow flex flex-col min-h-0">
            <RealTimeTradingChartAdapter {...chartAdapterProps} />
        </div>
      </main>
    </div>
  );
};
export default App;