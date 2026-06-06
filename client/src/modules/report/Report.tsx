import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatCurrency } from '@/utils';
import { TrendingUp, Euro, ShoppingBag, Users } from 'lucide-react';
import StatCard from '@/components/cards/StatCard';

const venditeSettimanali = [
  { giorno: 'Lun', vendite: 680, ordini: 32 },
  { giorno: 'Mar', vendite: 720, ordini: 38 },
  { giorno: 'Mer', vendite: 890, ordini: 45 },
  { giorno: 'Gio', vendite: 760, ordini: 41 },
  { giorno: 'Ven', vendite: 1120, ordini: 58 },
  { giorno: 'Sab', vendite: 1450, ordini: 72 },
  { giorno: 'Dom', vendite: 1380, ordini: 68 },
];

const venditeMese = [
  { mese: 'Gen', vendite: 18500 }, { mese: 'Feb', vendite: 17200 }, { mese: 'Mar', vendite: 21000 },
  { mese: 'Apr', vendite: 22500 }, { mese: 'Mag', vendite: 25000 }, { mese: 'Giu', vendite: 23500 },
];

const distribuzioneCategorie = [
  { name: 'Le Classiche', value: 45, color: '#C8102E' },
  { name: 'Le Speciali',  value: 28, color: '#1F6F8B' },
  { name: 'Antipasti',    value: 12, color: '#F97316' },
  { name: 'Dolci',        value: 8,  color: '#7C3AED' },
  { name: 'Bevande',      value: 7,  color: '#16A34A' },
];

const topProdotti = [
  { nome: 'Margherita',       ordini: 312, ricavi: 2184.00 },
  { nome: 'Diavola',          ordini: 248, ricavi: 2108.00 },
  { nome: 'Tartufo e Burrata',ordini: 186, ricavi: 2232.00 },
  { nome: 'Garlic Knots',     ordini: 165, ricavi: 742.50  },
  { nome: 'Tiramisù classico',ordini: 142, ricavi: 710.00  },
];

const PERIODI = ['Settimana', 'Mese', 'Anno'] as const;

export default function Report() {
  const [periodo, setPeriodo] = useState<typeof PERIODI[number]>('Settimana');

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {PERIODI.map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              periodo === p ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:border-primary'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Vendite totali"    value="€7.000,00" icon={Euro}        color="green" trend={{ value: '+8,2% vs settimana scorsa', positive: true }} />
        <StatCard label="Ordini totali"     value={354}        icon={ShoppingBag} color="blue"  trend={{ value: '+12 vs settimana scorsa', positive: true }} />
        <StatCard label="Scontrino medio"   value="€19,77"    icon={TrendingUp}  color="orange" />
        <StatCard label="Clienti unici"     value={89}         icon={Users}       color="violet" trend={{ value: '+5 nuovi clienti', positive: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendite settimanali */}
        <div className="card">
          <h2 className="font-bold text-text-primary mb-4">Vendite per giorno</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={venditeSettimanali} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="giorno" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Vendite']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }}
              />
              <Bar dataKey="vendite" fill="#C8102E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuzione categorie */}
        <div className="card">
          <h2 className="font-bold text-text-primary mb-4">Distribuzione categorie</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={distribuzioneCategorie} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={3}>
                {distribuzioneCategorie.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 12, color: '#6B7280' }}>{v}</span>} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Quota']} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend mensile */}
      <div className="card">
        <h2 className="font-bold text-text-primary mb-4">Andamento mensile</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={venditeMese} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="mese" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [formatCurrency(v), 'Vendite']} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }} />
            <Bar dataKey="vendite" fill="#1F6F8B" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top prodotti */}
      <div className="card">
        <h2 className="font-bold text-text-primary mb-4">Top 5 prodotti</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['#', 'Prodotto', 'Ordini', 'Ricavi', 'Quota'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProdotti.map((p, i) => (
                <tr key={p.nome} className="hover:bg-bg transition-colors">
                  <td className="table-cell">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-warning/20 text-warning' : 'bg-bg text-text-muted'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="table-cell font-semibold text-text-primary">{p.nome}</td>
                  <td className="table-cell text-text-secondary">{p.ordini}</td>
                  <td className="table-cell font-bold text-text-primary">{formatCurrency(p.ricavi)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(p.ordini / topProdotti[0].ordini) * 100}%` }} />
                      </div>
                      <span className="text-xs text-text-muted w-8 text-right">
                        {Math.round((p.ordini / topProdotti[0].ordini) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
