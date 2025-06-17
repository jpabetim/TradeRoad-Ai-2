import { ChartCandlestickData, MarketType } from '../types';
// Importamos nuestro wrapper personalizado de CCXT para navegador
import { createExchange, timeframes as ccxtTimeframes, formatSymbolForExchange } from './ccxt-browser';

// Opciones compartidas para instancias de exchange de CCXT
const exchangeOptions = {
  'enableRateLimit': true,
  'timeout': 30000,
  'verbose': false
};

// Lista de exchanges con buena cobertura para diferentes tipos de mercado
// IMPORTANTE: Solo incluir exchanges que están soportados en nuestro wrapper ccxt-browser.js
export const CCXT_EXCHANGES: Record<MarketType, string[]> = {
  'crypto': ['binance', 'bingx', 'bybit', 'kucoin', 'mexc'],
  'forex': ['binance', 'kucoin'],  // Algunos exchanges crypto también tienen mercados forex
  'stocks': ['binance'],  // Futuros tokenizados en algunos exchanges
  'indices': ['binance'],  // Índices en exchanges de crypto
  'commodities': ['binance', 'kucoin'] // Commodities tokenizados
};

/**
 * Función para obtener datos históricos usando nuestro wrapper de CCXT
 */
export const getHistoricalData = async (
  symbol: string,
  timeframe: string,
  marketType: MarketType,
  preferredExchange?: string
): Promise<ChartCandlestickData[]> => {
  try {
    // Elegir exchange preferido o el primero disponible para este tipo de mercado
    const exchangeId = preferredExchange || CCXT_EXCHANGES[marketType][0];
    console.log(`Using CCXT with exchange: ${exchangeId} for ${marketType}`);
    
    try {
      // Crear la instancia del exchange usando nuestro wrapper personalizado
      const exchange = createExchange(exchangeId, exchangeOptions);
      
      // Formatear símbolo según el exchange usando la función del wrapper
      const formattedSymbol = formatSymbolForExchange(symbol, exchangeId);
      console.log(`Formatted symbol: ${formattedSymbol}`);
      
      // Usar el timeframe de nuestro wrapper, o 1h como valor predeterminado
      // Convertimos a minúsculas y accedemos de forma segura
      const timeframeLower = timeframe.toLowerCase();
      const ccxtTimeframe = (timeframeLower in ccxtTimeframes) ? 
                            ccxtTimeframes[timeframeLower as keyof typeof ccxtTimeframes] : 
                            ccxtTimeframes['1h'];
    
      // Obtener datos históricos
      const since = undefined; // Obtener todos los datos disponibles
      const limit = 500; // Limitar la cantidad de velas
      
      // Inicializar los mercados y obtener datos OHLCV
      await exchange.loadMarkets();
      const ohlcv = await exchange.fetchOHLCV(formattedSymbol, ccxtTimeframe, since, limit);
      
      // Transformar datos al formato esperado por el gráfico
      return ohlcv.map((candle: number[]) => ({
        time: candle[0] / 1000, // CCXT usa milisegundos, necesitamos segundos
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5] || 0
      }));
    } catch (error) {
      console.error(`Error específico del exchange ${exchangeId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error('Error general obteniendo datos históricos con CCXT:', error);
    throw error;
  }
};

/**
 * Función para obtener el precio actual de un símbolo
 */
export const getCurrentPrice = async (
  symbol: string,
  marketType: MarketType,
  preferredExchange?: string
): Promise<number> => {
  try {
    // Elegir exchange preferido o el primero disponible para este tipo de mercado
    const exchangeId = preferredExchange || CCXT_EXCHANGES[marketType][0];
    console.log(`Getting current price from ${exchangeId} for ${symbol}`);
    
    // Crear instancia de exchange usando nuestro wrapper
    const exchange = createExchange(exchangeId, exchangeOptions);
    
    // Formatear símbolo según el exchange
    const formattedSymbol = formatSymbolForExchange(symbol, exchangeId);
    
    // Obtener ticker
    await exchange.loadMarkets();
    const ticker = await exchange.fetchTicker(formattedSymbol);
    
    return ticker.last || 0;
  } catch (error) {
    console.error('Error obteniendo precio actual con CCXT:', error);
    throw error;
  }
};

/**
 * Mapeo de exchanges a proveedores de datos nativos
 * Útil para cuando queremos elegir entre usar CCXT o un proveedor nativo
 */
export const mapExchangeToDataSource = (exchange: string): string => {
  const mapping: Record<string, string> = {
    'binance': 'binance',
    'bingx': 'bingx',
    'bybit': 'bybit',
    'kucoin': 'kucoin'
  };
  
  return mapping[exchange.toLowerCase()] || exchange.toLowerCase();
};

/**
 * Obtener exchanges compatibles con el tipo de mercado actual
 */
export const getCompatibleExchanges = (marketType: MarketType): string[] => {
  return CCXT_EXCHANGES[marketType] || [];
};
