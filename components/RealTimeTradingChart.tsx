

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickData as LWCCandlestickData, LineData as LWCLineData, HistogramData as LWCHistogramData,
  LineStyle, UTCTimestamp, PriceScaleMode, IPriceLine, DeepPartial, ChartOptions, SeriesMarker, Time, ColorType
} from 'lightweight-charts';
import pako from 'pako';
import { DataSource, GeminiAnalysisResult, TickerData, AnalysisPointType, MovingAverageConfig, FibonacciLevel } from '../types'; // Removed DeltaZoneSettings
import { mapTimeframeToApi } from '../constants';
// import { IndicatorName } from '../App'; // No longer needed as RSI is removed

type Theme = 'dark' | 'light';

interface RealTimeTradingChartProps {
  dataSource: DataSource;
  symbol: string;
  timeframe: string;
  analysisResult: GeminiAnalysisResult | null;
  onLatestChartInfoUpdate: (info: { price: number | null; volume?: number | null }) => void; // RSI removed
  onChartLoadingStateChange: (isLoading: boolean) => void;
  movingAverages: MovingAverageConfig[];
  theme: Theme;
  chartPaneBackgroundColor: string;
  volumePaneHeight: number;
  showAiAnalysisDrawings: boolean;
  wSignalColor: string; // Hex color string e.g. #FFD700
  wSignalOpacity: number; // Opacity from 0 to 1
  showWSignals: boolean; // New prop to control W-Signal visibility
  // Nuevas propiedades para soporte de múltiples fuentes de datos
  providerOverride?: any; // Configuración de proveedor personalizado
  staticData?: CandlestickData[]; // Datos pre-cargados para fuentes sin WebSocket
  // RSI and DeltaZoneSettings props removed
  // rsiColor: string;
}

type CandlestickData = LWCCandlestickData<UTCTimestamp> & { volume?: number };
type LineData = LWCLineData<UTCTimestamp>;
type HistogramData = LWCHistogramData<UTCTimestamp>;

interface BaseProviderConfig {
  name: string;
  historicalApi: (symbol: string, interval: string) => string;
  formatSymbol: (s: string) => string;
  parseKline: (data: any) => CandlestickData;
  parseTicker: (data: any, currentSymbol: string, currentProvider: DataSource) => Partial<TickerData>;
}

interface BinanceProviderConfig extends BaseProviderConfig {
  type: 'binance';
  wsKline: (symbol: string, interval: string) => string;
  wsTicker: (symbol: string) => string;
  parseHistorical: (data: any[]) => CandlestickData[];
}

interface BingXProviderConfig extends BaseProviderConfig {
  type: 'bingx';
  wsBase: string;
  getKlineSubMessage: (symbol: string, interval: string) => string;
  getTickerSubMessage: (symbol: string) => string;
  parseHistorical: (allOriginsResponse: any) => CandlestickData[];
}

type CurrentProviderConfig = BinanceProviderConfig | BingXProviderConfig;

const PROVIDERS_CONFIG: { binance: BinanceProviderConfig; bingx: BingXProviderConfig; quodd: any } = {
  binance: {
    type: 'binance',
    name: 'Binance Futures',
    historicalApi: (symbol, interval) => `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=1000`,
    wsKline: (symbol, interval) => `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`,
    wsTicker: (symbol) => `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@ticker`,
    formatSymbol: (s) => s.replace(/[^A-Z0-9]/g, '').toUpperCase(),
    parseHistorical: (data) => data.map(k => ({ time: k[0] / 1000 as UTCTimestamp, open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) })),
    parseKline: (data) => ({ time: data.k.t / 1000 as UTCTimestamp, open: parseFloat(data.k.o), high: parseFloat(data.k.h), low: parseFloat(data.k.l), close: parseFloat(data.k.c), volume: parseFloat(data.k.v) }),
    parseTicker: (data, currentSymbol, currentProvider) => ({ price: parseFloat(data.c), changePercent: parseFloat(data.P), volume: parseFloat(data.v), quoteVolume: parseFloat(data.q), symbol: currentSymbol, provider: currentProvider })
  },
  bingx: {
    type: 'bingx',
    name: 'BingX Futures',
    historicalApi: (symbol, interval) => {
      const validBinanceSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'SOLUSDT'];
      const formattedSymbol = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
      
      if (validBinanceSymbols.includes(formattedSymbol)) {
        return `https://fapi.binance.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=1000`;
      } else {
        console.warn(`Símbolo ${symbol} no compatible con Binance Futures, se usarán datos simulados`);
        return '';
      }
    },
    wsBase: 'wss://open-api-swap.bingx.com/swap-market', 
    formatSymbol: (s) => s.replace(/[^A-Z0-9]/g, '').toUpperCase(),
    parseHistorical: (data) => data.map(k => ({ time: k[0] / 1000 as UTCTimestamp, open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) })),
    getKlineSubMessage: (symbol, interval) => JSON.stringify({ id: crypto.randomUUID(), reqType: 'sub', dataType: `${symbol}@kline_${interval}` }),
    getTickerSubMessage: (symbol) => JSON.stringify({ id: crypto.randomUUID(), reqType: 'sub', dataType: `${symbol}@trade` }),
    parseKline: (data) => ({ time: data.T / 1000 as UTCTimestamp, open: parseFloat(data.o), high: parseFloat(data.h), low: parseFloat(data.l), close: parseFloat(data.c), volume: parseFloat(data.v) }),
    parseTicker: (data, currentSymbol, currentProvider) => ({ price: parseFloat(data.p), symbol: currentSymbol, provider: currentProvider })
  },
  quodd: {
    type: 'quodd',
    name: 'QUODD API',
    historicalApi: () => '',
    formatSymbol: (s) => s, 
    parseHistorical: () => [] 
  }
};

const calculateMA = (data: CandlestickData[], period: number): LineData[] => {
  if (data.length < period) return [];
  const results: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0; for (let j = 0; j < period; j++) { sum += data[i - j].close; }
    results.push({ time: data[i].time, value: sum / period });
  }
  return results;
};

const calculateEMA = (data: CandlestickData[], period: number): LineData[] => {
  if (data.length < period) return [];
  const results: LineData[] = []; const k = 2 / (period + 1);
  let sumForSma = 0; for (let i = 0; i < period; i++) { sumForSma += data[i].close; }
  let ema = sumForSma / period; results.push({ time: data[period - 1].time, value: ema });
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * k + ema; results.push({ time: data[i].time, value: ema });
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
  light: { background: '#FFFFFF', text: '#000000', grid: '#e5e7eb', border: '#d1d5db', fiboRetracement: 'rgba(59, 130, 246, 0.7)', fiboExtension: 'rgba(249, 115, 22, 0.7)' },
  dark: { background: '#0f172a', text: '#FFFFFF', grid: '#1e293b', border: '#334155', fiboRetracement: 'rgba(96, 165, 250, 0.7)', fiboExtension: 'rgba(251, 146, 60, 0.7)' }
};

const getChartLayoutOptions = (
  effectiveBackgroundColor: string, effectiveTextColor: string, gridColor: string, borderColor: string
): DeepPartial<ChartOptions> => ({
  layout: {
    background: { type: ColorType.Solid, color: effectiveBackgroundColor },
    textColor: effectiveTextColor 
  },
  grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
  // Time scale and price scale text colors will be set explicitly after chart creation
});

const generateMockData = (symbol: string, count: number): CandlestickData[] => {
  console.log(`Generando ${count} velas simuladas para ${symbol}`);
  const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
  const interval = 900; 
  const basePrice = symbol.includes('BTC') ? 40000 : symbol.includes('ETH') ? 2500 : 100;
  
  let lastPrice = basePrice + (Math.random() * basePrice * 0.1);
  let lastVolume = Math.random() * 100;
  
  const candles: CandlestickData[] = [];
  
  for (let i = 0; i < count; i++) {
    const time = (now - ((count - i) * interval)) as UTCTimestamp;
    const volatility = Math.random() * 0.02; 
    const direction = Math.random() > 0.5 ? 1 : -1;
    const change = lastPrice * volatility * direction;
    
    const open = lastPrice;
    const close = lastPrice + change;
    const high = Math.max(open, close) + (Math.random() * lastPrice * 0.01);
    const low = Math.min(open, close) - (Math.random() * lastPrice * 0.01);
    const volume = lastVolume + (Math.random() * 50) - 25;
    
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume: volume > 10 ? volume : 10
    });
    
    lastPrice = close;
    lastVolume = volume;
  }
  
  return candles;
};

// Define los tipos específicos para las funciones de cálculo
const calculateMA = (data: CandlestickData[], period: number): LineData[] => {
  if (data.length < period) return [];
  const results: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) { sum += data[i - j].close; }
    results.push({ time: data[i].time, value: sum / period });
  }
  return results;
};

const calculateEMA = (data: CandlestickData[], period: number): LineData[] => {
  if (data.length < period) return [];
  const results: LineData[] = []; 
  const k = 2 / (period + 1);
  let sumForSma = 0; 
  for (let i = 0; i < period; i++) { sumForSma += data[i].close; }
  
  let emaValue = sumForSma / period;
  results.push({ time: data[period - 1].time, value: emaValue });
  
  for (let i = period; i < data.length; i++) {
    emaValue = (data[i].close - emaValue) * k + emaValue;
    results.push({ time: data[i].time, value: emaValue });
  }
  return results;
};

const RealTimeTradingChart: React.FC<RealTimeTradingChartProps> = ({
  dataSource, symbol: rawSymbol, timeframe: rawTimeframe, analysisResult,
  onLatestChartInfoUpdate, onChartLoadingStateChange, movingAverages,
  theme, chartPaneBackgroundColor, volumePaneHeight, showAiAnalysisDrawings,
  wSignalColor, wSignalOpacity, showWSignals, providerOverride, staticData
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick', UTCTimestamp>>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram', UTCTimestamp>>(null);
  const projectionSeriesRef = useRef<ISeriesApi<'Line', UTCTimestamp>>(null);
  const analysisPriceLinesRef = useRef<IPriceLine[]>([]);
  const maSeriesRefs = useRef<ISeriesApi<'Line', UTCTimestamp>[]>([]);
  const volumePriceScaleIdRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [historicalData, setHistoricalData] = useState<CandlestickData[]>([]);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'ok' | 'error'>('connecting');
  const [currentIntervalInSeconds, setCurrentIntervalInSeconds] = useState<number>(3600);

  const providerConf = providerOverride || (PROVIDERS_CONFIG[dataSource as 'binance' | 'bingx'] || null);
  
  const formattedSymbol = (rawSymbol && providerConf && providerConf.formatSymbol) 
    ? providerConf.formatSymbol(rawSymbol) 
    : rawSymbol;
  const apiTimeframe = mapTimeframeToApi(rawTimeframe);

  const getStrokeColor = (type: AnalysisPointType | string, isFvg: boolean = false): string => {
    const opacity = isFvg ? '0.3' : '0.7'; 
    switch(type) {
      case AnalysisPointType.POI_OFERTA:
      case AnalysisPointType.FVG_BAJISTA:
        return `rgba(239, 68, 68, ${opacity})`; 
      case AnalysisPointType.POI_DEMANDA:
      case AnalysisPointType.FVG_ALCISTA:
        return `rgba(34, 197, 94, ${opacity})`; 
      case AnalysisPointType.LIQUIDEZ_COMPRADORA:
        return `rgba(59, 130, 246, ${opacity})`; 
      case AnalysisPointType.LIQUIDEZ_VENDEDORA:
        return `rgba(249, 115, 22, ${opacity})`; 
      case AnalysisPointType.BOS_ALCISTA:
      case AnalysisPointType.CHOCH_ALCISTA:
          return `rgba(16, 185, 129, ${opacity})`; 
      case AnalysisPointType.BOS_BAJISTA:
      case AnalysisPointType.CHOCH_BAJISTA:
          return `rgba(220, 38, 38, ${opacity})`; 
      case AnalysisPointType.EQUILIBRIUM:
        return `rgba(107, 114, 128, ${opacity})`; 
      default: return `rgba(156, 163, 175, ${opacity})`; 
    }
  };
  
  const getTextColorForZone = (bgColor: string) => {
    return isColorLight(bgColor) ? THEME_COLORS.dark.text : THEME_COLORS.light.text;
  };

  const calculateIntervalInSeconds = (tf: string): number => {
    const value = parseInt(tf.slice(0, -1)); const unit = tf.slice(-1).toLowerCase();
    if (unit === 'm') return value * 60; if (unit === 'h') return value * 3600;
    if (unit === 'd') return value * 86400; if (unit === 'w') return value * 604800;
    return 3600;
  };

  useEffect(() => {
    const chartEl = chartContainerRef.current;
    if (!chartEl || !formattedSymbol || !providerConf) {
      onChartLoadingStateChange(false);
      return;
    }

    onChartLoadingStateChange(true); setTickerData(null);
    onLatestChartInfoUpdate({ price: null, volume: null }); 
    setHistoricalData([]); maSeriesRefs.current = {};
    setCurrentIntervalInSeconds(calculateIntervalInSeconds(apiTimeframe));
    
    volumePriceScaleIdRef.current = null;

    const volumePaneIndex = 1; 

    const effectiveBackgroundColor = chartPaneBackgroundColor || (theme === 'dark' ? THEME_COLORS.dark.background : THEME_COLORS.light.background);
    const scaleTextColor = isColorLight(effectiveBackgroundColor) ? THEME_COLORS.light.text : THEME_COLORS.dark.text;
    const generalLayoutTextColor = scaleTextColor; 
    
    const gridColor = theme === 'dark' ? THEME_COLORS.dark.grid : THEME_COLORS.light.grid;
    const borderColor = theme === 'dark' ? THEME_COLORS.dark.border : THEME_COLORS.light.border;
    
    const chartBaseOptions: DeepPartial<ChartOptions> = {
        ...getChartLayoutOptions(effectiveBackgroundColor, generalLayoutTextColor, gridColor, borderColor),
        autoSize: true,
        timeScale: { 
            timeVisible: true, 
            secondsVisible: apiTimeframe.includes('m'),
        },
        rightPriceScale: { 
            mode: PriceScaleMode.Logarithmic, 
            scaleMargins: { top: 0.1, bottom: 0.05 },
        },
    };

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    chartRef.current = createChart(chartEl, chartBaseOptions);
    
    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a', 
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a', 
      wickDownColor: '#ef5350',
    });
    projectionSeriesRef.current = chartRef.current.addLineSeries({ color: '#0ea5e9', lineWidth: 2, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false, pane: 0 });

    volumeSeriesRef.current = null;
    if (chartRef.current) { 
      const id = `volume_ps_${volumePaneIndex}`;
      volumeSeriesRef.current = chartRef.current.addHistogramSeries({
        priceScaleId: id,
        priceFormat: {
          type: 'volume'
        }
      });
      chartRef.current.priceScale(id).applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
    }
    
    const applyScaleStyles = (chart: IChartApi, txtColor: string, brdColor: string) => {
        chart.priceScale('right').applyOptions({
            textColor: txtColor,
            borderColor: brdColor,
        });

        chart.timeScale().applyOptions({
            textColor: txtColor,
            borderColor: brdColor,
        });

        if (volumePriceScaleIdRef.current) {
            chart.priceScale(volumePriceScaleIdRef.current).applyOptions({
                textColor: txtColor,
                borderColor: brdColor,
                scaleMargins: { top: 0.8, bottom: 0.02 },
            });
        }
    };

    if (chartRef.current) {
        applyScaleStyles(chartRef.current, scaleTextColor, borderColor);
    }

    const fetchHistoricalData = async () => {
      if (!providerConf || typeof providerConf.historicalApi !== 'function') {
        console.error('No se ha configurado correctamente el proveedor de datos');
        setConnectionStatus('error');
        onChartLoadingStateChange(false);
        return [];
      }
      
      try {
        const apiUrl = providerConf.historicalApi(formattedSymbol, apiTimeframe);
        
        if (!apiUrl) {
          console.log(`URL vacía al intentar obtener datos históricos para ${rawSymbol}. Proveedor: ${providerConf.name}`);
          
          if (providerConf.type === 'bingx') {
            console.log(`Generando datos simulados para ${rawSymbol} ya que el símbolo no es compatible con Binance Futures`);
            const mockData = generateMockData(rawSymbol, 100);
            return mockData;
          }
          return [];
        }
        
        console.log(`Fetching historical data from: ${apiUrl}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`HTTP error! status: ${response.status}, URL: ${apiUrl}, Response: ${errorText}`);
          
          if (providerConf.type === 'bingx' && errorText.includes('Invalid symbol')) {
            console.log(`Símbolo inválido para Binance. Generando datos simulados para ${rawSymbol}`);
            const mockData = generateMockData(rawSymbol, 100);
            return mockData;
          }
          
          throw new Error(`HTTP error! status: ${response.status}, Response: ${errorText}`);
        }
        
        const rawData = await response.json();
        
        if (!providerConf.parseHistorical || typeof providerConf.parseHistorical !== 'function') {
          console.error('No se ha configurado el parseador de datos históricos para el proveedor');
          return [];
        }
        
        const parsedData = providerConf.parseHistorical(rawData);
        
        parsedData.sort((a, b) => a.time - b.time);
        setHistoricalData(parsedData);
        
        if (candlestickSeriesRef.current && parsedData.length > 0) {
          candlestickSeriesRef.current.setData(parsedData);
        }

        if (volumeSeriesRef.current && parsedData.length > 0) {
          const volumeData = parsedData
            .filter((d: CandlestickData) => d.volume !== undefined)
            .map((d: CandlestickData) => ({ 
              time: d.time, 
              value: d.volume || 0, 
              color: d.close > d.open ? '#26a69a' : '#ef5350' 
            }));

          volumeSeriesRef.current.setData(volumeData);
        }

        if (parsedData.length > 0) {
          setConnectionStatus('ok');
          const lastCandle = parsedData[parsedData.length - 1];
          onLatestChartInfoUpdate({ price: lastCandle.close, volume: lastCandle.volume });
        } else {
          setConnectionStatus('error');
          console.error(`No se pudieron obtener datos históricos de ${apiUrl}`);
        }
        
        return parsedData;
      } catch (error) {
        setConnectionStatus('error');
        console.error(`Error fetching historical data: ${error}`);
        
        if (providerConf?.type === 'bingx') {
          console.log(`Error con API de Binance. Generando datos simulados para ${rawSymbol}`);
          const mockData = generateMockData(rawSymbol, 100);
          setHistoricalData(mockData);
          
          if (candlestickSeriesRef.current) {
            candlestickSeriesRef.current.setData(mockData);
          }
          
          if (volumeSeriesRef.current) {
            const volumeData = mockData
              .filter((d: CandlestickData) => d.volume !== undefined)
              .map((d: CandlestickData) => ({ 
                time: d.time, 
                value: d.volume || 0, 
                color: d.close > d.open ? '#26a69a' : '#ef5350' 
              }));
            
            volumeSeriesRef.current.setData(volumeData);
            
            if (mockData.length > 0) {
              const lastCandle = mockData[mockData.length - 1];
              onLatestChartInfoUpdate({ price: lastCandle.close, volume: lastCandle.volume });
            }
          }
        }
        
        onChartLoadingStateChange(false);
        return [];
      }
    };
    
  const setupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (!providerConf) {
      console.error('No se ha configurado el proveedor de datos');
      return;
    }
    
    let ws: WebSocket;
    
    if (providerConf.type === 'binance') {
      ws = new WebSocket(providerConf.wsKline(formattedSymbol, apiTimeframe));
    } else if (providerConf.type === 'bingx') {
      ws = new WebSocket(providerConf.wsBase);
    } else {
      console.log(`Proveedor ${providerConf.type} no soporta WebSocket`);
      return;
    }
    
    wsRef.current = ws;
    
    ws.onopen = () => { 
      setConnectionStatus('ok'); 
      console.log(`${providerConf.name} WebSocket connected for klines.`);
      
      if (providerConf.type === 'bingx') {
        ws.send(providerConf.getKlineSubMessage(formattedSymbol, apiTimeframe));
      }
    };
    
    ws.onmessage = (event: MessageEvent) => {
      try {
        let klineData: any;
        
        if (providerConf.type === 'bingx' && typeof event.data === "string" && event.data.includes("ping")) {
          ws.send(event.data.replace("ping", "pong")); 
          return;
        } else if (providerConf.type === 'bingx' && event.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = function() {
            try {
              const result = pako.inflate(new Uint8Array(reader.result as ArrayBuffer), { to: 'string' });
              const jsonData = JSON.parse(result);
              if (jsonData && jsonData.dataType && jsonData.dataType.startsWith(`${formattedSymbol}@kline_`)) {
                const kline = jsonData.data?.[0];
                if (kline) {
                  const newCandle = { 
                    time: kline.T / 1000 as UTCTimestamp, 
                    open: parseFloat(kline.o), 
                    high: parseFloat(kline.h), 
                    low: parseFloat(kline.l), 
                    close: parseFloat(kline.c), 
                    volume: parseFloat(kline.v) 
                  };
                  
                  candlestickSeriesRef.current?.update(newCandle);
                  volumeSeriesRef.current?.update({ 
                    time: newCandle.time, 
                    value: newCandle.volume ?? 0, 
                    color: newCandle.close > newCandle.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                  });
                  
                  onLatestChartInfoUpdate({ price: newCandle.close, volume: newCandle.volume });
                  
                  setHistoricalData(prev => { 
                    const newData = [...prev];
                    const lastBar = newData[newData.length -1];
                    if(lastBar && lastBar.time === newCandle.time) {
                      newData[newData.length -1] = newCandle;
                    } else {
                      newData.push(newCandle);
                    }
                    return newData;
                  });
                }
              }
            } catch (e) { 
              console.error('Error processing BingX binary message:', e); 
            }
          };
          reader.readAsArrayBuffer(event.data);
          return; 
        } else {
          const data = JSON.parse(event.data as string);
          if (providerConf.type === 'binance' && data.e === 'kline') {
            klineData = providerConf.parseKline(data);
          } else { 
            return; 
          }
        }
        
        if (klineData) {
          candlestickSeriesRef.current?.update(klineData);
          volumeSeriesRef.current?.update({ 
            time: klineData.time, 
            value: klineData.volume ?? 0, 
            color: klineData.close > klineData.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          });
          
          onLatestChartInfoUpdate({ price: klineData.close, volume: klineData.volume });
          
          setHistoricalData(prev => { 
            const newData = [...prev];
            const lastBar = newData[newData.length -1];
            if(lastBar && lastBar.time === klineData!.time) {
              newData[newData.length -1] = klineData!;
            } else {
              newData.push(klineData!);
            }
            return newData;
          });
        }
      } catch (e) { 
        console.error('Error processing WebSocket kline message:', e); 
      }
    };
    
    ws.onerror = (event: Event) => {
      console.error(`${providerConf.name} WebSocket error event type:`, event.type);
      console.error(`${providerConf.name} WebSocket error object:`, event);
      setConnectionStatus('error');
    };
    
    ws.onclose = (event: CloseEvent) => {
      console.log(`${providerConf.name} WebSocket disconnected. Code: ${event.code}, Reason: "${event.reason}", Clean: ${event.wasClean}`);
      setConnectionStatus('connecting');
    };
  };
  
  useEffect(() => {
    if (providerConf) {
      setupWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (chartRef.current) { 
        chartRef.current.remove(); 
        chartRef.current = null; 
      }
    };
  }, [
    dataSource, rawSymbol, rawTimeframe, 
    theme, chartPaneBackgroundColor, 
  ]);

  useEffect(() => {
    if (!chartRef.current || historicalData.length === 0) return;
    
    maSeriesRefs.current.forEach(series => chartRef.current?.removeSeries(series));
    maSeriesRefs.current = [];

    movingAverages.forEach(maConfig => {
      if (maConfig.visible && historicalData.length >= maConfig.period) {
        const maData = maConfig.type === 'EMA'
          ? calculateEMA(historicalData, maConfig.period)
          : calculateMA(historicalData, maConfig.period);
        
        if (chartRef.current) {
            const maSeries = chartRef.current.addLineSeries({
            color: maConfig.color,
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            });
            maSeries.setData(maData as LineData[]);
            maSeriesRefs.current.push(maSeries);
        }
      }
    });
  }, [movingAverages, historicalData]); // Re-run if MAs config or historical data changesrtRef.current) return;

    // Clear previous analysis drawings
    analysisPriceLinesRef.current.forEach(line => candlestickSeriesRef.current?.removePriceLine(line));
    analysisPriceLinesRef.current = [];
      candlestickSeriesRef.current.setMarkers(markers as SeriesMarker<UTCTimestamp>[]); // Clear markers
    projectionSeriesRef.current?.setData([]); // Clear projection path

    if (analysisResult && showAiAnalysisDrawings && candlestickSeriesRef.current) {
      const { puntos_clave_grafico, proyeccion_precio_visual, analisis_fibonacci } = analysisResult;
      const currentSeries = candlestickSeriesRef.current;
{{ ... }}
            } else if (point.marker_shape === "arrowUp") {
                markerColor = `rgba(76, 175, 80, ${generalMarkerOpacity})`; 
            } else if (point.marker_shape === "arrowDown") {
                 markerColor = `rgba(244, 67, 54, ${generalMarkerOpacity})`; 
            }
           const markers = trendLines.filter(line => line.type === 'marker').map(line => ({
        time: line.startTime as UTCTimestamp,
        position: line.startPrice > line.endPrice ? 'aboveBar' : 'belowBar',
        color: line.color || '#2196F3',
        shape: (line.markerShape || 'circle') as SeriesMarkerShape,
        text: line.label || ''
      }));      });
        }
      });
      currentSeries.setMarkers(markers);
      
      // Draw Fibonacci levels
      if (analisis_fibonacci) {
        const { niveles_retroceso, niveles_extension } = analisis_fibonacci;
        const fiboColors = theme === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light;

        const drawFiboLevels = (levels: FibonacciLevel[], fiboColor: string, prefix: string = "") => {
          levels.forEach(level => {
            fibPriceLines.push(candlestickSeriesRef.current.createPriceLine({
          price: level.price,
          color: fibColor,
          lineWidth: level.lineWidth || 1,
          lineStyle: level.lineStyle || LineStyle.Dashed,
          title: `${level.label}: ${level.price.toFixed(2)}`,
          axisLabelVisible: true,
        }));      title: `${prefix}${level.label}`
            });
            analysisPriceLinesRef.current.push(line);
          });
        };
        if (niveles_retroceso) drawFiboLevels(niveles_retroceso, fiboColors.fiboRetracement);
{{ ... }}

  return (
    <div ref={chartContainerRef} className="w-full h-[400px] bg-white dark:bg-gray-900 rounded-lg shadow border-gray-200 dark:border-gray-700 overflow-hidden">
      {connectionStatus === 'error' && <div className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded text-xs z-10">Connection Error</div>}
    </div>
  );    {connectionStatus === 'error' && <div className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded text-xs z-10">Connection Error</div>}
    </div>
  );
};

export default RealTimeTradingChart;
