// Exportación simplificada de CCXT para entorno de navegador
// Este archivo actúa como un puente para importar solo las partes de CCXT que funcionan en el navegador

// Establecer intercambios compatibles con navegador
// En tiempo de ejecución, estos serán provistos por el bundle de ccxt.browser.min.js
let binance, bingx, bybit, kucoin, coinex, huobi, okx, bitget, mexc;

// CCXT será cargado como variable global por el script en index.html
// Verificamos si está disponible globalmente primero
if (typeof window !== 'undefined' && window.ccxt) {
  // Extraer los exchanges de ccxt global
  ({ binance, bingx, bybit, kucoin, coinex, huobi, okx, bitget, mexc } = window.ccxt);
} else {
  // Ambiente de desarrollo - intentar importar ccxt
  try {
    const ccxtModule = require('ccxt');
    ({ binance, bingx, bybit, kucoin, coinex, huobi, okx, bitget, mexc } = ccxtModule);
  } catch (error) {
    console.error('Error al cargar CCXT:', error);
  }
}

// Exportar solo los exchanges compatibles con navegador
const exchanges = {
  binance,
  bingx,
  bybit,
  kucoin,
  coinex, 
  huobi,
  okx,
  bitget,
  mexc
};

// Función para crear una instancia de exchange
export const createExchange = (exchangeId, options = {}) => {
  if (!exchanges[exchangeId.toLowerCase()]) {
    throw new Error(`Exchange ${exchangeId} no soportado en versión navegador`);
  }
  
  // Opciones comunes para todos los exchanges
  const commonOptions = {
    enableRateLimit: true,
    timeout: 30000,
    ...options
  };

  // Crear la instancia con las opciones proporcionadas
  return new exchanges[exchangeId.toLowerCase()](commonOptions);
};

// Re-exportar funciones útiles de CCXT que no dependen de Node.js
export const timeframes = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',
  '8h': '8h',
  '12h': '12h',
  '1d': '1d',
  '3d': '3d',
  '1w': '1w',
  '1M': '1M'
};

// Exportar funciones de utilidad para formateo de símbolos
export const formatSymbolForExchange = (symbol, exchange) => {
  // Eliminar espacios y convertir a mayúsculas
  symbol = symbol.replace(/\s+/g, '').toUpperCase();
  
  // Formateo específico por exchange
  switch (exchange.toLowerCase()) {
    case 'binance':
    case 'bingx':
    case 'bybit':
      // Estos exchanges usan formato BTCUSDT
      return symbol;
    case 'kucoin':
    case 'coinex':
    case 'huobi':
    case 'okx':
    case 'bitget':
    case 'mexc':
      // Estos exchanges podrían usar formato BTC-USDT o similar
      if (symbol.includes('/')) {
        return symbol.replace('/', '-');
      } else if (!symbol.includes('-')) {
        // Si no tiene un separador, intentar inferir donde debería ir
        // Buscar common quote currencies al final del string
        const quotes = ['USDT', 'USD', 'BUSD', 'USDC', 'BTC', 'ETH'];
        for (const quote of quotes) {
          if (symbol.endsWith(quote)) {
            return `${symbol.slice(0, -quote.length)}-${quote}`;
          }
        }
      }
      return symbol;
    default:
      return symbol;
  }
};

// Exportación por defecto
export default {
  exchanges,
  createExchange,
  timeframes,
  formatSymbolForExchange
};
