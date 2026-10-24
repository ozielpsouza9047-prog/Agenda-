import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runBrowserConnectionTest } from './lib/testConnection';

// Executa diagnóstico temporário de leitura e sessão no console do navegador
runBrowserConnectionTest().catch((err) => {
  console.error('[Dívida Zero AI] Falha ao executar diagnóstico de conexão:', err);
});

createRoot(document.getElementById('root')!).render(<App />);

// Register and update Service Worker, clearing outdated caches
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key !== 'divida-zero-v5')
            .map((key) => caches.delete(key))
        );
      }
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      });
      await registration.update();
    } catch (err) {
      console.log('ServiceWorker update check:', err);
    }
  });
}
