// App.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DataSource, MarketType, MovingAverageConfig, AnalysisPoint, GeminiAnalysisResult } from './types';
import ControlsPanel from './components/ControlsPanel';
import RealTimeTradingChartAdapter from './components/RealTimeTradingChartAdapter';
import AiQueryPanel from './components/AiQueryPanel';
import AutomatedAnalysisDisplay from './components/AutomatedAnalysisDisplay';
import ApiKeyMessage from './components/ApiKeyMessage';
import {
  DEFAULT_SYMBOLS,
  DEFAULT_DATA_SOURCE,
  DEFAULT_MARKET_TYPE,
  DEFAULT_TIMEFRAME,
  AVAILABLE_DATA_SOURCES,
  getAutoAnalysisPrompt,
} from './constants';
import { Button } from './components/ui/button'; // Asegúrate de que la ruta es correcta

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

interface LatestChartInfo { price: number | null; volume?: number | null; }
type Theme = 'dark' | 'light';

const initialMAs: MovingAverageConfig[] = [
  { id: 'ma1', type: 'EMA', period: 12, color: '#34D399', visible: true },
  { id: 'ma2', type: 'EMA', period: 20, color: '#F472B6', visible: true },
];

const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const storedValue = localStorage.getItem(key);
  try {
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (e) { return defaultValue; }
};

const App: React.FC = () => {
  const [marketType, setMarketType] = useState<MarketType>(() => getLocalStorageItem('traderoad_marketType', DEFAULT_MARKET_TYPE));
  const getDefaultDataSourceForMarketType = (mType: MarketType): DataSource => (mType === 'crypto' ? 'binance' : 'fmp');
  const [dataSource, setDataSource] = useState<DataSource>(() => getDefaultDataSourceForMarketType(marketType));
  const getDefaultSymbolForMarketType = (mType: MarketType) => DEFAULT_SYMBOLS[mType] || DEFAULT_SYMBOLS.crypto;
  const [actualSymbol, setActualSymbol] = useState<string>(() => getLocalStorageItem('traderoad_actualSymbol', getDefaultSymbolForMarketType(marketType)));
  const [symbolInput, setSymbolInput] = useState<string>(actualSymbol);
  const [timeframe, setTimeframe] = useState<string>(() => getLocalStorageItem('traderoad_timeframe', DEFAULT_TIMEFRAME));
  const [theme, setTheme] = useState<Theme>(() => getLocalStorageItem('traderoad_theme', 'dark'));
  const [movingAverages, setMovingAverages] = useState<MovingAverageConfig[]>(() => getLocalStorageItem('traderoad_movingAverages', initialMAs));
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(() => getLocalStorageItem('traderoad_isPanelVisible', true));

  const [apiKeyPresent, setApiKeyPresent] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChartLoading, setIsChartLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latestChartInfo, setLatestChartInfo] = useState<LatestChartInfo>({ price: null, volume: null });
  const [prompt, setPrompt] = useState<string>('');
  const [analysisDrawings, setAnalysisDrawings] = useState<AnalysisPoint[]>([]);
  const [priceProjectionPath, setPriceProjectionPath] = useState<number[]>([]);
  const [showAiAnalysisDrawings, setShowAiAnalysisDrawings] = useState<boolean>(true);
  const [showIndicators, setShowIndicators] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window.CONFIG?.API_KEY === 'string' && !window.CONFIG.API_KEY.includes('NO_')) {
      setApiKeyPresent(true);
    }
  }, []);

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
      const finalPrompt = isAuto ? getAutoAnalysisPrompt(actualSymbol, timeframe, latestChartInfo.price, '') : userPrompt;
      const payload = { symbol: actualSymbol, timeframe, currentPrice: latestChartInfo.price, prompt: finalPrompt, latestVolume: latestChartInfo.volume };

      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Error en el servidor de análisis');

      const result: GeminiAnalysisResult = await response.json();
      setAnalysisResult(result);
      if (result.puntos_clave_grafico) setAnalysisDrawings(result.puntos_clave_grafico);
      if (result.proyeccion_precio_visual?.path) setPriceProjectionPath(result.proyeccion_precio_visual.path);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [actualSymbol, timeframe, isChartLoading, latestChartInfo, prompt]);

  useEffect(() => {
    if (actualSymbol && timeframe && !isChartLoading) {
      handleAnalyze(true);
    }
  }, [actualSymbol, timeframe, isChartLoading]);

  const handleMarketTypeChange = (newMarketType: MarketType) => {
    setMarketType(newMarketType);
    const newDataSource = getDefaultDataSourceForMarketType(newMarketType);
    const newSymbol = getDefaultSymbolForMarketType(newMarketType);
    setDataSource(newDataSource);
    setActualSymbol(newSymbol);
    setSymbolInput(newSymbol);
  };

  const toggleAiAnalysisDrawings = useCallback(() => {
    setShowAiAnalysisDrawings(prev => !prev);
  }, []);

  const toggleIndicators = useCallback(() => {
    setShowIndicators(prev => !prev);
  }, []);

  const chartAdapterProps = useMemo(() => ({
    dataSource, 
    symbol: actualSymbol, 
    timeframe, 
    theme, 
    movingAverages,
    onLatestInfo: setLatestChartInfo, 
    onChartLoading: setIsChartLoading,
    showAiAnalysisDrawings,
    analysisDrawings, 
    priceProjectionPath,
    chartPaneBackgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    volumePaneHeight: 0.2,
    showWSignals: false,
    wSignalColor: 'rgba(255, 235, 59, 1)',
    wSignalOpacity: 0.7,
    onAnalyzeClick: () => handleAnalyze(false),
    onAutoAnalyzeClick: () => handleAnalyze(true),
    showIndicators
  }), [dataSource, actualSymbol, timeframe, theme, movingAverages, analysisDrawings, priceProjectionPath, handleAnalyze, showAiAnalysisDrawings, showIndicators]);

  return (
    <div className={`flex flex-col h-screen antialiased ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-100 text-gray-900'}`}>
      <header className={`p-2 sm:p-3 shadow-md flex flex-wrap items-center gap-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
        <h1 className="text-lg sm:text-xl font-bold text-sky-500 whitespace-nowrap">TradeRoad AI</h1>
        <div className="flex-grow min-w-[300px]">
          <AiQueryPanel
            prompt={prompt}
            onPromptChange={setPrompt}
            onAnalyzeClick={() => handleAnalyze(false)}
            onAutoAnalyzeClick={() => handleAnalyze(true)}
            isLoading={isLoading}
            theme={theme}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={toggleAiAnalysisDrawings}
            variant="outline"
            size="sm"
            className={`${showAiAnalysisDrawings ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            {showAiAnalysisDrawings ? 'Ocultar Dibujos' : 'Mostrar Dibujos'}
          </Button>
          <Button 
            onClick={toggleIndicators}
            variant="outline"
            size="sm"
            className={`${showIndicators ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-500' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            Indicadores {showIndicators ? '▲' : '▼'}
          </Button>
          <Button 
            onClick={() => setIsPanelVisible(!isPanelVisible)} 
            variant="outline" 
            size="sm"
            className={`${theme === 'dark' ? 'text-white hover:text-white bg-slate-700 hover:bg-slate-600' : 'text-slate-800 hover:text-slate-900 bg-white hover:bg-slate-200'}`}
          >
            {isPanelVisible ? 'Ocultar Panel' : 'Mostrar Panel'}
          </Button>
          <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} variant="outline" size="sm">
            {theme === 'light' ? '🌙' : '☀️'}
          </Button>
        </div>
      </header>

      {!apiKeyPresent && <ApiKeyMessage />}

      <main className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {isPanelVisible && (
          <aside className="w-full md:w-1/3 md:max-w-sm lg:max-w-md flex flex-col h-1/2 md:h-full">
            <div className="p-4 overflow-y-auto space-y-4">
              <ControlsPanel
                marketType={marketType}
                onMarketTypeChange={handleMarketTypeChange}
                dataSource={dataSource}
                onDataSourceChange={setDataSource}
                symbolInput={symbolInput}
                onSymbolInputChange={setSymbolInput}
                onSymbolSubmit={() => setActualSymbol(symbolInput.toUpperCase())}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                theme={theme}
                onThemeChange={setTheme}
                actualSymbol={actualSymbol}
                setActualSymbol={setActualSymbol}
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