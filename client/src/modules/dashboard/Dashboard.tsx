import React, { useState, useEffect } from 'react';
import { ShoppingBag, Euro, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '@/components/cards/StatCard';
import StatusBadge from '@/components/badges/StatusBadge';
import { formatCurrency, tempoTrascorso } from '@/utils';
import { getOrdini } from '@/api/ordini';
import type { OrdineAPI } from '@/api/ordini';
import { getDashboardKPIs, getFasceOrarie } from '@/api/report';
import { getIngredienti } from '@/api/ingredienti';
import { useNavigate } from 'react-router-dom';

const avvisoColor: Record<string, string> = {
  warning: 'border-l-warning bg-warning/5',
  danger:  'border-l-danger  bg-danger/5',
  info:    'border-l-info    bg-info/5',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [ordini, setOrdini] = useState<OrdineAPI[]>([]);
  const [kpis, setKpis] = useState({
    totale_incasso_oggi: 0,
    numero_ordini_oggi: 0,
    scontrino_medio_oggi: 0,
    ordini_attivi: 0
  });
  const [scorteEsaurite, setScorteEsaurite] = useState<string[]>([]);
  const [graficoData, setGraficoData] = useState<{ ora: string; vendite: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const caricaTutto = async () => {
      try {
        // Carica gli ultimi ordini per la tabella
        const ordiniData = await getOrdini({ limit: 5 });
        setOrdini(ordiniData);

        // Carica i KPI reali
        const kpisData = await getDashboardKPIs();
        setKpis(kpisData);

        // Carica scorte ed ingredienti
        const ingredientiData = await getIngredienti();
        const esauriti = ingredientiData.filter(i => i.disponibile === 0).map(i => i.nome);
        setScorteEsaurite(esauriti);

        // Carica dati fasce orarie per il grafico (ore di punta 11:00 - 23:00)
        const fasceData = await getFasceOrarie();
        const mapped = fasceData
          .filter(item => {
            const oraNum = parseInt(item.ora.split(':')[0], 10);
            return oraNum >= 11 && oraNum <= 23;
          })
          .map(item => ({
            ora: item.ora,
            vendite: item.incasso
          }));
        setGraficoData(mapped);
      } catch {
        // Fallimento silenzioso o fallback su mock
      } finally {
        setLoading(false);
      }
    };
    caricaTutto();
  }, []);

  const ultimi = ordini.slice(0, 5);

  const tuttiAvvisi = [
    ...scorteEsaurite.map(nome => ({ tipo: 'warning' as const, testo: `Scorta esaurita: ingrediente "${nome}" terminato!` })),
    { tipo: 'info' as const, testo: 'Picco di ordini atteso tra le 19:00 e le 21:00 (Fasce orarie di punta)' }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ordini attivi"     value={kpis.ordini_attivi}                        icon={ShoppingBag}   color="blue"   sub="in corso" />
        <StatCard label="Vendite oggi"      value={formatCurrency(kpis.totale_incasso_oggi)} icon={Euro}          color="green"  trend={{ value: 'aggiornato ora', positive: true }} />
        <StatCard label="Ordini completati" value={kpis.numero_ordini_oggi}                    icon={CheckCircle}   color="green"  sub="oggi" />
        <StatCard label="Scorte basse"      value={scorteEsaurite.length}                     icon={AlertTriangle} color="orange" sub="ingredienti esauriti" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafico vendite */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-text-primary">Vendite per ora</h2>
              <p className="text-xs text-text-muted mt-0.5">Oggi (dati reali)</p>
            </div>
            <div className="flex items-center gap-1.5 text-success text-sm font-semibold">
              <TrendingUp size={16} /> aggiornato in tempo reale
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={graficoData}>
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
          <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
            {tuttiAvvisi.map((a, i) => (
              <div key={i} className={`border-l-4 ${avvisoColor[a.tipo]} rounded-r-lg px-3 py-2.5`}>
                <p className="text-xs md:text-sm text-text-primary font-medium">{a.testo}</p>
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-text-muted py-8 text-sm animate-pulse">
                    Caricamento...
                  </td>
                </tr>
              ) : ultimi.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-text-muted py-8 text-sm">
                    Nessun ordine trovato
                  </td>
                </tr>
              ) : (
                ultimi.map(o => (
                  <tr key={o.id} className="hover:bg-bg transition-colors">
                    <td className="table-cell font-semibold">{o.numero_ordine}</td>
                    <td className="table-cell text-xs md:text-sm">
                      {o.cliente ? `${o.cliente.nome} ${o.cliente.cognome}` : o.nome_banco ? `cliente banco: ${o.nome_banco}` : 'cliente banco'}
                    </td>
                    <td className="table-cell capitalize text-xs md:text-sm">{o.canale}</td>
                    <td className="table-cell font-semibold text-xs md:text-sm">{formatCurrency(o.totale)}</td>
                    <td className="table-cell text-text-muted text-xs md:text-sm">{tempoTrascorso(o.creato_il)} fa</td>
                    <td className="table-cell"><StatusBadge stato={o.stato} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
