import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Phone, Mail, Star, X, Save, RefreshCw, Pencil, Trash2, User } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils';
import { clsx } from 'clsx';
import { useToast } from '@/contexts/ToastContext';
import { getClienti, creaCliente, aggiornaCliente, eliminaCliente } from '@/api/clienti';
import type { ClienteAPI, CreaClienteBody } from '@/api/clienti';

function segmentoCliente(c: ClienteAPI): { label: string; color: string; icon: string } {
  const p = c.punti_fedelta;
  if (p >= 200) return { label: 'VIP',          color: 'bg-violet/10 text-violet',     icon: '⭐' };
  if (p >= 100) return { label: 'Affezionato',  color: 'bg-info/10 text-info',         icon: '💙' };
  if (p >= 30)  return { label: 'Occasionale',  color: 'bg-gray-100 text-gray-600',    icon: '🔄' };
  return              { label: 'Nuovo',         color: 'bg-blue-100 text-blue-700',    icon: '🌱' };
}

interface FormCliente {
  nome: string;
  cognome: string;
  telefono: string;
  email: string;
  note: string;
}

const formVuoto: FormCliente = { nome: '', cognome: '', telefono: '', email: '', note: '' };

interface ModalClienteProps {
  cliente: ClienteAPI | null; // null = creazione
  onClose: () => void;
  onSaved: (c: ClienteAPI) => void;
}

function ModalCliente({ cliente, onClose, onSaved }: ModalClienteProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormCliente>(
    cliente
      ? { nome: cliente.nome, cognome: cliente.cognome, telefono: cliente.telefono, email: cliente.email ?? '', note: cliente.note ?? '' }
      : formVuoto
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<FormCliente>>({});

  const set = (k: keyof FormCliente) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const valida = () => {
    const errs: Partial<FormCliente> = {};
    if (!form.nome.trim())     errs.nome = 'Campo obbligatorio';
    if (!form.cognome.trim())  errs.cognome = 'Campo obbligatorio';
    if (!form.telefono.trim()) errs.telefono = 'Campo obbligatorio';
    else if (!/^[\d\s\+\-\(\)]{6,20}$/.test(form.telefono.trim())) errs.telefono = 'Numero non valido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const salva = async () => {
    if (!valida()) return;
    setSaving(true);
    try {
      const body: CreaClienteBody = {
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim() || undefined,
        note: form.note.trim() || undefined,
      };
      const salvato = cliente
        ? await aggiornaCliente(cliente.id, body)
        : await creaCliente(body);
      toast.success(cliente ? 'Cliente aggiornato!' : 'Cliente creato!');
      onSaved(salvato);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errore?: string } } })?.response?.data?.errore
        || 'Errore durante il salvataggio';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-text-primary text-lg flex items-center gap-2">
            <User size={18} />
            {cliente ? `Modifica: ${cliente.nome} ${cliente.cognome}` : 'Nuovo cliente'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 flex flex-col gap-4">
          {/* Nome + Cognome */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome <span className="text-danger">*</span></label>
              <input
                className={clsx('input', errors.nome && 'border-danger')}
                placeholder="Mario"
                value={form.nome}
                onChange={set('nome')}
              />
              {errors.nome && <p className="text-xs text-danger mt-1">{errors.nome}</p>}
            </div>
            <div>
              <label className="label">Cognome <span className="text-danger">*</span></label>
              <input
                className={clsx('input', errors.cognome && 'border-danger')}
                placeholder="Rossi"
                value={form.cognome}
                onChange={set('cognome')}
              />
              {errors.cognome && <p className="text-xs text-danger mt-1">{errors.cognome}</p>}
            </div>
          </div>

          {/* Telefono */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Phone size={13} /> Telefono <span className="text-danger">*</span>
            </label>
            <input
              className={clsx('input', errors.telefono && 'border-danger')}
              type="tel"
              placeholder="Es. 333 1234567"
              value={form.telefono}
              onChange={set('telefono')}
            />
            {errors.telefono && <p className="text-xs text-danger mt-1">{errors.telefono}</p>}
            <p className="text-xs text-text-muted mt-1">Il numero viene usato per ricerche rapide in cassa</p>
          </div>

          {/* Email */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Mail size={13} /> Email <span className="text-text-muted font-normal">(opzionale)</span>
            </label>
            <input
              className="input"
              type="email"
              placeholder="mario@esempio.it"
              value={form.email}
              onChange={set('email')}
            />
          </div>

          {/* Note */}
          <div>
            <label className="label">Note</label>
            <textarea
              className="input resize-none text-sm"
              rows={2}
              placeholder="Allergie, preferenze, indirizzo consegna abituale…"
              value={form.note}
              onChange={set('note')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Annulla
          </button>
          <button
            onClick={salva}
            disabled={saving}
            className={clsx('btn-primary flex-1 justify-center', saving && 'opacity-60 cursor-not-allowed')}
          >
            {saving
              ? <><RefreshCw size={14} className="animate-spin" /> Salvataggio…</>
              : <><Save size={14} /> {cliente ? 'Aggiorna' : 'Crea cliente'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Clienti() {
  const toast = useToast();
  const [clienti, setClienti] = useState<ClienteAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [cerca, setCerca] = useState('');
  const [segFiltro, setSegFiltro] = useState('tutti');
  const [modalCliente, setModalCliente] = useState<ClienteAPI | null | 'nuovo'>(null); // null=chiuso, 'nuovo'=creazione, ClienteAPI=modifica

  const carica = useCallback(async () => {
    try {
      const data = await getClienti();
      setClienti(data);
    } catch {
      toast.error('Impossibile caricare i clienti dal server.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carica(); }, [carica]);

  const handleElimina = async (c: ClienteAPI, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Eliminare ${c.nome} ${c.cognome}? L'operazione è irreversibile.`)) return;
    try {
      await eliminaCliente(c.id);
      setClienti(prev => prev.filter(x => x.id !== c.id));
      toast.success('Cliente eliminato');
    } catch {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const conSegmento = clienti.map(c => ({ ...c, _seg: segmentoCliente(c) }));

  const filtrati = conSegmento.filter(c => {
    const matchSeg = segFiltro === 'tutti' || c._seg.label.toLowerCase() === segFiltro;
    const q = cerca.toLowerCase();
    const matchSearch =
      `${c.nome} ${c.cognome}`.toLowerCase().includes(q) ||
      c.telefono.includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false);
    return matchSeg && matchSearch;
  });

  const segCounts = {
    vip:         clienti.filter(c => segmentoCliente(c).label === 'VIP').length,
    affezionato: clienti.filter(c => segmentoCliente(c).label === 'Affezionato').length,
    occasionale: clienti.filter(c => segmentoCliente(c).label === 'Occasionale').length,
    nuovo:       clienti.filter(c => segmentoCliente(c).label === 'Nuovo').length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'vip',         label: 'VIP',         icon: '⭐', color: 'bg-violet/10 text-violet',   count: segCounts.vip },
          { key: 'affezionato', label: 'Affezionato', icon: '💙', color: 'bg-info/10 text-info',        count: segCounts.affezionato },
          { key: 'occasionale', label: 'Occasionale', icon: '🔄', color: 'bg-gray-100 text-gray-600',   count: segCounts.occasionale },
          { key: 'nuovo',       label: 'Nuovo',       icon: '🌱', color: 'bg-blue-100 text-blue-700',   count: segCounts.nuovo },
        ].map(s => (
          <div
            key={s.key}
            className="card p-4 cursor-pointer hover:shadow-elevated transition-shadow"
            onClick={() => setSegFiltro(s.key === segFiltro ? 'tutti' : s.key)}
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-text-primary">{s.count}</div>
            <div className={clsx('badge mt-1', s.color)}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input pl-9 w-60"
              placeholder="Cerca per nome o telefono..."
              value={cerca}
              onChange={e => setCerca(e.target.value)}
            />
          </div>
          <select className="select w-44" value={segFiltro} onChange={e => setSegFiltro(e.target.value)}>
            <option value="tutti">Tutti i segmenti</option>
            <option value="vip">VIP</option>
            <option value="affezionato">Affezionato</option>
            <option value="occasionale">Occasionale</option>
            <option value="nuovo">Nuovo</option>
          </select>
        </div>
        <button className="btn-primary" onClick={() => setModalCliente('nuovo')}>
          <Plus size={16} /> Nuovo cliente
        </button>
      </div>

      {/* Table (hidden on mobile, visible on desktop/tablet) */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Cliente', 'Contatti', 'Segmento', 'Punti fedeltà', 'Pizze', 'Ultimo ordine', 'Note', ''].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="table-cell">
                          <div className="h-4 bg-border/50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtrati.map(c => {
                    const seg = c._seg;
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-bg transition-colors cursor-pointer"
                        onClick={() => setModalCliente(c)}
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              {c.nome[0]}{c.cognome[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-text-primary">{c.nome} {c.cognome}</div>
                              <div className="text-xs text-text-muted">#{c.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs flex items-center gap-1 text-text-secondary font-medium">
                              <Phone size={10} /> {c.telefono}
                            </div>
                            {c.email && <div className="text-xs flex items-center gap-1 text-text-muted"><Mail size={10} /> {c.email}</div>}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={clsx('badge', seg.color)}>{seg.icon} {seg.label}</span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1 font-bold text-text-primary">
                            <Star size={12} className="text-warning" /> {c.punti_fedelta}
                          </div>
                        </td>
                        <td className="table-cell font-bold text-text-primary">🍕 {c.contatore_pizze}</td>
                        <td className="table-cell text-text-muted text-xs">
                          {c.ultimo_ordine ? c.ultimo_ordine.split(' ')[0] : '—'}
                        </td>
                        <td className="table-cell text-text-muted text-xs max-w-[150px] truncate">
                          {c.note ?? '—'}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setModalCliente(c)}
                              className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-bg transition-colors"
                              title="Modifica"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={e => handleElimina(c, e)}
                              className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-bg transition-colors"
                              title="Elimina"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              {!loading && filtrati.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-cell text-center text-text-muted py-12">
                    {cerca ? `Nessun risultato per "${cerca}"` : 'Nessun cliente trovato'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile view: Card list */}
      <div className="flex flex-col gap-3 sm:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse bg-border/20 h-24" />
          ))
        ) : filtrati.length === 0 ? (
          <div className="card text-center py-12 text-text-muted">
            {cerca ? `Nessun risultato per "${cerca}"` : 'Nessun cliente trovato'}
          </div>
        ) : (
          filtrati.map(c => {
            const seg = c._seg;
            return (
              <div
                key={c.id}
                onClick={() => setModalCliente(c)}
                className="card p-4 flex flex-col gap-3 cursor-pointer hover:border-primary transition-all active:scale-95"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {c.nome[0]}{c.cognome[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary text-sm">{c.nome} {c.cognome}</h4>
                      <span className="text-[10px] text-text-muted">ID: #{c.id}</span>
                    </div>
                  </div>
                  <span className={clsx('badge text-[10px]', seg.color)}>{seg.icon} {seg.label}</span>
                </div>
                
                <div className="flex flex-col gap-1 text-xs text-text-secondary border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1.5"><Phone size={12} /> {c.telefono}</div>
                  {c.email && <div className="flex items-center gap-1.5"><Mail size={12} /> {c.email}</div>}
                </div>

                <div className="flex justify-between items-center border-t border-gray-100 pt-3 text-xs">
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[10px] text-text-muted block font-semibold uppercase">Punti</span>
                      <span className="font-bold text-text-primary flex items-center gap-0.5">⭐ {c.punti_fedelta}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block font-semibold uppercase">Pizze</span>
                      <span className="font-bold text-text-primary">🍕 {c.contatore_pizze}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setModalCliente(c)}
                      className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-bg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={e => handleElimina(c, e)}
                      className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-bg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modale creazione / modifica */}
      {modalCliente !== null && (
        <ModalCliente
          cliente={modalCliente === 'nuovo' ? null : modalCliente}
          onClose={() => setModalCliente(null)}
          onSaved={salvato => {
            setClienti(prev => {
              const idx = prev.findIndex(x => x.id === salvato.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = salvato;
                return next;
              }
              return [salvato, ...prev];
            });
            setModalCliente(null);
          }}
        />
      )}
    </div>
  );
}
