import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatCurrency } from '@/utils';
import { TrendingUp, Euro, ShoppingBag, Users } from 'lucide-react';
import StatCard from '@/components/cards/StatCard';
import { getAndamentoIncassi, getTopProdotti, getMargini, getConfronto } from '@/api/report';
import { getProdotti } from '@/api/prodotti';
import { getCategorie } from '@/api/categorie';
import { getClienti } from '@/api/clienti';
import type { ProdottoAPI } from '@/api/prodotti';
import type { CategoriaAPI } from '@/api/categorie';
import type { AndamentoIncassi, ClassificaProdotto, ConfrontoSettimana } from '@/api/report';

const PERIODI = ['Settimana', 'Mese', 'Anno'] as const;

const ottieniDateFiltro = (p: 'Settimana' | 'Mese' | 'Anno') => {
  const fine = new Date();
  const inizio = new Date();
  if (p === 'Settimana') {
    inizio.setDate(fine.getDate() - 7);
  } else if (p === 'Mese') {
    inizio.setDate(fine.getDate() - 30);
  } else {
    inizio.setDate(fine.getDate() - 365);
  }
  return {
    daData: inizio.toISOString().split('T')[0],
    aData: fine.toISOString().split('T')[0],
  };
};

export default function Report() {
  const [periodo, setPeriodo] = useState<typeof PERIODI[number]>('Settimana');
  const [loadingStatic, setLoadingStatic] = useState(true);
  const [loadingPeriodo, setLoadingPeriodo] = useState(true);
  const loading = loadingStatic || loadingPeriodo;
  const [incassiData, setIncassiData] = useState<AndamentoIncassi[]>([]);
  const [topProdottiData, setTopProdottiData] = useState<ClassificaProdotto[]>([]);
  const [margini, setMargini] = useState({
    ricavo_totale: 0,
    costo_totale: 0,
    profitto_lordo: 0,
    margine_percentuale: 0,
  });
  const [confronto, setConfronto] = useState<ConfrontoSettimana | null>(null);
  const [prodotti, setProdotti] = useState<ProdottoAPI[]>([]);
  const [categorie, setCategorie] = useState<CategoriaAPI[]>([]);
  const [numClienti, setNumClienti] = useState(0);
  const [trendMensileData, setTrendMensileData] = useState<{ mese: string; vendite: number }[]>([]);

  // Caricamento dati statici (eseguito solo una volta al mount)
  useEffect(() => {
    const caricaDatiStatici = async () => {
      setLoadingStatic(true);
      try {
        const [
          confrontoRes,
          prodottiRes,
          categorieRes,
          clientiRes,
          tuttiIncassi,
        ] = await Promise.all([
          getConfronto(),
          getProdotti(),
          getCategorie(),
          getClienti().catch(() => []),
          getAndamentoIncassi(), // storico completo per il trend mensile
        ]);

        setConfronto(confrontoRes);
        setProdotti(prodottiRes);
        setCategorie(categorieRes);
        setNumClienti(clientiRes.length);

        // Calcola andamento mensile storico
        const mesiMap: Record<string, { mese: string; vendite: number; sortingKey: string }> = {};
        tuttiIncassi.forEach(item => {
          const date = new Date(item.giorno);
          const meseNome = date.toLocaleString('it-IT', { month: 'short' });
          const anno = date.getFullYear();
          const chiave = `${meseNome} ${String(anno).slice(-2)}`;
          const sortingKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!mesiMap[chiave]) {
            mesiMap[chiave] = { mese: chiave, vendite: 0, sortingKey };
          }
          mesiMap[chiave].vendite += item.incasso;
        });
        const sortedTrend = Object.values(mesiMap)
          .sort((a, b) => a.sortingKey.localeCompare(b.sortingKey))
          .map(x => ({ mese: x.mese, vendite: x.vendite }))
          .slice(-6);
        setTrendMensileData(sortedTrend);
      } catch (err) {
        console.error('Errore nel caricamento dei dati statici del report:', err);
      } finally {
        setLoadingStatic(false);
      }
    };
    caricaDatiStatici();
  }, []);

  // Caricamento dati temporali (eseguito al cambio periodo)
  useEffect(() => {
    const caricaDatiPeriodo = async () => {
      setLoadingPeriodo(true);
      try {
        const { daData, aData } = ottieniDateFiltro(periodo);

        const [
          incassi,
          topProdotti,
          marginiRes,
        ] = await Promise.all([
          getAndamentoIncassi(daData, aData),
          getTopProdotti(daData, aData),
          getMargini(daData, aData),
        ]);

        setIncassiData(incassi);
        setTopProdottiData(topProdotti);
        setMargini(marginiRes);
      } catch (err) {
        console.error('Errore nel caricamento dei dati temporali del report:', err);
      } finally {
        setLoadingPeriodo(false);
      }
    };
    caricaDatiPeriodo();
  }, [periodo]);

  // Formatta dati per grafico vendite giornaliere
  const andamentoGrafico = incassiData.map(item => {
    const data = new Date(item.giorno);
    const giornoEtichetta = data.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    return {
      giorno: giornoEtichetta,
      vendite: item.incasso,
      ordini: item.ordini
    };
  });

  // Calcola quote categorie
  const catMap: Record<number, { name: string; value: number; color: string }> = {};
  const colori = ['#C8102E', '#1F6F8B', '#F97316', '#7C3AED', '#16A34A', '#EC4899', '#EAB308'];

  topProdottiData.forEach(tp => {
    const prod = prodotti.find(p => p.id === tp.prodotto_id);
    const catId = prod ? prod.categoria_id : 0;
    const cat = categorie.find(c => c.id === catId);
    const catNome = cat ? cat.nome : 'Varie';

    if (!catMap[catId]) {
      catMap[catId] = {
        name: catNome,
        value: 0,
        color: colori[Object.keys(catMap).length % colori.length]
      };
    }
    catMap[catId].value += tp.incasso;
  });

  const distribuzioneData = Object.values(catMap);
  const topProdottiSlices = topProdottiData.slice(0, 5);
  const maxQuantita = topProdottiSlices[0]?.quantita ?? 1;

  // Calcola totali filtrati
  const ordiniTotali = incassiData.reduce((sum, item) => sum + item.ordini, 0);
  const scontrinoMedio = ordiniTotali > 0 ? (margini.ricavo_totale / ordiniTotali) : 0;

  // Calcolo trend vendite basato sulla risposta di confronto
  const trendPercentuale = confronto ? `${confronto.differenza_percentuale_incasso > 0 ? '+' : ''}${confronto.differenza_percentuale_incasso.toFixed(1)}% vs settimana scorsa` : 'aggiornato';
  const trendPositivo = confronto ? confronto.differenza_percentuale_incasso >= 0 : true;

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
        <StatCard label="Vendite totali"    value={formatCurrency(margini.ricavo_totale)} icon={Euro}        color="green" trend={periodo === 'Settimana' ? { value: trendPercentuale, positive: trendPositivo } : undefined} />
        <StatCard label="Ordini totali"     value={ordiniTotali}                          icon={ShoppingBag} color="blue" />
        <StatCard label="Scontrino medio"   value={formatCurrency(scontrinoMedio)}         icon={TrendingUp}  color="orange" />
        <StatCard label="Clienti registrati" value={numClienti}                            icon={Users}       color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendite settimanali */}
        <div className="card">
          <h2 className="font-bold text-text-primary mb-4">Vendite nel periodo</h2>
          {loading ? (
            <div className="h-60 flex items-center justify-center text-text-muted text-sm animate-pulse">Caricamento grafico...</div>
          ) : andamentoGrafico.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-text-muted text-sm">Nessuna vendita registrata</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={andamentoGrafico} barSize={28}>
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
          )}
        </div>

        {/* Distribuzione categorie */}
        <div className="card">
          <h2 className="font-bold text-text-primary mb-4">Distribuzione categorie</h2>
          {loading ? (
            <div className="h-60 flex items-center justify-center text-text-muted text-sm animate-pulse">Caricamento grafico...</div>
          ) : distribuzioneData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-text-muted text-sm">Nessuna categoria venduta</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={distribuzioneData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={3}>
                  {distribuzioneData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 12, color: '#6B7280' }}>{v}</span>} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Quota Incasso']} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Trend mensile */}
      <div className="card">
        <h2 className="font-bold text-text-primary mb-4">Andamento mensile (ultimi 6 mesi)</h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-text-muted text-sm animate-pulse">Caricamento trend...</div>
        ) : trendMensileData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-text-muted text-sm">Dati insufficienti</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendMensileData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mese" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Vendite']} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Bar dataKey="vendite" fill="#1F6F8B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top prodotti */}
      <div className="card">
        <h2 className="font-bold text-text-primary mb-4">Top 5 prodotti più venduti</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['#', 'Prodotto', 'Ordini', 'Ricavi', 'Quota quantità'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-text-muted py-8 text-sm animate-pulse">
                    Caricamento...
                  </td>
                </tr>
              ) : topProdottiSlices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-text-muted py-8 text-sm">
                    Nessun prodotto venduto
                  </td>
                </tr>
              ) : (
                topProdottiSlices.map((p, i) => (
                  <tr key={p.nome} className="hover:bg-bg transition-colors">
                    <td className="table-cell">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-warning/20 text-warning' : 'bg-bg text-text-muted'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-text-primary text-xs md:text-sm">{p.nome}</td>
                    <td className="table-cell text-text-secondary text-xs md:text-sm">{p.quantita}</td>
                    <td className="table-cell font-bold text-text-primary text-xs md:text-sm">{formatCurrency(p.incasso)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden min-w-[50px]">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(p.quantita / maxQuantita) * 100}%` }} />
                        </div>
                        <span className="text-xs text-text-muted w-8 text-right">
                          {Math.round((p.quantita / maxQuantita) * 100)}%
                        </span>
                      </div>
                    </td>
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
