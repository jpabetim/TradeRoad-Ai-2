import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { DataSource, MovingAverageConfig } from '../types';
import { mapTimeframeToApi } from '../constants';

const PROVIDERS_CONFIG: Record<string, any> = {
    binance: {
        historicalApi: (symbol: string, interval: string) => `/api/proxy?url=${encodeURIComponent(`https://fapi.binance.com/fapi/v1/klines?symbol=<span class="math-inline">\{symbol\}&interval\=</span>{interval}&limit=1000`)}`,
        parseHistorical: (data: any) => {
            if (!Array.isArray(data)) {
                console.error("[Frontend] La respuesta de Binance no es un array. Respuesta recibida:", data);
                return [];
            }
            return data.map((k: any) => ({ time: k[0] / 1000, open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) }));
        }
    },
    bingx: {
        historicalApi: (symbol: string, interval: string) => `/api/proxy?url=${encodeURIComponent(`https://open-api.bingx.com/openApi/swap/v2/quote/klines?symbol=<span class="math-inline">\{symbol\}&interval\=</span>{interval}&limit=1000`)}`,
        parseHistorical: (res: any) => {
            if (!res?.data || !Array.isArray(res.data)) {
                console.error("[Frontend] La respuesta de BingX no tiene el formato esperado. Respuesta recibida:", res);
                return [];
            }
            return res.data.map((k: any) => ({ time: parseInt(k.time) / 1000, open: parseFloat(k.open), high: parseFloat(k.high), low: parseFloat(k.low), close: parseFloat(k.close), volume: parseFloat(k.volume) }));
        }
    }
};

const calculateMA = (data: CandlestickData<UTCTimestamp>[], period: number): LineData<UTCTimestamp>[] => {
  if (data.length < period) return [];
  const results: LineData<UTCTimestamp>[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) { sum += data[i - j].close; }
    results.push({ time: data[i].time, value: sum / period });
  }
  return results;
};

const calculateEMA = (data: CandlestickData<UTCTimestamp>[], period: number): LineData<UTCTimestamp>[] => {
    if (data.length < period) return [];
    const results: LineData<UTCTimestamp>[] = [];
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
    for (let i = period - 1; i < data.length; i++) {
        if (i === period - 1) {
            results.push({ time: data[i].time, value: ema });
        } else {
            ema = (data[i].close - ema) * k + ema;
            results.push({ time: data[i].time, value: ema });
        }
    }
    return results;
};

interface RealTimeTradingChartProps {
    dataSource: DataSource;
    symbol: string;
    timeframe: string;
    onLatestInfo: (info: { price: number | null; volume?: number | null }) => void;
    onChartLoading: (isLoading: boolean) => void;
    movingAverages: MovingAverageConfig[];
    staticData?: CandlestickData<UTCTimestamp>[];
}

export default function RealTimeTradingChart({ dataSource, symbol, timeframe, onChartLoading, onLatestInfo, movingAverages, staticData }: RealTimeTradingChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const maSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    const [historicalData, setHistoricalData] = useState<CandlestickData<UTCTimestamp>[]>([]);

    useEffect(() => {
        const chartEl = chartContainerRef.current;
        if (!chartEl) return;
        const chart = createChart(chartEl, {
            layout: { background: { color: '#0f172a' }, textColor: '#FFFFFF' },
            grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
            autoSize: true,
        });
        chartRef.current = chart;
        candlestickSeriesRef.current = chart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' });
        return () => {
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!symbol || !timeframe) return;
            onChartLoading(true);
            const providerConf = PROVIDERS_CONFIG[dataSource];
            if (!providerConf) {
                console.error(`[Frontend] Proveedor no configurado en RealTimeTradingChart: ${dataSource}`);
                onChartLoading(false);
                return;
            }
            try {
                const apiUrl = providerConf.historicalApi(symbol, mapTimeframeToApi(timeframe));
                console.log(`[Frontend] Intentando fetch a: ${apiUrl}`);
                const response = await fetch(apiUrl);
                
                console.log(`[Frontend] Respuesta del proxy recibida. Status: ${response.status}`);
                const data = await response.json();
                console.log(`[Frontend] Datos JSON del proxy:`, data);

                if (!response.ok) {
                    throw new Error(`El servidor devolvió un error: ${JSON.stringify(data)}`);
                }

                const parsedData = providerConf.parseHistorical(data).sort((a: any, b: any) => a.time - b.time);
                setHistoricalData(parsedData);
            } catch (error) {
                console.error(`[Frontend] Error en el bloque catch de fetchData:`, error);
                setHistoricalData([]);
            } finally {
                onChartLoading(false);
            }
        };

        if (staticData) {
            console.log("[Frontend] Usando datos estáticos.");
            setHistoricalData(staticData);
        } else {
            fetchData();
        }
    }, [dataSource, symbol, timeframe, staticData, onChartLoading, onLatestInfo]);

    useEffect(() => {
        if (candlestickSeriesRef.current) {
            candlestickSeriesRef.current.setData(historicalData);
            if (historicalData.length > 0) {
                chartRef.current?.timeScale().fitContent();
            }
        }
    }, [historicalData]);

    useEffect(() => {
        if (!chartRef.current || !historicalData || historicalData.length === 0) {
            maSeriesRefs.current.forEach(series => chartRef.current?.removeSeries(series));
            maSeriesRefs.current.clear();
            return;
        };

        const currentMaIds = new Set(movingAverages.map(ma => ma.id));
        maSeriesRefs.current.forEach((series, id) => {
            if (!currentMaIds.has(id)) {
                chartRef.current?.removeSeries(series);
                maSeriesRefs.current.delete(id);
            }
        });

        movingAverages.forEach(maConfig => {
            if (!maConfig.visible) {
                if (maSeriesRefs.current.has(maConfig.id)) {
                    chartRef.current?.removeSeries(maSeriesRefs.current.get(maConfig.id)!);
                    maSeriesRefs.current.delete(maConfig.id);
                }
                return;
            }

            const calculator = maConfig.type === 'EMA' ? calculateEMA : calculateMA;
            const maData = calculator(historicalData, maConfig.period);

            let maSeries = maSeriesRefs.current.get(maConfig.id);
            if (maSeries) {
                maSeries.applyOptions({ color: maConfig.color });
                maSeries.setData(maData);
            } else {
                maSeries = chartRef.current!.addLineSeries({
                    color: maConfig.color,
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                    crosshairMarkerVisible: false,
                });
                maSeries.setData(maData);
                maSeriesRefs.current.set(maConfig.id, maSeries);
            }
        });
    }, [movingAverages, historicalData]);

    return <div className="w-full h-full" ref={chartContainerRef} />;
}