
import React, { useState, useEffect, useCallback } from 'react';
import ControlsPanel from './components/ControlsPanel';
import RealTimeTradingChart from './components/RealTimeTradingChart';
import AnalysisPanel from './components/AnalysisPanel';
import ApiKeyMessage from './components/ApiKeyMessage';
import { GeminiAnalysisResult, DataSource, MovingAverageConfig } from './types';
import { analyzeChartWithGemini, ExtendedGeminiRequestPayload } from './services/geminiService';
import { DEFAULT_SYMBOL, DEFAULT_TIMEFRAME, DEFAULT_DATA_SOURCE } from './constants';

// Helper for debouncing
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

interface LatestChartInfo {
  price: number | null;
  volume?: number | null;
}

type Theme = 'dark' | 'light';
export type IndicatorName = 'volume';

const initialMAs: MovingAverageConfig[] = [
  { id: 'ma1', type: 'EMA', period: 12, color: '#34D399', visible: true },
  { id: 'ma2', type: 'EMA', period: 20, color: '#F472B6', visible: true },
  { id: 'ma3', type: 'MA', period: 50, color: '#CBD5E1', visible: true },
  { id: 'ma4', type: 'MA', period: 200, color: '#FF0000', visible: true },
];

const INITIAL_DARK_CHART_PANE_BACKGROUND_COLOR = '#18191B';
const INITIAL_LIGHT_CHART_PANE_BACKGROUND_COLOR = '#FFFFFF';
const INITIAL_VOLUME_PANE_HEIGHT = 0;
const INITIAL_W_SIGNAL_COLOR = '#243EA8'; // Blue color for W signals
const INITIAL_W_SIGNAL_OPACITY = 70; // 0-100 scale
const INITIAL_SHOW_W_SIGNALS = true;

// Helper para obtener valor de localStorage o un valor por defecto
const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      try {
        return JSON.parse(storedValue) as T;
      } catch (e) {
        console.error(`Error parsing localStorage item ${key}:`, e);
        return defaultValue;
      }
    }
  }
  return defaultValue;
};

// Helper function to ensure symbol consistency based on data source
const getConsistentSymbolForDataSource = (symbol: string, ds: DataSource): string => {
  let consistentSymbol = symbol.toUpperCase(); // Ensure uppercase base
  if (ds === 'bingx') {
    // Common conversions from Binance to BingX format
    if (consistentSymbol === 'BTCUSDT') return 'BTC-USDT';
    if (consistentSymbol === 'ETHUSDT') return 'ETH-USDT';
    if (consistentSymbol === 'SOLUSDT') return 'SOL-USDT';
    // If it's already in BingX format (contains '-', ends with USDT), it's likely fine
    if (consistentSymbol.includes('-') && consistentSymbol.endsWith('USDT')) return consistentSymbol;
    // Generic attempt for other symbols like ADAUSDT -> ADA-USDT (use with caution, assumes pattern)
    if (!consistentSymbol.includes('-') && consistentSymbol.endsWith('USDT') && consistentSymbol.length > 4) {
      // return consistentSymbol.replace(/USDT$/, '-USDT');
    }
  } else if (ds === 'binance') {
    // Common conversions from BingX to Binance format
    if (consistentSymbol === 'BTC-USDT') return 'BTCUSDT';
    if (consistentSymbol === 'ETH-USDT') return 'ETHUSDT';
    if (consistentSymbol === 'SOL-USDT') return 'SOLUSDT';
    // If it's already in Binance format (no '-', ends with USDT), it's likely fine
    if (!consistentSymbol.includes('-') && consistentSymbol.endsWith('USDT')) return consistentSymbol;
    // Generic attempt for other symbols like ADA-USDT -> ADAUSDT
    if (consistentSymbol.includes('-') && consistentSymbol.endsWith('USDT')) {
      // return consistentSymbol.replace('-', '');
    }
  }
  return consistentSymbol; // Return as is if no specific rule applies or already consistent
};


const App: React.FC = () => {
  // Load initial values from localStorage
  const initialRawSymbol = getLocalStorageItem('traderoad_actualSymbol', DEFAULT_SYMBOL);
  const initialDataSource = getLocalStorageItem('traderoad_dataSource', DEFAULT_DATA_SOURCE);
  
  // Ensure initial symbol is consistent with initial data source
  const consistentInitialSymbol = getConsistentSymbolForDataSource(initialRawSymbol, initialDataSource);

  // Forzar Binance como proveedor de datos predeterminado para solucionar problemas con BingX
  const [dataSource, setDataSource] = useState<DataSource>('binance');
  const [actualSymbol, setActualSymbol] = useState<string>(getConsistentSymbolForDataSource(consistentInitialSymbol, 'binance'));
  const [symbolInput, setSymbolInput] = useState<string>(consistentInitialSymbol);
  const [timeframe, setTimeframe] = useState<string>(() => getLocalStorageItem('traderoad_timeframe', DEFAULT_TIMEFRAME));
  const [theme, setTheme] = useState<Theme>(() => getLocalStorageItem('traderoad_theme', 'dark'));
  const [movingAverages, setMovingAverages] = useState<MovingAverageConfig[]>(() => getLocalStorageItem('traderoad_movingAverages', initialMAs));
  
  const initialBgColorBasedOnTheme = theme === 'dark' ? INITIAL_DARK_CHART_PANE_BACKGROUND_COLOR : INITIAL_LIGHT_CHART_PANE_BACKGROUND_COLOR;
  const [chartPaneBackgroundColor, setChartPaneBackgroundColor] = useState<string>(() =>
    getLocalStorageItem('traderoad_chartPaneBackgroundColor', initialBgColorBasedOnTheme)
  );

  const [volumePaneHeight, setVolumePaneHeight] = useState<number>(() => getLocalStorageItem('traderoad_volumePaneHeight', INITIAL_VOLUME_PANE_HEIGHT));
  const [showAiAnalysisDrawings, setShowAiAnalysisDrawings] = useState<boolean>(() => getLocalStorageItem('traderoad_showAiAnalysisDrawings', true));
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(() => getLocalStorageItem('traderoad_isPanelVisible', true));
  const [wSignalColor, setWSignalColor] = useState<string>(() => getLocalStorageItem('traderoad_wSignalColor', INITIAL_W_SIGNAL_COLOR));
  const [wSignalOpacity, setWSignalOpacity] = useState<number>(() => getLocalStorageItem('traderoad_wSignalOpacity', INITIAL_W_SIGNAL_OPACITY));
  const [showWSignals, setShowWSignals] = useState<boolean>(() => getLocalStorageItem('traderoad_showWSignals', INITIAL_SHOW_W_SIGNALS));


  // API Key state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyPresent, setApiKeyPresent] = useState<boolean>(false);

  // Otros estados
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChartLoading, setIsChartLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latestChartInfo, setLatestChartInfo] = useState<LatestChartInfo>({ price: null, volume: null });
  const [isMobile, setIsMobile] = useState<boolean>(false);


  // Guardar estados en localStorage cuando cambian
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('traderoad_dataSource', JSON.stringify(dataSource));
      localStorage.setItem('traderoad_actualSymbol', JSON.stringify(actualSymbol)); // actualSymbol is now always consistent
      localStorage.setItem('traderoad_timeframe', JSON.stringify(timeframe));
      localStorage.setItem('traderoad_theme', JSON.stringify(theme));
      localStorage.setItem('traderoad_movingAverages', JSON.stringify(movingAverages));
      localStorage.setItem('traderoad_chartPaneBackgroundColor', JSON.stringify(chartPaneBackgroundColor));
      localStorage.setItem('traderoad_volumePaneHeight', JSON.stringify(volumePaneHeight));
      localStorage.setItem('traderoad_showAiAnalysisDrawings', JSON.stringify(showAiAnalysisDrawings));
      localStorage.setItem('traderoad_isPanelVisible', JSON.stringify(isPanelVisible));
      localStorage.setItem('traderoad_wSignalColor', JSON.stringify(wSignalColor));
      localStorage.setItem('traderoad_wSignalOpacity', JSON.stringify(wSignalOpacity));
      localStorage.setItem('traderoad_showWSignals', JSON.stringify(showWSignals));
    }
  }, [
    dataSource, actualSymbol, timeframe, theme, movingAverages,
    chartPaneBackgroundColor, volumePaneHeight, showAiAnalysisDrawings, isPanelVisible,
    wSignalColor, wSignalOpacity, showWSignals
  ]);

  useEffect(() => {
    // Detect mobile on component mount
    setIsMobile(typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent));

    let keyFromEnv: string | undefined = undefined;
    if (typeof window !== 'undefined' && window.process && window.process.env && typeof window.process.env.API_KEY === 'string') {
      keyFromEnv = window.process.env.API_KEY;
    }

    if (keyFromEnv && keyFromEnv !== "TU_CLAVE_API_DE_GEMINI_AQUI") {
      setApiKey(keyFromEnv);
      setApiKeyPresent(true);
    } else {
      setApiKey(null);
      setApiKeyPresent(false);
      console.warn("Gemini API Key (API_KEY) is not set or is the placeholder value. AI analysis will be disabled. Ensure it is set on window.process.env.API_KEY in index.html.");
    }
  }, []);


  const debouncedSetActualSymbol = useCallback(
    debounce((newSymbol: string) => {
      // When user types, ensure the symbol they typed is made consistent for the current data source
      const consistentTypedSymbol = getConsistentSymbolForDataSource(newSymbol.trim(), dataSource);
      setActualSymbol(consistentTypedSymbol);
      // Also update input field if auto-correction changed it
      if (consistentTypedSymbol !== newSymbol.trim()) {
        setSymbolInput(consistentTypedSymbol);
      }
    }, 750),
    [dataSource] // Add dataSource as dependency, so debounced function uses current dataSource
  );

  const handleSymbolInputChange = (newInputValue: string) => {
    setSymbolInput(newInputValue.toUpperCase()); // Keep input in uppercase
    debouncedSetActualSymbol(newInputValue.toUpperCase());
  };

  // Effect to ensure symbolInput is in sync with actualSymbol if actualSymbol changes programmatically
  useEffect(() => {
    if (symbolInput !== actualSymbol) {
        setSymbolInput(actualSymbol);
    }
  }, [actualSymbol]);


  useEffect(() => {
    setAnalysisResult(null);
    setError(null);
  }, [actualSymbol, dataSource]);

  useEffect(() => {
    setLatestChartInfo({ price: null, volume: null });
  }, [actualSymbol, timeframe, dataSource]);


  useEffect(() => {
    const newThemeDefaultBgColor = theme === 'dark' ? INITIAL_DARK_CHART_PANE_BACKGROUND_COLOR : INITIAL_LIGHT_CHART_PANE_BACKGROUND_COLOR;
    const isCurrentBgThemeDefault =
      chartPaneBackgroundColor === INITIAL_DARK_CHART_PANE_BACKGROUND_COLOR ||
      chartPaneBackgroundColor === INITIAL_LIGHT_CHART_PANE_BACKGROUND_COLOR;

    if (isCurrentBgThemeDefault) {
      if (chartPaneBackgroundColor !== newThemeDefaultBgColor) {
        setChartPaneBackgroundColor(newThemeDefaultBgColor);
      }
    }
  }, [theme, chartPaneBackgroundColor]);


  const handleLatestChartInfoUpdate = useCallback((info: LatestChartInfo) => {
    setLatestChartInfo(info);
  }, []);

  const handleChartLoadingStateChange = useCallback((chartLoading: boolean) => {
    setIsChartLoading(chartLoading);
  }, []);

  const handleAnalyze = useCallback(async () => {
    console.log("Attempting analysis. Current state for analysis:");
    console.log("  - apiKey (actual value):", apiKey ? "Exists" : "MISSING or Placeholder");
    console.log("  - isChartLoading:", isChartLoading);
    console.log("  - latestChartInfo:", JSON.stringify(latestChartInfo));
    console.log("  - actualSymbol:", actualSymbol); // This should now be consistent
    console.log("  - timeframe:", timeframe);
    console.log("  - isMobile:", isMobile);


    if (!apiKey) {
      setError("API Key is not configured or is invalid. Analysis cannot proceed. Ensure API_KEY is correctly set in index.html and is not the placeholder value.");
      console.error("Analysis blocked: API Key not available or placeholder.");
      return;
    }
    if (isChartLoading || latestChartInfo.price === null || latestChartInfo.price === 0) {
      setError("Chart data is still loading or current price is unavailable. Please wait and try again.");
      console.error("Analysis blocked: Chart loading or price unavailable.", { isChartLoading, price: latestChartInfo.price });
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Display symbol for Gemini can be formatted nicely (e.g., with '/')
      // The `actualSymbol` is already in the correct format for the API (e.g. BTCUSDT or BTC-USDT)
      const displaySymbolForAI = actualSymbol.includes('-')
        ? actualSymbol.replace('-', '/') // For BingX symbols like BTC-USDT -> BTC/USDT
        : (actualSymbol.endsWith('USDT') ? actualSymbol.replace(/USDT$/, '/USDT') : actualSymbol); // For Binance symbols

      const currentPrice = latestChartInfo.price;
      const analysisTimeframe = timeframe;

      const payload: ExtendedGeminiRequestPayload = {
        symbol: displaySymbolForAI, // Use the display-friendly version for the AI prompt
        timeframe: analysisTimeframe.toUpperCase(),
        currentPrice,
        marketContextPrompt: "Context will be generated by getFullAnalysisPrompt",
        latestVolume: latestChartInfo.volume,
        apiKey: apiKey
      };

      console.log("Payload for Gemini API (excluding API key and context details):", JSON.stringify({...payload, apiKey: "REDACTED", marketContextPrompt: isMobile ? "Mobile Context" : "Desktop Context"}));

      const result = await analyzeChartWithGemini(payload);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Full analysis error in App.tsx:", err);
      let userErrorMessage = "An unknown error occurred during analysis.";
      if (err instanceof Error) {
        userErrorMessage = err.message;
      }
      setError(`${userErrorMessage} --- If using a mobile device, please open your browser's developer console, attempt the analysis again, and report any errors shown there.`);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, actualSymbol, timeframe, latestChartInfo, isChartLoading, isMobile]);

  const handleDataSourceChange = (newDataSource: DataSource) => {
    setDataSource(newDataSource); // Set the new data source
    // Ensure the current symbol (from symbolInput or actualSymbol) is made consistent
    // for the new data source, and update both actualSymbol and symbolInput.
    const symbolToConvert = symbolInput || actualSymbol; // Prefer input if user was typing
    const consistentNewSymbol = getConsistentSymbolForDataSource(symbolToConvert, newDataSource);
    
    setActualSymbol(consistentNewSymbol); // Update symbol for the chart immediately
    setSymbolInput(consistentNewSymbol);  // Update the input field to match
  };

  return (
    <div className={`flex flex-col h-screen antialiased ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-100 text-gray-900'}`}>
      <header className={`p-2 sm:p-3 shadow-md flex justify-between items-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border-b border-gray-200'}`}>
        <h1 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>TradeRoad</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsPanelVisible(!isPanelVisible)}
            aria-label={isPanelVisible ? 'Hide controls and analysis panel' : 'Show controls and analysis panel'}
            aria-expanded={isPanelVisible}
            aria-controls="controls-analysis-panel"
            className={`p-1 sm:p-2 rounded text-xs transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
          >
            {isPanelVisible ? 'Hide Panel' : 'Show Panel'}
          </button>
          <button
            onClick={() => {
              const newTheme = theme === 'light' ? 'dark' : 'light';
              setTheme(newTheme);
            }}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            className={`p-1 sm:p-2 rounded text-xs transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'} Mode
          </button>
        </div>
      </header>

      <ApiKeyMessage apiKeyPresent={apiKeyPresent} />

      <main className="flex-grow flex flex-col md:flex-row p-2 sm:p-4 gap-2 sm:gap-4 overflow-y-auto">

        <div className={`w-full flex-1 flex flex-col gap-2 sm:gap-4 overflow-hidden order-1 ${isPanelVisible ? 'md:order-2' : 'md:order-1'}`}>
          <div className={`flex-grow min-h-[300px] sm:min-h-[400px] md:min-h-0 shadow-lg rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <RealTimeTradingChart
              dataSource={dataSource}
              symbol={actualSymbol} // This is now consistently formatted
              timeframe={timeframe}
              analysisResult={analysisResult}
              onLatestChartInfoUpdate={handleLatestChartInfoUpdate}
              onChartLoadingStateChange={handleChartLoadingStateChange}
              movingAverages={movingAverages}
              theme={theme}
              chartPaneBackgroundColor={chartPaneBackgroundColor}
              volumePaneHeight={volumePaneHeight}
              showAiAnalysisDrawings={showAiAnalysisDrawings}
              wSignalColor={wSignalColor}
              wSignalOpacity={wSignalOpacity / 100} // Pass opacity as 0-1 for chart
              showWSignals={showWSignals}
            />
          </div>
        </div>

        <div
          id="controls-analysis-panel"
          className={`w-full md:w-80 lg:w-[360px] xl:w-[400px] flex-none flex flex-col gap-2 sm:gap-4 overflow-y-auto order-2 md:order-1 ${!isPanelVisible ? 'hidden' : ''}`}
        >

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} p-1 rounded-lg shadow-md flex-shrink-0 order-1 md:order-none`}>
            <ControlsPanel
              symbolInput={symbolInput} // Display this in input
              setSymbolInput={handleSymbolInputChange} // User typing handler
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              dataSource={dataSource}
              setDataSource={handleDataSourceChange} // Source change handler
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              apiKeyPresent={apiKeyPresent}
              isChartLoading={isChartLoading}
              chartPaneBackgroundColor={chartPaneBackgroundColor}
              setChartPaneBackgroundColor={setChartPaneBackgroundColor}
              volumePaneHeight={volumePaneHeight}
              setVolumePaneHeight={setVolumePaneHeight}
              showAiAnalysisDrawings={showAiAnalysisDrawings}
              setShowAiAnalysisDrawings={setShowAiAnalysisDrawings}
              movingAverages={movingAverages}
              setMovingAverages={setMovingAverages}
              wSignalColor={wSignalColor}
              setWSignalColor={setWSignalColor}
              wSignalOpacity={wSignalOpacity}
              setWSignalOpacity={setWSignalOpacity}
              showWSignals={showWSignals}
              setShowWSignals={setShowWSignals}
            />
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-md order-2 md:order-none`}>
            <AnalysisPanel
              analysisResult={analysisResult}
              isLoading={isLoading && !analysisResult && !error}
              error={error}
              isMobile={isMobile}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
