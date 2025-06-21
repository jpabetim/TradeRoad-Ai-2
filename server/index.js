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
    if (exchange && SYMBOLS_BY_EXCHANGE[exchange]) {
        return res.status(200).json(SYMBOLS_BY_EXCHANGE[exchange]);
    }
    return res.status(404).json({ error: "Exchange no encontrado o sin símbolos definidos." });
});

app.get('/api/proxy', async (req, res) => { /* ... tu código de proxy sin cambios ... */ });

app.post('/api/analyze-chart', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Falta el prompt.' });

        console.log("--- Recibido Prompt para Gemini ---");
        console.log(prompt); // LOGGING DEL PROMPT

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) throw new Error('GEMINI_API_KEY no configurada.');

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        
        console.log("--- Recibida Respuesta de Gemini ---");
        console.log(textResponse); // LOGGING DE LA RESPUESTA

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