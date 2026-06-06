import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import './index.css';

// Registrazione handler globale per errori javascript non gestiti
window.addEventListener('error', (event) => {
  // Ignora se l'evento non contiene dettagli sull'errore
  if (!event.error) return;
  
  // Evitiamo loop infiniti se l'errore proviene dal log stesso
  const stackStr = event.error.stack || '';
  if (stackStr.includes('/api/logs') || event.filename?.includes('/api/logs')) {
    return;
  }

  axios.post('/api/logs', {
    messaggio: event.error.message || event.message || 'Errore runtime javascript non gestito',
    stack: event.error.stack || null,
    tipo: 'UNCAUGHT_EXCEPTION',
    url: window.location.pathname + window.location.search,
    metodo: 'WINDOW_ONERROR'
  }).catch(() => {});
});

// Registrazione handler globale per promise reject non gestite (es. chiamate API fallite non catturate)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  
  // Evita loop se l'errore riguarda la chiamata ai log
  if (reason && reason.config && reason.config.url && reason.config.url.includes('/logs')) {
    return;
  }

  const msg = reason?.message || (typeof reason === 'string' ? reason : 'Promise rejection non gestita');
  const stack = reason?.stack || null;
  const isAxiosError = reason?.isAxiosError || false;

  axios.post('/api/logs', {
    messaggio: msg,
    stack: stack,
    tipo: isAxiosError ? 'UNCAUGHT_API_REJECTION' : 'UNCAUGHT_PROMISE_REJECTION',
    url: window.location.pathname + window.location.search,
    metodo: isAxiosError ? reason.config?.method?.toUpperCase() : 'ASYNC'
  }).catch(() => {});
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
