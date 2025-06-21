import React from 'react';
import { DataSource } from '../types';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AVAILABLE_DATA_SOURCES } from '../constants';

interface ControlsPanelProps {
  dataSource: DataSource;
  onDataSourceChange: (value: DataSource) => void;
  symbolInput: string;
  onSymbolInputChange: (value: string) => void;
  onSymbolSubmit: () => void;
  timeframe: string;
  onTimeframeChange: (value: string) => void;
  theme: 'light' | 'dark';
  availableSymbols?: string[];
  actualSymbol: string;
  setActualSymbol: (value: string) => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  dataSource,
  onDataSourceChange,
  symbolInput,
  onSymbolInputChange,
  onSymbolSubmit,
  timeframe,
  onTimeframeChange,
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
  const placeholderText = dataSource === 'bingx' ? 'e.g., BTC-USDT' : 'e.g., BTCUSDT';

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="data-source-select" className="block text-sm font-medium mb-1">Data Source</label>
        <Select value={dataSource} onValueChange={(value) => onDataSourceChange(value as DataSource)}>
          <SelectTrigger id="data-source-select"><SelectValue placeholder="Select data source" /></SelectTrigger>
          <SelectContent>
            {AVAILABLE_DATA_SOURCES.map(ds => (
              <SelectItem key={ds.value} value={ds.value}>{ds.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="symbol-input" className="block text-sm font-medium mb-1">Symbol</label>
        {symbols.length > 0 ? (
          <Select value={actualSymbol} onValueChange={(value) => setActualSymbol(value)}>
            <SelectTrigger id="symbol-select"><SelectValue placeholder="Select a symbol" /></SelectTrigger>
            <SelectContent>
              {symbols.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="symbol-input" type="text" value={symbolInput}
            onChange={(e) => onSymbolInputChange(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress} placeholder={placeholderText}
            className="w-full uppercase"
          />
        )}
      </div>

      <div>
        <label htmlFor="timeframe-select" className="block text-sm font-medium mb-1">Timeframe</label>
        <Select value={timeframe} onValueChange={onTimeframeChange}>
          <SelectTrigger id="timeframe-select"><SelectValue placeholder="Select timeframe" /></SelectTrigger>
          <SelectContent>
            {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (<SelectItem key={tf} value={tf}>{tf}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ControlsPanel;
// --- FIN: ControlsPanel.tsx ---