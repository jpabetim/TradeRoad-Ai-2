# 📈 TradeRoad AI - Análisis Inteligente de Trading

Aplicación de análisis de trading con IA que combina datos de mercado en tiempo real con análisis inteligente usando Google Gemini.

## 🚀 Funcionalidades

- **Análisis IA**: Análisis automático y consultas personalizadas con Gemini 1.5 Flash
- **Gráficos Trading**: Visualización avanzada con Lightweight Charts
- **Datos Multi-Fuente**: Integración con Binance, BingX, FMP
- **UI Responsiva**: Interfaz adaptable para desktop y móvil
- **Tiempo Real**: Datos de mercado actualizados

## 🛠️ Ejecutar Localmente

**Prerrequisitos:** Node.js 18+

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Crear `.env.local` con:
   ```env
   GEMINI_API_KEY=tu_clave_gemini_aqui
   FMP_API_KEY=tu_clave_fmp_aqui
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador:**
   http://localhost:3000

## 🌐 Desplegar en Vercel

### Método 1: Despliegue Automático
1. Fork este repositorio
2. Conectar con Vercel (https://vercel.com)
3. Configurar variables de entorno en Vercel:
   - `GEMINI_API_KEY`: Tu clave de Google Gemini
   - `FMP_API_KEY`: Tu clave de Financial Modeling Prep

### Método 2: CLI de Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Configurar variables de entorno
vercel env add GEMINI_API_KEY
vercel env add FMP_API_KEY
```

## 🔧 Configuración de APIs

### Google Gemini API
1. Visitar [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crear nueva clave API  
3. Añadir a variables de entorno como `GEMINI_API_KEY`

### Financial Modeling Prep (Opcional)
1. Registrarse en [FMP](https://financialmodelingprep.com)
2. Obtener clave API gratuita
3. Añadir como `FMP_API_KEY`

## 📁 Estructura del Proyecto

```
├── api/                    # Backend serverless
│   └── analyze.ts         # Endpoint de análisis IA
├── components/            # Componentes React
│   ├── RealTimeTradingChart.tsx
│   ├── ControlsPanel.tsx
│   └── AiQueryPanel.tsx
├── constants.ts           # Configuración y prompts
├── types.ts              # Definiciones TypeScript
└── App.tsx               # Componente principal
```

## 🔄 Actualizaciones Recientes

- ✅ Corregido modelo Gemini obsoleto
- ✅ Mejorado manejo de errores en APIs
- ✅ UI responsiva optimizada  
- ✅ Eliminados datos simulados erróneos
- ✅ Validación robusta de timestamps

## 🧪 Testing

```bash
# Unit tests
npm test

# Build de producción
npm run build

# Preview del build
npm run preview
```

## 📞 Soporte

Para problemas técnicos:
1. Verificar configuración de API keys
2. Revisar logs del navegador (F12)
3. Comprobar conectividad de red

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para detalles.
