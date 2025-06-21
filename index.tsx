import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Importar CSS correctamente
// --- LÍNEA MODIFICADA: Se ha añadido una barra '/' al principio ---
import '/index.css'; 

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);