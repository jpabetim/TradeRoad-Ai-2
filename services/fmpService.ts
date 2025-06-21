import axios from 'axios';
import { UTCTimestamp } from 'lightweight-charts';

export interface FMPHistoricalPrice { date: string; open: number; high: number; low: number; close: number; volume: number; }

// FORMA CORRECTA DE LEER LA API KEY CON VITE
const getFmpApiKey = (): string => {
  return import.meta.env.VITE_FMP_API_KEY || '';
};

export const getHistoricalData = async (symbol: string, timeframe: string = '1day') => {
    try {
        const apiKey = getFmpApiKey();
        if (!apiKey) throw new Error("Clave API de FMP no encontrada. Revisa tu fichero .env en la raíz del proyecto.");

        const apiTimeframe = timeframe === '1d' ? '1day' : timeframe;
        const fmpApiUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}&serietype=line`;

        const proxyUrl = `/api/proxy?url=${encodeURIComponent(fmpApiUrl)}`;
        const response = await axios.get(proxyUrl);

        const dataToParse = response.data.historical || response.data;
        if (!Array.isArray(dataToParse)) throw new Error('Respuesta de FMP inválida.');

        return dataToParse.map((item: FMPHistoricalPrice) => ({
            time: Math.floor(new Date(item.date).getTime() / 1000) as UTCTimestamp,
            open: item.open, high: item.high, low: item.low, close: item.close, volume: item.volume
        })).sort((a, b) => a.time - b.time);
    } catch (error) {
        console.error(`Error obteniendo datos de FMP para ${symbol}:`, error);
        return [];
    }
};