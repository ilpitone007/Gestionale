import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getOrdini, type OrdineAPI } from '@/api/ordini';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

interface OrdersContextType {
  ordini: OrdineAPI[];
  loading: boolean;
  refreshOrdini: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { utente } = useAuth();
  const { settings } = useSettings();
  const [ordini, setOrdini] = useState<OrdineAPI[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshOrdini = useCallback(async () => {
    if (!utente) return;
    try {
      const data = await getOrdini();
      setOrdini(data);
    } catch (err) {
      console.error('Errore nel polling ordini:', err);
    }
  }, [utente]);

  // Caricamento iniziale all'avvio o quando l'utente effettua il login
  useEffect(() => {
    if (utente) {
      setLoading(true);
      refreshOrdini().finally(() => setLoading(false));
    } else {
      setOrdini([]);
    }
  }, [utente, refreshOrdini]);

  // Polling a intervalli regolari basato sulle impostazioni di auto-refresh cucina
  useEffect(() => {
    if (!utente) return;

    const refreshSecs = settings.autoRefreshCucina || 30;
    const intervalId = setInterval(() => {
      refreshOrdini();
    }, refreshSecs * 1000);

    return () => clearInterval(intervalId);
  }, [utente, settings.autoRefreshCucina, refreshOrdini]);

  return (
    <OrdersContext.Provider value={{ ordini, loading, refreshOrdini }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) {
    throw new Error('useOrders must be used inside OrdersProvider');
  }
  return ctx;
}
