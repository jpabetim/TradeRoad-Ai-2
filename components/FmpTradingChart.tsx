import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time, CandlestickData, HistogramData } from 'lightweight-charts';
import { getHistoricalData, adaptFMPDataToCandlestick } from '../services/fmpService';

interface FmpTradingChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  darkMode?: boolean;
}

const FmpTradingChart: React.FC<FmpTradingChartProps> = ({
  symbol = 'AAPL',
  interval = 'daily',
  height = 400,
  darkMode = true
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Función para calcular Media Móvil Simple
  const calculateMA = (data: CandlestickData[], period: number): LineData[] => {
    if (data.length < period) return [];
    const results: LineData[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      let sum: number = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      results.push({
        time: data[i].time,
        value: sum / period
      });
    }
    
    return results;
  };
  
  // Función para inicializar el gráfico
  const initializeChart = () => {
    if (chartContainerRef.current) {
      // Limpiar el contenedor si ya existe un gráfico
      chartContainerRef.current.innerHTML = '';
      
      // Crear nuevo gráfico
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height,
        layout: {
          background: {
            color: darkMode ? '#131722' : '#ffffff',
          },
          textColor: darkMode ? '#d1d4dc' : '#191919',
        },
        grid: {
          vertLines: {
            color: darkMode ? '#1e273b' : '#f0f3fa',
          },
          horzLines: {
            color: darkMode ? '#1e273b' : '#f0f3fa',
          },
        },
        timeScale: {
          borderColor: darkMode ? '#4c525e' : '#d6dcde',
        },
        rightPriceScale: {
          borderColor: darkMode ? '#4c525e' : '#d6dcde',
        },
        crosshair: {
          mode: 0, // Modo de cruz
        },
      });
      
      // Series de velas (candlestick)
      candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#26a69a', // Verde para velas alcistas
        downColor: '#ef5350', // Rojo para velas bajistas
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      
      // Series de volumen
      volumeSeriesRef.current = chartRef.current.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', // Id vacío para escala superpuesta
      });
      
      // Ajustar tamaño al redimensionar la ventana
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    }
  };
  
  // Obtener datos históricos y actualizar el gráfico
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Obtener datos desde FMP API
      const historicalData = await getHistoricalData(symbol, interval, 100);
      
      if (!historicalData || historicalData.length === 0) {
        setError('No se pudieron obtener datos para el símbolo seleccionado');
        setIsLoading(false);
        return;
      }
      
      // Adaptar los datos de FMP al formato de Lightweight Charts
      const candleData = adaptFMPDataToCandlestick(historicalData);
      
      if (candlestickSeriesRef.current) {
        // Establecer datos de velas
        candlestickSeriesRef.current.setData(candleData);
        
        // Configurar datos de volumen
        if (volumeSeriesRef.current) {
          const volumeData = candleData.map(item => ({
            time: item.time,
            value: item.volume || 0,
            color: item.close > item.open ? '#26a69a' : '#ef5350'
          })) as HistogramData[];
          
          volumeSeriesRef.current.setData(volumeData);
        }
        
        // Calcular y mostrar medias móviles
        if (chartRef.current) {
          // Limpiar referencias anteriores
          maSeriesRefs.current.forEach(series => chartRef.current?.removeSeries(series));
          maSeriesRefs.current = [];
          
          // Añadir SMA de 20 períodos
          const ma20 = calculateMA(candleData, 20);
          const ma20Series = chartRef.current.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            title: 'MA 20',
          });
          ma20Series.setData(ma20);
          maSeriesRefs.current.push(ma20Series);
          
          // Añadir SMA de 50 períodos
          const ma50 = calculateMA(candleData, 50);
          const ma50Series = chartRef.current.addLineSeries({
            color: '#FF6D00',
            lineWidth: 2,
            title: 'MA 50',
          });
          ma50Series.setData(ma50);
          maSeriesRefs.current.push(ma50Series);
        }
        
        // Ajustar la vista para mostrar todos los datos
        chartRef.current?.timeScale().fitContent();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error obteniendo datos históricos:', error);
      setError('Error al cargar los datos: ' + (error instanceof Error ? error.message : String(error)));
      setIsLoading(false);
    }
  };
  
  // Inicializar el gráfico al montar el componente
  useEffect(() => {
    const cleanup = initializeChart();
    return cleanup;
  }, []);
  
  // Cargar datos cuando cambia el símbolo o intervalo
  useEffect(() => {
    if (chartRef.current) {
      fetchData();
    }
  }, [symbol, interval]);
  
  return (
    <div className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
          <div className="text-white">Cargando datos...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-20 z-10">
          <div className="text-white bg-red-800 p-4 rounded-lg">{error}</div>
        </div>
      )}
      
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">{symbol} - Financial Modeling Prep</h2>
        <div className="text-sm text-gray-400">
          Intervalo: {interval}
        </div>
      </div>
      
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
};

export default FmpTradingChart;
