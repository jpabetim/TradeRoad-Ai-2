import React from 'react';
import { DataSource } from '../types';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AVAILABLE_DATA_SOURCES } from '../constants';

interface ControlsPanelProps {
  dataSource: DataSource;
  onDataSourceChange: (value: DataSource) => void;
  actualSymbol: string;
  setActualSymbol: (value: string) => void;
  timeframe: string;
  onTimeframeChange: (value: string) => void;
  availableSymbols: string[];
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  dataSource, onDataSourceChange, actualSymbol, setActualSymbol,
  timeframe, onTimeframeChange, availableSymbols
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Data Source</label>
        <Select value={dataSource} onValueChange={(value) => onDataSourceChange(value as DataSource)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {AVAILABLE_DATA_SOURCES.map(ds => (<SelectItem key={ds.value} value={ds.value}>{ds.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="symbol-input" className="block text-sm font-medium mb-1">Symbol</label>
        <div className="relative">
            <Input
              id="symbol-input"
              type="text"
              list="symbol-suggestions"
              value={actualSymbol}
              onChange={(e) => setActualSymbol(e.target.value.toUpperCase())}
              placeholder="Escribe o selecciona un símbolo"
              className="w-full uppercase"
            />
            <datalist id="symbol-suggestions">
              {availableSymbols.map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Timeframe</label>
        <Select value={timeframe} onValueChange={onTimeframeChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (<SelectItem key={tf} value={tf}>{tf}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ControlsPanel;