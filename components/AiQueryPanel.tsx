import React from 'react';

interface AiQueryPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onAnalyzeClick: () => void;
  onAutoAnalyzeClick?: () => void;
  isLoading: boolean;
  theme?: 'light' | 'dark';
}

const AiQueryPanel: React.FC<AiQueryPanelProps> = ({ 
  prompt, 
  onPromptChange, 
  onAnalyzeClick, 
  onAutoAnalyzeClick,
  isLoading,
  theme = 'dark'
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
      <div className="relative flex-grow w-full">
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Pregunta algo sobre este gráfico..."
          className={`w-full py-2 px-3 rounded text-sm border resize-none ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-400'
              : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
          } transition-colors focus:outline-none focus:ring-2 ${
            theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-400'
          }`}
          disabled={isLoading}
          rows={2}
        />
        {prompt && !isLoading && (
          <button
            type="button"
            onClick={() => onPromptChange('')}
            className="absolute right-8 top-4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear input"
          >
            ×
          </button>
        )}
      </div>
      <div className="flex gap-1 mt-2 sm:mt-0">
        <button
          onClick={onAnalyzeClick}
          disabled={isLoading || !prompt.trim()}
          className={`shrink-0 py-2 px-4 rounded text-sm font-medium ${
            isLoading
              ? 'bg-blue-700 text-blue-100 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } transition-colors`}
          title="Analyze based on your question"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
        
        {onAutoAnalyzeClick && (
          <button
            onClick={onAutoAnalyzeClick}
            disabled={isLoading}
            className={`shrink-0 py-2 px-4 rounded text-sm font-medium ${
              isLoading
                ? 'bg-green-700 text-green-100 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } transition-colors`}
            title="Auto-analyze chart (no prompt needed)"
          >
            {isLoading ? 'Auto...' : 'Auto-Analyze'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AiQueryPanel;
