import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Trash2, Users, UserPlus, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/utils';
import api from '@/api/client';

interface Coupon {
  id: number;
  codice: string;
  tipo: 'percentuale' | 'fisso';
  valore: number;
  prodotto_gratis_id: number | null;
  valido_dal: string;
  valido_al: string;
  utilizzi_massimi: number;
  utilizzi_correnti: number;
  attivo: number;
}

interface Cliente {
  id: number;
  nome: string;
  cognome: string;
  telefono: string;
}

export default function CouponManagement() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [creazione, setCreazione] = useState(false);
  const [assegnazione, setAssegnazione] = useState(false);

  // Form creazione
  const [codice, setCodice] = useState('');
  const [tipo, setTipo] = useState<'percentuale' | 'fisso'>('percentuale');
  const [valore, setValore] = useState<number>(10);
  const [validoDal, setValidoDal] = useState(new Date().toISOString().split('T')[0]);
  const [validoAl, setValidoAl] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [utilizziMassimi, setUtilizziMassimi] = useState<number>(100);

  // Form assegnazione
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<number | 'tutti'>('tutti');

  const caricaDati = useCallback(async () => {
    setLoading(true);
    try {
      const [resCoupons, resClienti] = await Promise.all([
        api.get('/coupon').then(r => r.data),
        api.get('/clienti').then(r => r.data),
      ]);

      if (Array.isArray(resCoupons)) setCoupons(resCoupons);
      if (Array.isArray(resClienti)) setClienti(resClienti);
    } catch {
      toast.error('Errore durante il caricamento dei coupon.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    caricaDati();
  }, [caricaDati]);

  const handleCrea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codice.trim()) {
      toast.error('Inserisci un codice valido');
      return;
    }

    try {
      const res = await api.post('/coupon', {
        codice: codice.trim().toUpperCase(),
        tipo,
        valore: Number(valore),
        valido_dal: validoDal,
        valido_al: validoAl,
        utilizzi_massimi: Number(utilizziMassimi),
      });

      toast.success('Coupon creato con successo!');
      setCoupons(prev => [...prev, res.data]);
      setCreazione(false);
      setCodice('');
    } catch (err: any) {
      const msg = err.response?.data?.errore || 'Errore di connessione durante la creazione del coupon';
      toast.error(msg);
    }
  };

  const handleDisattiva = async (id: number) => {
    if (!window.confirm('Sei sicuro di voler disattivare questo coupon?')) return;
    try {
      await api.delete(`/coupon/${id}`);
      toast.success('Coupon disattivato correttamente');
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, attivo: 0 } : c));
    } catch (err: any) {
      const msg = err.response?.data?.errore || 'Errore di rete durante la disattivazione';
      toast.error(msg);
    }
  };

  const handleAssegna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCouponId) {
      toast.error('Seleziona un coupon');
      return;
    }

    try {
      const res = await api.post('/coupon/assegna', {
        coupon_id: selectedCouponId,
        cliente_id: selectedClienteId === 'tutti' ? null : Number(selectedClienteId),
        assegna_a_tutti: selectedClienteId === 'tutti',
      });

      toast.success(res.data.messaggio || 'Coupon assegnato correttamente!');
      setAssegnazione(false);
    } catch (err: any) {
      const msg = err.response?.data?.errore || 'Errore di connessione durante l\'assegnazione';
      toast.error(msg);
    }
  };

  const oggi = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-text-primary text-lg flex items-center gap-2">
            <Tag size={20} className="text-primary" /> Gestione Codici Sconto
          </h2>
          <p className="text-xs text-text-muted mt-0.5">Gestisci sconti percentuali o fissi e assegnali ai clienti</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAssegnazione(true)} className="btn-secondary text-xs">
            <UserPlus size={14} /> Assegna Coupon
          </button>
          <button onClick={() => setCreazione(true)} className="btn-primary text-xs">
            <Plus size={14} /> Crea Nuovo
          </button>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="card text-center py-12 text-text-muted">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
          Caricamento codici sconto in corso...
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg border-b border-border">
                  <th className="table-header">Codice</th>
                  <th className="table-header">Tipo</th>
                  <th className="table-header">Valore</th>
                  <th className="table-header">Utilizzi</th>
                  <th className="table-header">Validità</th>
                  <th className="table-header">Stato</th>
                  <th className="table-header text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-8 text-text-muted text-sm">
                      Nessun coupon attivo configurato. Clicca su "Crea Nuovo" per iniziare.
                    </td>
                  </tr>
                ) : (
                  coupons.map(c => {
                    const scaduto = oggi > c.valido_al;
                    const esaurito = c.utilizzi_correnti >= c.utilizzi_massimi;
                    const disattivato = c.attivo === 0;

                    let badgeStato = <span className="badge bg-success/10 text-success">Attivo</span>;
                    if (disattivato) {
                      badgeStato = <span className="badge bg-gray-100 text-gray-500">Disattivato</span>;
                    } else if (scaduto) {
                      badgeStato = <span className="badge bg-danger/10 text-danger">Scaduto</span>;
                    } else if (esaurito) {
                      badgeStato = <span className="badge bg-warning/10 text-warning">Esaurito</span>;
                    }

                    return (
                      <tr key={c.id} className="hover:bg-bg transition-colors">
                        <td className="table-cell font-mono font-bold text-sm tracking-wider">{c.codice}</td>
                        <td className="table-cell capitalize text-xs">{c.tipo}</td>
                        <td className="table-cell font-semibold text-sm">
                          {c.tipo === 'percentuale' ? `${c.valore}%` : formatCurrency(c.valore)}
                        </td>
                        <td className="table-cell text-xs font-medium">
                          {c.utilizzi_correnti} / {c.utilizzi_massimi}
                        </td>
                        <td className="table-cell text-xs text-text-secondary flex items-center gap-1.5 mt-2.5">
                          <Clock size={11} className="text-text-muted" />
                          {c.valido_dal} ➔ {c.valido_al}
                        </td>
                        <td className="table-cell">{badgeStato}</td>
                        <td className="table-cell text-right">
                          {c.attivo === 1 && (
                            <button
                              onClick={() => handleDisattiva(c.id)}
                              className="text-danger hover:text-red-700 p-1 rounded-lg hover:bg-danger/10 transition-colors"
                              title="Disattiva coupon"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Creazione */}
      {creazione && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleCrea} className="bg-surface rounded-2xl shadow-elevated w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-text-primary text-lg">Crea Nuovo Codice Sconto</h3>
              <button type="button" onClick={() => setCreazione(false)} className="text-text-muted hover:text-text-primary text-sm font-semibold">Annulla</button>
            </div>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="label">Codice Coupon</label>
                <input
                  type="text"
                  required
                  placeholder="Es. PROMO30"
                  className="input font-mono uppercase"
                  value={codice}
                  onChange={e => setCodice(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo Sconto</label>
                  <select className="select" value={tipo} onChange={e => setTipo(e.target.value as 'percentuale' | 'fisso')}>
                    <option value="percentuale">Percentuale (%)</option>
                    <option value="fisso">Importo fisso (€)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Valore Sconto</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="input"
                    value={valore}
                    onChange={e => setValore(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valido dal</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={validoDal}
                    onChange={e => setValidoDal(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Valido al</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={validoAl}
                    onChange={e => setValidoAl(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label">Utilizzi Massimi Consentiti</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="input font-semibold"
                  value={utilizziMassimi}
                  onChange={e => setUtilizziMassimi(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-3">
              <button type="button" onClick={() => setCreazione(false)} className="btn-secondary flex-1 justify-center">Annulla</button>
              <button type="submit" className="btn-primary flex-1 justify-center">Salva Coupon</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Assegnazione */}
      {assegnazione && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleAssegna} className="bg-surface rounded-2xl shadow-elevated w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-text-primary text-lg">Assegna Coupon a Cliente</h3>
              <button type="button" onClick={() => setAssegnazione(false)} className="text-text-muted hover:text-text-primary text-sm font-semibold">Annulla</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="label">Seleziona Coupon</label>
                <select
                  required
                  className="select"
                  value={selectedCouponId ?? ''}
                  onChange={e => setSelectedCouponId(Number(e.target.value))}
                >
                  <option value="" disabled>Scegli un codice...</option>
                  {coupons.filter(c => c.attivo === 1 && oggi <= c.valido_al).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codice} ({c.tipo === 'percentuale' ? `${c.valore}%` : formatCurrency(c.valore)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Assegna a</label>
                <select
                  required
                  className="select"
                  value={selectedClienteId}
                  onChange={e => setSelectedClienteId(e.target.value as number | 'tutti')}
                >
                  <option value="tutti">👥 Tutti i clienti registrati</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>
                      👤 {c.nome} {c.cognome} ({c.telefono})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-3">
              <button type="button" onClick={() => setAssegnazione(false)} className="btn-secondary flex-1 justify-center">Annulla</button>
              <button type="submit" className="btn-primary flex-1 justify-center">Assegna</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
