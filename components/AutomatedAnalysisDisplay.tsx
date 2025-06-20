import React from 'react';

interface AutomatedAnalysisDisplayProps {
  analysisResult: any; // Definir un tipo más específico según la estructura de tu respuesta
  theme?: 'light' | 'dark';
  isLoading?: boolean;
  error?: string | null;
}

const AutomatedAnalysisDisplay: React.FC<AutomatedAnalysisDisplayProps> = ({ 
  analysisResult, 
  theme = 'dark',
  isLoading = false,
  error = null
}) => {
  if (isLoading) {
    return (
      <div className={`p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex flex-col items-center justify-center space-y-3 py-6">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}>
            Processing your analysis...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'} border ${theme === 'dark' ? 'border-red-800/50' : 'border-red-200'}`}>
        <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>Error</h3>
        <p className={theme === 'dark' ? 'text-red-200' : 'text-red-600'}>
          {error}
        </p>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-50'} border ${theme === 'dark' ? 'border-slate-600/50' : 'border-gray-200'}`}>
        <h3 className={`font-medium mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>AI Analysis</h3>
        <p className={theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}>
          Enter a prompt or question in the search bar to analyze this chart.
        </p>
      </div>
    );
  }

  // Renderizar el análisis detallado
  return (
    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-600/50' : 'border-gray-200'}`}>
      <h2 className={`font-semibold text-lg mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
        Chart Analysis
      </h2>
      
      <div className="space-y-4">
        {analysisResult.escenarioPrincipal && (
          <div>
            <h3 className={`font-medium text-sm uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              Primary Scenario
            </h3>
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              {analysisResult.escenarioPrincipal}
            </div>
          </div>
        )}

        {analysisResult.escenarioAlternativo && (
          <div>
            <h3 className={`font-medium text-sm uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
              Alternative Scenario
            </h3>
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              {analysisResult.escenarioAlternativo}
            </div>
          </div>
        )}

        {analysisResult.soportesResistencias && (
          <div>
            <h3 className={`font-medium text-sm uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
              Support & Resistance
            </h3>
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              {analysisResult.soportesResistencias}
            </div>
          </div>
        )}

        {analysisResult.indicadoresTecnicos && (
          <div>
            <h3 className={`font-medium text-sm uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              Technical Indicators
            </h3>
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              {analysisResult.indicadoresTecnicos}
            </div>
          </div>
        )}

        {/* Si la respuesta contiene un campo 'text' simple (respuesta a una pregunta específica) */}
        {analysisResult.text && (
          <div>
            <h3 className={`font-medium text-sm uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Analysis
            </h3>
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              {analysisResult.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomatedAnalysisDisplay;
