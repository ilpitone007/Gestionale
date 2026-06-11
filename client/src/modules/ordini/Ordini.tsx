import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Clock, AlertTriangle, Printer, Pencil } from 'lucide-react';
import StatusBadge from '@/components/badges/StatusBadge';
import StatCard from '@/components/cards/StatCard';
import { tempoTrascorso, formatCurrency } from '@/utils';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { getOrdineById, aggiornaStatoOrdine } from '@/api/ordini';
import type { OrdineAPI, StatoOrdineAPI } from '@/api/ordini';
import PrintPreview from '@/components/print/PrintPreview';
import EditOrdine from '@/components/ordini/EditOrdine';
import { useOrders } from '@/contexts/OrdersContext';

const colonne: { stato: StatoOrdineAPI; label: string; color: string }[] = [
  { stato: 'ricevuto',        label: 'Ricevuti',        color: 'border-t-blue-500' },
  { stato: 'in_preparazione', label: 'In preparazione', color: 'border-t-info' },
  { stato: 'pronto',          label: 'Pronti',          color: 'border-t-success' },
  { stato: 'ritirato',        label: 'Ritirati',        color: 'border-t-gray-400' },
];

const nextStato: Partial<Record<StatoOrdineAPI, StatoOrdineAPI>> = {
  ricevuto: 'in_preparazione',
  in_preparazione: 'pronto',
  pronto: 'ritirato',
};

const canaleIcon: Record<string, string> = { banco: '🪑', telefono: '📞', online: '🌐' };

export default function Ordini() {
  const navigate = useNavigate();
  const { ordini, refreshOrdini, loading: refreshing } = useOrders();
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Modali
  const [ordineStampa, setOrdineStampa] = useState<OrdineAPI | null>(null);
  const [ordineModifica, setOrdineModifica] = useState<OrdineAPI | null>(null);
  const [colonnaAttiva, setColonnaAttiva] = useState<StatoOrdineAPI>('ricevuto');

  const avanzaStato = async (id: number) => {
    const ordine = ordini.find(o => o.id === id);
    if (!ordine) return;
    const next = nextStato[ordine.stato];
    if (!next) return;

    setLoadingIds(prev => new Set(prev).add(id));
    try {
      await aggiornaStatoOrdine(id, next);
      await refreshOrdini();
    } catch {
      setError('Impossibile avanzare lo stato dell\'ordine. Riprova.');
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // Apri stampa: carica dettaglio con righe
  const apriStampa = async (o: OrdineAPI) => {
    try {
      const dettaglio = await getOrdineById(o.id);
      setOrdineStampa(dettaglio);
    } catch {
      setOrdineStampa(o);
    }
  };

  // Apri modifica: carica dettaglio con righe
  const apriModifica = async (o: OrdineAPI) => {
    try {
      const dettaglio = await getOrdineById(o.id);
      setOrdineModifica(dettaglio);
    } catch {
      setOrdineModifica(o);
    }
  };

  const attivi = ordini.filter(o => o.stato !== 'ritirato' && o.stato !== 'annullato');

  return (
    <div className="flex flex-col gap-6">
      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attivi"        value={attivi.length}                                              icon={Clock}          color="blue" />
        <StatCard label="In prep."      value={ordini.filter(o => o.stato === 'in_preparazione').length}   icon={RefreshCw}      color="orange" />
        <StatCard label="Ricevuti"      value={ordini.filter(o => o.stato === 'ricevuto').length}          icon={AlertTriangle}  color="blue" />
        <StatCard label="Pronti"        value={ordini.filter(o => o.stato === 'pronto').length}            icon={Clock}          color="green" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-text-primary text-lg">Kanban ordini</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshOrdini()}
            disabled={refreshing}
            className="btn-secondary text-xs py-1.5"
            title="Aggiorna"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Aggiorno...' : 'Aggiorna'}
          </button>
          <button onClick={() => navigate('/cassa')} className="btn-primary">
            <Plus size={16} /> Nuovo ordine
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm">
          {error}
        </div>
      )}

      {/* Tab Selector for Mobile Kanban */}
      <div className="md:hidden flex bg-white border border-border rounded-xl p-1 mb-2 flex-shrink-0">
        {colonne.map(col => {
          const count = ordini.filter(o => o.stato === col.stato).length;
          const isActive = colonnaAttiva === col.stato;
          return (
            <button
              key={col.stato}
              onClick={() => setColonnaAttiva(col.stato)}
              className={clsx(
                'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5',
                isActive ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'
              )}
            >
              <span>{col.label}</span>
              <span className={clsx(
                'px-1.5 py-0.2 rounded-full font-bold text-[9px]',
                isActive ? 'bg-white text-primary' : 'bg-bg text-text-secondary'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {colonne.map(col => {
          const items = ordini.filter(o => o.stato === col.stato);
          return (
            <div
              key={col.stato}
              className={clsx(
                'kanban-col border-t-4',
                col.color,
                colonnaAttiva !== col.stato && 'hidden md:flex'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">{col.label}</span>
                <span className="text-xs bg-bg border border-border text-text-muted rounded-full px-2 py-0.5 font-semibold">{items.length}</span>
              </div>
              {items.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-text-muted text-xs py-8">Nessun ordine</div>
              )}
              {items.map(o => (
                <div key={o.id} className="kanban-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-text-primary">{o.numero_ordine}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{canaleIcon[o.canale] ?? '📋'}</span>
                      {/* Stampa */}
                      <button
                        onClick={() => apriStampa(o)}
                        title="Stampa scontrino"
                        className="text-text-muted hover:text-primary transition-colors p-0.5"
                      >
                        <Printer size={13} />
                      </button>
                      {/* Modifica — solo se ricevuto o in_preparazione */}
                      {(o.stato === 'ricevuto' || o.stato === 'in_preparazione') && (
                        <button
                          onClick={() => apriModifica(o)}
                          title="Modifica ordine"
                          className="text-text-muted hover:text-primary transition-colors p-0.5"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary font-medium mb-1">
                    {o.cliente ? `${o.cliente.nome} ${o.cliente.cognome}` : o.nome_banco ? `cliente banco: ${o.nome_banco}` : 'cliente banco'}
                  </p>
                  {(o.cliente?.telefono || o.telefono_banco) && (
                    <p className="text-xs text-text-muted">{o.cliente?.telefono ?? o.telefono_banco}</p>
                  )}
                  <div className="mt-2 flex flex-col gap-1">
                    {(o.righe ?? []).slice(0, 2).map((r, i) => (
                      <div key={i} className="text-xs text-text-muted">
                        {r.quantita}× {r.prodotto?.nome ?? `Prodotto #${r.prodotto_id}`}
                      </div>
                    ))}
                    {(o.righe?.length ?? 0) > 2 && (
                      <div className="text-xs text-text-muted">+{(o.righe?.length ?? 0) - 2} altri...</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock size={10} /> {tempoTrascorso(o.creato_il)} fa
                    </span>
                    <span className="text-xs font-bold text-text-primary">{formatCurrency(o.totale)}</span>
                  </div>
                  {nextStato[o.stato] && (
                    <button
                      onClick={() => avanzaStato(o.id)}
                      disabled={loadingIds.has(o.id)}
                      className="mt-3 w-full btn-secondary text-xs py-1.5 justify-center"
                    >
                      {loadingIds.has(o.id) ? (
                        <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                      ) : 'Avanza →'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Modali */}
      {ordineStampa && (
        <PrintPreview ordine={ordineStampa} onClose={() => setOrdineStampa(null)} />
      )}
      {ordineModifica && (
        <EditOrdine
          ordine={ordineModifica}
          onClose={() => setOrdineModifica(null)}
          onSaved={() => {
            refreshOrdini();
            setOrdineModifica(null);
          }}
        />
      )}
    </div>
  );
}
