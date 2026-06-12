import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '@/api/client';

export interface Settings {
  // 🏪 Locale
  nomePizzeria: string;
  telefono: string;
  indirizzo: string;
  email: string;
  piva: string;
  logo: string; // base64 o ''

  // 🕐 Orari (per ogni giorno: aperto|pranzo_inizio|pranzo_fine|cena_inizio|cena_fine)
  orari: Record<string, { aperto: boolean; pranzoInizio: string; pranzoFine: string; cenaInizio: string; cenaFine: string }>;
  giornoChiusura: string; // 'lunedi' | 'martedi' | ... | 'nessuno'

  // 🧾 Cassa
  ivaPerc: number;
  scontoMax: number;
  redirectDopoOrdine: 'ordini' | 'cucina' | 'cassa';
  confermaVuotaCarrello: boolean;

  // 🍕 Cucina
  autoRefreshCucina: number; // secondi: 10 | 30 | 60
  alertSonoroCucina: boolean;
  tempoPreparazione: number; // minuti

  // 🛵 Consegne
  costoConsegna: number;
  sogliaConsegnaGratis: number;
  tempoConsegna: number; // minuti

  // 📊 Business
  obiettivGiornaliero: number;

  // 🧩 Moduli visibili
  mostraModuli: {
    clienti: boolean;
    consegne: boolean;
    inventario: boolean;
    report: boolean;
    storico: boolean;
  };

  // 🖨️ Hardware
  ipStampante: string;
  modalitaDemo: boolean;

  // 🧾 Stampa
  footerScontrino: string;

  // 🔔 Notifiche & Anti-Spam
  notificheAbilitate: boolean;
  notificaSoloNuovi: boolean;
  notificaEscludiBanco: boolean;
  notificaSoloCanali: string[];
  suonoNotificaAbilitato: boolean;
  suonoSoloOnline: boolean;
  suonoCooldown: number;
  suonoVolume: number;
}

const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

const defaultOrari = Object.fromEntries(
  GIORNI.map(g => [g, { aperto: g !== 'lunedi', pranzoInizio: '12:00', pranzoFine: '15:00', cenaInizio: '18:30', cenaFine: '23:30' }])
);

export const DEFAULT_SETTINGS: Settings = {
  nomePizzeria: 'Pizzeria da Salvatore',
  telefono: '095 1234567',
  indirizzo: 'Via Etnea 123, Catania',
  email: 'info@pizzeriadasalvatore.it',
  piva: 'IT01234567890',
  logo: '',
  orari: defaultOrari,
  giornoChiusura: 'lunedi',
  ivaPerc: 10,
  scontoMax: 30,
  redirectDopoOrdine: 'ordini',
  confermaVuotaCarrello: true,
  autoRefreshCucina: 30,
  alertSonoroCucina: true,
  tempoPreparazione: 20,
  costoConsegna: 2.5,
  sogliaConsegnaGratis: 25,
  tempoConsegna: 35,
  obiettivGiornaliero: 800,
  ipStampante: '192.168.1.100',
  modalitaDemo: false,
  footerScontrino: 'Grazie per aver scelto la nostra pizzeria! 🍕',
  notificheAbilitate: true,
  notificaSoloNuovi: true,
  notificaEscludiBanco: true,
  notificaSoloCanali: ['online', 'telefono'],
  suonoNotificaAbilitato: true,
  suonoSoloOnline: false,
  suonoCooldown: 10,
  suonoVolume: 0.3,
  mostraModuli: {
    clienti: true,
    consegne: true,
    inventario: true,
    report: true,
    storico: true,
  },
};

const STORAGE_KEY = 'gestionale:settings';

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  saveSettings: () => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const saveSettings = useCallback(async () => {
    let currentSettings: Settings | null = null;
    setSettings(prev => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
      currentSettings = prev;
      return prev;
    });

    const token = localStorage.getItem('token');
    if (token && currentSettings) {
      try {
        await api.put('/impostazioni', currentSettings);
      } catch (err) {
        console.error('Errore nel salvataggio impostazioni sul server:', err);
      }
    }
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Carica impostazioni dal server all'avvio se loggato
  useEffect(() => {
    const caricaDalServer = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await api.get('/impostazioni');
        setSettings(prev => ({ ...prev, ...res.data }));
      } catch (err) {
        console.error('Errore nel caricamento impostazioni dal server:', err);
      }
    };
    caricaDalServer();
  }, []);

  // Auto-persist on change in local cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

export { GIORNI };
