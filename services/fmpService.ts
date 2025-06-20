/**
 * Financial Modeling Prep (FMP) API Service
 * Proporciona acceso a datos financieros incluyendo precios de acciones y criptomonedas
 */

import axios from 'axios';

// Tipos para los datos devueltos por la API
export interface FMPHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Campo opcional para nuestros datos simulados (no presente en la API real)
  timestamp?: number;
}

export interface FMPQuote {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  name: string;
  timestamp: number;
}

// Configuración base del servicio
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// La API key se obtiene del objeto window.CONFIG que se configura en index.html
const getApiKey = (): string => {
  const config = (window as any).CONFIG || {};
  return config.FMP_API_KEY || '';
};

// Comprueba si estamos usando una clave API dummy
const isUsingDummyKey = (): boolean => {
  const apiKey = getApiKey();
  return !apiKey || apiKey === 'dummy_fmp_api_key_for_development';
};

/**
 * Convierte el intervalo de tiempo a segundos
 */
const getIntervalSeconds = (interval: string): number => {
  if (interval.includes('min')) {
    // Formato: 1min, 5min, 15min, etc.
    const minutes = parseInt(interval);
    return minutes * 60;
  } else if (interval.includes('hour') || interval.includes('h')) {
    // Formato: 1h, 4h, etc.
    const hours = parseInt(interval);
    return hours * 3600;
  } else if (interval.includes('day') || interval === 'daily') {
    return 86400; // 24 horas en segundos
  } else if (interval.includes('week')) {
    return 604800; // 7 días en segundos
  } else if (interval.includes('month')) {
    return 2592000; // 30 días en segundos (aproximado)
  }
  return 86400; // Diario por defecto
};

/**
 * Devuelve un precio base simulado según el símbolo
 */
const getPriceScaleForSymbol = (symbol: string): number => {
  if (symbol.includes('BTC') || symbol.includes('BTCUSD')) return 45000;
  if (symbol.includes('ETH') || symbol.includes('ETHUSD')) return 3200;
  if (symbol.includes('AAPL')) return 175;
  if (symbol.includes('MSFT')) return 330;
  if (symbol.includes('GOOGL')) return 140;
  if (symbol.includes('AMZN')) return 180;
  if (symbol.includes('FB') || symbol.includes('META')) return 500;
  if (symbol.includes('SPX') || symbol.includes('SPY')) return 5200;
  return 100; // Valor predeterminado
};

/**
 * Devuelve la volatilidad simulada según el símbolo
 */
const getVolatilityForSymbol = (symbol: string): number => {
  if (symbol.includes('BTC') || symbol.includes('BTCUSD')) return 0.03;
  if (symbol.includes('ETH') || symbol.includes('ETHUSD')) return 0.04;
  if (symbol.includes('SPX') || symbol.includes('SPY')) return 0.01;
  return 0.02; // Volatilidad predeterminada
};

// Genera datos históricos de ejemplo para desarrollo
const getExampleHistoricalData = (symbol: string, interval: string, limit = 100): FMPHistoricalPrice[] => {
  console.log(`Usando datos de desarrollo para ${symbol} (${interval})`);
  
  const data: FMPHistoricalPrice[] = [];
  
  // Simular precio base según el símbolo
  let basePrice = getPriceScaleForSymbol(symbol);
  
  // Calcular intervalo en segundos para simular candles
  const intervalSeconds = getIntervalSeconds(interval);
  
  // Fecha actual para empezar a generar datos hacia atrás
  const currentDate = new Date();
  
  for (let i = 0; i < limit; i++) {
    // Generar datos de precio realistas con volatilidad basada en el símbolo
    const volatilityFactor = getVolatilityForSymbol(symbol);
    const change = (Math.random() - 0.5) * basePrice * volatilityFactor;
    
    const open = basePrice;
    const close = Math.max(0.01, basePrice + change);
    const high = Math.max(open, close) + Math.random() * basePrice * volatilityFactor * 0.5;
    const low = Math.min(open, close) - Math.random() * basePrice * volatilityFactor * 0.5;
    
    // Crear un volumen realista
    const volume = Math.floor(Math.random() * 1000000) + 50000;
    
    // Calcular timestamp para esta vela según el intervalo
    const timestamp = Math.floor((currentDate.getTime() / 1000) - (i * intervalSeconds));
    
    // Actualizar el precio base para la siguiente iteración
    basePrice = close;
    
    // La fecha como string en formato ISO para mantener compatibilidad con la estructura
    // que devuelve la API real de FMP
    const dateStr = new Date(timestamp * 1000).toISOString().split('T')[0];
    
    data.push({
      date: dateStr,
      open,
      high,
      low,
      close,
      volume,
      // Añadimos el timestamp limpio en formato UTCTimestamp (segundos)
      timestamp
    });
  }
  
  // Ordenar de más antiguo a más reciente
  return data.reverse();
};

/**
 * Obtiene datos históricos para un símbolo (acción o criptomoneda)
 * @param symbol Símbolo a consultar (ej: "AAPL" o "BTC")
 * @param interval Intervalo de tiempo ("1min", "5min", "15min", "30min", "1hour", "4hour", "daily")
 * @param limit Número máximo de registros a devolver
 */
export const getHistoricalData = async (
  symbol: string,
  interval: string = 'daily',
  limit: number = 100
): Promise<FMPHistoricalPrice[]> => {
  // Si estamos usando una clave API dummy, devolver datos ficticios
  if (isUsingDummyKey()) {
    console.log(`Usando datos de desarrollo para ${symbol} (${interval})`); 
    return getExampleHistoricalData(symbol, interval, limit);
  }
  
  try {
    // Convertir intervalo de tiempo al formato esperado por FMP
    const fmpInterval = mapIntervalToFMP(interval);
    
    // Construir la URL correcta según el tipo de intervalo
    let endpoint = '';
    if (fmpInterval === 'daily') {
      endpoint = `/historical-price-full/${symbol}?timeseries=${limit}`;
    } else {
      endpoint = `/historical-chart/${fmpInterval}/${symbol}?limit=${limit}`;
    }
    
    const response = await axios.get(`${BASE_URL}${endpoint}&apikey=${getApiKey()}`);
    
    // FMP devuelve datos en diferentes formatos según el endpoint
    if (response.data.historical) {
      return response.data.historical;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error obteniendo datos históricos de FMP:', error);
    console.log('Fallback a datos de desarrollo...');
    return getExampleHistoricalData(symbol, interval, limit);
  }
};

// Genera datos de cotización de ejemplo para desarrollo
const getExampleQuotes = (symbols: string[]): FMPQuote[] => {
  const now = new Date();
  const timestamp = now.getTime();
  
  return symbols.map(symbol => {
    let price = 100;
    let name = 'Stock';
    
    // Configuraciones específicas por símbolo
    if (symbol.includes('BTC') || symbol.includes('BTCUSD')) {
      price = 45000 + (Math.random() - 0.5) * 1000;
      name = 'Bitcoin';
    } else if (symbol.includes('ETH') || symbol.includes('ETHUSD')) {
      price = 3200 + (Math.random() - 0.5) * 100;
      name = 'Ethereum';
    } else if (symbol.includes('AAPL')) {
      price = 175 + (Math.random() - 0.5) * 3;
      name = 'Apple Inc.';
    } else if (symbol.includes('MSFT')) {
      price = 320 + (Math.random() - 0.5) * 5;
      name = 'Microsoft Corporation';
    } else if (symbol.includes('GOOGL')) {
      price = 140 + (Math.random() - 0.5) * 2;
      name = 'Alphabet Inc.';
    }
    
    const change = (Math.random() - 0.5) * price * 0.02;
    const changePercent = (change / price) * 100;
    
    return {
      symbol,
      price,
      volume: Math.floor(Math.random() * 10000000) + 500000,
      change,
      changePercent,
      name,
      timestamp
    };
  });
};

/**
 * Obtiene cotizaciones en tiempo real
 * @param symbol Símbolo o símbolos separados por coma (ej: "AAPL" o "AAPL,MSFT,GOOGL")
 */
export const getQuote = async (symbol: string): Promise<FMPQuote[]> => {
  // Si estamos usando una clave API dummy, devolver datos ficticios
  if (isUsingDummyKey()) {
    console.log(`Usando datos de cotización de desarrollo para ${symbol}`);
    const symbols = symbol.split(',').map(s => s.trim());
    return getExampleQuotes(symbols);
  }
  
  try {
    const response = await axios.get(
      `${BASE_URL}/quote/${symbol}?apikey=${getApiKey()}`
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo cotización de FMP:', error);
    // Fallback a datos de ejemplo
    console.log('Fallback a datos de cotización de desarrollo...');
    const symbols = symbol.split(',').map(s => s.trim());
    return getExampleQuotes(symbols);
  }
};

/**
 * Obtiene datos de criptomonedas en tiempo real
 * @param symbol Símbolo o símbolos separados por coma (ej: "BTCUSD" o "BTCUSD,ETHUSD")
 */
export const getCryptoQuote = async (symbol: string): Promise<FMPQuote[]> => {
  // Si estamos usando una clave API dummy, devolver datos ficticios
  if (isUsingDummyKey()) {
    console.log(`Usando datos de cotización crypto de desarrollo para ${symbol}`);
    const symbols = symbol.split(',').map(s => s.trim());
    return getExampleQuotes(symbols);
  }
  
  try {
    const response = await axios.get(
      `${BASE_URL}/quote/${symbol}?apikey=${getApiKey()}`
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo cotización de criptomoneda de FMP:', error);
    // Fallback a datos de ejemplo
    console.log('Fallback a datos de cotización crypto de desarrollo...');
    const symbols = symbol.split(',').map(s => s.trim());
    return getExampleQuotes(symbols);
  }
};

/**
 * Convierte el formato de intervalo interno al formato esperado por FMP
 */
const mapIntervalToFMP = (interval: string): string => {
  const intervalMap: Record<string, string> = {
    '1min': '1min',
    '5min': '5min',
    '15min': '15min',
    '30min': '30min',
    '1hour': '1hour',
    '4hour': '4hour',
    'daily': 'daily',
    '1d': 'daily',
    '1w': 'weekly',
    '1M': 'monthly'
  };
  
  return intervalMap[interval] || 'daily';
};

/**
 * Adapta los datos de FMP al formato esperado por el componente de gráficos
 */
export const adaptFMPDataToCandlestick = (data: FMPHistoricalPrice[]) => {
  return data
    .filter(item => {
      // Filtrar cualquier dato inválido o null
      if (!item || typeof item !== 'object') return false;
      return true;
    })
    .map(item => {
      // Asegurarse de que tenemos un timestamp numérico válido
      let time: number;
      
      if (typeof (item as any).timestamp === 'number') {
        // Usar el timestamp directamente si ya existe
        time = (item as any).timestamp;
      } else if (item.date) {
        try {
          // Intentar convertir la fecha string a timestamp
          time = Math.floor(new Date(item.date).getTime() / 1000);
          // Verificar que tenemos un timestamp válido
          if (isNaN(time) || time <= 0) {
            console.error('Fecha inválida encontrada:', item.date);
            // Usar fecha actual como fallback si la conversión falla
            time = Math.floor(Date.now() / 1000);
          }
        } catch (e) {
          console.error('Error al procesar fecha:', e);
          // Usar fecha actual como fallback
          time = Math.floor(Date.now() / 1000);
        }
      } else {
        // Si no hay ni timestamp ni date, usar fecha actual
        console.error('Dato sin fecha encontrado:', item);
        time = Math.floor(Date.now() / 1000);
      }
      
      return {
        time, // La biblioteca Lightweight Charts espera un UTCTimestamp en segundos
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      };
    })
    .reverse(); // FMP devuelve los datos con el más reciente primero, necesitamos invertirlos
};
