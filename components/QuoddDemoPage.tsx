import React, { useState, useEffect } from 'react';
import { authenticate, getAvailableSymbols, getHistoricalData, getCurrentPrice } from '../services/quoddService';
import RealTimeTradingChartAdapter from './RealTimeTradingChartAdapter';
import { DataSource, GeminiAnalysisResult, MovingAverageConfig } from '../types';
import './QuoddDemoPage.css';

const QuoddDemoPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando...');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSD');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [latestVolume, setLatestVolume] = useState<number | null>(null);

  // Configuraciones predeterminadas para el gráfico
  const movingAverages: MovingAverageConfig[] = [
    { id: 'ma1', type: 'EMA', period: 12, color: '#34D399', visible: true },
    { id: 'ma2', type: 'EMA', period: 20, color: '#F472B6', visible: true },
    { id: 'ma3', type: 'MA', period: 50, color: '#CBD5E1', visible: true },
    { id: 'ma4', type: 'MA', period: 200, color: '#FF0000', visible: true },
  ];

  // Autenticar con QUODD al iniciar
  useEffect(() => {
    const init = async () => {
      setStatusMessage('Autenticando con QUODD API...');
      setIsLoading(true);

      try {
        const success = await authenticate();
        setIsAuthenticated(success);
        
        if (success) {
          setStatusMessage('Autenticación exitosa. Cargando símbolos disponibles...');
          
          // Cargar símbolos disponibles
          try {
            const symbols = await getAvailableSymbols();
            setAvailableSymbols(symbols);
            setStatusMessage(`Autenticación exitosa. ${symbols.length} símbolos disponibles.`);
          } catch (error) {
            console.error('Error al cargar símbolos:', error);
            setStatusMessage('Autenticación exitosa, pero no se pudieron cargar símbolos.');
          }
        } else {
          setStatusMessage('Error de autenticación con QUODD API. Verifique las credenciales.');
        }
      } catch (error) {
        console.error('Error al inicializar QUODD:', error);
        setStatusMessage('Error al conectar con QUODD API. Revise la consola para más detalles.');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Manejar la actualización de información del gráfico
  const handleChartInfoUpdate = (info: { price: number | null; volume?: number | null }) => {
    if (info.price !== null) {
      setLatestPrice(info.price);
    }
    if (info.volume !== null && info.volume !== undefined) {
      setLatestVolume(info.volume);
    }
  };

  // Manejar cambio de estado de carga del gráfico
  const handleChartLoadingChange = (isLoading: boolean) => {
    setIsLoading(isLoading);
    if (isLoading) {
      setStatusMessage('Cargando datos del gráfico...');
    } else {
      setStatusMessage('Datos cargados correctamente.');
    }
  };

  // Selector de símbolos
  const SymbolSelector = () => (
    <div className="symbol-selector">
      <label htmlFor="symbol-select">Símbolo:</label>
      <select 
        id="symbol-select"
        value={selectedSymbol}
        onChange={(e) => setSelectedSymbol(e.target.value)}
        disabled={isLoading || !isAuthenticated}
      >
        {availableSymbols.length > 0 ? (
          availableSymbols.map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          ))
        ) : (
          <option value={selectedSymbol}>{selectedSymbol}</option>
        )}
      </select>
    </div>
  );

  // Selector de timeframe
  const TimeframeSelector = () => (
    <div className="timeframe-selector">
      <label htmlFor="timeframe-select">Timeframe:</label>
      <select
        id="timeframe-select"
        value={timeframe}
        onChange={(e) => setTimeframe(e.target.value)}
        disabled={isLoading || !isAuthenticated}
      >
        <option value="1m">1 minuto</option>
        <option value="5m">5 minutos</option>
        <option value="15m">15 minutos</option>
        <option value="30m">30 minutos</option>
        <option value="1h">1 hora</option>
        <option value="4h">4 horas</option>
        <option value="1d">1 día</option>
        <option value="1w">1 semana</option>
      </select>
    </div>
  );

  return (
    <div className="quodd-demo-container">
      <h1>QUODD API Demo</h1>
      
      <div className="status-bar">
        <span className={`status-indicator ${isAuthenticated ? 'authenticated' : 'not-authenticated'}`}></span>
        <span className="status-message">{statusMessage}</span>
      </div>
      
      <div className="price-display">
        {latestPrice !== null && (
          <div className="current-price">Precio actual: <strong>${latestPrice.toFixed(2)}</strong></div>
        )}
        {latestVolume !== null && (
          <div className="current-volume">Volumen: <strong>{latestVolume.toLocaleString()}</strong></div>
        )}
      </div>
      
      <div className="controls">
        <SymbolSelector />
        <TimeframeSelector />
      </div>
      
      <div className="chart-container" style={{ height: '600px', width: '100%' }}>
        {isAuthenticated ? (
          <RealTimeTradingChartAdapter
            dataSource="quodd"
            symbol={selectedSymbol}
            timeframe={timeframe}
            analysisResult={null}
            onLatestChartInfoUpdate={handleChartInfoUpdate}
            onChartLoadingStateChange={handleChartLoadingChange}
            movingAverages={movingAverages}
            theme="dark"
            chartPaneBackgroundColor="#18191B"
            volumePaneHeight={0}
            showAiAnalysisDrawings={false}
            wSignalColor="#243EA8"
            wSignalOpacity={70}
            showWSignals={true}
          />
        ) : (
          <div className="not-authenticated-message">
            {isLoading ? (
              <p>Conectando con QUODD API...</p>
            ) : (
              <p>Por favor autentique para visualizar el gráfico.</p>
            )}
          </div>
        )}
      </div>
      
      <div className="info-section">
        <h2>Información de QUODD API</h2>
        <p>Esta demo utiliza QUODD API REST para obtener datos de mercado en tiempo real y datos históricos.</p>
        <p>Características principales:</p>
        <ul>
          <li>Datos en tiempo real para más de 900 criptomonedas y 170 divisas</li>
          <li>Integración sencilla mediante REST API sin problemas de compatibilidad</li>
          <li>Datos históricos disponibles en múltiples timeframes</li>
          <li>Autenticación segura mediante token</li>
        </ul>
      </div>
    </div>
  );
};

export default QuoddDemoPage;
