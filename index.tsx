import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Importar CSS correctamente
import './index.css'; // Importamos el archivo index.css en la raíz

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