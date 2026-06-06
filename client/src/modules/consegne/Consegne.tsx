import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, CheckCircle, Bike, Phone } from 'lucide-react';
import { formatCurrency, tempoTrascorso } from '@/utils';
import StatusBadge from '@/components/badges/StatusBadge';
import { clsx } from 'clsx';
import { useToast } from '@/contexts/ToastContext';
import { getOrdini, aggiornaStatoOrdine } from '@/api/ordini';
import type { OrdineAPI } from '@/api/ordini';

const mockRider = [
  { id: 1, nome: 'Marco Esposito',  stato: 'in_consegna',  consegneOggi: 8,  ultimaAttivita: new Date(Date.now()-5*60000).toISOString() },
  { id: 2, nome: 'Giulia Romano',   stato: 'in_consegna',  consegneOggi: 6,  ultimaAttivita: new Date(Date.now()-12*60000).toISOString() },
  { id: 3, nome: 'Luca Ferrara',    stato: 'disponibile',  consegneOggi: 4,  ultimaAttivita: new Date(Date.now()-20*60000).toISOString() },
  { id: 4, nome: 'Sofia Marino',    stato: 'pausa',        consegneOggi: 3,  ultimaAttivita: new Date(Date.now()-35*60000).toISOString() },
];

const riderStatoColor: Record<string, string> = {
  disponibile: 'bg-success/10 text-success border-success/30',
  in_consegna: 'bg-violet/10 text-violet border-violet/30',
  pausa:        'bg-warning/10 text-warning border-warning/30',
};
const riderStatoLabel: Record<string, string> = {
  disponibile: 'Disponibile', in_consegna: 'In consegna', pausa: 'In pausa',
};

export default function Consegne() {
  const toast = useToast();
  const [ordini, setOrdini] = useState<OrdineAPI[]>([]);

  const carica = useCallback(async (silent = false) => {
    try {
      const data = await getOrdini();
      setOrdini(data.filter(o => o.canale === 'online'));
    } catch {
      if (!silent) toast.error('Impossibile caricare gli ordini delivery.');
    }
  }, [toast]);

  useEffect(() => {
    carica();
    const interval = setInterval(() => carica(true), 30_000);
    return () => clearInterval(interval);
  }, [carica]);

  const completa = async (id: number) => {
    try {
      await aggiornaStatoOrdine(id, 'ritirato');
      setOrdini(prev => prev.filter(o => o.id !== id));
      toast.success('Consegna completata!');
    } catch {
      toast.error('Errore durante il salvataggio.');
    }
  };

  const inConsegna = ordini.filter(o => o.stato === 'pronto');
  const pronti     = ordini.filter(o => o.stato === 'in_preparazione' || o.stato === 'ricevuto');
  const completati: OrdineAPI[] = [];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'In consegna',      value: inConsegna.length,                     color: 'text-violet' },
          { label: 'Da assegnare',      value: pronti.length,                         color: 'text-warning' },
          { label: 'Completate oggi',   value: completati.length + 12,               color: 'text-success' },
          { label: 'Rider attivi',      value: mockRider.filter(r => r.stato !== 'pausa').length, color: 'text-info' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={clsx('text-3xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-text-secondary font-semibold uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="font-bold text-text-primary">Ordini delivery</h2>
          {ordini.length === 0 && (
            <div className="card text-center py-12 text-text-muted">Nessun ordine delivery online</div>
          )}
          {ordini.map(o => (
            <div key={o.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-text-primary">{o.numero_ordine}</span>
                  <StatusBadge stato={o.stato} />
                </div>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock size={11} /> {tempoTrascorso(o.creato_il)} fa
                </span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                <span className="text-sm text-text-primary">{o.nota ?? 'Indirizzo non specificato'}</span>
              </div>
              {o.cliente && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Phone size={12} /> {o.cliente.nome} {o.cliente.cognome} — {o.cliente.telefono}
                </div>
              )}
              <div className="text-xs text-text-muted">
                {(o.righe ?? []).map(r => `${r.quantita}x ${r.prodotto?.nome ?? `#${r.prodotto_id}`}`).join(', ')}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary">{formatCurrency(o.totale)}</span>
                <div className="flex items-center gap-2">
                  {(o.stato === 'pronto' || o.stato === 'ricevuto') && (
                    <button onClick={() => completa(o.id)} className="btn-primary py-1.5 text-xs">
                      <CheckCircle size={12} /> Completata
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}        </div>

        {/* Riders */}
        <div>
          <h2 className="font-bold text-text-primary mb-4">Rider</h2>
          <div className="flex flex-col gap-3">
            {mockRider.map(r => (
              <div key={r.id} className={clsx('card p-4 border', riderStatoColor[r.stato])}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-text-primary">{r.nome}</span>
                  <span className={clsx('badge border', riderStatoColor[r.stato])}>
                    {riderStatoLabel[r.stato]}
                  </span>
                </div>
                <div className="text-xs text-text-muted">
                  Consegne oggi: <span className="font-bold text-text-primary">{r.consegneOggi}</span>
                </div>
                {r.ultimaAttivita && (
                  <div className="text-xs text-text-muted mt-1">
                    Ultima attività: {tempoTrascorso(r.ultimaAttivita)} fa
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
