import React, { useState } from 'react';

interface ChartControlsProps {
  onAnalyzeClick: () => void;
  onAutoAnalyzeClick?: () => void; // Nueva propiedad para análisis automático
  showAiAnalysisDrawings: boolean;
  toggleAiAnalysisDrawings: () => void;
  isLoading: boolean;
}

const ChartControls: React.FC<ChartControlsProps> = ({ 
  onAnalyzeClick, 
  onAutoAnalyzeClick,
  showAiAnalysisDrawings,
  toggleAiAnalysisDrawings,
  isLoading
}) => {
  const [showIndicators, setShowIndicators] = useState(false);
  
  const toggleIndicators = () => {
    setShowIndicators(!showIndicators);
  };

  return (
    <>
      {/* Botones principales en horizontal */}
      <div className="flex gap-1">
        <button
          onClick={onAnalyzeClick}
          disabled={isLoading}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors
            ${isLoading 
              ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
              : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          title="Analyze with your question"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>

        {onAutoAnalyzeClick && (
          <button
            onClick={onAutoAnalyzeClick}
            disabled={isLoading}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors
              ${isLoading 
                ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            title="Auto-analyze current chart"
          >
            {isLoading ? 'Auto...' : 'Auto'}
          </button>
        )}
      </div>
      
      <button
        onClick={toggleAiAnalysisDrawings}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors
          ${showAiAnalysisDrawings 
            ? 'bg-amber-600 hover:bg-amber-700 text-white' 
            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
      >
        {showAiAnalysisDrawings ? 'Hide Drawings' : 'Show Drawings'}
      </button>
      
      {/* Botón desplegable para indicadores */}
      <div className="relative inline-block">
        <button
          onClick={toggleIndicators}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors
            ${showIndicators 
              ? 'bg-violet-600 hover:bg-violet-700 text-white' 
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
        >
          Indicators {showIndicators ? '▲' : '▼'}
        </button>
        
        {/* Panel de indicadores desplegable */}
        {showIndicators && (
          <div className="absolute right-0 top-full z-50 p-2 bg-slate-800/95 rounded text-xs mt-1 border border-slate-700 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-[#34D399] inline-block mr-1.5 rounded-full"></span>
                <span className="text-slate-300">EMA 12</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-[#F472B6] inline-block mr-1.5 rounded-full"></span>
                <span className="text-slate-300">EMA 20</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-[#CBD5E1] inline-block mr-1.5 rounded-full"></span>
                <span className="text-slate-300">MA 50</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChartControls;
