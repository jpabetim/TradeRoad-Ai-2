import React, { useState } from 'react';
import FmpTradingChart from '../components/FmpTradingChart';
import { Layout } from '../components/Layout';

const FmpDemo: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [interval, setInterval] = useState<string>('daily');
  
  // Lista de símbolos comunes para probar
  const commonSymbols = [
    { value: 'AAPL', label: 'Apple Inc.' },
    { value: 'MSFT', label: 'Microsoft Corp.' },
    { value: 'GOOGL', label: 'Alphabet Inc.' },
    { value: 'AMZN', label: 'Amazon.com Inc.' },
    { value: 'META', label: 'Meta Platforms Inc.' },
    { value: 'TSLA', label: 'Tesla Inc.' },
    { value: 'NVDA', label: 'NVIDIA Corp.' },
    { value: 'BTCUSD', label: 'Bitcoin/USD' },
    { value: 'ETHUSD', label: 'Ethereum/USD' }
  ];
  
  // Intervalos disponibles
  const intervals = [
    { value: '1min', label: '1 minuto' },
    { value: '5min', label: '5 minutos' },
    { value: '15min', label: '15 minutos' },
    { value: '30min', label: '30 minutos' },
    { value: '1hour', label: '1 hora' },
    { value: '4hour', label: '4 horas' },
    { value: 'daily', label: 'Diario' }
  ];
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Demo Financial Modeling Prep</h1>
        <p className="mb-6 text-gray-400">
          Esta página demuestra el uso de la API de Financial Modeling Prep para obtener datos históricos de precios
          y mostrarlos en un gráfico utilizando Lightweight Charts.
        </p>
        
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-400 mb-2">Símbolo</label>
              <div className="flex">
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-gray-700 text-white p-2 rounded-md"
                >
                  {commonSymbols.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value} - {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Ingresa un símbolo personalizado"
                  className="ml-2 w-full bg-gray-700 text-white p-2 rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-400 mb-2">Intervalo</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded-md"
              >
                {intervals.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="bg-gray-900 p-1 rounded text-xs text-gray-400 mb-4">
            <p>
              <strong>Nota:</strong> Para usar esta funcionalidad, asegúrate de tener configurada la variable de entorno
              <code className="mx-1 px-1 py-0.5 bg-gray-800 rounded">FMP_API_KEY</code> 
              en tu servicio de Render.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-900 rounded-lg shadow-lg p-4">
          <FmpTradingChart 
            symbol={symbol} 
            interval={interval} 
            height={500} 
            darkMode={true} 
          />
        </div>
      </div>
    </Layout>
  );
};

export default FmpDemo;
