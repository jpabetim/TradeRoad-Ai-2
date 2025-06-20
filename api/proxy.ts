import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const allowedDomains = [
      'open-api.bingx.com',
      'api.binance.com',
      'fapi.binance.com',
      'api.example.com', // Para quodd (ajustar al dominio real posteriormente)
      'sandbox.iexapis.com', // Para pruebas con APIs alternativas como IEX Cloud
      'cloud.iexapis.com',
      'finnhub.io',
      'data.alpaca.markets',
      'api.polygon.io'
    ];

    const targetUrl = new URL(url);
    if (!allowedDomains.some(domain => targetUrl.hostname.includes(domain))) {
      console.warn(`Domain not allowed: ${targetUrl.hostname}`);
      return res.status(403).json({ error: `Domain not allowed: ${targetUrl.hostname}` });
    }

    console.log(`Proxying request to: ${url}`);

    // --- INICIO DE LA SOLUCIÓN ---

    // 1. Prepara las cabeceras dinámicamente
    const requestHeaders: Record<string, string> = {
      'User-Agent': 'TradeRoad-AI/1.0',
    };

    // 2. Añade la API Key correcta según el dominio
    if (targetUrl.hostname.includes('bingx.com')) {
      if (process.env.BINGX_API_KEY) {
        requestHeaders['X-BX-APIKEY'] = process.env.BINGX_API_KEY;
        console.log('BingX API Key added to headers.');
      } else {
        console.warn('BINGX_API_KEY environment variable not set!');
      }
    } else if (targetUrl.hostname.includes('binance.com')) {
      if (process.env.BINANCE_API_KEY) {
        requestHeaders['X-MBX-APIKEY'] = process.env.BINANCE_API_KEY;
        console.log('Binance API Key added to headers.');
      } else {
        console.warn('BINANCE_API_KEY environment variable not set!');
      }
    }
    // Puedes añadir más 'else if' para otros proveedores que requieran claves

    // 3. Realiza la llamada fetch con las cabeceras dinámicas
    const response = await fetch(url, {
      headers: requestHeaders,
    });

    // --- FIN DE LA SOLUCIÓN ---

    if (!response.ok) {
      // Intenta leer el cuerpo del error para más detalles
      const errorBody = await response.text();
      console.error(`Error from external API (${response.status}): ${errorBody}`);
      return res.status(response.status).json({
        error: `API Error: ${response.statusText}`,
        body: errorBody,
        source: 'proxy'
      });
    }
    
    // Intentar parsear la respuesta como JSON
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // Si no es JSON, obtener como texto
      const text = await response.text();
      data = { text };
    }
    
    // Establecer los headers CORS adecuados
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(response.status).json(data);

  } catch (error: any) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: error.message || 'Error en el proxy',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
