import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DataSource, MovingAverageConfig, GeminiAnalysisResult } from './types';
import ControlsPanel from './components/ControlsPanel';
import RealTimeTradingChart from './components/RealTimeTradingChart';
import AiQueryPanel from './components/AiQueryPanel';
import MovingAverageControls from './components/MovingAverageControls';
import AutomatedAnalysisDisplay from './components/AutomatedAnalysisDisplay';
import { AVAILABLE_DATA_SOURCES, getAutoAnalysisPrompt, DEFAULT_SYMBOLS, DEFAULT_TIMEFRAME, DEFAULT_DATA_SOURCE } from './constants';
import { Button } from './components/ui/button';

const App: React.FC = () => {
  const [dataSource, setDataSource] = useState<DataSource>(DEFAULT_DATA_SOURCE);
  const [actualSymbol, setActualSymbol] = useState<string>(DEFAULT_SYMBOLS.crypto);
  const [timeframe, setTimeframe] = useState<string>(DEFAULT_TIMEFRAME);
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(true);
  const [movingAverages, setMovingAverages] = useState<MovingAverageConfig[]>([
    { id: 'ma1', type: 'EMA', period: 12, color: '#34D399', visible: true },
    { id: 'ma2', type: 'EMA', period: 20, color: '#F472B6', visible: true },
    { id: 'ma3', type: 'EMA', period: 200, color: '#FFFFFF', visible: true },
  ]);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [showIndicators, setShowIndicators] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestChartInfo, setLatestChartInfo] = useState({ price: null, volume: null });

  useEffect(() => {
    fetch(`/api/symbols?exchange=${dataSource}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableSymbols(data);
          if (!data.includes(actualSymbol)) {
            setActualSymbol(data[0] || '');
          }
        }
      })
      .catch(err => console.error("Error al cargar símbolos:", err));
  }, [dataSource]);

  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
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
  }, [actualSymbol, timeframe, prompt, isChartLoading, latestChartInfo]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
      <header className="p-3 shadow-md bg-slate-800">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-x-4 flex-grow min-w-[400px]">
            <h1 className="text-xl font-bold text-sky-500 whitespace-nowrap">TradeRoad AI</h1>
            <div className="flex-grow">
              <AiQueryPanel prompt={prompt} onPromptChange={setPrompt} onAnalyzeClick={() => handleAnalyze(false)} onAutoAnalyzeClick={() => handleAnalyze(true)} isLoading={isLoading} theme="dark" />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={() => setShowIndicators(p => !p)} variant="outline" size="sm" className="bg-sky-800 text-sky-200 border-sky-700 hover:bg-sky-700">
              Indicadores {showIndicators ? '▲' : '▼'}
            </Button>
            <Button onClick={() => setIsPanelVisible(p => !p)} variant="outline" size="sm" className="bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600">
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
          <aside className="w-full md:w-1/3 md:max-w-sm lg:max-w-md p-4 overflow-y-auto">
            <ControlsPanel
              dataSource={dataSource}
              onDataSourceChange={setDataSource}
              actualSymbol={actualSymbol}
              setActualSymbol={setActualSymbol}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              availableSymbols={availableSymbols}
            />
            <AutomatedAnalysisDisplay analysisResult={analysisResult} error={error} isLoading={isLoading} />
          </aside>
        )}
        <div className="flex-grow">
          <RealTimeTradingChart
            dataSource={dataSource}
            symbol={actualSymbol}
            timeframe={timeframe}
            movingAverages={movingAverages}
            onChartLoading={setIsChartLoading}
            onLatestInfo={setLatestChartInfo}
          />
        </div>
      </main>
    </div>
  );
};
export default App;