import express from 'express';
import cors from 'cors';
import proxy from './proxy';
import analyze from './analyze';

// Crear una aplicación Express para gestionar las solicitudes API
const app = express();

// Configurar middleware
app.use(cors()); 
app.use(express.json());

// Configurar rutas API
app.all('/api/proxy', proxy);
app.post('/api/analyze', analyze);

// Para Netlify Functions y otros entornos serverless
export const handler = (req: any, res: any) => {
  // Normalizar path para quitar la parte /api si está incluida en la URL
  const path = req.path.replace(/^\/\.netlify\/functions\/api/, '');
  
  // Registrar la solicitud para depuración
  console.log(`[API] ${req.method} ${path}`);
  
  if (path === '/proxy') {
    return proxy(req, res);
  } else if (path === '/analyze') {
    return analyze(req, res);
  } else {
    return res.status(404).json({ error: `Endpoint no encontrado: ${path}` });
  }
};

export default app;
