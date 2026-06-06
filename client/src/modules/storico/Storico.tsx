import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Printer, X } from 'lucide-react';
import { formatCurrency, formatDate, tempoTrascorso } from '@/utils';
import StatusBadge from '@/components/badges/StatusBadge';
import { clsx } from 'clsx';
import { useToast } from '@/contexts/ToastContext';
import { getOrdini, getOrdineById } from '@/api/ordini';
import type { OrdineAPI, StatoOrdineAPI } from '@/api/ordini';
import PrintPreview from '@/components/print/PrintPreview';

const statiOptions = [
  { value: 'tutti',          label: 'Tutti gli stati' },
  { value: 'ritirato',       label: 'Ritirati' },
  { value: 'annullato',      label: 'Annullati' },
  { value: 'ricevuto',       label: 'Ricevuti' },
  { value: 'in_preparazione',label: 'In preparazione' },
  { value: 'pronto',         label: 'Pronti' },
];

const canaliOptions = [
  { value: 'tutti',    label: 'Tutti i canali' },
  { value: 'banco',    label: 'Banco' },
  { value: 'telefono', label: 'Telefono' },
  { value: 'online',   label: 'Online' },
];

const canaleIcon: Record<string, string> = { banco: '🪑', telefono: '📞', online: '🌐' };

export default function Storico() {
  const toast = useToast();
  const [ordini, setOrdini] = useState<OrdineAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [cerca, setCerca] = useState('');
  const [statoFiltro, setStatoFiltro] = useState('tutti');
  const [canaleFiltro, setCanaleFiltro] = useState('tutti');
  const [selected, setSelected] = useState<OrdineAPI | null>(null);
  const [ordineStampa, setOrdineStampa] = useState<OrdineAPI | null>(null);

  const apriStampa = async (o: OrdineAPI) => {
    try {
      const dettaglio = await getOrdineById(o.id);
      setOrdineStampa(dettaglio);
    } catch {
      setOrdineStampa(o);
    }
  };

  const carica = useCallback(async () => {
    try {
      const data = await getOrdini();
      setOrdini(data);
    } catch {
      toast.error('Impossibile caricare lo storico.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carica(); }, [carica]);

  const filtrati = ordini.filter(o => {
    const matchStato = statoFiltro === 'tutti' || o.stato === statoFiltro;
    const matchCanale = canaleFiltro === 'tutti' || o.canale === canaleFiltro;
    const q = cerca.toLowerCase();
    const nomeCliente = o.cliente 
      ? `${o.cliente.nome} ${o.cliente.cognome}` 
      : (o.nome_banco ?? '');
    const telCliente = o.cliente?.telefono || (o.telefono_banco ?? '');
    const matchSearch = o.numero_ordine.toLowerCase().includes(q) ||
                        nomeCliente.toLowerCase().includes(q) ||
                        telCliente.toLowerCase().includes(q);
    return matchStato && matchCanale && matchSearch;
  });

  const totaleVendite = filtrati.filter(o => o.stato === 'ritirato').reduce((a, o) => a + (o.totale ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input className="input pl-9 w-52" placeholder="Cerca ordine..." value={cerca} onChange={e => setCerca(e.target.value)} />
          </div>
          <select className="select w-44" value={statoFiltro} onChange={e => setStatoFiltro(e.target.value)}>
            {statiOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select w-36" value={canaleFiltro} onChange={e => setCanaleFiltro(e.target.value)}>
            {canaliOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-text-secondary">
            <span className="font-bold text-text-primary">{filtrati.length}</span> ordini — <span className="font-bold text-success">{formatCurrency(totaleVendite)}</span>
          </div>
          <button className="btn-secondary" onClick={() => toast.info('Export CSV in corso...')}>
            <Download size={14} /> Esporta
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table (hidden on mobile, visible on desktop/tablet) */}
        <div className={clsx('hidden sm:block flex-1 card p-0 overflow-hidden', selected && 'lg:flex-[0_0_60%]')}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Ordine', 'Data', 'Cliente', 'Canale', 'Totale', 'Pagamento', 'Stato'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="table-cell"><div className="h-4 bg-border/50 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  : filtrati.map(o => (
                      <tr
                        key={o.id}
                        className={clsx('hover:bg-bg transition-colors cursor-pointer', selected?.id === o.id && 'bg-primary/5')}
                        onClick={() => setSelected(selected?.id === o.id ? null : o)}
                      >
                        <td className="table-cell font-semibold">{o.numero_ordine}</td>
                        <td className="table-cell text-xs text-text-muted">{o.creato_il?.split(' ')[0] ?? '—'}</td>
                        <td className="table-cell">
                          {o.cliente ? `${o.cliente.nome} ${o.cliente.cognome}` : o.nome_banco ? `cliente banco: ${o.nome_banco}` : 'cliente banco'}
                        </td>
                        <td className="table-cell">
                          <span className="flex items-center gap-1">{canaleIcon[o.canale] ?? '📋'} {o.canale}</span>
                        </td>
                        <td className="table-cell font-bold">{formatCurrency(o.totale)}</td>
                        <td className="table-cell capitalize text-xs text-text-muted">{o.metodo_pagamento?.replace('_', ' ')}</td>
                        <td className="table-cell"><StatusBadge stato={o.stato} /></td>
                      </tr>
                    ))}
                {!loading && filtrati.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-cell text-center text-text-muted py-12">Nessun ordine trovato</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile card list */}
        <div className={clsx('flex flex-col gap-3 sm:hidden flex-1', selected && 'hidden')}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse bg-border/20 h-20" />
            ))
          ) : filtrati.length === 0 ? (
            <div className="card text-center py-8 text-text-muted">Nessun ordine trovato</div>
          ) : (
            filtrati.map(o => (
              <div
                key={o.id}
                onClick={() => setSelected(o)}
                className="card p-4 flex flex-col gap-2 cursor-pointer hover:border-primary transition-all active:scale-95"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text-primary text-sm">{o.numero_ordine}</span>
                  <span className="text-[10px] text-text-muted">{o.creato_il?.split(' ')[0]}</span>
                </div>
                <div className="text-xs text-text-secondary">
                  {o.cliente ? `${o.cliente.nome} ${o.cliente.cognome}` : o.nome_banco ? `cliente banco: ${o.nome_banco}` : 'cliente banco'}
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-1">
                  <span className="text-xs font-bold text-text-primary">{formatCurrency(o.totale)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted capitalize">{o.canale}</span>
                    <StatusBadge stato={o.stato} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel (Desktop) */}
        {selected && (
          <div className="hidden lg:flex lg:flex-[0_0_38%] card flex-col gap-4 self-start">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-text-primary text-lg">{selected.numero_ordine}</h2>
              <div className="flex items-center gap-2">
                <StatusBadge stato={selected.stato} />
                <button
                  onClick={() => apriStampa(selected)}
                  title="Stampa scontrino"
                  className="btn-secondary text-xs py-1.5 px-2"
                >
                  <Printer size={13} /> Stampa
                </button>
                <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Data</span><span>{selected.creato_il?.split(' ')[0]}</span></div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Cliente</span>
                <span>{selected.cliente ? `${selected.cliente.nome} ${selected.cliente.cognome}` : selected.nome_banco ? `cliente banco: ${selected.nome_banco}` : '—'}</span>
              </div>
              {(selected.cliente?.telefono || selected.telefono_banco) && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Telefono</span>
                  <span>{selected.cliente?.telefono ?? selected.telefono_banco}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-text-secondary">Canale</span><span className="capitalize">{selected.canale}</span></div>
              {selected.nota && <div className="flex justify-between"><span className="text-text-secondary">Note</span><span className="text-right max-w-[60%]">{selected.nota}</span></div>}
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-text-primary mb-3 text-sm">Dettaglio righe</h3>
              <div className="flex flex-col gap-2">
                {(selected.righe ?? []).map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{r.quantita}× {r.prodotto?.nome ?? `#${r.prodotto_id}`}</span>
                    <span className="font-semibold">{formatCurrency((r.prezzo_unitario ?? 0) * r.quantita)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-3 pt-3 flex justify-between font-bold text-text-primary">
                <span>Totale</span><span>{formatCurrency(selected.totale)}</span>
              </div>
              <div className="mt-1 text-xs text-text-muted capitalize">Pagamento: {selected.metodo_pagamento?.replace('_', ' ')}</div>
            </div>
          </div>
        )}

        {/* Detail modal (Mobile & Tablet) */}
        {selected && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <div className="relative z-10 bg-surface border border-border rounded-2xl shadow-elevated w-full max-w-md p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-text-primary text-lg">{selected.numero_ordine}</h2>
                <div className="flex items-center gap-2">
                  <StatusBadge stato={selected.stato} />
                  <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary p-1">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-text-secondary">Data</span><span>{selected.creato_il}</span></div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Cliente</span>
                  <span>{selected.cliente ? `${selected.cliente.nome} ${selected.cliente.cognome}` : selected.nome_banco ? `cliente banco: ${selected.nome_banco}` : '—'}</span>
                </div>
                {(selected.cliente?.telefono || selected.telefono_banco) && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Telefono</span>
                    <span>{selected.cliente?.telefono ?? selected.telefono_banco}</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-text-secondary">Canale</span><span className="capitalize">{selected.canale}</span></div>
                {selected.nota && <div className="flex justify-between"><span className="text-text-secondary">Note</span><span className="text-right max-w-[60%]">{selected.nota}</span></div>}
              </div>
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-text-primary mb-3 text-sm">Dettaglio righe</h3>
                <div className="flex flex-col gap-2">
                  {(selected.righe ?? []).map((r, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{r.quantita}× {r.prodotto?.nome ?? `#${r.prodotto_id}`}</span>
                      <span className="font-semibold">{formatCurrency((r.prezzo_unitario ?? 0) * r.quantita)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-3 pt-3 flex justify-between font-bold text-text-primary">
                  <span>Totale</span><span>{formatCurrency(selected.totale)}</span>
                </div>
                <div className="mt-1 text-xs text-text-muted capitalize">Pagamento: {selected.metodo_pagamento?.replace('_', ' ')}</div>
              </div>
              <div className="flex gap-2 mt-4 border-t border-border pt-4">
                <button
                  onClick={() => apriStampa(selected)}
                  className="btn-secondary flex-1 justify-center text-xs py-2"
                >
                  <Printer size={13} /> Ristampa
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="btn-primary flex-1 justify-center text-xs py-2"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PrintPreview modal */}
      {ordineStampa && (
        <PrintPreview ordine={ordineStampa} onClose={() => setOrdineStampa(null)} />
      )}
    </div>
  );
}
