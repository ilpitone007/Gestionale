import React, { useState, useRef, useEffect } from 'react';
import {
  Save, Store, Clock, Bell, Shield, Printer, Wifi, RefreshCcw,
  Users, Truck, BarChart3, ShoppingCart, ChefHat, Key, Eye, EyeOff, LayoutDashboard, Tag,
  Terminal, AlertTriangle, FileText, Activity, Copy, Check, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useSettings, GIORNI, DEFAULT_SETTINGS } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';
import CouponManagement from '@/components/impostazioni/CouponManagement';
import { getLogs, clearLogs, Log } from '@/api/logs';
import { formatDate } from '@/utils';
import { playChime } from '@/components/layout/Header';

const GIORNI_LABEL: Record<string, string> = {
  lunedi: 'Lunedì', martedi: 'Martedì', mercoledi: 'Mercoledì',
  giovedi: 'Giovedì', venerdi: 'Venerdì', sabato: 'Sabato', domenica: 'Domenica',
};

const sezioni = [
  { id: 'locale',    label: 'Locale',       icon: Store },
  { id: 'orari',     label: 'Orari',         icon: Clock },
  { id: 'cassa',     label: 'Cassa',         icon: ShoppingCart },
  { id: 'cucina',    label: 'Cucina',        icon: ChefHat },
  { id: 'notifiche', label: 'Notifiche',     icon: Bell },
  { id: 'consegne',  label: 'Consegne',      icon: Truck },
  { id: 'business',  label: 'Business',      icon: BarChart3 },
  { id: 'coupon',    label: 'Codici Sconto', icon: Tag },
  { id: 'moduli',    label: 'Moduli',        icon: LayoutDashboard },
  { id: 'utenti',    label: 'Utenti',        icon: Users },
  { id: 'hardware',  label: 'Hardware',      icon: Printer },
  { id: 'sistema',   label: 'Sistema',       icon: Shield },
  { id: 'logs',      label: 'Log di Sistema', icon: Terminal },
];

function Toggle({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm text-text-primary">{label}</div>
        {desc && <div className="text-xs text-text-muted mt-0.5">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={clsx('relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-4', value ? 'bg-primary' : 'bg-border')}
      >
        <span className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', value ? 'translate-x-7' : 'translate-x-1')} />
      </button>
    </div>
  );
}

export default function Impostazioni() {
  const toast = useToast();
  const { settings, updateSettings, saveSettings, resetSettings } = useSettings();
  const [sezione, setSezione] = useState('locale');
  const logoRef = useRef<HTMLInputElement>(null);

  // Stato per i Log di Sistema
  const { utente } = useAuth();
  const isAuthorized = utente && (utente.ruolo === 'titolare' || utente.ruolo === 'responsabile');
  const [logs, setLogs] = useState<Log[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('tutti');
  const [copiatoId, setCopiatoId] = useState<number | null>(null);

  const caricaLog = async () => {
    setLoadingLogs(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (err: any) {
      toast.error(err.message || 'Impossibile caricare i log');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (sezione === 'logs' && isAuthorized) {
      caricaLog();
    }
  }, [sezione, isAuthorized]);

  const handleClearLogs = async () => {
    if (!window.confirm('Sei sicuro di voler cancellare TUTTI i log di sistema? Questa azione è irreversibile.')) {
      return;
    }
    setLoadingLogs(true);
    try {
      await clearLogs();
      setLogs([]);
      toast.success('Log di sistema svuotati con successo!');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile svuotare i log');
    } finally {
      setLoadingLogs(false);
    }
  };

  const toggleLog = (id: number) => {
    setExpandedLogId(prev => (prev === id ? null : id));
  };

  const handleCopia = (testo: string, id: number) => {
    navigator.clipboard.writeText(testo);
    setCopiatoId(id);
    setTimeout(() => setCopiatoId(null), 2000);
  };

  const logsFiltrati = logs.filter(log => {
    const matchRicerca =
      log.messaggio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.url && log.url.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.stack && log.stack.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.metodo && log.metodo.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchRicerca) return false;

    if (filtroTipo === 'EXCEPTIONS') {
      return log.messaggio.toLowerCase().includes('uncaught') || log.messaggio.toLowerCase().includes('exception');
    }
    if (filtroTipo === 'API') {
      return log.messaggio.toLowerCase().includes('api_error') || log.messaggio.toLowerCase().includes('rejection') || log.messaggio.toLowerCase().includes('http');
    }
    if (filtroTipo === 'REACT') {
      return log.messaggio.toLowerCase().includes('react_crash') || log.messaggio.toLowerCase().includes('render');
    }

    return true;
  });

  // Utenti — cambio password
  const [vecchiaPassword, setVecchiaPassword] = useState('');
  const [nuovaPassword, setNuovaPassword] = useState('');
  const [mostraPass, setMostraPass] = useState(false);

  const [backendStatus, setBackendStatus] = useState('Verifica in corso...');
  const [dbStatus, setDbStatus] = useState('Verifica in corso...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setBackendStatus('🟢 Online');
          setDbStatus(data.database === 'connesso' ? '✅ Connesso' : '❌ Errore');
        } else {
          setBackendStatus('🔴 Offline');
          setDbStatus('❌ Disconnesso');
        }
      } catch {
        setBackendStatus('🔴 Offline');
        setDbStatus('❌ Disconnesso');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const salva = async () => {
    try {
      await saveSettings();
      toast.success('Impostazioni salvate con successo sul server!');
    } catch {
      toast.error('Errore durante il salvataggio delle impostazioni.');
    }
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      const base64String = ev.target?.result as string;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/uploads/logo', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ image: base64String }),
        });

        if (!res.ok) {
          const d = await res.json();
          toast.error(d.errore ?? 'Errore durante l\'upload del logo');
          return;
        }

        const data = await res.json();
        updateSettings({ logo: data.url });
        toast.success('Logo caricato con successo sul server!');
      } catch (err) {
        toast.error('Errore di connessione durante l\'upload del logo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (!window.confirm('Ripristinare tutte le impostazioni ai valori predefiniti?')) return;
    resetSettings();
    toast.success('Impostazioni ripristinate!');
  };

  const handleCambiaPassword = async () => {
    if (!nuovaPassword || nuovaPassword.length < 6) {
      toast.error('La nuova password deve essere di almeno 6 caratteri'); return;
    }
    try {
      const res = await fetch('/api/auth/cambio-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ vecchia_password: vecchiaPassword, nuova_password: nuovaPassword }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.errore ?? 'Errore'); return; }
      toast.success('Password aggiornata!');
      setVecchiaPassword(''); setNuovaPassword('');
    } catch {
      toast.error('Errore di connessione');
    }
  };

  return (
    <div className="flex gap-6 overflow-y-auto">
      {/* Sidebar sezioni */}
      <div className="w-48 flex-shrink-0 flex flex-col gap-1">
        {sezioni
          .filter(s => s.id !== 'logs' || isAuthorized)
          .map(s => (
            <button
              key={s.id}
              onClick={() => setSezione(s.id)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                sezione === s.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg hover:text-text-primary'
              )}
            >
              <s.icon size={15} />
              {s.label}
            </button>
          ))}
      </div>

      {/* Contenuto */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* ── LOCALE ── */}
        {sezione === 'locale' && (
          <div className="card p-6">
            <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><Store size={18} /> Informazioni locale</h2>

            {/* Logo */}
            <div className="mb-5">
              <label className="label">Logo pizzeria</label>
              <div className="flex items-center gap-4">
                {settings.logo ? (
                  <img src={settings.logo} alt="logo" className="w-20 h-20 object-contain rounded-xl border border-border bg-bg" />
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-text-muted text-xs text-center">Nessun logo</div>
                )}
                <div className="flex flex-col gap-2">
                  <button onClick={() => logoRef.current?.click()} className="btn-secondary text-xs py-1.5">Carica logo</button>
                  {settings.logo && <button onClick={() => updateSettings({ logo: '' })} className="text-xs text-danger hover:underline">Rimuovi</button>}
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label">Nome locale</label>
                <input type="text" className="input" value={settings.nomePizzeria} onChange={e => updateSettings({ nomePizzeria: e.target.value })} /></div>
              <div><label className="label">Partita IVA</label>
                <input className="input" value={settings.piva} onChange={e => updateSettings({ piva: e.target.value })} /></div>
              <div><label className="label">Telefono</label>
                <input type="number" className="input" value={settings.telefono} onChange={e => updateSettings({ telefono: e.target.value.replace(/\D/g, '') })} /></div>
              <div><label className="label">Email</label>
                <input className="input" type="email" value={settings.email} onChange={e => updateSettings({ email: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="label">Indirizzo</label>
                <input className="input" value={settings.indirizzo} onChange={e => updateSettings({ indirizzo: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="label">Footer scontrino</label>
                <input className="input" value={settings.footerScontrino} onChange={e => updateSettings({ footerScontrino: e.target.value })}
                  placeholder="Es. Grazie per averci scelto!" /></div>
            </div>
          </div>
        )}

        {/* ── ORARI ── */}
        {sezione === 'orari' && (
          <div className="card p-6">
            <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><Clock size={18} /> Orari di apertura</h2>
            <div className="mb-4">
              <label className="label">Giorno di chiusura settimanale</label>
              <select className="select w-48" value={settings.giornoChiusura} onChange={e => updateSettings({ giornoChiusura: e.target.value })}>
                <option value="nessuno">Nessuno (sempre aperto)</option>
                {GIORNI.map(g => <option key={g} value={g}>{GIORNI_LABEL[g]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-3">
              {GIORNI.map(g => {
                const o = settings.orari[g] ?? { aperto: true, pranzoInizio: '12:00', pranzoFine: '15:00', cenaInizio: '18:30', cenaFine: '23:30' };
                const chiuso = settings.giornoChiusura === g;
                return (
                  <div key={g} className={clsx('rounded-xl border border-border p-3 transition-opacity', chiuso && 'opacity-40 pointer-events-none')}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-24 font-semibold text-sm text-text-primary">{GIORNI_LABEL[g]}</div>
                      <Toggle
                        label="Aperto"
                        value={o.aperto}
                        onChange={v => updateSettings({ orari: { ...settings.orari, [g]: { ...o, aperto: v } } })}
                      />
                      {o.aperto && (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <span>Pranzo</span>
                            <input type="time" className="input w-28 py-1 text-xs" value={o.pranzoInizio}
                              onChange={e => updateSettings({ orari: { ...settings.orari, [g]: { ...o, pranzoInizio: e.target.value } } })} />
                            <span>—</span>
                            <input type="time" className="input w-28 py-1 text-xs" value={o.pranzoFine}
                              onChange={e => updateSettings({ orari: { ...settings.orari, [g]: { ...o, pranzoFine: e.target.value } } })} />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <span>Cena</span>
                            <input type="time" className="input w-28 py-1 text-xs" value={o.cenaInizio}
                              onChange={e => updateSettings({ orari: { ...settings.orari, [g]: { ...o, cenaInizio: e.target.value } } })} />
                            <span>—</span>
                            <input type="time" className="input w-28 py-1 text-xs" value={o.cenaFine}
                              onChange={e => updateSettings({ orari: { ...settings.orari, [g]: { ...o, cenaFine: e.target.value } } })} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CASSA ── */}
        {sezione === 'cassa' && (
          <div className="card p-6">
            <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><ShoppingCart size={18} /> Cassa & Ordini</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">IVA predefinita (%)</label>
                <input type="number" min={0} max={22} className="input w-32" value={settings.ivaPerc}
                  onChange={e => updateSettings({ ivaPerc: Number(e.target.value) })} />
                <p className="text-xs text-text-muted mt-1">Aliquota applicata sugli scontrini</p>
              </div>
              <div>
                <label className="label">Sconto massimo consentito (%)</label>
                <input type="number" min={0} max={100} className="input w-32" value={settings.scontoMax}
                  onChange={e => updateSettings({ scontoMax: Number(e.target.value) })} />
                <p className="text-xs text-text-muted mt-1">Limite per dipendenti (0 = nessun limite)</p>
              </div>
              <div>
                <label className="label">Redirect dopo "Invia ordine"</label>
                <select className="select" value={settings.redirectDopoOrdine}
                  onChange={e => updateSettings({ redirectDopoOrdine: e.target.value as 'ordini' | 'cucina' | 'cassa' })}>
                  <option value="ordini">→ Pagina Ordini</option>
                  <option value="cucina">→ Pagina Cucina</option>
                  <option value="cassa">Rimani in Cassa</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Toggle label="Conferma prima di svuotare il carrello"
                desc="Mostra un popup di conferma quando si clicca 'Svuota'"
                value={settings.confermaVuotaCarrello}
                onChange={v => updateSettings({ confermaVuotaCarrello: v })} />
            </div>
          </div>
        )}

        {/* ── CUCINA ── */}
        {sezione === 'cucina' && (
          <div className="card p-6">
            <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><ChefHat size={18} /> Cucina</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Auto-refresh vista cucina</label>
                <select className="select w-48" value={settings.autoRefreshCucina}
                  onChange={e => updateSettings({ autoRefreshCucina: Number(e.target.value) })}>
                  <option value={10}>Ogni 10 secondi</option>
                  <option value={30}>Ogni 30 secondi</option>
                  <option value={60}>Ogni minuto</option>
                  <option value={0}>Disabilitato</option>
                </select>
              </div>
              <div>
                <label className="label">Tempo stimato preparazione (min)</label>
                <input type="number" min={1} max={120} className="input w-32" value={settings.tempoPreparazione}
                  onChange={e => updateSettings({ tempoPreparazione: Number(e.target.value) })} />
                <p className="text-xs text-text-muted mt-1">Mostrato al cliente come tempo attesa</p>
              </div>
            </div>
            <div className="mt-4">
              <Toggle label="Alert sonoro per nuovi ordini"
                desc="Suona quando un nuovo ordine arriva in cucina"
                value={settings.alertSonoroCucina}
                onChange={v => updateSettings({ alertSonoroCucina: v })} />
            </div>
          </div>
        )}

        {/* ── NOTIFICHE ── */}
        {sezione === 'notifiche' && (
          <div className="card p-6 flex flex-col gap-5">
            <div>
              <h2 className="font-bold text-text-primary mb-1 flex items-center gap-2"><Bell size={18} /> Notifiche & Anti-Spam</h2>
              <p className="text-sm text-text-muted">Configura come e quando ricevere avvisi visivi e acustici per gli ordini.</p>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Impostazioni Visive</h3>
              <Toggle
                label="Abilita Notifiche Generali"
                desc="Mostra il badge del contatore e la lista degli ordini nell'intestazione"
                value={settings.notificheAbilitate}
                onChange={v => updateSettings({ notificheAbilitate: v })}
              />
              {settings.notificheAbilitate && (
                <>
                  <Toggle
                    label="Solo Nuovi Ordini (Ricevuti)"
                    desc="Mostra notifiche solo per ordini nello stato iniziale, ignorando cambi di stato successivi"
                    value={settings.notificaSoloNuovi}
                    onChange={v => updateSettings({ notificaSoloNuovi: v })}
                  />
                  <Toggle
                    label="Escludi Ordini al Banco"
                    desc="Non inviare notifiche per ordini creati direttamente sul posto al banco"
                    value={settings.notificaEscludiBanco}
                    onChange={v => updateSettings({ notificaEscludiBanco: v })}
                  />
                  
                  {/* Selettore Canali Abilitati */}
                  <div className="py-3 border-b border-border">
                    <label className="label">Canali che generano notifiche</label>
                    <div className="flex gap-4 mt-2 flex-wrap">
                      {[
                        { key: 'online', label: '🌐 Online' },
                        { key: 'telefono', label: '📞 Telefono' },
                        { key: 'banco', label: '🪑 Banco' },
                      ].map(ch => {
                        const inList = settings.notificaSoloCanali?.includes(ch.key) ?? false;
                        return (
                          <label key={ch.key} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                            <input
                              type="checkbox"
                              checked={inList}
                              className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                              onChange={e => {
                                const next = e.target.checked
                                  ? [...(settings.notificaSoloCanali ?? []), ch.key]
                                  : (settings.notificaSoloCanali ?? []).filter(k => k !== ch.key);
                                updateSettings({ notificaSoloCanali: next });
                              }}
                            />
                            {ch.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Impostazioni Audio</h3>
              <Toggle
                label="Abilita Avviso Sonoro (Chime)"
                desc="Riproduce una melodia quando arriva una nuova notifica filtrata"
                value={settings.suonoNotificaAbilitato}
                onChange={v => updateSettings({ suonoNotificaAbilitato: v })}
              />
              
              {settings.suonoNotificaAbilitato && (
                <div className="flex flex-col gap-4 mt-3">
                  <Toggle
                    label="Suono solo per Ordini Online"
                    desc="Riproduce l'alert sonoro solo per gli ordini web esterni, riducendo lo spam acustico"
                    value={settings.suonoSoloOnline}
                    onChange={v => updateSettings({ suonoSoloOnline: v })}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                    <div>
                      <label className="label">Volume Chime</label>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          className="select w-32"
                          value={settings.suonoVolume}
                          onChange={e => updateSettings({ suonoVolume: Number(e.target.value) })}
                        >
                          <option value={0.1}>Basso (10%)</option>
                          <option value={0.3}>Medio (30%)</option>
                          <option value={0.5}>Alto (50%)</option>
                          <option value={0.8}>Massimo (80%)</option>
                        </select>
                        <button
                          onClick={() => playChime(settings.suonoVolume)}
                          className="btn-secondary text-xs py-2 px-3"
                          title="Ascolta un'anteprima del suono"
                        >
                          🔊 Test Suono
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">Ritardo Cooldown Sonoro</label>
                      <select
                        className="select w-48 mt-1"
                        value={settings.suonoCooldown}
                        onChange={e => updateSettings({ suonoCooldown: Number(e.target.value) })}
                      >
                        <option value={0}>Nessuno (suona sempre)</option>
                        <option value={5}>5 secondi</option>
                        <option value={10}>10 secondi (Consigliato)</option>
                        <option value={30}>30 secondi</option>
                        <option value={60}>1 minuto</option>
                      </select>
                      <p className="text-[10px] text-text-muted mt-1">Tempo minimo di silenzio tra due chime acustici consecutivi</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONSEGNE ── */}
        {sezione === 'consegne' && (
          <div className="card p-6">
            <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><Truck size={18} /> Consegne a domicilio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Costo consegna (€)</label>
                <input type="number" min={0} step={0.5} className="input w-36" value={settings.costoConsegna}
                  onChange={e => updateSettings({ costoConsegna: Number(e.target.value) })} />
                <p className="text-xs text-text-muted mt-1">Inserisci 0 per consegna sempre gratuita</p>
              </div>
              <div>
                <label className="label">Soglia gratuità consegna (€)</label>
                <input type="number" min={0} step={1} className="input w-36" value={settings.sogliaConsegnaGratis}
                  onChange={e => updateSettings({ sogliaConsegnaGratis: Number(e.target.value) })} />
                <p className="text-xs text-text-muted mt-1">Gratis sopra questo importo (0 = mai gratis)</p>
              </div>
              <div>
                <label className="label">Tempo stimato consegna (min)</label>
                <input type="number" min={5} max={180} className="input w-36" value={settings.tempoConsegna}
                  onChange={e => updateSettings({ tempoConsegna: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        )}

        {/* ── BUSINESS ── */}
        {sezione === 'business' && (
          <div className="card p-6">
            <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><BarChart3 size={18} /> Business & Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Obiettivo fatturato giornaliero (€)</label>
                <input type="number" min={0} step={50} className="input w-40" value={settings.obiettivGiornaliero}
                  onChange={e => updateSettings({ obiettivGiornaliero: Number(e.target.value) })} />
                <p className="text-xs text-text-muted mt-1">Mostrato come target nella Dashboard</p>
              </div>
              <div>
                <label className="label">Giorno di chiusura (escluso dai report)</label>
                <select className="select w-48" value={settings.giornoChiusura}
                  onChange={e => updateSettings({ giornoChiusura: e.target.value })}>
                  <option value="nessuno">Nessuno</option>
                  {GIORNI.map(g => <option key={g} value={g}>{GIORNI_LABEL[g]}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── MODULI ── */}
        {sezione === 'moduli' && (
          <div className="flex flex-col gap-4">
            <div className="card p-6">
              <h2 className="font-bold text-text-primary mb-1 flex items-center gap-2">
                <LayoutDashboard size={18} /> Moduli visibili
              </h2>
              <p className="text-sm text-text-muted mb-5">
                Scegli quali sezioni mostrare nella barra laterale. I moduli disabilitati vengono nascosti ma i dati vengono conservati.
              </p>
              <div className="flex flex-col">
                {([
                  { key: 'clienti',    label: 'Clienti',          desc: 'Rubrica clienti, storico ordini e fidelizzazione', icon: '👥' },
                  { key: 'consegne',   label: 'Consegne',         desc: 'Gestione delivery e rider',                        icon: '🛵' },
                  { key: 'inventario', label: 'Inventario',       desc: 'Ingredienti, scorte e movimenti magazzino',         icon: '📦' },
                  { key: 'report',     label: 'Report & Analytics',desc: 'Vendite, margini e statistiche avanzate',          icon: '📊' },
                  { key: 'storico',    label: 'Storico ordini',   desc: 'Archivio di tutti gli ordini completati',           icon: '📋' },
                ] as { key: keyof typeof settings.mostraModuli; label: string; desc: string; icon: string }[]).map(mod => (
                  <Toggle
                    key={mod.key}
                    value={settings.mostraModuli[mod.key]}
                    onChange={v => updateSettings({ mostraModuli: { ...settings.mostraModuli, [mod.key]: v } })}
                    label={`${mod.icon} ${mod.label}`}
                    desc={mod.desc}
                  />
                ))}
              </div>
            </div>
            <div className="card p-4 bg-info/5 border border-info/20">
              <p className="text-sm text-info font-medium flex items-start gap-2">
                <Bell size={15} className="mt-0.5 flex-shrink-0" />
                Le modifiche sono istantanee — la sidebar si aggiorna subito senza riavviare l'app.
              </p>
            </div>
          </div>
        )}

        {/* ── UTENTI ── */}
        {sezione === 'utenti' && (

          <div className="flex flex-col gap-4">
            {/* Cambio password */}
            <div className="card p-6">
              <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><Key size={18} /> Cambia password</h2>
              <div className="flex flex-col gap-3 max-w-sm">
                <div>
                  <label className="label">Password attuale</label>
                  <div className="relative">
                    <input type={mostraPass ? 'text' : 'password'} className="input pr-10"
                      value={vecchiaPassword} onChange={e => setVecchiaPassword(e.target.value)} />
                    <button type="button" onClick={() => setMostraPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                      {mostraPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Nuova password</label>
                  <input type={mostraPass ? 'text' : 'password'} className="input"
                    value={nuovaPassword} onChange={e => setNuovaPassword(e.target.value)}
                    placeholder="Min. 6 caratteri" />
                </div>
                <button onClick={handleCambiaPassword} className="btn-primary w-fit">
                  <Key size={14} /> Aggiorna password
                </button>
              </div>
            </div>

            {/* Info ruoli */}
            <div className="card p-6">
              <h2 className="font-bold text-text-primary mb-3 flex items-center gap-2"><Users size={18} /> Ruoli e permessi</h2>
              <div className="flex flex-col gap-2 text-sm">
                {[
                  { ruolo: 'titolare', desc: 'Accesso completo: gestione menu, report, utenti, impostazioni', color: 'text-primary' },
                  { ruolo: 'responsabile', desc: 'Accesso a cassa, ordini, cucina, consegne, clienti', color: 'text-info' },
                  { ruolo: 'dipendente', desc: 'Solo cassa, ordini e cucina', color: 'text-success' },
                ].map(r => (
                  <div key={r.ruolo} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                    <span className={clsx('font-semibold capitalize w-28 flex-shrink-0', r.color)}>{r.ruolo}</span>
                    <span className="text-text-secondary text-xs">{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── HARDWARE ── */}
        {sezione === 'hardware' && (
          <div className="card p-6">
            <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><Printer size={18} /> Hardware & Periferiche</h2>
            <div className="flex flex-col gap-5">
              <div>
                <label className="label">Indirizzo IP stampante termica</label>
                <input className="input w-56 font-mono" value={settings.ipStampante}
                  onChange={e => updateSettings({ ipStampante: e.target.value })}
                  placeholder="192.168.1.100" />
                <p className="text-xs text-text-muted mt-1">Per integrazione futura con stampante POS</p>
              </div>
              <div className="border-t border-border pt-4">
                <Toggle label="Modalità demo"
                  desc="Simula le operazioni senza effettuare chiamate API reali (utile per training)"
                  value={settings.modalitaDemo}
                  onChange={v => updateSettings({ modalitaDemo: v })} />
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Periferiche connesse</p>
                {[
                  { label: 'Stampante cucina',        stato: 'Connessa',      ok: true },
                  { label: 'Stampante cassa',          stato: 'Connessa',      ok: true },
                  { label: 'Display cliente',          stato: 'Non connesso',  ok: false },
                  { label: 'Lettore codice a barre',   stato: 'Non connesso',  ok: false },
                ].map(p => (
                  <div key={p.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <span className="text-sm text-text-primary">{p.label}</span>
                    <span className={clsx('text-sm font-semibold', p.ok ? 'text-success' : 'text-text-muted')}>{p.stato}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SISTEMA ── */}
        {sezione === 'sistema' && (
          <div className="card p-6">
            <h2 className="font-bold text-text-primary mb-5 flex items-center gap-2"><Shield size={18} /> Sistema</h2>
            <div className="flex flex-col gap-0 text-sm">
              {[
                { label: 'Versione app',        value: 'v1.0.0',   valueClass: 'font-mono text-xs bg-bg px-3 py-1 rounded-lg' },
                { label: 'Connessione backend', value: backendStatus, valueClass: backendStatus.includes('Online') ? 'text-success font-semibold' : 'text-danger font-semibold' },
                { label: 'Database',            value: dbStatus, valueClass: dbStatus.includes('Connesso') ? 'text-success font-semibold' : 'text-danger font-semibold' },
                { label: 'Ultimo backup',       value: 'Oggi 03:00', valueClass: 'text-text-muted' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-text-secondary">{row.label}</span>
                  <span className={row.valueClass}>{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 border-b border-border">
                <div>
                  <span className="text-text-secondary">Reset impostazioni</span>
                  <p className="text-xs text-text-muted mt-0.5">Ripristina tutti i valori predefiniti</p>
                </div>
                <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-warning border border-warning/30 rounded-xl hover:bg-warning/10 transition-colors">
                  <RefreshCcw size={12} /> Reset
                </button>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <span className="text-text-secondary">Reset dati demo</span>
                  <p className="text-xs text-text-muted mt-0.5">Cancella modifiche e ripristina dati originali</p>
                </div>
                <button
                  onClick={() => {
                    if (!window.confirm('Eliminare tutti i dati demo?')) return;
                    ['gestionale:ordini', 'gestionale:menu', 'gestionale:inventario'].forEach(k => localStorage.removeItem(k));
                    window.location.reload();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger border border-danger/30 rounded-xl hover:bg-danger/10 transition-colors"
                >
                  <RefreshCcw size={12} /> Reset dati
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CODICI SCONTO ── */}
        {sezione === 'coupon' && (
          <CouponManagement />
        )}

        {/* ── LOG DI SISTEMA ── */}
        {sezione === 'logs' && isAuthorized && (
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
              <div>
                <h2 className="font-bold text-text-primary text-lg flex items-center gap-2">
                  <Terminal className="text-primary" size={20} /> Log di Sistema
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Ultimi 100 eventi di errore o crash registrati sia lato client che server.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={caricaLog}
                  disabled={loadingLogs}
                  className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
                >
                  <RefreshCcw size={14} className={clsx(loadingLogs && 'animate-spin')} />
                  Aggiorna
                </button>
                <button
                  onClick={handleClearLogs}
                  disabled={logs.length === 0 || loadingLogs}
                  className="btn-danger text-xs py-1.5 flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Svuota Log
                </button>
              </div>
            </div>

            {/* Filtri & Ricerca */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Cerca nei log (messaggio, url, stack)..."
                  className="input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <select
                  className="select"
                  value={filtroTipo}
                  onChange={e => setFiltroTipo(e.target.value)}
                >
                  <option value="tutti">Tutti i log</option>
                  <option value="EXCEPTIONS">Eccezioni Javascript</option>
                  <option value="API">Errori API</option>
                  <option value="REACT">Crash React UI</option>
                </select>
              </div>
            </div>

            {loadingLogs ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-secondary">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-sm font-medium">Caricamento log...</span>
              </div>
            ) : logsFiltrati.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-border rounded-xl bg-bg/50">
                <Activity size={36} className="mx-auto text-text-muted mb-3" />
                <p className="text-sm font-semibold text-text-primary">Nessun log registrato</p>
                <p className="text-xs text-text-muted mt-1">Il sistema funziona regolarmente senza errori segnalati.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {logsFiltrati.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  
                  // Colori badge per tipo di log
                  let badgeColor = 'bg-gray-100 text-gray-700';
                  if (log.messaggio.includes('REACT_CRASH') || log.messaggio.includes('Crash')) {
                    badgeColor = 'bg-red-100 text-red-700 border border-red-200';
                  } else if (log.messaggio.includes('API_ERROR') || log.messaggio.includes('REJECTION') || log.messaggio.toLowerCase().includes('http')) {
                    badgeColor = 'bg-orange-100 text-orange-700 border border-orange-200';
                  } else if (log.messaggio.includes('UNCAUGHT') || log.messaggio.includes('EXCEPTION')) {
                    badgeColor = 'bg-rose-100 text-rose-700 border border-rose-200';
                  }

                  return (
                    <div
                      key={log.id}
                      className={clsx(
                        'border rounded-xl transition-all duration-200 bg-white shadow-sm hover:shadow-md overflow-hidden',
                        isExpanded ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
                      )}
                    >
                      {/* Header log riga */}
                      <div
                        onClick={() => toggleLog(log.id)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', badgeColor)}>
                              {log.metodo || 'ERR'}
                            </span>
                            <span className="text-xs text-text-muted font-medium">
                              {formatDate(log.creato_il)}
                            </span>
                            {log.url && (
                              <span className="text-xs font-mono bg-bg text-text-secondary px-1.5 py-0.5 rounded max-w-xs truncate" title={log.url}>
                                {log.url}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-text-primary truncate" title={log.messaggio}>
                            {log.messaggio}
                          </h3>
                        </div>
                        <div className="text-text-muted hover:text-text-primary p-1">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Dettagli log riga */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs">
                            <div className="bg-white p-2.5 rounded-lg border border-border">
                              <span className="text-text-muted block mb-0.5 uppercase tracking-wider text-[9px] font-bold">Tipo Evento</span>
                              <span className="font-semibold text-text-primary">{log.metodo || 'Eccezione/Errore'}</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-border">
                              <span className="text-text-muted block mb-0.5 uppercase tracking-wider text-[9px] font-bold">Metodo / API URL</span>
                              <span className="font-mono text-text-primary break-all">{log.metodo ? `${log.metodo} ${log.url || ''}` : 'N/A'}</span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-border">
                              <span className="text-text-muted block mb-0.5 uppercase tracking-wider text-[9px] font-bold">Data di registrazione</span>
                              <span className="font-semibold text-text-primary">{new Date(log.creato_il).toLocaleString('it-IT')}</span>
                            </div>
                          </div>

                          {log.stack ? (
                            <div className="relative mt-3">
                              <div className="absolute right-2 top-2 flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopia(log.stack || '', log.id);
                                  }}
                                  className="p-1.5 rounded-md bg-white border border-border text-text-secondary hover:text-primary transition-colors"
                                  title="Copia stack trace"
                                >
                                  {copiatoId === log.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                                </button>
                              </div>
                              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[10px] font-mono leading-relaxed max-h-72">
                                {log.stack}
                              </pre>
                            </div>
                          ) : (
                            <div className="text-xs text-text-muted italic p-2 bg-white rounded-lg border border-dashed border-border text-center">
                              Nessun dettaglio aggiuntivo dello stack trace registrato per questo log.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Salva */}
        {sezione !== 'coupon' && sezione !== 'logs' && (
          <div className="flex justify-end">
            <button onClick={salva} className="btn-primary">
              <Save size={16} /> Salva impostazioni
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
