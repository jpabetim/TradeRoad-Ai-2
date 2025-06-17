# TradeRoad-Ai Backend Proxy Server

Este servidor actúa como proxy para las API externas utilizadas por TradeRoad-Ai:

1. **Proxy para BingX** - Soluciona problemas de CORS y estabilidad con la API de BingX
2. **Proxy para la API de Gemini AI** - Mayor seguridad al no exponer la clave API en el frontend

## Instalación

```bash
cd server
npm install
```

## Configuración

1. Crea un archivo `.env` en la carpeta `/server` basado en `.env.example`:

```bash
cp .env.example .env
```

2. Configura tu clave API de Gemini en el archivo `.env`:

```
GEMINI_API_KEY=tu_clave_api_aquí
```

## Ejecución del Servidor

### En desarrollo

```bash
cd server
npm run dev
```

El servidor se iniciará en `http://localhost:3001` por defecto.

### En producción

```bash
cd server
npm start
```

## Endpoints disponibles

### Datos históricos de BingX

```
GET /api/bingx-history?symbol=BTCUSDT&interval=1h
```

Este endpoint reemplaza la llamada a través del proxy público `api.allorigins.win` para mayor estabilidad.

### Análisis con Gemini AI

```
POST /api/analyze-chart
Body: { "prompt": "texto del prompt" }
```

Este endpoint procesa las solicitudes de análisis de gráficos, enviando el prompt a la API de Gemini y devolviendo la respuesta procesada.

## Implementación en Render

1. Configura la variable de entorno `GEMINI_API_KEY` en el panel de Render.
2. Actualiza tu `render.yaml` para incluir el servidor de backend.
3. Asegúrate de que el proceso de build ejecute `npm install` en la carpeta del servidor.

## Notas importantes

- El frontend debe estar configurado para hacer llamadas a estos endpoints locales.
- Para entornos de desarrollo, asegúrate de que el frontend tenga la URL correcta del servidor backend.
- En producción, el servidor sirve tanto la API como los archivos estáticos del frontend.
