import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runBrowserConnectionTest } from './lib/testConnection';

// Executa diagnóstico temporário de leitura e sessão no console do navegador
runBrowserConnectionTest().catch((err) => {
  console.error('[Dívida Zero AI] Falha ao executar diagnóstico de conexão:', err);
});

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, (err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
