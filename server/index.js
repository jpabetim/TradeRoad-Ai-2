const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta dist
console.log(`Configurando archivos estáticos en: ${path.join(__dirname, '../dist')}`);
app.use(express.static(path.join(__dirname, '../dist')));

// Configuración para SPA - manejar rutas del cliente
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Proxy para compatibilidad con formato Binance para el frontend
app.get('/api/bingx-history', async (req, res) => {
  try {
    const { symbol, interval } = req.query;
    
    if (!symbol || !interval) {
      return res.status(400).json({ 
        error: 'Symbol y interval son parámetros requeridos' 
      });
    }
    
    // Mapeo de intervalos de Binance a BingX si es necesario
    const bingxInterval = interval.replace('m', 'min').replace('h', 'hour').replace('d', 'day').replace('w', 'week');
    
    // BingX necesita el símbolo en otro formato (con guion bajo)
    const bingxSymbol = symbol.replace('USDT', '_USDT');
    
    const apiUrl = `https://open-api.bingx.com/openApi/swap/v2/quote/klines?symbol=${bingxSymbol}&interval=${bingxInterval}&limit=500`;
    console.log(`Proxy request to BingX: ${apiUrl}`);

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`BingX API error: ${response.statusText}`);
    }
    
    const bingxData = await response.json();
    console.log(`BingX data received: ${bingxData.code === "0" ? "Success" : "Error: " + bingxData.msg}`);
    
    if (bingxData.code !== "0") {
      throw new Error(`BingX API returned error: ${bingxData.msg}`);
    }
    
    // Formatear datos de BingX al formato que espera Binance para mantener compatibilidad
    // Binance: [tiempo, open, high, low, close, volume, ...]
    const formattedData = bingxData.data.map(candle => [
      candle.time,           // tiempo
      parseFloat(candle.open),  // open
      parseFloat(candle.high),  // high
      parseFloat(candle.low),   // low
      parseFloat(candle.close), // close
      parseFloat(candle.volume) // volume
    ]);
    
    // Devolver en formato compatible con Binance para que el frontend existente funcione
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching BingX history:', error);
    res.status(500).json({ error: `Failed to fetch data: ${error.message}` });
  }
});

// Proxy para la API de Gemini
app.post('/api/analyze-chart', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // La API key debe estar en variables de entorno del servidor o en la solicitud
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || req.body.apiKey;
    
    if (!apiKey) {
      console.error('❌ No API key found in environment or request');
      return res.status(500).json({ error: 'API key not configured on server or in request' });
    }
    
    console.log(`🔍 API Key disponible: ${apiKey ? '✓ SÍ' : '✗ NO'} (longitud: ${apiKey ? apiKey.length : 0})`);
    
    // Cargar la biblioteca de Google Generative AI
    try {
      const { GoogleGenerativeAI } = require('@google/genai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      console.log(`📤 Sending prompt to Gemini (${prompt.length} chars)`);
      
      // Configuración para la generación de contenido
      const generationConfig = {
        temperature: 0.2,
        topK: 32,
        topP: 0.95,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      };
      
      console.log('⚙️ Generation config:', JSON.stringify(generationConfig));
      
      // Solicitud sin streaming para mayor estabilidad
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig
      });
      
      const response = result.response;
      let fullResponse = response.text();
      
      console.log(`📥 Gemini response received (${fullResponse.length} chars)`);
      console.log(`🔍 Response preview: ${fullResponse.substring(0, 50)}...`);
      
      // Asegurar que la respuesta sea un JSON válido
      fullResponse = fullResponse.trim();
      
      // Limpiar la respuesta para obtener JSON válido
      if (fullResponse.includes('```json')) {
        // Si está envuelto en bloques de código markdown
        fullResponse = fullResponse.replace(/```json\n|```\n|```json|```/g, '');
        console.log('🧹 Removed markdown code blocks');
      }
      
      // Intentar analizar como JSON
      let jsonData;
      try {
        jsonData = JSON.parse(fullResponse);
        console.log('✅ JSON válido confirmado');
      } catch (jsonError) {
        console.warn('⚠️ La respuesta no es JSON válido, aplicando sanitización adicional');
        console.error(jsonError.message);
        
        // Limpieza adicional
        if (fullResponse.startsWith('{{')) {
          fullResponse = fullResponse.substring(1);
          console.log('🧹 Removed extra { at start');
        }
        if (fullResponse.endsWith('}}')) {
          fullResponse = fullResponse.substring(0, fullResponse.length - 1);
          console.log('🧹 Removed extra } at end');
        }
        
        // Eliminar caracteres no válidos para JSON
        const originalLength = fullResponse.length;
        fullResponse = fullResponse.replace(/[\u0000-\u001F]/g, '');
        if (originalLength !== fullResponse.length) {
          console.log(`🧹 Removed ${originalLength - fullResponse.length} control characters`);
        }
        
        // Un último intento de verificación
        try {
          jsonData = JSON.parse(fullResponse);
          console.log('✅ JSON válido después de sanitización');
        } catch (finalJsonError) {
          console.error('❌ No se pudo convertir a JSON válido:', finalJsonError.message);
          
          // Si todo falla, creamos un JSON serializado como string básico para devolver al frontend
          const errorResponse = {
            marketStructure: {
              trend: "undefined",
              keyLevels: [],
              description: "Error procesando la respuesta de la API."
            },
            tradingSignals: {
              direction: "neutral",
              strength: "low",
              entry: null,
              stopLoss: null,
              targets: [],
              reasoning: "No se pudo generar un análisis por un error de procesamiento."
            },
            errors: [finalJsonError.message, "La respuesta de la API no se pudo convertir a JSON válido."]
          };
          jsonData = JSON.stringify(errorResponse);
          console.log('⚠️ Using fallback JSON structure');
        }
      }
      
      // Enviar la respuesta directamente como una cadena JSON sin doble stringify
      // El frontend espera recibir una cadena JSON en response.data.analysis que luego parseará
      res.json({ analysis: jsonData });
      console.log('✅ Response sent to client successfully');
      
    } catch (genError) {
      console.error('❌ Error with Gemini API:', genError);
      res.status(500).json({ 
        error: `AI error: ${genError.message}`,
        fullError: genError.toString()
      });
    }
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
      error: `Server error: ${error.message}`,
      fullError: error.toString()
    });
  }
});

// Esto asegura que las rutas SPA funcionen correctamente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
