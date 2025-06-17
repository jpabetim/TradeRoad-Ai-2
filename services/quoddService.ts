import axios from 'axios';

// Tipos para los datos de QUODD
export interface QuoddSnapResponse {
  Ticker: string;
  Currency?: string;
  Ask: number;
  AskSize: number;
  AskMarket?: string;
  Bid: number;
  BidSize: number;
  BidMarket?: string;
  Open: number;
  High: number;
  Low: number;
  PreviousClose: number;
  Last: number;
  LastMarket?: string;
  LastSize: number;
  LastTimestamp: string;
  QuoteTimestamp: string;
  NumberOfTrades: number;
  TotalVolume: number;
  VWAP?: number;
  YearHigh?: number;
  YearLow?: number;
  TradingStatus?: string;
  Change: number;
  ChangePct: number;
  Feed?: string;
  IsDelayed: boolean;
  Error?: string;
}

// Configuración
const QUODD_API_BASE_URL = 'https://api.quodd.com';
let authToken = '';

// Variable para mock/credenciales de prueba
// NOTA: Reemplazar esto con tus credenciales reales después de registrarte en QUODD
const TRIAL_USERNAME = 'YOUR_TRIAL_USERNAME';
const TRIAL_PASSWORD = 'YOUR_TRIAL_PASSWORD';

/**
 * Autenticación con QUODD para obtener token
 * El token es válido por 24 horas
 */
export async function authenticate(): Promise<boolean> {
  try {
    console.log('Autenticando con QUODD...');
    
    // SIMULACIÓN: En una aplicación real, esto haría una solicitud real a la API
    // const response = await axios.post(`${QUODD_API_BASE_URL}/token/trial`, {
    //   username: TRIAL_USERNAME,
    //   password: TRIAL_PASSWORD
    // });
    // authToken = response.data.token;
    
    // Para fines de demostración, simulamos un token exitoso
    authToken = 'mock_token_for_demo';
    
    console.log('✅ Autenticación exitosa con QUODD');
    return true;
  } catch (error) {
    console.error('❌ Error de autenticación con QUODD:', error);
    return false;
  }
}

/**
 * Verificar si el token existe y renovarlo si es necesario
 */
async function ensureAuthenticated(): Promise<boolean> {
  if (!authToken) {
    return await authenticate();
  }
  return true;
}

/**
 * Obtener datos en tiempo real para un símbolo
 */
export async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    await ensureAuthenticated();
    
    // Simulamos un delay breve para imitar una llamada real a la API de tiempo real
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Determinar precio base según el símbolo para mayor consistencia
    let basePrice = 0;
    if (symbol.includes('BTC')) {
      basePrice = 50000 + Math.random() * 2000;
    } else if (symbol.includes('ETH')) {
      basePrice = 2500 + Math.random() * 200;
    } else if (symbol.includes('SOL')) {
      basePrice = 120 + Math.random() * 10;
    } else if (symbol.includes('AAPL')) {
      basePrice = 180 + Math.random() * 10;
    } else if (symbol.includes('TSLA')) {
      basePrice = 250 + Math.random() * 15;
    } else if (symbol.includes('SPY')) {
      basePrice = 450 + Math.random() * 10;
    } else {
      basePrice = 100 + Math.random() * 900; // Para otros símbolos
    }
    
    // Volatilidad base según el tipo de activo
    let volatility = 0.001; // 0.1% para cotización en tiempo real (menos que histórica)
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL')) {
      volatility = 0.003; // 0.3% para criptomonedas
    }
    
    // Determina si el precio se mueve hacia arriba o abajo
    const direction = Math.random() > 0.5 ? 1 : -1;
    const movement = direction * Math.random() * volatility;
    
    // Datos simulados para demostración con precios más realistas
    const mockData: QuoddSnapResponse = {
      Ticker: symbol,
      Ask: parseFloat((basePrice * (1 + Math.random() * 0.001)).toFixed(2)),
      AskSize: Math.floor(Math.random() * 100),
      Bid: parseFloat((basePrice * (1 - Math.random() * 0.001)).toFixed(2)),
      BidSize: Math.floor(Math.random() * 100),
      Open: parseFloat((basePrice * (1 - Math.random() * 0.01)).toFixed(2)),
      High: parseFloat((basePrice * (1 + Math.random() * 0.01)).toFixed(2)),
      Low: parseFloat((basePrice * (1 - Math.random() * 0.01)).toFixed(2)),
      PreviousClose: parseFloat((basePrice * (1 - Math.random() * 0.005)).toFixed(2)),
      Last: parseFloat((basePrice * (1 + movement)).toFixed(2)),
      LastSize: Math.floor(Math.random() * 100),
      LastTimestamp: new Date().toISOString(),
      QuoteTimestamp: new Date().toISOString(),
      NumberOfTrades: Math.floor(Math.random() * 1000),
      TotalVolume: Math.floor(basePrice * 100 * (0.8 + Math.random() * 0.4)),
      Change: parseFloat((basePrice * movement).toFixed(2)),
      ChangePct: parseFloat((movement * 100).toFixed(2)),
      IsDelayed: false
    };
    
    console.log(`Precio actual para ${symbol}: ${mockData.Last}`);
    return mockData.Last;
  } catch (error) {
    console.error(`❌ Error al obtener precio actual para ${symbol}:`, error);
    return null;
  }
}

/**
 * Obtener datos históricos para un símbolo
 * Nota: QUODD tiene diferentes endpoints para datos históricos que necesitarían implementarse
 * con las credenciales reales.
 */
export async function getHistoricalData(
  symbol: string,
  timeframe: string = '1d',
  limit: number = 100
): Promise<any[]> {
  try {
    await ensureAuthenticated();
    
    // Simulamos un delay para imitar una llamada real a la API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log(`Obteniendo datos históricos para ${symbol}, timeframe: ${timeframe}, limit: ${limit}`);
    
    // Generar datos históricos simulados más realistas
    const mockHistoricalData = [];
    const now = new Date();
    let currentTimestamp = now.getTime();
    
    // Convertir timeframe a milisegundos para simulación
    const timeframeInMs = timeframeToMilliseconds(timeframe);
    
    // Determinar precio base según el símbolo para mayor consistencia
    let basePrice = 0;
    if (symbol.includes('BTC')) {
      basePrice = 50000 + Math.random() * 2000;
    } else if (symbol.includes('ETH')) {
      basePrice = 2500 + Math.random() * 200;
    } else if (symbol.includes('SOL')) {
      basePrice = 120 + Math.random() * 10;
    } else if (symbol.includes('AAPL')) {
      basePrice = 180 + Math.random() * 10;
    } else if (symbol.includes('TSLA')) {
      basePrice = 250 + Math.random() * 15;
    } else if (symbol.includes('SPY')) {
      basePrice = 450 + Math.random() * 10;
    } else {
      basePrice = 100 + Math.random() * 900; // Para otros símbolos
    }
    
    // Volatilidad base según el tipo de activo
    let volatility = 0.01; // 1% por defecto
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL')) {
      volatility = 0.03; // 3% para criptomonedas
    }
    
    let lastClose = basePrice;
    let lastHigh = basePrice;
    let lastLow = basePrice;
    
    for (let i = 0; i < limit; i++) {
      const timestamp = new Date(currentTimestamp).toISOString();
      
      // Crear movimientos más realistas
      const changePercent = (Math.random() * 2 - 1) * volatility;
      const close = lastClose * (1 + changePercent);
      const open = lastClose * (1 + (Math.random() * 2 - 1) * volatility * 0.5);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.8);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.8);
      const volume = Math.floor(basePrice * 100 * (0.8 + Math.random() * 0.4));
      
      mockHistoricalData.unshift({
        timestamp: timestamp,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume
      });
      
      // Actualizar los valores para el próximo ciclo
      lastClose = close;
      lastHigh = high;
      lastLow = low;
      
      currentTimestamp -= timeframeInMs;
    }
    
    return mockHistoricalData;
  } catch (error) {
    console.error(`❌ Error al obtener datos históricos para ${symbol}:`, error);
    return [];
  }
}

/**
 * Convertir formato de timeframe a milisegundos
 */
function timeframeToMilliseconds(timeframe: string): number {
  const unit = timeframe.charAt(timeframe.length - 1);
  const value = parseInt(timeframe.substring(0, timeframe.length - 1));
  
  switch (unit) {
    case 'm': // minutos
      return value * 60 * 1000;
    case 'h': // horas
      return value * 60 * 60 * 1000;
    case 'd': // días
      return value * 24 * 60 * 60 * 1000;
    case 'w': // semanas
      return value * 7 * 24 * 60 * 60 * 1000;
    case 'M': // meses (aproximado)
      return value * 30 * 24 * 60 * 60 * 1000;
    default:
      console.error(`Formato de tiempo no reconocido: ${timeframe}`);
      return 24 * 60 * 60 * 1000; // 1 día por defecto
  }
}

/**
 * Obtiene los símbolos disponibles
 * Nota: En una implementación real, esto obtendría los símbolos disponibles desde QUODD
 * Ahora devuelve una promesa para simular mejor el comportamiento real de una API
 */
export async function getAvailableSymbols(): Promise<string[]> {
  await ensureAuthenticated();
  
  // Simulamos un delay para imitar una llamada real a la API
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Símbolos populares para demostración
  return [
    'BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD',
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX',
    'TSLA', 'NVDA', 'AMD', 'INTC', 'JPM', 'BAC',
    'EUR-USD', 'GBP-USD', 'JPY-USD', 'CHF-USD',
    'SPY', 'QQQ', 'IWM', 'DIA', 'XLE', 'XLF'
  ];
}

/**
 * Obtener los timeframes disponibles
 */
export function getAvailableTimeframes(): string[] {
  return ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
}

/**
 * Lista de mercados disponibles para mostrar en la UI
 */
export function getAvailableMarkets(): string[] {
  return [
    'US Stocks', 
    'Crypto', 
    'Forex', 
    'Indices',
    'ETFs'
  ];
}
