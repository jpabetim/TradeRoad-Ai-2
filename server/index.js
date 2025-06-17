// server/index.js - TEMPORARY DEBUGGING VERSION
console.log('--- [SERVER/INDEX.JS] SCRIPT STARTED (TEMPORARY DEBUG VERSION) ---');

try {
  const http = require('http');
  const path = require('path'); // Para verificar __dirname
  console.log('--- [SERVER/INDEX.JS] Módulo http cargado ---');
  console.log(`--- [SERVER/INDEX.JS] __dirname: ${__dirname} ---`);
  console.log(`--- [SERVER/INDEX.JS] cwd: ${process.cwd()} ---`);


  const PORT = process.env.PORT || 3001;

  const server = http.createServer((req, res) => {
    console.log(`--- [SERVER/INDEX.JS] PETICIÓN RECIBIDA: ${req.method} ${req.url} ---`);
    
    if (req.url === '/api/health' && req.method === 'GET') {
      console.log('--- [SERVER/INDEX.JS] /api/health HIT ---');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: "ok", message: "Temporary debug server is healthy" }));
      return;
    }
    
    if (req.url === '/api/analyze-chart' && req.method === 'POST') {
      console.log('--- [SERVER/INDEX.JS] /api/analyze-chart HIT (TEMPORARY DEBUG VERSION) ---');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ analysis: JSON.stringify({ message: "Temporary debug response from server/index.js" }) }));
      return;
    }

    // Servir un index.html simple para probar
    if (req.url === '/' && req.method === 'GET') {
        console.log('--- [SERVER/INDEX.JS] / HIT, serving simple HTML ---');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Temporary Debug Server</h1><p>Server is running.</p><p><a href="/api/health">Check Health</a></p>');
        return;
    }

    console.log(`--- [SERVER/INDEX.JS] Ruta no encontrada: ${req.method} ${req.url} ---`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found - Temporary Debug Server');
  });

  server.on('error', (e) => {
    console.error('--- [SERVER/INDEX.JS] ERROR EN EL SERVIDOR HTTP:', e);
  });

  server.listen(PORT, () => {
    console.log(`--- [SERVER/INDEX.JS] SERVIDOR DE DEBUG ESCUCHANDO EN PUERTO ${PORT} ---`);
    console.log(`--- [SERVER/INDEX.JS] NODE_ENV: ${process.env.NODE_ENV} ---`);
    console.log(`--- [SERVER/INDEX.JS] GEMINI_API_KEY está presente: ${!!process.env.GEMINI_API_KEY} ---`);
    console.log(`--- [SERVER/INDEX.JS] Para probar, visita / o /api/health en tu URL de Render ---`);
  });

} catch (e) {
  console.error('❌ FATAL ERROR [SERVER/INDEX.JS] AL INICIAR:', e);
  // Si hay un error al cargar módulos, esto podría ser lo único que se vea.
  // Forzar la salida para que Render no se quede colgado si hay un error muy temprano.
  process.exit(1); 
}

console.log('--- [SERVER/INDEX.JS] SCRIPT FINALIZADO (TEMPORARY DEBUG VERSION) ---');
