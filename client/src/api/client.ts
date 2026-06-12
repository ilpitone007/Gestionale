import axios from 'axios';

// Normalizza l'URL delle API per assicurarsi che termini con '/api' se è un URL remoto
let apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
if (apiBaseUrl.startsWith('http') && !apiBaseUrl.endsWith('/api') && !apiBaseUrl.endsWith('/api/')) {
  apiBaseUrl = `${apiBaseUrl.replace(/\/$/, '')}/api`;
}

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Aggiunge il token JWT a ogni richiesta
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Logout automatico su 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('utente');
      window.location.href = '/login';
    } else {
      // Logga l'errore del client sul server (fire-and-forget)
      if (error.config && !error.config.url.includes('/logs')) {
        axios.post(`${apiBaseUrl}/logs`, {
          messaggio: error.response?.data?.errore || error.message || 'Errore API',
          stack: error.stack || null,
          tipo: 'API_ERROR',
          url: error.config.url,
          metodo: error.config.method?.toUpperCase()
        }).catch(() => {});
      }
    }
    return Promise.reject(error);
  }
);

export default api;

