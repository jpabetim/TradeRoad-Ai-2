// Constants para el servidor
// Este archivo es una copia de constants.ts adaptada para Node.js

const DEFAULT_SYMBOL = "ETHUSDT"; // Binance format default
// These are just examples, user can type any symbol.
const AVAILABLE_SYMBOLS_BINANCE = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "LINKUSDT"];
const AVAILABLE_SYMBOLS_BINGX = ["BTC-USDT", "ETH-USDT", "XAUUSD", "EURUSD", "USOIL"];
const DISPLAY_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAUUSD", "EURUSD"];

const DEFAULT_TIMEFRAME = "1h"; // Use lowercase consistent with API and button values
// Timeframes for quick select buttons
const QUICK_SELECT_TIMEFRAMES = ["1m", "3m", "5m", "15m", "1h", "4h", "1d", "1w"];
// All available timeframes if a dropdown were to be kept or for validation
const AVAILABLE_TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"];

const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";

// Este es el prompt maestro para el análisis automático
const getAutoAnalysisPrompt = (symbol, timeframe) => {
  return `
    Eres "TradeRoad AI Analyst", un experto en análisis técnico de mercados financieros basado en conceptos de Smart Money (SMC) y Wyckoff.
    
    Analiza el gráfico de ${symbol} en la temporalidad principal de ${timeframe}. Tu análisis debe ser profundo y estructurado.

    Devuelve tu respuesta COMPLETA Y EXCLUSIVAMENTE en formato JSON, siguiendo esta estructura al pie de la letra:
    {
      "analisis_general": {
        "estructura_mercado_resumen": {
          "1W": "Tu análisis de estructura en 1 Semana.",
          "1D": "Tu análisis de estructura en 1 Día.",
          "4H": "Tu análisis de estructura en 4 Horas.",
          "1H": "Tu análisis de estructura en 1 Hora.",
          "15M": "Tu análisis de estructura en 15 Minutos."
        },
        "fase_wyckoff_actual": "Tu análisis de la fase de Wyckoff actual.",
        "sesgo_direccional_general": "El sesgo general (alcista, bajista, lateral, indefinido).",
        "comentario_volumen": "Un breve comentario sobre el volumen reciente.",
        "interpretacion_volumen_detallada": "Un análisis más detallado del volumen.",
        "comentario_funding_rate_oi": "Un análisis conceptual del Funding Rate y Open Interest."
      },
      "escenarios_probables": [
        {
          "nombre_escenario": "Escenario Principal: [Nombre]",
          "probabilidad": "alta",
          "descripcion_detallada": "Descripción del escenario.",
          "niveles_clave_de_invalidacion": "Descripción del nivel que invalida el escenario.",
          "trade_setup_asociado": {
            "tipo": "CORTO o LARGO",
            "punto_entrada_ideal": 123.45,
            "zona_entrada": [123.00, 124.00],
            "stop_loss": 125.00,
            "take_profit_1": 120.00
          }
        },
        {
          "nombre_escenario": "Escenario Alternativo: [Nombre]",
          "probabilidad": "media",
          "descripcion_detallada": "Descripción del escenario alternativo.",
          "niveles_clave_de_invalidacion": "Descripción del nivel que lo invalida.",
          "trade_setup_asociado": { "tipo": "NINGUNO" }
        }
      ],
      "proyeccion_precio_visual": {
        "descripcion_camino_1": "Una breve descripción del camino que el precio podría tomar.",
        "path": [123.45, 122.50, 124.00, 121.00]
      },
      "puntos_clave_grafico": [
        {
          "id": "poi-oferta-4h-1",
          "label": "Bearish OB 4H",
          "tipo": "poi oferta",
          "zona": [2600.00, 2630.00],
          "temporalidad": "4H",
          "importancia": "alta",
          "color": "#FF5252",
          "lineStyle": 2
        },
        {
          "id": "liquidez-vendedora-4h-1",
          "label": "SSL 4H",
          "tipo": "liquidez vendedora",
          "nivel": 2400.00,
          "temporalidad": "4H",
          "importancia": "alta",
          "color": "#E040FB",
          "lineStyle": 3
        }
      ],
      "conclusion_recomendacion": {
        "resumen_ejecutivo": "Tu conclusión final y resumen de la situación del mercado.",
        "proximo_movimiento_esperado": "Descripción del movimiento más probable a corto plazo.",
        "mejor_oportunidad_actual": { "tipo": "CORTO", "punto_entrada_ideal": 2610.00 }
      }
    }
  `;
};

module.exports = {
  DEFAULT_SYMBOL,
  AVAILABLE_SYMBOLS_BINANCE,
  AVAILABLE_SYMBOLS_BINGX,
  DISPLAY_SYMBOLS,
  DEFAULT_TIMEFRAME,
  QUICK_SELECT_TIMEFRAMES,
  AVAILABLE_TIMEFRAMES,
  GEMINI_MODEL_NAME,
  getAutoAnalysisPrompt
};
