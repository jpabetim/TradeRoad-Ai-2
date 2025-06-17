

import React, { useState, useEffect } from 'react';
import { QUICK_SELECT_TIMEFRAMES, AVAILABLE_DATA_SOURCES, AVAILABLE_MARKET_TYPES, AVAILABLE_SYMBOLS_BINANCE, AVAILABLE_SYMBOLS_BINGX } from '../constants';
import { DataSource, MovingAverageConfig, MarketType } from '../types'; 
import MovingAverageControls from './MovingAverageControls';

interface ControlsPanelProps {
  symbolInput: string;
  setSymbolInput: (symbol: string) => void;
  timeframe: string;
  setTimeframe: (timeframe: string) => void;
  dataSource: DataSource;
  setDataSource: (dataSource: DataSource) => void;
  marketType: MarketType;
  setMarketType: (marketType: MarketType) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  apiKeyPresent: boolean;
  isChartLoading: boolean;
  chartPaneBackgroundColor: string;
  setChartPaneBackgroundColor: (color: string) => void;
  volumePaneHeight: number;
  setVolumePaneHeight: (height: number) => void;
  showAiAnalysisDrawings: boolean;
  setShowAiAnalysisDrawings: (show: boolean) => void;
  movingAverages: MovingAverageConfig[];
  setMovingAverages: (configs: MovingAverageConfig[]) => void;
  wSignalColor: string;
  setWSignalColor: (color: string) => void;
  wSignalOpacity: number; // 0-100
  setWSignalOpacity: (opacity: number) => void;
  showWSignals: boolean;
  setShowWSignals: (show: boolean) => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  symbolInput,
  setSymbolInput,
  timeframe,
  setTimeframe,
  dataSource,
  setDataSource,
  marketType,
  setMarketType,
  onAnalyze,
  isLoading,
  apiKeyPresent,
  isChartLoading,
  chartPaneBackgroundColor,
  setChartPaneBackgroundColor,
  volumePaneHeight,
  setVolumePaneHeight,
  showAiAnalysisDrawings,
  setShowAiAnalysisDrawings,
  movingAverages,
  setMovingAverages,
  wSignalColor,
  setWSignalColor,
  wSignalOpacity,
  setWSignalOpacity,
  showWSignals,
  setShowWSignals,
}) => {
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSymbolInput(e.target.value.toUpperCase());
  };

  const getSymbolPlaceholder = () => {
    switch (marketType) {
      case 'crypto':
        return dataSource === 'bingx' ? 'E.g., BTC-USDT, ETH-USDT' : 'E.g., BTCUSDT, ETHUSDT';
      case 'forex':
        return 'E.g., EUR/USD, GBP/JPY';
      case 'indices':
        return 'E.g., SPX, DJIA';
      case 'commodities':
        return 'E.g., XAUUSD (Gold), CL (Oil)';
      case 'stocks':
        return 'E.g., AAPL, MSFT';
      default:
        return 'Enter symbol';
    }
  };

  const getSymbolSuggestions = () => {
    // En una versión futura, esto podría obtener sugerencias específicas según el proveedor y tipo de mercado
    if (dataSource === 'bingx' && marketType === 'crypto') return AVAILABLE_SYMBOLS_BINGX;
    if (dataSource === 'binance' && marketType === 'crypto') return AVAILABLE_SYMBOLS_BINANCE;
    return [];
  };
  
  // Filtra las fuentes de datos según el tipo de mercado seleccionado
  const getAvailableDataSources = () => {
    return AVAILABLE_DATA_SOURCES.filter(ds => ds.marketTypes.includes(marketType));
  };

  const symbolDatalistId = "symbol-suggestions";

  return (
    <div className="p-3 sm:p-4 bg-slate-800 rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-sky-400">Market Controls</h2>

      <div className="mb-3 sm:mb-4">
        <label htmlFor="marketType" className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-slate-300">Tipo de Mercado</label>
        <select
          id="marketType"
          value={marketType}
          onChange={(e) => {
            const newMarketType = e.target.value as MarketType;
            setMarketType(newMarketType);
            
            // Verifica si el proveedor actual es compatible con el nuevo tipo de mercado
            const isCurrentDataSourceCompatible = AVAILABLE_DATA_SOURCES.find(
              ds => ds.value === dataSource
            )?.marketTypes.includes(newMarketType);
            
            // Si no es compatible, cambia al primer proveedor compatible
            if (!isCurrentDataSourceCompatible) {
              const compatibleDataSource = AVAILABLE_DATA_SOURCES.find(
                ds => ds.marketTypes.includes(newMarketType)
              );
              if (compatibleDataSource) {
                setDataSource(compatibleDataSource.value as DataSource);
              }
            }
          }}
          className="bg-slate-700 border border-slate-600 text-slate-100 text-xs sm:text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2 sm:p-2.5"
        >
          {AVAILABLE_MARKET_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
        </select>
      </div>
      
      <div className="mb-3 sm:mb-4">
        <label htmlFor="dataSource" className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-slate-300">Fuente de Datos</label>
        <select
          id="dataSource"
          value={dataSource}
          onChange={(e) => setDataSource(e.target.value as DataSource)}
          className="bg-slate-700 border border-slate-600 text-slate-100 text-xs sm:text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2 sm:p-2.5"
        >
          {getAvailableDataSources().map(ds => <option key={ds.value} value={ds.value}>{ds.label}</option>)}
        </select>
      </div>

      <div className="mb-3 sm:mb-4">
        <label htmlFor="symbol-input" className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-slate-300">Trading Pair / Symbol</label>
         <input
          type="text"
          id="symbol-input"
          value={symbolInput}
          onChange={handleSymbolChange}
          placeholder={getSymbolPlaceholder()}
          className="bg-slate-700 border border-slate-600 text-slate-100 text-xs sm:text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2 sm:p-2.5"
          list={symbolDatalistId} // Added list attribute
        />
        <datalist id={symbolDatalistId}>
          {getSymbolSuggestions().map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <div className="mb-3 sm:mb-4">
        <label htmlFor="timeframe" className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-slate-300">Timeframe</label>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-1">
          {QUICK_SELECT_TIMEFRAMES.map(tf => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`py-1 px-1 text-xs font-medium rounded-md transition-colors ${
                timeframe === tf
                  ? 'bg-sky-500 text-white hover:bg-sky-600 ring-2 ring-sky-300 font-bold shadow-md'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4">
        <button
          onClick={() => setShowAiAnalysisDrawings(!showAiAnalysisDrawings)}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-1 px-2 rounded-lg focus:outline-none focus:shadow-outline transition-colors text-xs"
          aria-label="Toggle AI Analysis Drawings on Chart"
        >
          {showAiAnalysisDrawings ? 'Hide AI Drawings' : 'Show AI Drawings'}
        </button>
        <button
          onClick={onAnalyze}
          disabled={isLoading || isChartLoading || !apiKeyPresent}
          className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-1 px-2 rounded-lg focus:outline-none focus:shadow-outline transition-colors text-xs"
          aria-label="Analyze Chart with AI"
        >
          {isLoading ? 'Analyzing...' : (isChartLoading ? 'Chart Loading...' : 'Analyze (AI)')}
        </button>
      </div>
      {!apiKeyPresent && <p className="text-xs text-yellow-400 mt-1.5 sm:mt-2 text-center">AI analysis disabled: API Key not configured.</p>}
      

      {/* Display Settings Section */}
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-700">
        <h3 
          className="text-sm sm:text-md font-semibold mb-2 text-sky-300 cursor-pointer flex justify-between items-center"
          onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)}
          aria-expanded={isDisplaySettingsOpen}
          aria-controls="display-settings-content"
        >
          Display Settings
          <span className="text-xs">{isDisplaySettingsOpen ? '▲ Hide' : '▼ Show'}</span>
        </h3>
        
        {isDisplaySettingsOpen && (
          <div id="display-settings-content" className="space-y-2 sm:space-y-3 pt-1.5 sm:pt-2">
            <MovingAverageControls
                movingAverages={movingAverages}
                setMovingAverages={setMovingAverages}
            />
            
            <div className="mb-2 sm:mb-3">
                <label htmlFor="chart-bg-color-picker" className="block mb-1 text-xs sm:text-sm font-medium text-slate-300">Chart Background Color</label>
                <input
                  type="color"
                  id="chart-bg-color-picker"
                  value={chartPaneBackgroundColor}
                  onChange={(e) => setChartPaneBackgroundColor(e.target.value)}
                  className="w-full h-7 sm:h-8 p-0 border-none rounded cursor-pointer bg-slate-700"
                />
            </div>

            <div className="mb-2 sm:mb-3">
                <label htmlFor="volume-pane-height" className="block mb-1 text-xs sm:text-sm font-medium text-slate-300">Volume Pane Height: {volumePaneHeight}px</label>
                <input
                    type="range"
                    id="volume-pane-height"
                    min="50" max="300" step="10"
                    value={volumePaneHeight}
                    onChange={(e) => setVolumePaneHeight(Number(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
            </div>

            <div className="pt-2 mt-2 border-t border-slate-700">
              <h4 className="text-xs sm:text-sm font-semibold text-sky-300 mb-1.5">W-Signal Appearance</h4>
              <div className="flex items-center mb-2 sm:mb-3">
                <input
                  type="checkbox"
                  id="show-w-signals-checkbox"
                  checked={showWSignals}
                  onChange={(e) => setShowWSignals(e.target.checked)}
                  className="w-3.5 h-3.5 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500 focus:ring-offset-slate-800 mr-2"
                />
                <label htmlFor="show-w-signals-checkbox" className="text-xs sm:text-sm font-medium text-slate-300">Show W-Signals</label>
              </div>
              <div className="mb-2 sm:mb-3">
                  <label htmlFor="w-signal-color-picker" className="block mb-1 text-xs sm:text-sm font-medium text-slate-300">W-Signal Marker Color</label>
                  <input
                      type="color"
                      id="w-signal-color-picker"
                      value={wSignalColor}
                      onChange={(e) => setWSignalColor(e.target.value)}
                      className="w-full h-7 sm:h-8 p-0 border-none rounded cursor-pointer bg-slate-700"
                  />
              </div>
              <div className="mb-2 sm:mb-3">
                  <label htmlFor="w-signal-opacity-slider" className="block mb-1 text-xs sm:text-sm font-medium text-slate-300">W-Signal Marker Opacity: {wSignalOpacity}%</label>
                  <input
                      type="range"
                      id="w-signal-opacity-slider"
                      min="0" max="100" step="1"
                      value={wSignalOpacity}
                      onChange={(e) => setWSignalOpacity(Number(e.target.value))}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ControlsPanel;
