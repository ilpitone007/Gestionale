import React, { useState, useEffect } from 'react';
import { ShoppingBag, Euro, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '@/components/cards/StatCard';
import StatusBadge from '@/components/badges/StatusBadge';
import { formatCurrency, tempoTrascorso } from '@/utils';
import { getOrdini } from '@/api/ordini';
import type { OrdineAPI } from '@/api/ordini';
import { useNavigate } from 'react-router-dom';

const venditeOra = [
  { ora: '10:00', vendite: 120 }, { ora: '11:00', vendite: 180 }, { ora: '12:00', vendite: 320 },
  { ora: '13:00', vendite: 280 }, { ora: '14:00', vendite: 210 }, { ora: '18:00', vendite: 260 },
  { ora: '19:00', vendite: 380 }, { ora: '20:00', vendite: 340 }, { ora: '21:00', vendite: 290 },
];

const avvisi = [
  { tipo: 'warning', testo: 'Funghi champignon sotto soglia minima' },
  { tipo: 'warning', testo: 'Mascarpone quasi esaurito' },
  { tipo: 'info',    testo: 'Picco di ordini atteso tra le 19:00 e le 21:00' },
];

const avvisoColor: Record<string, string> = {
  warning: 'border-l-warning bg-warning/5',
  danger:  'border-l-danger  bg-danger/5',
  info:    'border-l-info    bg-info/5',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [ordini, setOrdini] = useState<OrdineAPI[]>([]);

  useEffect(() => {
    getOrdini().then(setOrdini).catch(() => null);
  }, []);

  const attivi    = ordini.filter(o => o.stato !== 'ritirato' && o.stato !== 'annullato');
  const completati = ordini.filter(o => o.stato === 'ritirato');
  const totaleOggi = completati.reduce((s, o) => s + (o.totale ?? 0), 0);
  const ultimi    = [...ordini].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ordini attivi"     value={attivi.length}             icon={ShoppingBag}   color="blue"   sub="in corso" />
        <StatCard label="Vendite oggi"      value={formatCurrency(totaleOggi)} icon={Euro}          color="green"  trend={{ value: 'aggiornato ora', positive: true }} />
        <StatCard label="Ordini completati" value={completati.length}         icon={CheckCircle}   color="green"  sub="oggi" />
        <StatCard label="Scorte basse"      value={0}                         icon={AlertTriangle} color="orange" sub="ingredienti" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafico vendite */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-text-primary">Vendite per ora</h2>
              <p className="text-xs text-text-muted mt-0.5">Oggi (dati indicativi)</p>
            </div>
            <div className="flex items-center gap-1.5 text-success text-sm font-semibold">
              <TrendingUp size={16} /> +8,2% vs ieri
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={venditeOra}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="ora" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Vendite']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }}
              />
              <Line type="monotone" dataKey="vendite" stroke="#C8102E" strokeWidth={2.5} dot={{ fill: '#C8102E', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Avvisi */}
        <div className="card">
          <h2 className="font-bold text-text-primary mb-4">Avvisi</h2>
          <div className="flex flex-col gap-3">
            {avvisi.map((a, i) => (
              <div key={i} className={`border-l-4 ${avvisoColor[a.tipo]} rounded-r-lg px-3 py-2.5`}>
                <p className="text-sm text-text-primary">{a.testo}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ultimi ordini */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-text-primary">Ultimi ordini</h2>
          <button className="btn-ghost text-xs" onClick={() => navigate('/ordini')}>Vedi tutti →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Ordine', 'Cliente', 'Canale', 'Totale', 'Tempo', 'Stato'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ultimi.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-text-muted py-8 text-sm">
                    Nessun ordine trovato
                  </td>
                </tr>
              )}
              {ultimi.map(o => (
                <tr key={o.id} className="hover:bg-bg transition-colors">
                  <td className="table-cell font-semibold">{o.numero_ordine}</td>
                  <td className="table-cell">
                    {o.cliente ? `${o.cliente.nome} ${o.cliente.cognome}` : o.nome_banco ? `cliente banco: ${o.nome_banco}` : 'cliente banco'}
                  </td>
                  <td className="table-cell capitalize">{o.canale}</td>
                  <td className="table-cell font-semibold">{formatCurrency(o.totale)}</td>
                  <td className="table-cell text-text-muted">{tempoTrascorso(o.creato_il)} fa</td>
                  <td className="table-cell"><StatusBadge stato={o.stato} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
