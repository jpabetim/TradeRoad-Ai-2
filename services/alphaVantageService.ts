import axios from 'axios';
import { ChartCandlestickData } from '../types';

// FORMA CORRECTA DE LEER LA API KEY CON VITE
const getAlphaVantageApiKey = (): string => {
  return import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '';
};

const timeframeToAlphaVantageInterval: Record<string, string> = {
  '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min', 
  '1h': '60min', '1d': 'daily', '1w': 'weekly', '1M': 'monthly',
};

export const getHistoricalData = async (symbol: string, timeframe: string): Promise<ChartCandlestickData[]> => {
  const apiKey = getAlphaVantageApiKey();
  if (!apiKey) throw new Error("Clave API de Alpha Vantage no encontrada. Revisa tu fichero .env.");

  try {
    const interval = timeframeToAlphaVantageInterval[timeframe.toLowerCase()] || 'daily';
    const isIntraday = !['daily', 'weekly', 'monthly'].includes(interval);
    
    const params: Record<string, string> = {
      function: isIntraday ? 'TIME_SERIES_INTRADAY' : `TIME_SERIES_${interval.toUpperCase()}`,
      symbol: symbol,
      apikey: apiKey,
      outputsize: 'full'
    };

    if (isIntraday) params.interval = interval;
    
    const alphaVantageApiUrl = `https://www.alphavantage.co/query?${new URLSearchParams(params).toString()}`;
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(alphaVantageApiUrl)}`;
    
    const response = await axios.get(proxyUrl);

    if (response.data['Error Message']) throw new Error(`Alpha Vantage: ${response.data['Error Message']}`);

    const timeSeriesKey = Object.keys(response.data).find(k => k.includes('Time Series'));
    if (!timeSeriesKey) throw new Error('No se encontraron datos de series temporales en la respuesta de Alpha Vantage');

    const timeSeriesData = response.data[timeSeriesKey];
    return Object.entries(timeSeriesData).map(([timestamp, values]: [string, any]) => ({
        time: Math.floor(new Date(timestamp).getTime() / 1000),
        open: parseFloat(values['1. open']), high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']), close: parseFloat(values['4. close']),
        volume: parseFloat(values['5. volume'] || '0'),
    })).sort((a, b) => a.time - b.time);

  } catch (error) {
    console.error(`Error obteniendo datos de Alpha Vantage para ${symbol}:`, error);
    throw error;
  }
};