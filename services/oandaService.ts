import axios from 'axios';
import { ChartCandlestickData, TickerData } from '../types';

// Configuración de la API de OANDA
const OANDA_API_KEY = process.env.OANDA_API_KEY || '';
const OANDA_ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID || '';
const OANDA_API_URL = 'https://api-fxpractice.oanda.com'; // URL para cuenta práctica, cambiar a api-fxtrade.oanda.com para cuentas reales

// Configuración de cabeceras para las peticiones
const headers = {
  'Authorization': `Bearer ${OANDA_API_KEY}`,
  'Content-Type': 'application/json',
};

// Mapeo de intervalos
const timeframeToOandaGranularity: Record<string, string> = {
  '1m': 'M1',
  '5m': 'M5',
  '15m': 'M15',
  '30m': 'M30',
  '1h': 'H1',
  '4h': 'H4',
  '1d': 'D',
  '1w': 'W',
  '1M': 'M',
};

// Convertir formato de símbolos para OANDA
// OANDA usa underscore: EUR_USD en lugar de EUR/USD
const formatOandaSymbol = (symbol: string): string => {
  // Si ya tiene formato de OANDA con underscore, no modificar
  if (symbol.includes('_')) {
    return symbol;
  }

  // Reemplazar '/' con '_'
  if (symbol.includes('/')) {
    return symbol.replace('/', '_');
  }

  // Si es formato compacto como EURUSD, insertar underscore
  if (symbol.length === 6) {
    return `${symbol.substring(0, 3)}_${symbol.substring(3, 6)}`;
  }

  return symbol;
};

// Obtener datos históricos de OANDA
export const getHistoricalData = async (
  symbol: string,
  timeframe: string,
  count: number = 500
): Promise<ChartCandlestickData[]> => {
  try {
    const formattedSymbol = formatOandaSymbol(symbol);
    const granularity = timeframeToOandaGranularity[timeframe.toLowerCase()] || 'D';

    const response = await axios.get(`${OANDA_API_URL}/v3/instruments/${formattedSymbol}/candles`, {
      headers,
      params: {
        granularity,
        count,
        price: 'M', // Midpoint por defecto
      },
    });

    // Convertir los datos recibidos al formato que usa nuestra aplicación
    const candles = response.data.candles.map((candle: any) => {
      // OANDA proporciona tiempo en formato ISO
      const time = Math.floor(new Date(candle.time).getTime() / 1000);
      
      // Obtener datos de precio medio
      const open = parseFloat(candle.mid.o);
      const high = parseFloat(candle.mid.h);
      const low = parseFloat(candle.mid.l);
      const close = parseFloat(candle.mid.c);
      
      // OANDA proporciona el volumen como el número de transacciones
      const volume = candle.volume;

      return {
        time,
        open,
        high,
        low,
        close,
        volume,
      } as ChartCandlestickData;
    });

    return candles;
  } catch (error) {
    console.error('Error obteniendo datos históricos de OANDA:', error);
    throw error;
  }
};

// Obtener el precio actual y datos del ticker
export const getCurrentTickerData = async (symbol: string): Promise<TickerData> => {
  try {
    const formattedSymbol = formatOandaSymbol(symbol);

    // Obtener precio actual
    const priceResponse = await axios.get(`${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/pricing`, {
      headers,
      params: {
        instruments: formattedSymbol,
      },
    });

    if (!priceResponse.data.prices || priceResponse.data.prices.length === 0) {
      throw new Error(`No se encontraron datos de precio para ${symbol}`);
    }

    const priceData = priceResponse.data.prices[0];
    
    // Calculamos el precio medio entre bid y ask
    const bid = parseFloat(priceData.bids[0].price);
    const ask = parseFloat(priceData.asks[0].price);
    const midPrice = (bid + ask) / 2;

    // Crear nombre para mostrar desde el símbolo formateado (EUR_USD -> EUR/USD)
    const displayName = formattedSymbol.replace('_', '/');

    return {
      provider: 'oanda',
      symbol: formattedSymbol,
      marketType: 'forex',
      price: midPrice,
      // OANDA no proporciona cambio porcentual directamente
      lastPriceChange: 'none', // No podemos determinar esto con una sola consulta
      displayName,
    };
  } catch (error) {
    console.error('Error obteniendo datos actuales de OANDA:', error);
    throw error;
  }
};

// Obtener instrumentos disponibles en OANDA
export const getAvailableInstruments = async (): Promise<{ symbol: string, name: string }[]> => {
  try {
    const response = await axios.get(`${OANDA_API_URL}/v3/accounts/${OANDA_ACCOUNT_ID}/instruments`, {
      headers,
    });

    return response.data.instruments.map((instrument: any) => ({
      symbol: instrument.name,
      name: `${instrument.displayName} (${instrument.name})`,
    }));
  } catch (error) {
    console.error('Error obteniendo instrumentos disponibles en OANDA:', error);
    
    // Devolver algunos pares principales de forex como respaldo
    return [
      { symbol: 'EUR_USD', name: 'Euro/US Dollar (EUR_USD)' },
      { symbol: 'USD_JPY', name: 'US Dollar/Japanese Yen (USD_JPY)' },
      { symbol: 'GBP_USD', name: 'British Pound/US Dollar (GBP_USD)' },
      { symbol: 'AUD_USD', name: 'Australian Dollar/US Dollar (AUD_USD)' },
      { symbol: 'USD_CAD', name: 'US Dollar/Canadian Dollar (USD_CAD)' },
      { symbol: 'USD_CHF', name: 'US Dollar/Swiss Franc (USD_CHF)' },
      { symbol: 'NZD_USD', name: 'New Zealand Dollar/US Dollar (NZD_USD)' },
    ];
  }
};
