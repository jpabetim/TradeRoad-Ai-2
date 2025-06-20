import React from 'react';
import { DataSource, MovingAverageConfig, MarketType } from '../types';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AVAILABLE_DATA_SOURCES } from '../constants';

interface ControlsPanelProps {
  marketType?: MarketType;
  onMarketTypeChange?: (value: MarketType) => void;
  dataSource: DataSource;
  onDataSourceChange: (value: DataSource) => void;
  symbolInput: string;
  onSymbolInputChange: (value: string) => void;
  onSymbolSubmit: () => void;
  timeframe: string;
  onTimeframeChange: (value: string) => void;
  theme: 'light' | 'dark';
  onThemeChange: (value: 'light' | 'dark') => void;
  movingAverages?: MovingAverageConfig[];
  onMovingAveragesChange?: (value: MovingAverageConfig[]) => void;
  availableSymbols?: string[];
  actualSymbol: string;
  setActualSymbol: (value: string) => void;
  chartPaneBackgroundColor?: string;
  onChartPaneBackgroundColorChange?: (value: string) => void;
  volumePaneHeight?: number;
  onVolumePaneHeightChange?: (value: number) => void;
  showAiAnalysisDrawings?: boolean;
  onShowAiAnalysisDrawingsChange?: (value: boolean) => void;
  onResetSettings?: () => void;
  isPanelVisible?: boolean;
  setIsPanelVisible?: (value: boolean) => void;
  wSignalColor?: string;
  setWSignalColor?: (value: string) => void;
  wSignalOpacity?: number;
  setWSignalOpacity?: (value: number) => void;
  showWSignals?: boolean;
  setShowWSignals?: (value: boolean) => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  dataSource,
  onDataSourceChange,
  symbolInput,
  onSymbolInputChange,
  onSymbolSubmit,
  timeframe,
  onTimeframeChange,
  theme,
  onThemeChange,
  availableSymbols,
  actualSymbol,
  setActualSymbol,
}) => {

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSymbolSubmit();
    }
  };

  const symbols = availableSymbols || [];
  console.log('Valor de miArray:', symbols); // Línea añadida para depurar
  // Siempre mostramos el panel, sin importar si hay símbolos disponibles o no
    return (
      <div className="space-y-4">
        {/* Selección de Fuente de Datos */}
        <div>
          <label htmlFor="data-source-select" className="block text-sm font-medium mb-1">Data Source</label>
          <Select value={dataSource} onValueChange={(value) => onDataSourceChange(value as DataSource)}>
            <SelectTrigger id="data-source-select">
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_DATA_SOURCES.map(ds => (
                <SelectItem key={ds.value} value={ds.value}>{ds.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selección de Símbolo (Dinámico) */}
        <div>
          <label htmlFor="symbol-input" className="block text-sm font-medium mb-1">Symbol</label>
          {symbols.length > 0 ? (
            <Select
              value={actualSymbol}
              onValueChange={(value) => setActualSymbol(value)}
            >
              <SelectTrigger id="symbol-select">
                <SelectValue placeholder="Select a symbol" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="symbol-input"
              type="text"
              value={symbolInput}
              onChange={(e) => onSymbolInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., BTCUSDT"
              className="w-full"
            />
          )}
        </div>

        {/* Selección de Timeframe */}
        <div>
          <label htmlFor="timeframe-select" className="block text-sm font-medium mb-1">Timeframe</label>
          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger id="timeframe-select">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
                <SelectItem key={tf} value={tf}>{tf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botón para cambiar tema */}
        <div>
          <Button onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')} className="w-full">
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </Button>
        </div>

        {/* Aquí irían más controles para las medias móviles, etc. */}
      </div>
    );
  return (
    <div className="space-y-4">
      {/* Selección de Fuente de Datos */}
      <div>
        <label htmlFor="data-source-select" className="block text-sm font-medium mb-1">Data Source</label>
        <Select value={dataSource} onValueChange={(value) => onDataSourceChange(value as DataSource)}>
          <SelectTrigger id="data-source-select">
            <SelectValue placeholder="Select data source" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_DATA_SOURCES.map(ds => (
              <SelectItem key={ds.value} value={ds.value}>{ds.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selección de Símbolo (Dinámico) */}
      <div>
        <label htmlFor="symbol-input" className="block text-sm font-medium mb-1">Symbol</label>
        {symbols.length > 0 ? (
          <Select
            value={actualSymbol}
            onValueChange={(value) => setActualSymbol(value)}
          >
            <SelectTrigger id="symbol-select">
              <SelectValue placeholder="Select a symbol" />
            </SelectTrigger>
            <SelectContent>
              {symbols.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="symbol-input"
            type="text"
            value={symbolInput}
            onChange={(e) => onSymbolInputChange(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="e.g., BTCUSDT"
            className="w-full uppercase"
          />
        )}
      </div>

      {/* Selección de Timeframe */}
      <div>
        <label htmlFor="timeframe-select" className="block text-sm font-medium mb-1">Timeframe</label>
        <Select value={timeframe} onValueChange={onTimeframeChange}>
          <SelectTrigger id="timeframe-select">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
              <SelectItem key={tf} value={tf}>{tf}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Botón para cambiar tema */}
      <div>
        <Button onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')} className="w-full">
          Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
        </Button>
      </div>

      {/* Aquí irían más controles para las medias móviles, etc. */}
    </div>
  );
};

export default ControlsPanel;
