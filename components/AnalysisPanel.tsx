

import React from 'react';
import { GeminiAnalysisResult, TradeSetup, ScenarioAnalysis, AnalysisPointType, FibonacciAnalysis, FibonacciLevel } from '../types';

interface AnalysisPanelProps {
  analysisResult: GeminiAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  isMobile: boolean; // New prop for mobile detection
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-md sm:text-lg font-semibold mt-3 sm:mt-4 mb-1.5 sm:mb-2 text-sky-400 border-b border-slate-700 pb-1">{children}</h3>
);

const DetailItem: React.FC<{ label: string; value?: string | number | null; isCode?: boolean; valueClassName?: string }> = ({ label, value, isCode = false, valueClassName = "" }) => (
  value || value === 0 ? ( 
    <p className="text-xs sm:text-sm text-slate-300">
      <span className="font-medium text-slate-100">{label}:</span>{' '}
      {isCode ? <code className="text-xs bg-slate-600 p-0.5 sm:p-1 rounded">{value}</code> : <span className={valueClassName}>{value}</span>}
    </p>
  ) : null
);


const TradeSetupDisplay: React.FC<{ setup: TradeSetup | undefined, isMobile: boolean }> = ({ setup, isMobile }) => {
  if (!setup || setup.tipo === "ninguno") {
    return <p className="text-xs sm:text-sm text-slate-400 italic">No specific trade setup identified.</p>;
  }
  return (
    <div className="space-y-1 mt-1 p-2 sm:p-3 bg-slate-700/50 rounded-md">
      <DetailItem label="Type" value={setup.tipo?.toUpperCase()} />
      {!isMobile && <DetailItem label="Entry Condition" value={setup.descripcion_entrada} />}
      <DetailItem label="Ideal Entry Price" value={setup.punto_entrada_ideal ? `$${setup.punto_entrada_ideal.toFixed(Math.abs(setup.punto_entrada_ideal) < 1 ? 4 : 2)}` : undefined} />
      {!isMobile && <DetailItem label="Entry Zone" value={setup.zona_entrada ? `[$${setup.zona_entrada[0].toFixed(Math.abs(setup.zona_entrada[0]) < 1 ? 4 : 2)} - $${setup.zona_entrada[1].toFixed(Math.abs(setup.zona_entrada[1]) < 1 ? 4 : 2)}]` : undefined} />}
      <DetailItem label="Stop Loss" value={setup.stop_loss ? `$${setup.stop_loss.toFixed(Math.abs(setup.stop_loss) < 1 ? 4 : 2)}` : undefined} />
      <DetailItem label="Take Profit 1" value={setup.take_profit_1 ? `$${setup.take_profit_1.toFixed(Math.abs(setup.take_profit_1) < 1 ? 4 : 2)}` : undefined} />
      {!isMobile && setup.take_profit_2 && <DetailItem label="Take Profit 2" value={`$${setup.take_profit_2.toFixed(Math.abs(setup.take_profit_2) < 1 ? 4 : 2)}`} />}
      {!isMobile && setup.take_profit_3 && <DetailItem label="Take Profit 3" value={`$${setup.take_profit_3.toFixed(Math.abs(setup.take_profit_3) < 1 ? 4 : 2)}`} />}
      {setup.razon_fundamental && <p className="text-xs sm:text-sm text-slate-300 mt-1"><span className="font-medium text-slate-100">Reason:</span> {setup.razon_fundamental}</p>}
      {!isMobile && setup.confirmaciones_adicionales && setup.confirmaciones_adicionales.length > 0 && (
        <DetailItem label="Confirmations" value={setup.confirmaciones_adicionales.join(', ')} />
      )}
      {!isMobile && <DetailItem label="Risk/Reward" value={setup.ratio_riesgo_beneficio} />}
      <DetailItem label="Confidence" value={setup.calificacion_confianza} />
    </div>
  );
};

const FibonacciLevelDisplay: React.FC<{ level: FibonacciLevel }> = ({ level }) => (
  <li className="text-xs">
    <span className="font-medium text-slate-200">{level.label}:</span> ${level.price.toFixed(Math.abs(level.price) < 1 ? 4 : 2)}
  </li>
);

const FibonacciAnalysisDisplay: React.FC<{ fiboAnalysis: FibonacciAnalysis | undefined }> = ({ fiboAnalysis }) => {
  if (!fiboAnalysis) {
    return <p className="text-xs sm:text-sm text-slate-400 italic">No Fibonacci analysis available.</p>;
  }

  const sortedRetracementLevels = [...(fiboAnalysis.niveles_retroceso || [])].sort((a, b) => {
    const isUpwardImpulse = fiboAnalysis.precio_fin_impulso > fiboAnalysis.precio_inicio_impulso;
    return isUpwardImpulse ? b.price - a.price : a.price - b.price;
  });

  const sortedExtensionLevels = [...(fiboAnalysis.niveles_extension || [])].sort((a, b) => {
    return a.level - b.level;
  });

  return (
    <div className="space-y-1.5 sm:space-y-2 mt-1.5 sm:mt-2 p-2 sm:p-3 bg-slate-700 rounded-md">
      <p className="text-xs sm:text-sm text-slate-300"><span className="font-medium text-slate-100">Impulse:</span> {fiboAnalysis.descripcion_impulso}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 text-xs">
        <DetailItem label="Impulse Start (A)" value={fiboAnalysis.precio_inicio_impulso ? `$${fiboAnalysis.precio_inicio_impulso.toFixed(Math.abs(fiboAnalysis.precio_inicio_impulso) < 1 ? 4 : 2)}` : 'N/A'} />
        <DetailItem label="Impulse End (B)" value={fiboAnalysis.precio_fin_impulso ? `$${fiboAnalysis.precio_fin_impulso.toFixed(Math.abs(fiboAnalysis.precio_fin_impulso) < 1 ? 4 : 2)}` : 'N/A'} />
        {fiboAnalysis.precio_fin_retroceso != null && (
             <DetailItem label="Retracement End (C)" value={`$${fiboAnalysis.precio_fin_retroceso.toFixed(Math.abs(fiboAnalysis.precio_fin_retroceso) < 1 ? 4 : 2)}`} />
        )}
      </div>

      {sortedRetracementLevels.length > 0 && (
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-slate-200 mt-1.5 sm:mt-2 mb-1">Retracement Levels (A-B):</h4>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            {sortedRetracementLevels.map((level, index) => (
              <FibonacciLevelDisplay key={`retracement-${index}`} level={level} />
            ))}
          </ul>
        </div>
      )}

      {sortedExtensionLevels.length > 0 && (
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-slate-200 mt-1.5 sm:mt-2 mb-1">Extension Levels (A-B-C):</h4>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            {sortedExtensionLevels.map((level, index) => (
              <FibonacciLevelDisplay key={`extension-${index}`} level={level} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysisResult, isLoading, error, isMobile }) => {
  
  const StatusDisplayWrapper: React.FC<{ title: string; children: React.ReactNode; titleColor?: string }> = ({ title, children, titleColor = "text-sky-400" }) => (
    <div className="p-3 sm:p-4 bg-slate-800 rounded-lg shadow h-full"> {/* h-full here is okay as it fills its parent if parent has fixed height, or natural height */}
      <h2 className={`text-lg sm:text-xl font-semibold mb-2 ${titleColor}`}>{title}</h2>
      <div className="text-xs sm:text-sm text-slate-300">{children}</div>
    </div>
  );

  if (isLoading) {
    return (
      <StatusDisplayWrapper title="AI Analysis">
        Loading analysis...
      </StatusDisplayWrapper>
    );
  }

  if (error) {
    return (
      <StatusDisplayWrapper title="AI Analysis Error" titleColor="text-red-400">
        {error}
      </StatusDisplayWrapper>
    );
  }

  if (!analysisResult) {
    return (
      <StatusDisplayWrapper title="AI Analysis">
        Click "Analyze Chart" to get AI insights.
      </StatusDisplayWrapper>
    );
  }

  const primaryScenario = analysisResult.escenarios_probables?.find(s => s.probabilidad === 'alta') || analysisResult.escenarios_probables?.[0];
  const alternativeScenarios = analysisResult.escenarios_probables?.filter(s => s !== primaryScenario) || [];
  
  const activeSignalType = analysisResult.conclusion_recomendacion?.mejor_oportunidad_actual?.tipo;
  const overallBias = analysisResult.analisis_general?.sesgo_direccional_general;

  const biasColorMap: Record<string, string> = {
    alcista: "text-green-400",
    bajista: "text-red-400",
  };
  const biasColorClass = biasColorMap[overallBias?.toLowerCase() || ''] || "text-slate-300";

  const activeSignalColorMap: Record<string, string> = {
    largo: 'text-green-400',
    corto: 'text-red-400',
  };
  const activeSignalColorClass = activeSignalColorMap[activeSignalType?.toLowerCase() || ''] || 'text-slate-300';


  return (
    <div className="p-3 sm:p-4 bg-slate-800 rounded-lg shadow"> 
      <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-sky-400">AI Analysis Results</h2>
      
      <div>
        {!isMobile && primaryScenario && (
          <>
            <SectionTitle>Primary Scenario</SectionTitle>
            <div className="p-2 sm:p-3 bg-slate-700 rounded-md">
              <p className="text-xs sm:text-sm font-semibold text-slate-100">{primaryScenario.nombre_escenario}</p>
              <p className="text-xs text-slate-300 mt-1">{primaryScenario.descripcion_detallada}</p>
              {primaryScenario.niveles_clave_de_invalidacion && (
                <p className="text-xs text-slate-400 mt-1">Invalidation: {primaryScenario.niveles_clave_de_invalidacion}</p>
              )}
              {primaryScenario.trade_setup_asociado && primaryScenario.trade_setup_asociado.tipo !== "ninguno" && (
                   <>
                      <p className="text-xs font-semibold text-slate-100 mt-1.5 sm:mt-2">
                        Associated Setup: <span className={primaryScenario.trade_setup_asociado.tipo === 'largo' ? 'text-green-400' : 'text-red-400'}>{primaryScenario.trade_setup_asociado.tipo.toUpperCase()}</span>
                      </p>
                      <TradeSetupDisplay setup={primaryScenario.trade_setup_asociado} isMobile={isMobile} />
                   </>
              )}
            </div>
          </>
        )}
        {!isMobile && !primaryScenario && (
             <p className="text-xs sm:text-sm text-slate-400 italic">No primary scenario identified.</p>
        )}


        {(alternativeScenarios.length > 0 || (isMobile && primaryScenario)) && (
          <>
            <SectionTitle>Alternative Scenarios</SectionTitle>
            {/* On mobile, if primary existed, it might be shown here if prompt provides it as an 'alternative' */}
            {isMobile && primaryScenario && !alternativeScenarios.find(s => s.nombre_escenario === primaryScenario.nombre_escenario) && (
                 <div className="mt-1.5 sm:mt-2 p-2 sm:p-3 bg-slate-700/70 rounded-md">
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">{primaryScenario.nombre_escenario} <span className="text-xs text-slate-400">(Prob: {primaryScenario.probabilidad})</span></p>
                    <p className="text-xs text-slate-300 mt-1">{primaryScenario.descripcion_detallada}</p>
                    {primaryScenario.niveles_clave_de_invalidacion && (
                      <p className="text-xs text-slate-400 mt-1">Invalidation: {primaryScenario.niveles_clave_de_invalidacion}</p>
                    )}
                    {primaryScenario.trade_setup_asociado && primaryScenario.trade_setup_asociado.tipo !== "ninguno" && (
                      <>
                        <p className="text-xs font-semibold text-slate-100 mt-1.5 sm:mt-2">
                          Potential Trade: <span className={primaryScenario.trade_setup_asociado.tipo === 'largo' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{primaryScenario.trade_setup_asociado.tipo.toUpperCase()}</span>
                        </p>
                        <TradeSetupDisplay setup={primaryScenario.trade_setup_asociado} isMobile={isMobile}/>
                      </>
                    )}
                </div>
            )}
            {alternativeScenarios.map((scenario, index) => (
              <div key={index} className="mt-1.5 sm:mt-2 p-2 sm:p-3 bg-slate-700/70 rounded-md">
                <p className="text-xs sm:text-sm font-semibold text-slate-200">{scenario.nombre_escenario} <span className="text-xs text-slate-400">(Prob: {scenario.probabilidad})</span></p>
                <p className="text-xs text-slate-300 mt-1">{scenario.descripcion_detallada}</p>
                {scenario.niveles_clave_de_invalidacion && (
                  <p className="text-xs text-slate-400 mt-1">Invalidation: {scenario.niveles_clave_de_invalidacion}</p>
                )}
                {scenario.trade_setup_asociado && scenario.trade_setup_asociado.tipo !== "ninguno" && (
                  <>
                    <p className="text-xs font-semibold text-slate-100 mt-1.5 sm:mt-2">
                      Potential Trade: <span className={scenario.trade_setup_asociado.tipo === 'largo' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{scenario.trade_setup_asociado.tipo.toUpperCase()}</span>
                    </p>
                    <TradeSetupDisplay setup={scenario.trade_setup_asociado} isMobile={isMobile} />
                  </>
                )}
              </div>
            ))}
          </>
        )}

        {!isMobile && (
          <>
            <SectionTitle>Active Signal Type</SectionTitle>
            <p className={`text-xs sm:text-sm font-semibold ${activeSignalColorClass}`}>
              {activeSignalType && activeSignalType !== "ninguno" ? activeSignalType.toUpperCase() : "NONE"}
            </p>

            {analysisResult.proyeccion_precio_visual && (analysisResult.proyeccion_precio_visual.camino_probable_1 || analysisResult.proyeccion_precio_visual.descripcion_camino_1) && (
              <>
                <SectionTitle>Price Projection</SectionTitle>
                {analysisResult.proyeccion_precio_visual.descripcion_camino_1 && <p className="text-xs sm:text-sm text-slate-300 mb-1">{analysisResult.proyeccion_precio_visual.descripcion_camino_1}</p>}
                {analysisResult.proyeccion_precio_visual.camino_probable_1 && (
                  <p className="text-xs text-slate-400">Path: {analysisResult.proyeccion_precio_visual.camino_probable_1.map(p => typeof p === 'number' ? `$${p.toFixed(Math.abs(p) < 1 ? 4 : 2)}` : p).join(' → ')}</p>
                )}
              </>
            )}
            
            <SectionTitle>Recommended Trade Setup</SectionTitle>
            <TradeSetupDisplay setup={analysisResult.conclusion_recomendacion?.mejor_oportunidad_actual} isMobile={isMobile} />

            <SectionTitle>Fibonacci Analysis</SectionTitle>
            <FibonacciAnalysisDisplay fiboAnalysis={analysisResult.analisis_fibonacci} />
          </>
        )}


        {analysisResult.puntos_clave_grafico && analysisResult.puntos_clave_grafico.length > 0 && (
          <>
            <SectionTitle>Key Levels & Zones Identified</SectionTitle>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-300 mt-1.5 sm:mt-2 p-1.5 sm:p-2 bg-slate-700 rounded-md">
              {analysisResult.puntos_clave_grafico.map((point, index) => (
                <li key={index}>
                  <span className="font-medium text-slate-100">{point.label}</span>
                  {!isMobile && point.tipo && <span className="text-xs text-slate-400"> ({point.tipo.replace(/_/g, ' ')})</span>}
                  {point.zona && <span className="text-xs text-slate-400"> [$${point.zona[0].toFixed(Math.abs(point.zona[0]) < 1 ? 4 : 2)} - $${point.zona[1].toFixed(Math.abs(point.zona[1]) < 1 ? 4 : 2)}]</span>}
                  {point.nivel != null && <span className="text-xs text-slate-400"> @ ${typeof point.nivel === 'number' ? point.nivel.toFixed(Math.abs(point.nivel) < 1 ? 4 : 2) : point.nivel}</span>}
                  {!isMobile && point.temporalidad && <span className="text-xs text-slate-500"> ({point.temporalidad})</span>}
                  {(point.tipo === AnalysisPointType.POI_DEMANDA || point.tipo === AnalysisPointType.POI_OFERTA) && point.mitigado && <span className="text-xs text-sky-300"> (Mitigated)</span>}
                  {!isMobile && point.importancia && <span className="text-xs text-yellow-400"> Importance: {point.importancia}</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        <SectionTitle>General Market Structure & Volume</SectionTitle>
        {analysisResult.analisis_general?.estructura_mercado_resumen && Object.entries(analysisResult.analisis_general.estructura_mercado_resumen).map(([tf, desc]) =>
          desc && <DetailItem key={tf} label={`Structure (${tf.replace('htf_', '').replace('mtf_', '').replace('ltf_', '')})`} value={desc as string} />
        )}
        {!isMobile && <DetailItem label="Wyckoff Phase" value={analysisResult.analisis_general?.fase_wyckoff_actual} />}
        <DetailItem label="Overall Bias" value={analysisResult.analisis_general?.sesgo_direccional_general?.toUpperCase()} valueClassName={biasColorClass + " font-semibold"}/>
        {!isMobile && analysisResult.analisis_general?.comentario_volumen && (
          <p className="text-xs sm:text-sm text-slate-300 mt-1"><span className="font-medium text-slate-100">Brief Volume Comment:</span> {analysisResult.analisis_general.comentario_volumen}</p>
        )}
        {!isMobile && analysisResult.analisis_general?.interpretacion_volumen_detallada && (
          <p className="text-xs sm:text-sm text-slate-300 mt-1"><span className="font-medium text-slate-100">Detailed Volume Analysis:</span> {analysisResult.analisis_general.interpretacion_volumen_detallada}</p>
        )}
         {!isMobile && analysisResult.analisis_general?.comentario_funding_rate_oi && (
           <>
            <SectionTitle>Conceptual FR/OI Analysis</SectionTitle>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 mb-1.5 sm:mb-2 p-2 sm:p-3 bg-slate-700 rounded-md">
              {analysisResult.analisis_general.comentario_funding_rate_oi}
            </p>
           </>
        )}
        
        <SectionTitle>Conclusion & Recommendations</SectionTitle>
        {analysisResult.conclusion_recomendacion?.resumen_ejecutivo && (
          <p className="text-xs sm:text-sm text-slate-300 mt-1 mb-1.5 sm:mb-2 p-2 sm:p-3 bg-slate-700 rounded-md">{analysisResult.conclusion_recomendacion.resumen_ejecutivo}</p>
        )}
        {!isMobile && <DetailItem label="Next Expected Move" value={analysisResult.conclusion_recomendacion?.proximo_movimiento_esperado} />}
        {!isMobile && analysisResult.conclusion_recomendacion?.oportunidades_reentrada_detectadas && (
           <>
            <h4 className="text-sm font-semibold mt-2 mb-1 text-sky-300">Re-entry Opportunities:</h4>
            <p className="text-xs sm:text-sm text-slate-300 p-2 bg-slate-700/70 rounded-md">{analysisResult.conclusion_recomendacion.oportunidades_reentrada_detectadas}</p>
           </>
        )}
        {!isMobile && analysisResult.conclusion_recomendacion?.consideraciones_salida_trade && (
           <>
            <h4 className="text-sm font-semibold mt-2 mb-1 text-sky-300">Exit Considerations:</h4>
            <p className="text-xs sm:text-sm text-slate-300 p-2 bg-slate-700/70 rounded-md">{analysisResult.conclusion_recomendacion.consideraciones_salida_trade}</p>
           </>
        )}
        {!isMobile && analysisResult.conclusion_recomendacion?.senales_confluencia_avanzada && (
           <>
            <h4 className="text-sm font-semibold mt-2 mb-1 text-sky-300">Advanced Confluence Signals (Conceptual):</h4>
            <p className="text-xs sm:text-sm text-slate-300 p-2 bg-slate-700/70 rounded-md">{analysisResult.conclusion_recomendacion.senales_confluencia_avanzada}</p>
           </>
        )}
        {!isMobile && <DetailItem label="Warnings/Risks" value={analysisResult.conclusion_recomendacion?.advertencias_riesgos} />}
      </div>
    </div>
  );
};

export default AnalysisPanel;