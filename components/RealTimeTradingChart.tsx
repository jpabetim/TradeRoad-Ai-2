import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickSeriesOptions, HistogramSeriesOptions, LineSeriesOptions,
  LineStyle, PriceScaleMode, IPriceLine, DeepPartial, ChartOptions,
  SeriesMarker, ColorType, SeriesMarkerShape, LineWidth, Time
} from 'lightweight-charts';
import pako from 'pako';
import { DataSource, MovingAverageConfig, AnalysisPoint } from '../types';
import { mapTimeframeToApi } from '../constants';
import { getHistoricalData as getFmpData, adaptFMPDataToCandlestick } from '../services/fmpService';

declare module 'pako' {
  export function inflate(data: Uint8Array): Uint8Array;
  export function deflate(data: Uint8Array): Uint8Array;
}

interface RealTimeTradingChartProps {
  dataSource: DataSource;
  symbol: string;
  timeframe: string;
  onLatestInfo: (info: { price: number | null; volume?: number | null }) => void;
  onChartLoading: (isLoading: boolean) => void;
  movingAverages: MovingAverageConfig[];
  theme: 'dark' | 'light';
  chartPaneBackgroundColor: string;
  volumePaneHeight: number;
  showAiAnalysisDrawings: boolean; // Kept for future use
  wSignalColor: string;
  wSignalOpacity: number;
  showWSignals: boolean;
  analysisDrawings?: AnalysisPoint[];
  priceProjectionPath?: number[];
  providerOverride?: any;
  staticData?: any[];
}

type UTCTimestamp = number;

type CandlestickData = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type LineData = {
  time: UTCTimestamp;
  value: number;
};

const PROVIDERS_CONFIG: { [key: string]: any } = {
  binance: {
    type: 'binance',
    name: 'Binance Futures',
    historicalApi: (symbol, interval) => `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=1000`,
    wsKline: (symbol, interval) => `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`,
    formatSymbol: (s) => s.replace(/[^A-Z0-9]/g, '').toUpperCase(),
    parseHistorical: (data) => {
      // Verificar que data es un array antes de mapear
      if (Array.isArray(data)) {
        return data.map(k => {
          const timestamp = k[0] / 1000;
          if (isNaN(timestamp) || timestamp <= 0) {
            console.error('Binance: Timestamp inválido', k[0]);
            return null;
          }
          return {
            time: timestamp as UTCTimestamp,
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          };
        }).filter(Boolean);
      }
      console.error('Binance: Datos no son un array', data);
      return [];
    },
    parseKline: (data) => ({
      time: data.k.t / 1000 as UTCTimestamp,
      open: parseFloat(data.k.o),
      high: parseFloat(data.k.h),
      low: parseFloat(data.k.l),
      close: parseFloat(data.k.c),
      volume: parseFloat(data.k.v)
    }),
  },
  bingx: {
    type: 'bingx',
    name: 'BingX Futures',
    // Llamamos a nuestro proxy y le pasamos la URL de BingX
    historicalApi: (symbol, interval) => {
      // 1. Construye la URL real de BingX que queremos que el proxy llame
      const bingxApiUrl = `https://open-api.bingx.com/openApi/swap/v2/quote/klines?symbol=${symbol}&interval=${interval}&limit=1000`;
      
      // 2. Construye la URL de nuestro proxy, pasando la URL de BingX como parámetro
      return `/api/proxy?url=${encodeURIComponent(bingxApiUrl)}`;
    },
    wsBase: 'wss://open-api-swap.bingx.com/swap-market',
    formatSymbol: (s) => s.replace(/[^A-Z0-9-]/g, '').toUpperCase(), // Permite guiones para BTC-USDT
    parseHistorical: (response) => {
      // Verificar que response tiene la estructura esperada
      if (response && response.data && Array.isArray(response.data)) {
        return response.data.map((k: any) => {
          const timestamp = parseInt(k.time) / 1000;
          if (isNaN(timestamp) || timestamp <= 0) {
            console.error('BingX: Timestamp inválido', k.time);
            return null;
          }
          return {
            time: timestamp as UTCTimestamp,
            open: parseFloat(k.open),
            high: parseFloat(k.high),
            low: parseFloat(k.low),
            close: parseFloat(k.close),
            volume: parseFloat(k.volume)
          };
        }).filter(Boolean);
      }
      // Si no tiene la estructura esperada, devolver array vacío
      console.error('BingX: Respuesta mal formada', response);
      return [];
    },
    getKlineSubMessage: (symbol, interval) => JSON.stringify({ id: crypto.randomUUID(), reqType: 'sub', dataType: `${symbol}@kline_${interval}` }),
    parseKline: (data) => ({
      time: data.T / 1000 as UTCTimestamp,
      open: parseFloat(data.o),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      close: parseFloat(data.c),
      volume: parseFloat(data.v)
    }),
  },
  fmp: {
    type: 'fmp',
    name: 'Financial Modeling Prep',
    // Nota: No necesitamos definir historicalApi aquí porque usamos el servicio FMP directamente
    formatSymbol: (s) => s.toUpperCase(), // FMP usa símbolos estándar como SPX, AAPL
    parseHistorical: (data) => {
      // Usamos el adaptador de FMP que tiene su propia validación robusta
      return adaptFMPDataToCandlestick(data);
    }
  },
  quodd: {
    type: 'quodd',
    name: 'Quodd',
    historicalApi: (symbol, interval) => `https://api.example.com/quodd/historical?symbol=${symbol}&interval=${interval}`,
    formatSymbol: (s) => s.replace(/\s+/g, '').toUpperCase(),
    parseHistorical: (response) => {
      if (!response || !response.candles) return [];
      return response.candles.map((k: any) => ({
        time: parseInt(k.timestamp) / 1000 as UTCTimestamp, 
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume || 0)
      }));
    },
  },
};

const calculateMA = (data: CandlestickData[], period: number): LineData[] => {
  if (data.length < period) return [];
  const results: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum: number = 0;
    for (let j = 0; j < period; j++) { sum += data[i - j].close; }
    results.push({ time: data[i].time, value: sum / period });
  }
  return results;
};

const calculateEMA = (data: CandlestickData[], period: number): LineData[] => {
  if (data.length < period) return [];
  const results: LineData[] = [];
  const k: number = 2 / (period + 1);
  let sumForSma: number = 0;
  for (let i = 0; i < period; i++) { sumForSma += data[i].close; }
  let emaValue: number = sumForSma / period;
  results.push({ time: data[period - 1].time, value: emaValue });
  for (let i = period; i < data.length; i++) {
    emaValue = (data[i].close - emaValue) * k + emaValue;
    results.push({ time: data[i].time, value: emaValue });
  }
  return results;
};

const isColorLight = (hexColor: string): boolean => {
  const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  if (color.length !== 6 && color.length !== 3) return true;
  let r, g, b;
  if (color.length === 3) {
    r = parseInt(color[0] + color[0], 16); g = parseInt(color[1] + color[1], 16); b = parseInt(color[2] + color[2], 16);
  } else {
    r = parseInt(color.substring(0, 2), 16); g = parseInt(color.substring(2, 4), 16); b = parseInt(color.substring(4, 6), 16);
  }
  return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.5;
};

const THEME_COLORS = {
  light: { background: '#FFFFFF', text: '#000000', grid: '#e5e7eb' },
  dark: { background: '#0f172a', text: '#FFFFFF', grid: '#1e293b' }
};

const getChartLayoutOptions = (
  effectiveBackgroundColor: string, effectiveTextColor: string, gridColor: string
): DeepPartial<ChartOptions> => ({
  layout: {
    background: { type: ColorType.Solid, color: effectiveBackgroundColor },
    textColor: effectiveTextColor
  },
  grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
});

const generateMockData = (count: number): CandlestickData[] => {
  const baseTime = Math.floor(Date.now() / 1000) - count * 86400;
  const data: CandlestickData[] = [];
  
  for (let i = 0; i < count; i++) {
    const time = baseTime + i * 86400;
    const open = 100 + Math.random() * 10;
    const high = open + Math.random() * 5;
    const low = open - Math.random() * 5;
    const close = (open + high + low) / 3 + (Math.random() * 2 - 1);
    const volume = 1000 + Math.random() * 2000;
    
    data.push({ time, open, high, low, close, volume });
  }
  
  return data;
};

// Helper para convertir cualquier string de forma a un SeriesMarkerShape válido
const getValidMarkerShape = (shape: string): SeriesMarkerShape => {
  // Los valores válidos para SeriesMarkerShape en lightweight-charts
  switch (shape.toLowerCase()) {
    case 'circle':
      return 'circle';
    case 'square':
      return 'square';
    case 'arrowup':
    case 'arrow_up':
    case 'arrow-up':
      return 'arrowUp';
    case 'arrowdown':
    case 'arrow_down':
    case 'arrow-down':
      return 'arrowDown';
    case 'diamond': // No soportado directamente, usar circle
    default:
      return 'circle';
  }
};

export default function RealTimeTradingChart({
  dataSource,
  symbol: rawSymbol,
  timeframe: rawTimeframe,
  onLatestInfo = () => {},
  onChartLoading = () => {},
  movingAverages = [],
  theme = 'dark',
  chartPaneBackgroundColor = '',
  volumePaneHeight = 0.2,
  showAiAnalysisDrawings = true,
  wSignalColor = 'rgba(255, 235, 59, 1)',
  wSignalOpacity = 0.7,
  showWSignals = false,
  analysisDrawings = [],
  priceProjectionPath = [],
  providerOverride = null,
  staticData = null,
}: RealTimeTradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'>>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'>>(null);
  const maSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const priceProjectionSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const analysisMarkersRef = useRef<SeriesMarker<Time>[]>([]);

  const [historicalData, setHistoricalData] = useState<CandlestickData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'ok' | 'error'>('connecting');

  const baseProviderConf = PROVIDERS_CONFIG[dataSource as string] || {};
  const providerConf = providerOverride && providerOverride[dataSource] 
    ? { ...baseProviderConf, ...providerOverride[dataSource] } 
    : baseProviderConf;
  const formattedSymbol = (rawSymbol && providerConf?.formatSymbol) ? providerConf.formatSymbol(rawSymbol) : rawSymbol;
  const apiTimeframe = mapTimeframeToApi(rawTimeframe);

  const processAndSetData = useCallback((rawData: any[]) => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;
    
    // Validar y sanitizar datos para asegurar que todos tienen un time válido como UTCTimestamp
    const sanitizedData: CandlestickData[] = rawData
      .filter(item => item && typeof item === 'object') // Filtrar elementos nulos o no-objetos
      .map(item => {
        // Asegurarse de que time es un número (UTCTimestamp)
        let time: UTCTimestamp;
        
        if (typeof item.time === 'number') {
          // Ya es número, verificar que es válido
          time = isNaN(item.time) ? Math.floor(Date.now() / 1000) : item.time as UTCTimestamp;
        } else if (item.time instanceof Date) {
          // Es un objeto Date, convertir a timestamp
          time = Math.floor(item.time.getTime() / 1000) as UTCTimestamp;
        } else if (typeof item.time === 'string') {
          // Es string, intentar convertir a timestamp
          try {
            time = Math.floor(new Date(item.time).getTime() / 1000) as UTCTimestamp;
            if (isNaN(time)) {
              console.error('Error: fecha inválida:', item.time);
              time = Math.floor(Date.now() / 1000) as UTCTimestamp;
            }
          } catch (e) {
            console.error('Error al procesar fecha string:', e);
            time = Math.floor(Date.now() / 1000) as UTCTimestamp;
          }
        } else if (item.timestamp) {
          // Si no hay time pero hay timestamp, usamos timestamp
          try {
            time = Number(item.timestamp) as UTCTimestamp;
          } catch (e) {
            console.error('Error al procesar timestamp:', e);
            time = Math.floor(Date.now() / 1000) as UTCTimestamp;
          }
        } else if (item.date) {
          // Si no hay time ni timestamp pero hay date, convertimos date a timestamp
          try {
            const dateObj = new Date(item.date);
            if (!isNaN(dateObj.getTime())) {
              time = Math.floor(dateObj.getTime() / 1000) as UTCTimestamp;
            } else {
              console.error('Error: date inválido', item.date);
              time = Math.floor(Date.now() / 1000) as UTCTimestamp;
            }
          } catch (e) {
            console.error('Error al procesar date string:', e);
            time = Math.floor(Date.now() / 1000) as UTCTimestamp;
          }
        } else {
          console.error('Error: formato de fecha no válido, sin time/timestamp/date', item);
          time = Math.floor(Date.now() / 1000) as UTCTimestamp;
        }
        
        // Devolver objeto con formato sanitizado
        return {
          time,
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close),
          volume: item.volume ? Number(item.volume) : 0
        };
      });

    // Ordenar datos cronológicamente
    sanitizedData.sort((a, b) => a.time - b.time);
    
    setHistoricalData(sanitizedData);
    candlestickSeriesRef.current.setData(sanitizedData);

    const volumeData = sanitizedData.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close > d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
    }));
    volumeSeriesRef.current.setData(volumeData);

    if (sanitizedData.length > 0) {
        const lastCandle = sanitizedData[sanitizedData.length - 1];
        onLatestInfo({ price: lastCandle.close, volume: lastCandle.volume });
    }
    onChartLoading(false);
  }, [onLatestInfo, onChartLoading]);

  // Effect to update analysis drawings when they change
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current || !analysisDrawings) return;
    
    // Remove existing markers first
    candlestickSeriesRef.current.setMarkers([]);
    
    // Create new markers for each analysis point
    const markers: SeriesMarker<Time>[] = analysisDrawings.map((point: AnalysisPoint) => {
      // Determine shape based on tipo property
      let shape: SeriesMarkerShape = 'circle'; // Default shape
      
      // Convert marker_shape to a valid SeriesMarkerShape if present
      if (point.marker_shape) {
        // Make sure it's a valid SeriesMarkerShape value
        const validShape = getValidMarkerShape(point.marker_shape);
        shape = validShape;
      } else {
        // Otherwise, derive shape from tipo
        const pointType = point.tipo?.toLowerCase();
        if (pointType?.includes('resist')) shape = 'square';
        else if (pointType?.includes('soporte') || pointType?.includes('support')) shape = 'circle';
        else if (pointType?.includes('break') && !pointType?.includes('down')) shape = 'arrowUp';
        else if (pointType?.includes('break') && pointType?.includes('down')) shape = 'arrowDown';
        else if (pointType?.includes('demanda')) shape = 'arrowUp';
        else if (pointType?.includes('oferta')) shape = 'arrowDown';
      }
      
      // Parse the time based on the format
      let time: Time;
      
      if (point.marker_time) {
        // If marker_time is provided, use it directly
        time = point.marker_time as Time;
      } else {
        // Otherwise use the last candle time as default
        time = historicalData.length > 0 
          ? historicalData[historicalData.length - 1].time as Time 
          : Math.floor(Date.now() / 1000) as Time;
      }
      
      // Return the marker configuration
      return {
        time,
        position: point.marker_position || 'inBar',
        color: point.color || '#FF0000',
        shape,
        text: point.marker_text || point.label,
        id: point.id,
        size: 1
      };
    });
    
    // Save markers reference
    analysisMarkersRef.current = markers;
    
    // Apply markers to the chart
    candlestickSeriesRef.current.setMarkers(markers);
  }, [analysisDrawings, historicalData]);
  
  // Effect to update price projection when it changes
  useEffect(() => {
    if (!chartRef.current || !priceProjectionSeriesRef.current || !historicalData.length || !priceProjectionPath?.length) return;
    
    // Create a line series for price projection if it doesn't exist
    // The line will start from the last candle and extend based on the projection path
    const lastCandle = historicalData[historicalData.length - 1];
    if (!lastCandle) return;
    
    // Calculate timestamps for projection points
    // Each projection point will be timeframe units into the future
    const projectionData = priceProjectionPath.map((price, index: number) => {
      // Use last candle's timestamp as base and add future time points based on index
      // We're using the same timeframe unit (e.g., 1 hour = 3600 seconds)
      let timeIncrement = 0;
      if (apiTimeframe === '1h') timeIncrement = 3600;
      else if (apiTimeframe === '4h') timeIncrement = 3600 * 4;
      else if (apiTimeframe === '1d') timeIncrement = 3600 * 24;
      else if (apiTimeframe === '1w') timeIncrement = 3600 * 24 * 7;
      else if (apiTimeframe.includes('m')) {
        // Extract minutes value, e.g., '15m' -> 15
        const minutes = parseInt(apiTimeframe.replace('m', '')) || 1;
        timeIncrement = 60 * minutes;
      }
      
      const time = (lastCandle.time as number) + (index + 1) * timeIncrement;
      
      return {
        time: time as Time,
        value: price
      };
    });
    
    // Set data to projection series
    priceProjectionSeriesRef.current.setData(projectionData);
  }, [priceProjectionPath, historicalData, apiTimeframe]);
  
  // Main effect for chart creation and destruction
  useEffect(() => {
    const chartEl = chartContainerRef.current;
    if (!chartEl || !formattedSymbol || !providerConf) {
      onChartLoading(false);
      return;
    }

    onChartLoading(true);
    
    const effectiveBackgroundColor = chartPaneBackgroundColor || (theme === 'dark' ? THEME_COLORS.dark.background : THEME_COLORS.light.background);
    const scaleTextColor = isColorLight(effectiveBackgroundColor) ? THEME_COLORS.dark.text : THEME_COLORS.light.text;
    const gridColor = theme === 'dark' ? THEME_COLORS.dark.grid : THEME_COLORS.light.grid;
    
    const chart = createChart(chartEl, {
        ...getChartLayoutOptions(effectiveBackgroundColor, scaleTextColor, gridColor),
        autoSize: true,
        timeScale: { timeVisible: true, secondsVisible: false },
        rightPriceScale: { 
          mode: PriceScaleMode.Logarithmic,
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          textColor: theme === 'dark' ? '#D1D5DB' : '#1F2937',
        },
    });
    chartRef.current = chart;

    candlestickSeriesRef.current = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    volumeSeriesRef.current = chart.addHistogramSeries({
        priceScaleId: 'volume_ps', color: '#26a69a', priceFormat: { type: 'volume' }
    });
    chart.priceScale('volume_ps').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    
    // Add a line series for price projection
    priceProjectionSeriesRef.current = chart.addLineSeries({
      color: '#4B89FF',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
    });
    
    // Only fetch historical data if we are not using static data from the adapter
    if (!staticData) {
      const fetchHistoricalData = async () => {
        try {
          onChartLoading(true);
          setConnectionStatus('connecting');
          
          // Formateo final del símbolo justo antes de la llamada
          const finalSymbol = providerConf.formatSymbol ? providerConf.formatSymbol(rawSymbol) : rawSymbol;
          
          let parsedData = [];
          
          // Caso especial para FMP que usa un servicio dedicado en lugar de una URL directa
          if (dataSource === 'fmp') {
            try {
              console.log(`Obteniendo datos FMP para ${finalSymbol} con intervalo ${apiTimeframe}`);
              const fmpData = await getFmpData(
                finalSymbol, 
                apiTimeframe, 
                1000
              );
              
              if (!Array.isArray(fmpData) || fmpData.length === 0) {
                throw new Error(`FMP no devolvió datos válidos para ${finalSymbol}`);
              }
              
              // Usar el adaptador de FMP que tiene su propia validación
              parsedData = adaptFMPDataToCandlestick(fmpData);
            } catch (error) {
              const fmpError = error as Error;
              console.error(`Error al obtener datos de FMP: ${fmpError.message}`, fmpError);
              throw new Error(`Error al obtener datos de FMP: ${fmpError.message}`);
            }
          } 
          // Para otros proveedores que usan API normal
          else if (providerConf?.historicalApi) {
            const apiUrl = providerConf.historicalApi(finalSymbol, apiTimeframe);
            console.log(`Obteniendo datos de ${dataSource} para ${finalSymbol} desde ${apiUrl}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            try {
              const response = await fetch(apiUrl, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
              });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error de la API [${response.status}]: ${errorText || response.statusText}`);
              }
              
              const rawData = await response.json();
              
              if (!rawData) {
                throw new Error(`${dataSource} devolvió una respuesta vacía para ${finalSymbol}`);
              }
              
              // Usar el parser del proveedor
              parsedData = providerConf.parseHistorical(rawData);
            } catch (error) {
              const fetchError = error as Error;
              if (fetchError.name === 'AbortError') {
                throw new Error(`La petición a ${dataSource} expiró después de 10s`);
              }
              throw fetchError;
            }
          } else {
            throw new Error(`Proveedor ${dataSource} no soportado o mal configurado`);
          }
          
          // Validación adicional de los datos
          if (!Array.isArray(parsedData)) {
            throw new Error(`${dataSource} devolvió un formato incorrecto para ${finalSymbol}`);
          }
          
          if (parsedData.length === 0) {
            throw new Error(`${dataSource} no devolvió datos para ${finalSymbol}. Verifica si el símbolo existe.`);
          }
          
          // Verificar que hay al menos algunos datos válidos
          const validDataPoints = parsedData.filter(item => (
            item && 
            typeof item.time === 'number' && 
            !isNaN(item.time) &&
            item.time > 0 &&
            !isNaN(item.open) && 
            !isNaN(item.high) && 
            !isNaN(item.low) && 
            !isNaN(item.close)
          ));
          
          if (validDataPoints.length < parsedData.length * 0.5) {
            console.warn(
              `${dataSource} devolvió datos parcialmente válidos (${validDataPoints.length}/${parsedData.length}). ` +
              `Se procesarán solo los puntos válidos.`
            );
          }
          
          if (validDataPoints.length === 0) {
            throw new Error(
              `${dataSource} devolvió datos, pero ninguno es válido para gráfico de velas. `+
              `Verifica el formato o si tienes permisos para ese símbolo.`
            );
          }
          
          // Procesar datos sanitizados
          processAndSetData(validDataPoints.length > 0 ? validDataPoints : parsedData);
          setConnectionStatus('ok');
        } catch (error) {
          const err = error as Error;
          console.error(`Error al obtener datos históricos: ${err.message}`, err);
          // Fallback a un gráfico vacío en lugar de datos simulados para no confundir
          processAndSetData([]);
          setConnectionStatus('error');
          // Informar al componente padre del error
          onChartLoading(false);
        }
      };

      fetchHistoricalData();
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // Cleanup de referencias
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      priceProjectionSeriesRef.current = null;
      analysisMarkersRef.current = [];
      maSeriesRefs.current.clear();
    };
  }, [dataSource, rawSymbol, rawTimeframe, theme, chartPaneBackgroundColor, providerOverride]); // staticData is NOT a dependency

  // Effect for handling static data updates from the adapter
  useEffect(() => {
    if (staticData && candlestickSeriesRef.current) {
      processAndSetData(staticData);
      setConnectionStatus('ok');
    }
  }, [staticData, processAndSetData]);

  // Effect for WebSocket connection
  useEffect(() => {
    if (staticData || !providerConf || !providerConf.wsKline) return;

    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(providerConf.wsKline(formattedSymbol, apiTimeframe));
    wsRef.current = ws;
    ws.onopen = () => setConnectionStatus('ok');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (providerConf.type === 'binance' && data.e === 'kline') {
          const klineData = providerConf.parseKline(data);
          candlestickSeriesRef.current?.update(klineData);
          volumeSeriesRef.current?.update({ time: klineData.time, value: klineData.volume ?? 0, color: klineData.close > klineData.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)' });
          onLatestInfo({ price: klineData.close, volume: klineData.volume });
        }
      } catch (e) { console.error('Error processing WebSocket kline message:', e); }
    };
    ws.onerror = () => setConnectionStatus('error');
    ws.onclose = () => setConnectionStatus('connecting');

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [dataSource, formattedSymbol, apiTimeframe, staticData, providerConf, onLatestInfo]);

  // Effect for Moving Averages
  useEffect(() => {
    if (!chartRef.current || historicalData.length === 0) return;

    const chart = chartRef.current;
    const currentMaKeys = new Set(movingAverages.map(ma => `${ma.type}-${ma.period}`));

    // Remove old MAs
    maSeriesRefs.current.forEach((series, key) => {
      if (!currentMaKeys.has(key)) {
        chart.removeSeries(series);
        maSeriesRefs.current.delete(key);
      }
    });

    // Add/update MAs
    movingAverages.forEach(ma => {
      const key = `${ma.type}-${ma.period}`;
      const calculator = ma.type === 'EMA' ? calculateEMA : calculateMA;
      const maData = calculator(historicalData, ma.period);

      if (maSeriesRefs.current.has(key)) {
        maSeriesRefs.current.get(key)?.setData(maData);
      } else {
        const maSeries = chart.addLineSeries({ color: ma.color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
        maSeries.setData(maData);
        maSeriesRefs.current.set(key, maSeries);
      }
    });
  }, [movingAverages, historicalData]);

  return (
    <div className="w-full h-full relative" ref={chartContainerRef}>
      {connectionStatus !== 'ok' && (
        <div className="absolute top-2 left-2 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {connectionStatus === 'connecting' ? 'Connecting...' : 'Connection Error'}
        </div>
      )}
    </div>
  );
}

// Renaming calculateMA to calculateSMA for clarity as it's a Simple Moving Average
const calculateSMA = calculateMA;

// Nueva función para obtener datos de Binance directamente (solo para pruebas, puede eliminarse después)
async function fetchDataFromBinance() {
  const symbol = 'ETHUSDT'; // Puedes hacerlo dinámico si es necesario
  const interval = '15m';
  const limit = 1000;
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  console.log(`Obteniendo datos de Binance para ${symbol} desde ${url}`); // Modificado para usar la variable symbol

  try {
    const response = await fetch(url);

    // Verificar el estado de la respuesta HTTP
    if (!response.ok) {
      console.error(`Error en la respuesta de la API: ${response.status} ${response.statusText}`);
      // Intentar leer el cuerpo como texto para obtener más detalles del error
      try {
        const errorText = await response.text();
        console.error('Cuerpo de la respuesta (error):', errorText);
      } catch (textError) {
        console.error('No se pudo leer el cuerpo de la respuesta de error:', textError);
      }
      // Aquí podrías manejar el error, por ejemplo, mostrando un mensaje al usuario o actualizando el estado
      return null; // o lanzar un error para que sea capturado por un manejador de errores superior
    }

    // Intentar leer la respuesta como texto primero para depuración
    const responseText = await response.text();
    // console.log('Respuesta cruda de la API:', responseText); // Descomenta si necesitas ver la respuesta cruda siempre

    // Ahora intentar parsear como JSON
    try {
      const data = JSON.parse(responseText);
      // console.log('Datos de Binance parseados:', data); // Descomenta si necesitas ver los datos parseados
      // ...procesar los datos...
      // Por ejemplo, si 'miArray' se actualiza con estos datos:
      // setMiArray(data); // Asumiendo que tienes una función setMiArray del estado de React
      return data;
    } catch (jsonError) {
      console.error('Error al parsear JSON:', jsonError);
      console.error('Texto que falló al parsear:', responseText); // Muestra el texto que causó el error
      // Aquí manejas el error de parseo de JSON
      return null; // o lanzar un error
    }

  } catch (networkError) {
    console.error('Error de red o al hacer fetch:', networkError);
    // Aquí manejas errores de red u otros errores del fetch
    return null; // o lanzar un error
  }
}

// Ejemplo de cómo podrías llamar a esta función y manejar los datos o errores
// (esto dependerá de cómo esté estructurado tu componente React)
// useEffect(() => {
//   fetchDataFromBinance().then(data => {
//     if (data) {
//       // Aquí es donde probablemente actualizas el estado que usa 'miArray'
//       // Por ejemplo: setChartData(data);
//       console.log("Datos recibidos y procesados correctamente.");
//     } else {
//       console.log("No se pudieron obtener los datos de Binance.");
//       // Podrías establecer un estado de error aquí para mostrarlo en la UI
//     }
//   }).catch(error => {
//      console.error("Error en la cadena de promesas de fetchDataFromBinance:", error);
//      // Manejo de errores si la promesa es rechazada
//   });
// }, []);