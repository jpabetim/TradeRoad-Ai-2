import React, { useState } from 'react';
import ExchangeTradingChart from '../components/ExchangeTradingChart';
import { Layout } from '../components/Layout';

const ExchangesDemo: React.FC = () => {
  const [exchange, setExchange] = useState<'binance' | 'bingx'>('binance');
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [interval, setInterval] = useState<string>('1d');
  
  // Símbolos populares para cada exchange
  const exchangeSymbols = {
    binance: [
      { value: 'BTCUSDT', label: 'Bitcoin/USDT' },
      { value: 'ETHUSDT', label: 'Ethereum/USDT' },
      { value: 'BNBUSDT', label: 'BNB/USDT' },
      { value: 'SOLUSDT', label: 'Solana/USDT' },
      { value: 'ADAUSDT', label: 'Cardano/USDT' },
      { value: 'XRPUSDT', label: 'Ripple/USDT' }
    ],
    bingx: [
      { value: 'BTC-USDT', label: 'Bitcoin/USDT' },
      { value: 'ETH-USDT', label: 'Ethereum/USDT' },
      { value: 'SOL-USDT', label: 'Solana/USDT' },
      { value: 'BNB-USDT', label: 'BNB/USDT' },
      { value: 'XRP-USDT', label: 'Ripple/USDT' }
    ]
  };
  
  // Intervalos disponibles
  const intervals = [
    { value: '1m', label: '1 minuto' },
    { value: '5m', label: '5 minutos' },
    { value: '15m', label: '15 minutos' },
    { value: '30m', label: '30 minutos' },
    { value: '1h', label: '1 hora' },
    { value: '4h', label: '4 horas' },
    { value: '1d', label: 'Diario' }
  ];
  
  // Manejar el cambio de exchange para ajustar el formato del símbolo
  const handleExchangeChange = (newExchange: 'binance' | 'bingx') => {
    setExchange(newExchange);
    
    // Convertir el símbolo actual al formato del nuevo exchange
    if (newExchange === 'binance') {
      // BingX -> Binance: BTC-USDT -> BTCUSDT
      setSymbol(symbol.replace('-', ''));
    } else {
      // Binance -> BingX: BTCUSDT -> BTC-USDT
      if (!symbol.includes('-')) {
        const base = symbol.slice(0, -4);
        const quote = symbol.slice(-4);
        setSymbol(`${base}-${quote}`);
      }
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Demo de Exchanges - Sin CCXT</h1>
        <p className="mb-6 text-gray-400">
          Esta página demuestra el uso directo de las APIs de Binance y BingX para obtener datos
          de precios históricos sin depender de la biblioteca CCXT.
        </p>
        
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-gray-400 mb-2">Exchange</label>
              <select
                value={exchange}
                onChange={(e) => handleExchangeChange(e.target.value as 'binance' | 'bingx')}
                className="w-full bg-gray-700 text-white p-2 rounded-md"
              >
                <option value="binance">Binance</option>
                <option value="bingx">BingX</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 mb-2">Símbolo</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded-md"
              >
                {exchangeSymbols[exchange].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
          
          <div className="bg-gray-900 p-3 rounded text-sm text-gray-400">
            <p className="font-semibold mb-1">📝 Notas importantes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Las APIs públicas de Binance y BingX tienen límites de tasa de solicitudes.</li>
              <li>Algunas funcionalidades avanzadas pueden requerir claves API privadas.</li>
              <li>Esta implementación es más ligera que usar CCXT, pero con menos funcionalidades.</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-gray-900 rounded-lg shadow-lg p-4">
          <ExchangeTradingChart 
            exchange={exchange} 
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

export default ExchangesDemo;
