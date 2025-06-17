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

// Proxy para BingX historical data
app.get('/api/bingx-history', async (req, res) => {
  try {
    const { symbol, interval } = req.query;
    
    if (!symbol || !interval) {
      return res.status(400).json({ 
        error: 'Symbol y interval son parámetros requeridos' 
      });
    }
    
    const apiUrl = `https://open-api.bingx.com/openApi/swap/v2/quote/klines?symbol=${symbol}&interval=${interval}&limit=500`;
    console.log(`Proxy request to BingX: ${apiUrl}`);

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`BingX API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`BingX data received: ${data.code === "0" ? "Success" : "Error: " + data.msg}`);
    
    res.json(data);
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
    
    // La API key debe estar en variables de entorno del servidor
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured on server' });
    }
    
    const { GoogleGenerativeAI } = require('@google/genai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log(`Sending prompt to Gemini (${prompt.length} chars)`);
    
    try {
      // Streaming para obtener la respuesta completa
      const result = await model.generateContentStream({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 0.95,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      });
      
      let fullResponse = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
      }
      
      console.log(`Gemini response received (${fullResponse.length} chars)`);
      
      // Sanitizar y devolver
      fullResponse = fullResponse.trim();
      
      res.json({ analysis: fullResponse });
    } catch (genError) {
      console.error('Error with Gemini API:', genError);
      res.status(500).json({ error: `AI error: ${genError.message}` });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

// Esto asegura que las rutas SPA funcionen correctamente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
