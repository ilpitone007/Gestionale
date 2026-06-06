import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, AlertTriangle, ChefHat, RefreshCw } from 'lucide-react';
import { tempoTrascorso } from '@/utils';
import { clsx } from 'clsx';
import { getOrdini, aggiornaStatoOrdine } from '@/api/ordini';
import type { OrdineAPI, StatoOrdineAPI } from '@/api/ordini';

const canaleIcon: Record<string, string> = { banco: '🪑', telefono: '📞', online: '🌐' };
const TEMPO_ALERT = 20; // minuti

function parseDateUTC(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('Z') || dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}

function minutiTrascorsi(iso: string): number {
  return Math.floor((Date.now() - parseDateUTC(iso).getTime()) / 60000);
}

export default function Cucina() {
  const [ordini, setOrdini] = useState<OrdineAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'ricevuto' | 'in_preparazione' | 'pronto'>('ricevuto');

  const carica = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getOrdini({ stato: 'attivi' });
      setOrdini(data);
    } catch {
      // fail silently on polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carica();
    const interval = setInterval(() => carica(true), 20_000);
    return () => clearInterval(interval);
  }, [carica]);

  const avanza = async (o: OrdineAPI) => {
    const nextMap: Partial<Record<StatoOrdineAPI, StatoOrdineAPI>> = {
      ricevuto: 'in_preparazione',
      in_preparazione: 'pronto',
    };
    const next = nextMap[o.stato];
    if (!next) return;

    setLoadingIds(prev => new Set(prev).add(o.id));
    try {
      const aggiornato = await aggiornaStatoOrdine(o.id, next);
      setOrdini(prev => prev.map(x => x.id === o.id ? { ...x, ...aggiornato } : x));
    } catch {
      await carica(true);
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(o.id); return s; });
    }
  };

  const ricevuti  = ordini.filter(o => o.stato === 'ricevuto');
  const inPrep    = ordini.filter(o => o.stato === 'in_preparazione');
  const pronti    = ordini.filter(o => o.stato === 'pronto');

  const renderCard = (o: OrdineAPI) => {
    const minuti = minutiTrascorsi(o.creato_il);
    const inRitardo = minuti >= TEMPO_ALERT && o.stato !== 'pronto';

    return (
      <div
        key={o.id}
        className={clsx(
          'bg-white rounded-2xl border p-4 shadow-card',
          inRitardo ? 'border-danger/50 ring-1 ring-danger/20' : 'border-border'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-text-primary">{o.numero_ordine}</span>
            <span className="text-lg">{canaleIcon[o.canale] ?? '📋'}</span>
          </div>
          <div className={clsx(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg',
            inRitardo ? 'bg-danger/10 text-danger' : 'bg-bg text-text-muted'
          )}>
            <Clock size={12} />
            {tempoTrascorso(o.creato_il)}
            {inRitardo && ' ⚠️'}
          </div>
        </div>

        {/* Nome cliente — in evidenza */}
        <div className={clsx(
          'flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-xl text-sm font-bold',
          (o.cliente || o.nome_banco) ? 'bg-primary/10 text-primary' : 'bg-bg text-text-muted'
        )}>
          <span>👤</span>
          <span>{o.cliente ? `${o.cliente.nome} ${o.cliente.cognome}` : o.nome_banco ? `cliente banco: ${o.nome_banco}` : 'cliente banco'}</span>
          {(o.cliente?.telefono || o.telefono_banco) && (
            <span className="ml-auto text-xs font-medium text-text-muted">{o.cliente?.telefono ?? o.telefono_banco}</span>
          )}
        </div>

        {o.nota && (
          <p className="text-xs bg-warning/10 text-warning rounded-lg px-2 py-1 mb-2">📝 {o.nota}</p>
        )}

        <div className="flex flex-col gap-1.5 mb-3">
          {(o.righe ?? []).map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {r.quantita}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {r.prodotto?.nome ?? `Prodotto #${r.prodotto_id}`}
              </span>
              {r.nota && <span className="text-xs text-text-muted italic">({r.nota})</span>}
            </div>
          ))}
        </div>

        {o.stato !== 'pronto' && (
          <button
            onClick={() => avanza(o)}
            disabled={loadingIds.has(o.id)}
            className={clsx(
              'w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60',
              o.stato === 'ricevuto'
                ? 'bg-info text-white hover:bg-[#1a5e76]'
                : 'bg-success text-white hover:bg-green-700'
            )}
          >
            {loadingIds.has(o.id)
              ? <span className="inline-flex items-center gap-1"><RefreshCw size={14} className="animate-spin" /> Aggiorno...</span>
              : o.stato === 'ricevuto' ? '🍳 Inizia preparazione' : '✅ Segna come pronto'}
          </button>
        )}
        {o.stato === 'pronto' && (
          <div className="w-full py-2.5 rounded-xl text-sm font-bold bg-success/10 text-success text-center">
            ✅ Pronto per il servizio
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4 p-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><AlertTriangle size={20} /></div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{ricevuti.length}</div>
            <div className="text-xs text-text-secondary font-semibold uppercase">Da iniziare</div>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="p-3 bg-info/10 text-info rounded-xl"><ChefHat size={20} /></div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{inPrep.length}</div>
            <div className="text-xs text-text-secondary font-semibold uppercase">In preparazione</div>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="p-3 bg-success/10 text-success rounded-xl"><CheckCircle size={20} /></div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{pronti.length}</div>
            <div className="text-xs text-text-secondary font-semibold uppercase">Pronti</div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4 text-text-muted text-sm">Caricamento ordini...</div>
      )}

      {/* Tab Selector for Mobile Kitchen */}
      <div className="md:hidden flex bg-white border border-border rounded-xl p-1 mb-2 flex-shrink-0">
        {[
          { key: 'ricevuto', label: 'Ricevuti', count: ricevuti.length, color: 'bg-blue-500' },
          { key: 'in_preparazione', label: 'In Prep', count: inPrep.length, color: 'bg-info' },
          { key: 'pronto', label: 'Pronti', count: pronti.length, color: 'bg-success' }
        ].map(col => {
          const isActive = activeTab === col.key;
          return (
            <button
              key={col.key}
              onClick={() => setActiveTab(col.key as any)}
              className={clsx(
                'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5',
                isActive ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'
              )}
            >
              <span className="flex items-center gap-1">
                <span className={clsx("w-2 h-2 rounded-full", col.color)} />
                {col.label}
              </span>
              <span className={clsx(
                'px-1.5 py-0.2 rounded-full font-bold text-[9px]',
                isActive ? 'bg-white text-primary' : 'bg-bg text-text-secondary'
              )}>
                {col.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={clsx(activeTab !== 'ricevuto' && 'hidden md:block')}>
          <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            Ricevuti ({ricevuti.length})
          </h3>
          <div className="flex flex-col gap-3">{ricevuti.map(renderCard)}</div>
        </div>
        <div className={clsx(activeTab !== 'in_preparazione' && 'hidden md:block')}>
          <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-info inline-block" />
            In preparazione ({inPrep.length})
          </h3>
          <div className="flex flex-col gap-3">{inPrep.map(renderCard)}</div>
        </div>
        <div className={clsx(activeTab !== 'pronto' && 'hidden md:block')}>
          <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success inline-block" />
            Pronti ({pronti.length})
          </h3>
          <div className="flex flex-col gap-3">{pronti.map(renderCard)}</div>
        </div>
      </div>
    </div>
  );
}
