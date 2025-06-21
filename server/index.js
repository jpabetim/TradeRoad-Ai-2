import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3101;
app.use(cors());
app.use(express.json());

const SYMBOLS_BY_EXCHANGE = {
    binance: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"],
    bingx: ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XAU-USD"],
    fmp: ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"],
    alphavantage: ["EURUSD", "GBPUSD", "USDJPY", "SPY", "QQQ"],
};

app.get('/api/symbols', (req, res) => {
    const exchange = req.query.exchange;
    if (typeof exchange === 'string' && SYMBOLS_BY_EXCHANGE[exchange]) {
        return res.status(200).json(SYMBOLS_BY_EXCHANGE[exchange]);
    }
    return res.status(404).json({ error: "Exchange no encontrado o sin símbolos definidos." });
});

app.get('/api/proxy', async (req, res) => {
    console.log(`[Server] Proxy: Petición recibida a las ${new Date().toLocaleTimeString()}`);
    
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string') {
        console.error('[Server] Proxy: Error - No se proporcionó URL en la query.');
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`[Server] Proxy: Intentando llamar a la URL externa -> ${targetUrl}`);

    try {
        const allowedDomains = ['fapi.binance.com', 'open-api.bingx.com', 'financialmodelingprep.com', 'www.alphavantage.co'];
        const targetHost = new URL(targetUrl).hostname;

        if (!allowedDomains.some(domain => targetHost.endsWith(domain))) {
            console.warn(`[Server] Proxy: Bloqueado dominio no permitido: ${targetHost}`);
            return res.status(403).json({ error: `Domain not allowed: ${targetHost}` });
        }

        const requestHeaders = { 'User-Agent': 'TradeRoad-AI/1.0' };
        if (targetUrl.includes('bingx.com') && process.env.BINGX_API_KEY) {
            requestHeaders['X-BX-APIKEY'] = process.env.BINGX_API_KEY;
        }

        const apiResponse = await fetch(targetUrl, { headers: requestHeaders });
        const responseData = await apiResponse.json();
        
        console.log(`[Server] Proxy: Respuesta de API externa - Status: ${apiResponse.status}`);

        if (!apiResponse.ok) {
            console.error(`[Server] Proxy: La API externa devolvió un error.`, responseData);
        }
        
        res.status(apiResponse.status).json(responseData);

    } catch (error) {
        console.error('❌ [Server] Proxy: Error CRÍTICO en el bloque catch:', error);
        res.status(500).json({ error: 'Proxy server failed', details: error.message });
    }
});

app.post('/api/analyze-chart', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Falta el prompt.' });
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) throw new Error('GEMINI_API_KEY no configurada.');
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
        if (!jsonMatch || !jsonMatch[1]) throw new Error('La respuesta de Gemini no es un JSON válido.');
        const analysisResult = JSON.parse(jsonMatch[1]);
        res.status(200).json(analysisResult);
    } catch (error) {
        console.error('❌ [Analyze] Error Crítico:', error);
        res.status(500).json({ error: 'Error en el servidor de análisis.', details: error.message });
    }
});

app.listen(PORT, () => { console.log(`🚀 [Server] escuchando en el puerto ${PORT}`); });