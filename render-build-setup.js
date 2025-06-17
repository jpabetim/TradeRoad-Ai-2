#!/usr/bin/env node

/**
 * Este script se ejecuta como parte del proceso de build en Render.
 * Su propósito es asegurar que todas las dependencias críticas para el build estén instaladas.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando script de configuración para build en Render...');

// Verificar la existencia del archivo vite.config.ts
const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  console.log('✅ Archivo vite.config.ts encontrado');
  const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');
  console.log('📄 Contenido de vite.config.ts:', viteConfigContent);
} else {
  console.error('❌ Error: No se encuentra el archivo vite.config.ts');
}

// Dependencias críticas para el build
const criticalDependencies = [
  '@vitejs/plugin-react@4.5.2',
  '@originjs/vite-plugin-commonjs@1.0.3',
  'vite-plugin-node-polyfills@0.23.0'
];

console.log('📦 Instalando dependencias críticas para el build...');
try {
  execSync(`npm install --no-save ${criticalDependencies.join(' ')}`, { stdio: 'inherit' });
  console.log('✅ Dependencias críticas instaladas correctamente');
} catch (error) {
  console.error('❌ Error instalando dependencias críticas:', error);
  process.exit(1);
}

// Verificar que las dependencias se instalaron correctamente
console.log('🔍 Verificando instalación de dependencias...');
const nodeModulesDir = path.join(process.cwd(), 'node_modules');

criticalDependencies.forEach(dep => {
  const packageName = dep.split('@')[0];
  const packagePath = path.join(nodeModulesDir, packageName);
  
  if (fs.existsSync(packagePath)) {
    console.log(`✅ Dependencia ${packageName} instalada correctamente`);
    
    // Verificar si el package.json existe y mostrar su versión
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`   Versión: ${packageJson.version}`);
    }
  } else {
    console.error(`❌ Error: No se encuentra la dependencia ${packageName} en node_modules`);
  }
});

console.log('✨ Script de configuración completado');
