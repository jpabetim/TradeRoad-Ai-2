import axios from 'axios';
import { ChartCandlestickData, MarketType, TickerData } from '../types';

// Claves de API
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

// Configuración de intervalos
const timeframeToAlphaVantageInterval: Record<string, string> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '60min',
  '1d': 'daily',
  '1w': 'weekly',
  '1M': 'monthly',
};

// Mapeo de símbolos para diferentes tipos de mercado
const getFormattedSymbol = (symbol: string, marketType: MarketType): string => {
  switch (marketType) {
    case 'forex':
      // Asumimos que el formato de entrada es 'EURUSD', lo convertimos a 'EUR/USD' para Alpha Vantage
      if (symbol.length === 6 && !symbol.includes('/')) {
        return `${symbol.substring(0, 3)}/${symbol.substring(3, 6)}`;
      }
      return symbol;
    case 'commodities':
      // Para commodities, podemos necesitar prefijos especiales
      if (!symbol.includes(':')) {
        return `COMMODITY:${symbol}`;
      }
      return symbol;
    default:
      return symbol;
  }
};

// Obtener datos históricos de Alpha Vantage
export const getHistoricalData = async (
  symbol: string,
  timeframe: string,
  marketType: MarketType
): Promise<ChartCandlestickData[]> => {
  try {
    const formattedSymbol = getFormattedSymbol(symbol, marketType);
    const interval = timeframeToAlphaVantageInterval[timeframe.toLowerCase()] || 'daily';
    
    let endpoint = '';
    let functionName = '';
    
    switch (marketType) {
      case 'forex':
        functionName = 'FX_' + (interval === 'daily' || interval === 'weekly' || interval === 'monthly' ? 
                        interval.toUpperCase() : 'INTRADAY');
        break;
      case 'stocks':
        functionName = interval === 'daily' || interval === 'weekly' || interval === 'monthly' ? 
                      'TIME_SERIES_' + interval.toUpperCase() : 'TIME_SERIES_INTRADAY';
        break;
      case 'commodities':
        // Para commodities, Alpha Vantage suele usar la misma API que para stocks
        functionName = interval === 'daily' || interval === 'weekly' || interval === 'monthly' ? 
                      'TIME_SERIES_' + interval.toUpperCase() : 'TIME_SERIES_INTRADAY';
        break;
      case 'indices':
        // Índices globales
        functionName = interval === 'daily' || interval === 'weekly' || interval === 'monthly' ? 
                      'TIME_SERIES_' + interval.toUpperCase() : 'TIME_SERIES_INTRADAY';
        break;
      default:
        throw new Error(`Tipo de mercado no soportado: ${marketType}`);
    }

    // Construir la URL de la API
    let params: Record<string, string> = {
      function: functionName,
      apikey: ALPHA_VANTAGE_API_KEY
    };

    if (marketType === 'forex') {
      const [fromCurrency, toCurrency] = formattedSymbol.split('/');
      params = {
        ...params,
        from_symbol: fromCurrency,
        to_symbol: toCurrency,
      };
    } else {
      params = {
        ...params,
        symbol: formattedSymbol,
      };
    }

    if (functionName.includes('INTRADAY')) {
      params.interval = interval;
      params.outputsize = 'full';
    }

    const response = await axios.get('https://www.alphavantage.co/query', {
      params
    });

    if (response.data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${response.data['Error Message']}`);
    }

    if (response.data['Information']) {
      console.warn(`Alpha Vantage info: ${response.data['Information']}`);
    }

    // Procesar la respuesta según el tipo de datos
    const candleData: ChartCandlestickData[] = [];
    let timeSeriesData: any;

    if (marketType === 'forex') {
      if (functionName === 'FX_INTRADAY') {
        timeSeriesData = response.data['Time Series FX ('+interval+')'];
      } else if (functionName === 'FX_DAILY') {
        timeSeriesData = response.data['Time Series FX (Daily)'];
      } else if (functionName === 'FX_WEEKLY') {
        timeSeriesData = response.data['Time Series FX (Weekly)'];
      } else {
        timeSeriesData = response.data['Time Series FX (Monthly)'];
      }
    } else {
      // Para stocks, índices y commodities
      if (functionName === 'TIME_SERIES_INTRADAY') {
        timeSeriesData = response.data[`Time Series (${interval})`];
      } else if (functionName === 'TIME_SERIES_DAILY') {
        timeSeriesData = response.data['Time Series (Daily)'];
      } else if (functionName === 'TIME_SERIES_WEEKLY') {
        timeSeriesData = response.data['Weekly Time Series'];
      } else {
        timeSeriesData = response.data['Monthly Time Series'];
      }
    }

    if (!timeSeriesData) {
      console.error('Estructura de datos inesperada de Alpha Vantage:', response.data);
      throw new Error('No se pudieron encontrar los datos de series temporales en la respuesta');
    }

    // Convertir los datos a nuestro formato de velas
    Object.entries(timeSeriesData).forEach(([timestamp, values]: [string, any]) => {
      const time = new Date(timestamp).getTime() / 1000; // Convertir a timestamp UNIX en segundos
      
      // Las claves pueden variar dependiendo del endpoint
      const open = parseFloat(values['1. open'] || values.open);
      const high = parseFloat(values['2. high'] || values.high);
      const low = parseFloat(values['3. low'] || values.low);
      const close = parseFloat(values['4. close'] || values.close);
      const volume = parseFloat(values['5. volume'] || values['6. volume'] || values.volume || '0');
      
      candleData.push({
        time,
        open,
        high,
        low,
        close,
        volume
      });
    });

    // Ordenar por tiempo ascendente
    return candleData.sort((a, b) => a.time - b.time);

  } catch (error) {
    console.error('Error obteniendo datos de Alpha Vantage:', error);
    throw error;
  }
};

// Obtener datos de ticker actual
export const getCurrentTickerData = async (
  symbol: string,
  marketType: MarketType
): Promise<TickerData> => {
  try {
    const formattedSymbol = getFormattedSymbol(symbol, marketType);
    let endpoint: string;
    let params: Record<string, string>;

    switch (marketType) {
      case 'forex':
        const [fromCurrency, toCurrency] = formattedSymbol.split('/');
        endpoint = 'https://www.alphavantage.co/query';
        params = {
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: fromCurrency,
          to_currency: toCurrency,
          apikey: ALPHA_VANTAGE_API_KEY
        };
        break;
        
      case 'stocks':
      case 'indices':
      case 'commodities':
        endpoint = 'https://www.alphavantage.co/query';
        params = {
          function: 'GLOBAL_QUOTE',
          symbol: formattedSymbol,
          apikey: ALPHA_VANTAGE_API_KEY
        };
        break;
        
      default:
        throw new Error(`Tipo de mercado no soportado: ${marketType}`);
    }

    const response = await axios.get(endpoint, { params });
    
    // Procesar la respuesta según el tipo de datos
    let price: number = 0;
    let changePercent: number = 0;
    let volume: number = 0;
    
    if (marketType === 'forex') {
      const exchangeData = response.data['Realtime Currency Exchange Rate'];
      if (exchangeData) {
        price = parseFloat(exchangeData['5. Exchange Rate']);
        // Alpha Vantage no proporciona el cambio porcentual en este endpoint
      } else {
        throw new Error('No se encontraron datos de tipo de cambio');
      }
    } else {
      // Para stocks, índices y commodities
      const quoteData = response.data['Global Quote'];
      if (quoteData) {
        price = parseFloat(quoteData['05. price']);
        changePercent = parseFloat(quoteData['10. change percent'].replace('%', ''));
        volume = parseFloat(quoteData['06. volume']);
      } else {
        throw new Error('No se encontraron datos de cotización global');
      }
    }

    // Crear el objeto TickerData
    return {
      provider: 'alphavantage',
      symbol: formattedSymbol,
      marketType,
      price,
      changePercent,
      volume,
      lastPriceChange: 'none', // No tenemos información de la última dirección del cambio
      displayName: formattedSymbol // Usar el símbolo formateado como nombre de visualización
    };
    
  } catch (error) {
    console.error('Error obteniendo datos actuales de Alpha Vantage:', error);
    throw error;
  }
};

// Obtener símbolos disponibles por tipo de mercado
export const getAvailableSymbols = async (marketType: MarketType): Promise<{symbol: string, name: string}[]> => {
  try {
    let endpoint = 'https://www.alphavantage.co/query';
    let params: Record<string, string> = {
      apikey: ALPHA_VANTAGE_API_KEY
    };
    
    switch (marketType) {
      case 'forex':
        params.function = 'CURRENCY_EXCHANGE_RATE';
        params.from_currency = 'EUR';
        params.to_currency = 'USD';
        // Alpha Vantage no tiene un endpoint específico para listar pares forex,
        // esta es solo una consulta de ejemplo para verificar que la API funciona
        return [
          { symbol: 'EUR/USD', name: 'Euro / US Dollar' },
          { symbol: 'GBP/USD', name: 'British Pound / US Dollar' },
          { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
          { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
          { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
          { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc' },
          { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar' },
          { symbol: 'EUR/GBP', name: 'Euro / British Pound' },
          { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen' },
          { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen' }
        ];
        
      case 'commodities':
        // Ejemplos de commodities disponibles
        return [
          { symbol: 'WTI', name: 'West Texas Intermediate Crude Oil' },
          { symbol: 'BRENT', name: 'Brent Crude Oil' },
          { symbol: 'NATURAL_GAS', name: 'Natural Gas' },
          { symbol: 'COPPER', name: 'Copper' },
          { symbol: 'ALUMINUM', name: 'Aluminum' },
          { symbol: 'WHEAT', name: 'Wheat' },
          { symbol: 'CORN', name: 'Corn' },
          { symbol: 'COTTON', name: 'Cotton' },
          { symbol: 'SUGAR', name: 'Sugar' },
          { symbol: 'COFFEE', name: 'Coffee' },
          { symbol: 'XAU', name: 'Gold Spot Price' },
          { symbol: 'XAG', name: 'Silver Spot Price' },
          { symbol: 'XPT', name: 'Platinum Spot Price' }
        ];
        
      case 'indices':
        // Ejemplos de índices disponibles
        return [
          { symbol: 'SPX', name: 'S&P 500' },
          { symbol: 'DJI', name: 'Dow Jones Industrial Average' },
          { symbol: 'IXIC', name: 'NASDAQ Composite' },
          { symbol: 'RUT', name: 'Russell 2000' },
          { symbol: 'FTSE', name: 'FTSE 100' },
          { symbol: 'DAX', name: 'DAX Performance Index' },
          { symbol: 'CAC', name: 'CAC 40' },
          { symbol: 'N225', name: 'Nikkei 225' },
          { symbol: 'HSI', name: 'Hang Seng Index' },
          { symbol: 'SSEC', name: 'Shanghai Composite Index' },
          { symbol: 'IBEX', name: 'IBEX 35' }
        ];
        
      default:
        throw new Error(`No se pueden listar símbolos para el tipo de mercado: ${marketType}`);
    }
  } catch (error) {
    console.error('Error obteniendo símbolos disponibles:', error);
    return [];
  }
};
