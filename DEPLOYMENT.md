# 🚀 Guía de Despliegue TradeRoad AI

## Configuración Rápida para Despliegue

### 📋 Checklist Pre-Despliegue

- [x] ✅ Código actualizado en repositorio
- [x] ✅ Backend corregido (Gemini 1.5 Flash)
- [x] ✅ UI responsiva implementada
- [x] ✅ Manejo de errores mejorado
- [x] ✅ Configuración Vercel lista

### 🔑 Variables de Entorno Requeridas

#### Para Vercel:
```bash
GEMINI_API_KEY=tu_clave_de_google_gemini
FMP_API_KEY=tu_clave_de_fmp_opcional
```

### 🌐 Despliegue en Vercel

#### Opción 1: Dashboard Web
1. **Conectar Repositorio:**
   - Ir a https://vercel.com/dashboard
   - Clic en "New Project"
   - Importar desde GitHub: `jpabetim/TradeRoad-Ai`

2. **Configurar Build:**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Variables de Entorno:**
   - Ir a Settings → Environment Variables
   - Añadir `GEMINI_API_KEY`
   - Añadir `FMP_API_KEY` (opcional)

4. **Deploy:**
   - Clic en "Deploy"
   - Vercel detectará automáticamente la configuración

#### Opción 2: CLI (Recomendado)
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login en Vercel
vercel login

# 3. Navegar al proyecto
cd /ruta/a/TradeRoad-Ai

# 4. Inicializar despliegue
vercel

# 5. Configurar variables de entorno
vercel env add GEMINI_API_KEY production
vercel env add FMP_API_KEY production

# 6. Redesplegar con variables
vercel --prod
```

### 🔧 Backend API Configuration

El backend está configurado como Vercel Functions:
- **Endpoint principal:** `/api/analyze`
- **Runtime:** Node.js
- **Método:** POST
- **Timeout:** 30s

#### Estructura de Request:
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "currentPrice": 45000,
  "prompt": "Analiza la tendencia actual"
}
```

### 📊 Monitoreo Post-Despliegue

#### Verificaciones:
1. **Frontend:** Aplicación carga correctamente ✓
2. **API Backend:** `/api/analyze` responde ✓
3. **Análisis IA:** Gemini API funciona ✓
4. **Datos Mercado:** APIs externas conectan ✓

#### URLs de Testing:
- **Producción:** `https://tu-app.vercel.app`
- **API Health:** `https://tu-app.vercel.app/api/analyze`

### 🚨 Troubleshooting Común

#### Error: "Gemini API Key not found"
```bash
# Verificar variables de entorno
vercel env ls

# Re-añadir si es necesario
vercel env add GEMINI_API_KEY production
```

#### Error: "Function timeout"
- Las funciones de Vercel tienen límite de 10s (hobby) o 60s (pro)
- El análisis IA está optimizado para <30s

#### Error: "CORS issues"
- Configuración CORS incluida en `vercel.json`
- Headers automáticos para `/api/*`

### 🔄 CI/CD Automático

Vercel detecta automáticamente cambios en:
- Branch `main` → Deploy a producción
- PRs → Deploy preview automático
- Commits → Build y test automático

### 📈 Optimizaciones de Producción

#### Performance:
- ✅ Vite build optimizado
- ✅ Lazy loading de componentes
- ✅ Code splitting automático
- ✅ Assets comprimidos

#### Seguridad:
- ✅ API keys en variables de entorno
- ✅ CORS configurado
- ✅ Headers de seguridad
- ✅ Rate limiting implícito

### 🆘 Soporte

Si encuentras problemas:
1. **Logs de Vercel:** Dashboard → Functions → View Logs
2. **Logs del Browser:** F12 → Console
3. **Network Tab:** Verificar requests fallidos

### 📞 Contacto

Para soporte técnico específico del despliegue, revisar:
- Documentación de Vercel
- Logs de la aplicación
- Variables de entorno configuradas
