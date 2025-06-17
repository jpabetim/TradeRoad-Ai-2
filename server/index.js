const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const path = require('path');

console.log('✅ [Server] Initializing...');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---

// 1. CORS: Habilita peticiones desde otros orígenes
const allowedOrigins = [
    'http://localhost:5173', // Desarrollo local
    'https://traderoad-ai.onrender.com' // Tu URL de producción
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
console.log('✅ [Server] CORS configured.');

// 2. JSON Parser: Para poder leer el body de las peticiones POST
app.use(express.json());
console.log('✅ [Server] JSON parser enabled.');

// 3. Static Files: Sirve la aplicación de React/Vite ya construida
const staticFilesPath = path.join(__dirname, '..', 'dist');
app.use(express.static(staticFilesPath));
console.log(`✅ [Server] Serving static files from: ${staticFilesPath}`);

// --- API Endpoints ---

// Endpoint de salud para verificar que el servidor está vivo
app.get('/api/health', (req, res) => {
    console.log('ጤ [Server] GET /api/health');
    res.status(200).json({ status: 'ok', message: 'Server is healthy and running' });
});

// Endpoint principal para el análisis con Gemini
app.post('/api/analyze-chart', async (req, res) => {
    console.log('🧠 [Server] POST /api/analyze-chart');
    try {
        const { prompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!prompt) {
            console.error('❌ [Server] Error: Prompt is required.');
            return res.status(400).json({ error: 'Prompt is required' });
        }
        if (!apiKey) {
            console.error('❌ [Server] Error: GEMINI_API_KEY not configured on server.');
            return res.status(500).json({ error: 'API key not configured on server' });
        }

        console.log('✔️ [Server] Prompt and API Key are present. Calling Gemini...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const generationConfig = { 
            temperature: 0.2, 
            topK: 32, 
            topP: 0.95, 
            response_mime_type: 'application/json', 
            maxOutputTokens: 8192 
        };

        const result = await model.generateContent({ 
            contents: [{ role: 'user', parts: [{ text: prompt }] }], 
            generationConfig 
        });

        const response = result.response;
        const analysisText = response.text();
        console.log('✅ [Server] Received response from Gemini.');

        // No es necesario parsear aquí, ya que el frontend espera un string JSON
        res.json({ analysis: analysisText });

    } catch (error) {
        console.error('❌ [Server] Critical error in /api/analyze-chart:', error);
        res.status(500).json({ 
            error: 'An unexpected error occurred on the server.',
            details: error.message,
            // Devuelve un objeto JSON válido en el campo 'analysis' para evitar errores de parseo en el frontend
            analysis: JSON.stringify({ error: true, message: 'Failed to get analysis from Gemini.', details: error.message })
        });
    }
});

// --- Fallback Route ---

// Redirige todas las demás peticiones GET al index.html de React para que el enrutador del lado del cliente funcione
app.get('*', (req, res) => {
    console.log(`➡️ [Server] Fallback: Serving index.html for route: ${req.path}`);
    res.sendFile(path.join(staticFilesPath, 'index.html'));
});

// --- Server Start ---

app.listen(PORT, () => {
    console.log('============================================');
    console.log(`🚀 [Server] Express server listening on port ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] Gemini API Key Loaded: ${!!process.env.GEMINI_API_KEY}`);
    console.log('============================================');
});
