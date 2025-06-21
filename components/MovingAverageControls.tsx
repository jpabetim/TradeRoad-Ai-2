import React from 'react';
import { MovingAverageConfig } from '../types';

interface MovingAverageControlsProps {
  movingAverages: MovingAverageConfig[];
  setMovingAverages: (configs: MovingAverageConfig[]) => void;
}

const MovingAverageControls: React.FC<MovingAverageControlsProps> = ({ movingAverages, setMovingAverages }) => {
  const handleMAChange = (index: number, field: keyof MovingAverageConfig, value: any) => {
    const updatedMAs = movingAverages.map((ma, i) => {
      if (i === index) {
        if (field === 'period') return { ...ma, [field]: parseInt(value, 10) || 1 };
        if (field === 'visible') return { ...ma, [field]: !!value };
        return { ...ma, [field]: value };
      }
      return ma;
    });
    setMovingAverages(updatedMAs);
  };

  const addMA = () => {
    setMovingAverages([
      ...movingAverages,
      { id: `ma${Date.now()}`, type: 'EMA', period: 50, color: '#facc15', visible: true }
    ]);
  };

  const removeMA = (id: string) => {
    setMovingAverages(movingAverages.filter(ma => ma.id !== id));
  };

  return (
    <div className="space-y-3">
      <h3 className="text-md font-semibold text-sky-400">Indicadores</h3>
      {movingAverages.map((ma, index) => (
        <div key={ma.id} className="flex items-center gap-x-2 p-2 bg-slate-700/50 rounded">
          <input
            type="checkbox"
            checked={ma.visible}
            onChange={(e) => handleMAChange(index, 'visible', e.target.checked)}
            className="w-4 h-4 text-sky-600 bg-slate-600 border-slate-500 rounded focus:ring-sky-500"
          />
          <select
            value={ma.type}
            onChange={(e) => handleMAChange(index, 'type', e.target.value as 'MA' | 'EMA')}
            className="bg-slate-600 border-slate-500 text-slate-100 text-xs rounded px-2 py-1"
          >
            <option value="MA">MA</option>
            <option value="EMA">EMA</option>
          </select>
          <input
            type="number"
            value={ma.period}
            min="1"
            onChange={(e) => handleMAChange(index, 'period', e.target.value)}
            className="bg-slate-600 border-slate-500 text-slate-100 text-xs rounded px-1 py-1 w-14 text-center"
          />
          <input
            type="color"
            value={ma.color}
            onChange={(e) => handleMAChange(index, 'color', e.target.value)}
            className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
          />
          <button onClick={() => removeMA(ma.id)} className="text-red-400 hover:text-red-300 ml-auto">
            &times;
          </button>
        </div>
      ))}
      <button onClick={addMA} className="w-full text-xs py-1.5 bg-sky-700 hover:bg-sky-600 rounded">
        Añadir Media Móvil
      </button>
    </div>
  );
};

export default MovingAverageControls;