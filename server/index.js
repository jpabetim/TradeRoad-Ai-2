// server/index.js

// --- USAREMOS IMPORT EN LUGAR DE REQUIRE ---
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

console.log('✅ [Server] Initializing API server...');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
console.log('✅ [Server] Middlewares configured.');

// --- API Endpoints ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const requestHeaders = { 'User-Agent': 'TradeRoad-AI/1.0' };
        if (String(targetUrl).includes('bingx.com') && process.env.BINGX_API_KEY) {
            requestHeaders['X-BX-APIKEY'] = process.env.BINGX_API_KEY;
        } else if (String(targetUrl).includes('binance.com') && process.env.BINANCE_API_KEY) {
            requestHeaders['X-MBX-APIKEY'] = process.env.BINANCE_API_KEY;
        }

        const apiResponse = await fetch(targetUrl, { headers: requestHeaders });
        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            throw new Error(`External API Error (${apiResponse.status}): ${errorBody}`);
        }
        const data = await apiResponse.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('❌ [Proxy] Error:', error);
        res.status(500).json({ error: 'Proxy server failed', details: error.message });
    }
});

app.post('/api/analyze-chart', async (req, res) => {
    try {
        const { symbol, timeframe, currentPrice, prompt } = req.body;
        if (!symbol || !timeframe || !prompt) {
            return res.status(400).json({ error: 'Faltan campos obligatorios.' });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return res.status(500).json({ error: 'Error de configuración: GEMINI_API_KEY no encontrada.' });
        }

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
        if (!jsonMatch || !jsonMatch[1]) {
            return res.status(500).json({ error: 'La respuesta de la IA no tenía un formato JSON válido.' });
        }

        const analysisResult = JSON.parse(jsonMatch[1]);
        res.status(200).json(analysisResult);
    } catch (error) {
        console.error('❌ [Analyze] Critical error:', error);
        res.status(500).json({ error: 'Error inesperado en el servidor de análisis.', details: error.message });
    }
});

// --- Arranque del Servidor ---
app.listen(PORT, () => {
    console.log('============================================');
    console.log(`🚀 [Server] API server listening on port ${PORT}`);
    console.log(`[Server] Gemini API Key Loaded: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`[Server] BingX API Key Loaded: ${!!process.env.BINGX_API_KEY}`);
    console.log('============================================');
});