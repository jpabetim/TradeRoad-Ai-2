/**
 * Servicios de intercambio para Binance y BingX
 * Proporciona funcionalidades para acceder a los datos de estos exchanges
 * sin depender de la biblioteca CCXT
 */

import axios from 'axios';

// Tipos para los datos de velas (OHLCV)
export interface CandleData {
  time: number; // Timestamp en milisegundos
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ExchangeInfo {
  name: string;
  description: string;
  website: string;
  api: string;
}

// Configuración de los exchanges
const EXCHANGES: Record<string, ExchangeInfo> = {
  binance: {
    name: 'Binance',
    description: 'El mayor exchange de criptomonedas del mundo por volumen',
    website: 'https://binance.com',
    api: 'https://api.binance.com'
  },
  bingx: {
    name: 'BingX',
    description: 'Exchange de criptomonedas con enfoque en trading social y derivados',
    website: 'https://bingx.com',
    api: 'https://open-api.bingx.com'
  }
};

/**
 * Obtiene datos históricos de velas (OHLCV) de Binance
 * 
 * @param symbol Par de trading (ej: "BTCUSDT")
 * @param interval Intervalo de tiempo (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
 * @param limit Número máximo de velas a devolver (max 1000)
 * @returns Array de datos de velas
 */
export const getBinanceCandles = async (
  symbol: string,
  interval: string = '1d',
  limit: number = 100
): Promise<CandleData[]> => {
  try {
    const response = await axios.get(`${EXCHANGES.binance.api}/api/v3/klines`, {
      params: {
        symbol: symbol.toUpperCase(),
        interval: interval,
        limit: limit
      }
    });
    
    // Transformar datos de Binance al formato interno
    return response.data.map((candle: any[]) => ({
      time: candle[0], // Timestamp de apertura
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));
  } catch (error) {
    console.error('Error obteniendo datos de Binance:', error);
    return [];
  }
};

/**
 * Obtiene datos históricos de velas (OHLCV) de BingX
 * 
 * @param symbol Par de trading (ej: "BTC-USDT")
 * @param interval Intervalo de tiempo (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
 * @param limit Número máximo de velas a devolver
 * @returns Array de datos de velas
 */
export const getBingXCandles = async (
  symbol: string,
  interval: string = '1d',
  limit: number = 100
): Promise<CandleData[]> => {
  try {
    // BingX usa un formato diferente para los símbolos, convertimos si es necesario
    const formattedSymbol = symbol.includes('-') ? symbol : symbol.replace(/(.+)(.{4})$/, '$1-$2');
    
    const response = await axios.get(`${EXCHANGES.bingx.api}/openApi/swap/v2/quote/klines`, {
      params: {
        symbol: formattedSymbol,
        interval: interval,
        limit: limit
      }
    });
    
    if (response.data.code !== 0 || !response.data.data) {
      throw new Error(`Error en respuesta de BingX: ${response.data.msg || 'Desconocido'}`);
    }
    
    // Transformar datos de BingX al formato interno
    return response.data.data.map((candle: any) => ({
      time: candle.time,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume)
    }));
  } catch (error) {
    console.error('Error obteniendo datos de BingX:', error);
    return [];
  }
};

/**
 * Adapta los datos de velas al formato esperado por Lightweight Charts
 */
export const adaptCandlesToLightweightCharts = (candles: CandleData[]) => {
  return candles.map(candle => ({
    time: Math.floor(candle.time / 1000), // Convertir de ms a segundos
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume
  }));
};

/**
 * Obtiene datos de mercado actuales de Binance
 * 
 * @param symbol Par de trading (ej: "BTCUSDT")
 */
export const getBinanceMarketData = async (symbol: string) => {
  try {
    const response = await axios.get(`${EXCHANGES.binance.api}/api/v3/ticker/24hr`, {
      params: {
        symbol: symbol.toUpperCase()
      }
    });
    
    return {
      symbol: response.data.symbol,
      priceChange: parseFloat(response.data.priceChange),
      priceChangePercent: parseFloat(response.data.priceChangePercent),
      lastPrice: parseFloat(response.data.lastPrice),
      volume: parseFloat(response.data.volume),
      high: parseFloat(response.data.highPrice),
      low: parseFloat(response.data.lowPrice)
    };
  } catch (error) {
    console.error('Error obteniendo datos de mercado de Binance:', error);
    return null;
  }
};

// Exportar información sobre los exchanges disponibles
export const getAvailableExchanges = () => {
  return Object.keys(EXCHANGES).map(key => ({
    id: key,
    ...EXCHANGES[key]
  }));
};
