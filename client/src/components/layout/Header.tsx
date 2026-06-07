import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Clock, CheckCircle2, AlertTriangle, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getOrdini } from '@/api/ordini';
import type { OrdineAPI } from '@/api/ordini';
import { tempoTrascorso } from '@/utils';
import { clsx } from 'clsx';

// Riproduzione acustica di notifica tramite Web Audio API
export function playChime(volume = 0.3) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Primo bip
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // RE5
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);
    
    // Secondo bip
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // LA5
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
    gain2.gain.linearRampToValueAtTime(volume * 0.5, ctx.currentTime + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.40);
  } catch (e) {
    // Silenzioso in caso di blocco autoplay del browser
  }
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':    { title: 'Dashboard',         subtitle: 'Panoramica generale del locale' },
  '/cassa':        { title: 'Cassa',              subtitle: 'Crea un nuovo ordine' },
  '/ordini':       { title: 'Ordini attivi',      subtitle: 'Gestisci il flusso degli ordini' },
  '/cucina':       { title: 'Dashboard Cucina',   subtitle: 'Vista dedicata alla cucina' },
  '/menu':         { title: 'Gestione Menù',      subtitle: 'Prodotti, prezzi e disponibilità' },
  '/inventario':   { title: 'Inventario',         subtitle: 'Ingredienti, scorte e movimenti' },
  '/consegne':     { title: 'Consegne',           subtitle: 'Gestione delivery e rider' },
  '/clienti':      { title: 'Clienti',            subtitle: 'Rubrica e storico clienti' },
  '/report':       { title: 'Report & Analytics', subtitle: 'Vendite, margini e statistiche' },
  '/storico':      { title: 'Storico Ordini',     subtitle: 'Tutti gli ordini completati e annullati' },
  '/impostazioni': { title: 'Impostazioni',       subtitle: 'Configurazione sistema e locale' },
};

const statoIcon: Record<string, React.ReactNode> = {
  ricevuto:        <AlertTriangle size={13} className="text-blue-500" />,
  in_preparazione: <Clock size={13} className="text-info" />,
  pronto:          <CheckCircle2 size={13} className="text-success" />,
  ritirato:        <CheckCircle2 size={13} className="text-text-muted" />,
  annullato:       <X size={13} className="text-danger" />,
};

const statoLabel: Record<string, string> = {
  ricevuto:        'Ricevuto',
  in_preparazione: 'In preparazione',
  pronto:          '✅ Pronto',
  ritirato:        'Ritirato',
  annullato:       'Annullato',
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { utente } = useAuth();
  const { settings } = useSettings();
  const [ora, setOra] = useState(new Date());
  const [aperto, setAperto] = useState(false);
  const [ordini, setOrdini] = useState<OrdineAPI[]>([]);
  const [letti, setLetti] = useState<Set<number>>(new Set());
  const [cancellate, setCancellate] = useState<Set<number>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Riferimenti anti-spam notifiche
  const prevOrdiniIds = useRef<Set<number>>(new Set());
  const ultimoSuonoRef = useRef<number>(0);
  const isFirstLoad = useRef(true);

  const path = Object.keys(pageTitles).find(k => window.location.pathname.startsWith(k)) ?? '/dashboard';
  const { title, subtitle } = pageTitles[path];

  // Orologio
  useEffect(() => {
    const t = setInterval(() => setOra(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Carica ultimi ordini come notifiche
  useEffect(() => {
    const carica = async () => {
      try {
        const data = await getOrdini({ limit: 15 });

        // Calcola nuovi ordini per l'alert acustico rispetto a quelli memorizzati
        const nuoviOrdini = data.filter(o => {
          if (prevOrdiniIds.current.has(o.id)) return false;

          // Filtri anti-spam a livello di suono
          if (!settings.notificheAbilitate) return false;
          if (settings.notificaSoloNuovi && o.stato !== 'ricevuto') return false;
          if (!['ricevuto', 'in_preparazione', 'pronto'].includes(o.stato)) return false;
          if (settings.notificaEscludiBanco && o.canale === 'banco') return false;
          if (settings.notificaSoloCanali && !settings.notificaSoloCanali.includes(o.canale)) return false;

          return true;
        });

        // Riproduci il suono solo se NON è il primo caricamento e sono presenti nuovi elementi
        if (!isFirstLoad.current && nuoviOrdini.length > 0 && settings.suonoNotificaAbilitato) {
          const oraCorrente = Date.now();
          const cooldownMs = (settings.suonoCooldown ?? 10) * 1000;

          const deveSuonare = nuoviOrdini.some(o => {
            if (settings.suonoSoloOnline && o.canale !== 'online') return false;
            return true;
          });

          if (deveSuonare && (oraCorrente - ultimoSuonoRef.current >= cooldownMs)) {
            playChime(settings.suonoVolume ?? 0.3);
            ultimoSuonoRef.current = oraCorrente;
          }
        }

        // Memorizza tutti gli ID visti
        data.forEach(o => prevOrdiniIds.current.add(o.id));

        if (isFirstLoad.current) {
          isFirstLoad.current = false;
        }

        setOrdini(data);
      } catch { /* silenzioso */ }
    };
    carica();
    const interval = setInterval(carica, 30_000);
    return () => clearInterval(interval);
  }, [settings]);

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!aperto) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAperto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aperto]);

  // Filtra notifiche in base alle impostazioni anti-spam
  const notificheFiltrate = ordini.filter(o => {
    if (!settings.notificheAbilitate) return false;
    if (settings.notificaSoloNuovi && o.stato !== 'ricevuto') return false;
    if (!['ricevuto', 'in_preparazione', 'pronto'].includes(o.stato)) return false;
    if (settings.notificaEscludiBanco && o.canale === 'banco') return false;
    if (settings.notificaSoloCanali && !settings.notificaSoloCanali.includes(o.canale)) return false;
    return true;
  });

  const nonLetti = notificheFiltrate.filter(o => !letti.has(o.id) && !cancellate.has(o.id));

  const dismissSingola = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCancellate(prev => new Set(prev).add(id));
  };

  const dismissTutte = () => {
    setCancellate(prev => {
      const next = new Set(prev);
      ordiniVisibili.forEach(o => next.add(o.id));
      return next;
    });
  };

  const apriPanel = () => {
    setAperto(p => !p);
    // Segna tutti come letti quando apre
    if (!aperto) setLetti(new Set(notificheFiltrate.map(o => o.id)));
  };

  const ordiniVisibili = notificheFiltrate.filter(o => !cancellate.has(o.id));

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-bg rounded-xl transition-colors"
            title="Apri menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <h1 className="page-title text-base md:text-2xl">{title}</h1>
          <p className="page-subtitle text-[10px] md:text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">

        <div className="text-right hidden lg:block">
          <div className="text-xs font-semibold text-text-primary">
            {ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-xs text-text-muted">
            {ora.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
          </div>
        </div>

        {/* Bottone notifiche */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={apriPanel}
            className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-bg rounded-xl transition-colors"
            title="Notifiche"
          >
            <Bell size={19} />
            {nonLetti.length > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {nonLetti.length > 9 ? '9+' : nonLetti.length}
              </span>
            )}
          </button>

          {/* Pannello dropdown */}
          {aperto && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-2xl shadow-elevated z-50 overflow-hidden">
              {/* Header pannello */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-bold text-text-primary text-sm">Notifiche ordini</span>
                <div className="flex items-center gap-2">
                  {ordiniVisibili.length > 0 && (
                    <button
                      onClick={dismissTutte}
                      className="text-xs bg-danger/10 hover:bg-danger text-danger hover:text-white px-2.5 py-1 rounded-lg transition-all font-bold"
                      title="Cancella tutte le notifiche"
                    >
                      Cancella tutte
                    </button>
                  )}
                  <button onClick={() => setAperto(false)} className="text-text-muted hover:text-text-primary">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Lista */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {ordiniVisibili.length === 0 && (
                  <div className="text-center text-text-muted text-sm py-8">Nessuna notifica</div>
                )}
                {ordiniVisibili.map(o => {
                  const attivo = ['ricevuto', 'in_preparazione', 'pronto'].includes(o.stato);
                  return (
                    <div
                      key={o.id}
                      className={clsx(
                        'group flex items-start gap-3 px-4 py-3 transition-colors relative',
                        attivo ? 'hover:bg-bg' : 'opacity-60 hover:bg-bg'
                      )}
                    >
                      <button
                        onClick={e => dismissSingola(o.id, e)}
                        className="absolute top-2 right-2 p-0.5 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity rounded"
                        title="Rimuovi"
                      >
                        <X size={11} />
                      </button>
                      <div className={clsx(
                        'mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                        o.stato === 'ricevuto' ? 'bg-blue-100' :
                        o.stato === 'in_preparazione' ? 'bg-info/10' :
                        o.stato === 'pronto' ? 'bg-success/10' :
                        'bg-bg'
                      )}>
                        {statoIcon[o.stato]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-text-primary truncate">
                            {o.numero_ordine}
                          </span>
                          <span className="text-[10px] text-text-muted whitespace-nowrap">
                            {tempoTrascorso(o.creato_il)} fa
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5">
                          {o.cliente ? `${o.cliente.nome} ${o.cliente.cognome}` : 'Cliente banco'}
                          {' · '}
                          <span className={clsx(
                            'font-medium',
                            o.stato === 'ricevuto' ? 'text-blue-500' :
                            o.stato === 'in_preparazione' ? 'text-info' :
                            o.stato === 'pronto' ? 'text-success' :
                            'text-text-muted'
                          )}>
                            {statoLabel[o.stato]}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border bg-bg">
                <a
                  href="/ordini"
                  className="text-xs text-primary font-semibold hover:underline"
                  onClick={() => setAperto(false)}
                >
                  Vedi tutti gli ordini →
                </a>
              </div>
            </div>
          )}
        </div>


      </div>
    </header>
  );
}
