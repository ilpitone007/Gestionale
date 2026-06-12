import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Receipt, User, StickyNote, RefreshCw, Phone } from 'lucide-react';
import { formatCurrency } from '@/utils';
import { clsx } from 'clsx';
import { useToast } from '@/contexts/ToastContext';
import api from '@/api/client';
import { getProdotti } from '@/api/prodotti';
import { getCategorie } from '@/api/categorie';
import { creaOrdine } from '@/api/ordini';
import type { ProdottoAPI } from '@/api/prodotti';
import type { CategoriaAPI } from '@/api/categorie';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';

interface RigaCassa {
  prodotto: ProdottoAPI;
  quantita: number;
  note: string;
}

type Canale = 'banco' | 'telefono' | 'online';
type Pagamento = 'contanti' | 'pos' | 'online';

const EMOJI: Record<string, string> = {
  Pizze: '🍕', 'Fritti Tradizionali': '🍟', 'Primi Piatti': '🍝',
  'Dolci Artigianali': '🍮', 'Bevande e Birre': '🥤',
};

export default function Cassa() {
  const toast = useToast();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [prodotti, setProdotti] = useState<ProdottoAPI[]>([]);
  const [categorie, setCategorie] = useState<CategoriaAPI[]>([]);
  const [tutteCategorie, setTutteCategorie] = useState<CategoriaAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [invio, setInvio] = useState(false);

  const [catSelezionata, setCatSelezionata] = useState<number | null>(null);
  const [righe, setRighe] = useState<RigaCassa[]>([]);
  const [canale, setCanale] = useState<Canale>('banco');
  const [nomeBanco, setNomeBanco] = useState('');
  const [telefonoBanco, setTelefonoBanco] = useState('');
  const [sconto, setSconto] = useState(0);
  const [pagamento, setPagamento] = useState<Pagamento>('contanti');
  const [nota, setNota] = useState('');
  const [mobileTab, setMobileTab] = useState<'menu' | 'carrello'>('menu');

  // Sconti e Coupon
  const [couponCodice, setCouponCodice] = useState('');
  const [couponApplicato, setCouponApplicato] = useState<{ codice: string; valore: number; tipo: 'percentuale' | 'fisso' } | null>(null);
  const [verificandoCoupon, setVerificandoCoupon] = useState(false);

  const applicaCoupon = async () => {
    if (!couponCodice.trim()) {
      toast.error('Inserisci un codice coupon');
      return;
    }
    setVerificandoCoupon(true);
    try {
      const res = await api.get(`/coupon/verifica/${couponCodice.trim()}`);
      const data = res.data;
      setCouponApplicato({
        codice: data.coupon.codice,
        valore: data.coupon.valore,
        tipo: data.coupon.tipo
      });
      toast.success(`Coupon ${data.coupon.codice} applicato!`);
    } catch (err: any) {
      const msg = err.response?.data?.errore || 'Codice coupon non valido';
      toast.error(msg);
      setCouponApplicato(null);
    } finally {
      setVerificandoCoupon(false);
    }
  };

  const carica = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([getProdotti(), getCategorie()]);
      setProdotti(prods);
      setTutteCategorie(cats);
      const radici = cats.filter(c => c.categoria_padre_id === null && c.attiva);
      setCategorie(radici);
      if (radici.length > 0) setCatSelezionata(radici[0].id);
    } catch {
      toast.error('Impossibile caricare il menu.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carica(); }, [carica]);

  const sottoCategorie = catSelezionata
    ? tutteCategorie.filter(c => c.categoria_padre_id === catSelezionata)
    : [];
  const idCatFiltro: number[] = catSelezionata
    ? [catSelezionata, ...sottoCategorie.map(c => c.id)]
    : [];

  const prodottiFiltrati = prodotti.filter(
    p => p.disponibile && (idCatFiltro.length === 0 || idCatFiltro.includes(p.categoria_id))
  );

  const catNome = (id: number) => tutteCategorie.find(c => c.id === id)?.nome ?? '';

  const aggiungi = (p: ProdottoAPI) => {
    setRighe(prev => {
      const idx = prev.findIndex(r => r.prodotto.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantita: next[idx].quantita + 1 };
        return next;
      }
      return [...prev, { prodotto: p, quantita: 1, note: '' }];
    });
  };

  const rimuovi = (id: number) => setRighe(prev => prev.filter(r => r.prodotto.id !== id));

  const cambiaQta = (id: number, delta: number) => {
    setRighe(prev =>
      prev.map(r => r.prodotto.id !== id ? r : { ...r, quantita: r.quantita + delta })
        .filter(r => r.quantita > 0)
    );
  };

  const cambiaNote = (id: number, note: string) => {
    setRighe(prev => prev.map(r => r.prodotto.id === id ? { ...r, note } : r));
  };

  const subtotale = righe.reduce((acc, r) => acc + r.prodotto.prezzo * r.quantita, 0);
  const scontoManuale = subtotale * (sconto / 100);
  const scontoCoupon = couponApplicato
    ? (couponApplicato.tipo === 'percentuale' ? (subtotale * couponApplicato.valore) / 100 : couponApplicato.valore)
    : 0;
  const scontoEuro = scontoManuale + scontoCoupon;
  const totale = Math.max(0, subtotale - scontoEuro);
  const numArticoli = righe.reduce((acc, r) => acc + r.quantita, 0);

  const invia = async () => {
    if (righe.length === 0) { toast.error('Aggiungi almeno un prodotto'); return; }
    setInvio(true);
    try {
      await creaOrdine({
        canale,
        metodo_pagamento: pagamento,
        righe: righe.map(r => ({ prodotto_id: r.prodotto.id, quantita: r.quantita, nota: r.note || undefined })),
        nota: nota || undefined,
        sconto: scontoManuale > 0 ? scontoManuale : undefined,
        coupon_codice: couponApplicato?.codice || undefined,
        nome_banco: nomeBanco.trim() || undefined,
        telefono_banco: telefonoBanco.trim() || undefined,
      });
      toast.success(`Ordine inviato! Totale: ${formatCurrency(totale)}`);
      setRighe([]);
      setNomeBanco('');
      setTelefonoBanco('');
      setSconto(0);
      setCouponApplicato(null);
      setCouponCodice('');
      setNota('');
      navigate('/ordini');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errore?: string } } })?.response?.data?.errore
        || 'Errore durante l\'invio dell\'ordine';
      toast.error(msg);
    } finally {
      setInvio(false);
    }
  };

  const svuotaCarrello = () => {
    if (settings.confermaVuotaCarrello) {
      if (!window.confirm('Sei sicuro di voler svuotare il carrello? Tutti i prodotti inseriti andranno persi.')) {
        return;
      }
    }
    setRighe([]);
    setNomeBanco('');
    setTelefonoBanco('');
    setSconto(0);
    setCouponApplicato(null);
    setCouponCodice('');
    setNota('');
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)] overflow-hidden relative">
      {/* Tab Selector for Mobile */}
      <div className="md:hidden flex bg-white border border-border rounded-xl p-1 mb-2 flex-shrink-0">
        <button
          onClick={() => setMobileTab('menu')}
          className={clsx(
            'flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all',
            mobileTab === 'menu' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'
          )}
        >
          🍕 Menù
        </button>
        <button
          onClick={() => setMobileTab('carrello')}
          className={clsx(
            'flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all relative',
            mobileTab === 'carrello' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'
          )}
        >
          🛒 Carrello
          {numArticoli > 0 && (
            <span className={clsx(
              'min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1',
              mobileTab === 'carrello' ? 'bg-white text-primary' : 'bg-primary text-white'
            )}>
              {numArticoli}
            </span>
          )}
        </button>
      </div>

      {/* ── Pannello sinistro: prodotti (scorre normalmente) ── */}
      <div className={clsx(
        "flex-1 overflow-y-auto pr-1 flex flex-col gap-4 pb-8",
        mobileTab !== 'menu' && 'hidden md:flex'
      )}>

        {/* Filtri categoria */}
        <div className="flex gap-2 flex-wrap">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 w-24 bg-border/50 rounded-xl animate-pulse" />
              ))
            : categorie.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCatSelezionata(cat.id)}
                  className={clsx(
                    'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    catSelezionata === cat.id
                      ? 'bg-primary text-white shadow-card'
                      : 'bg-surface border border-border text-text-secondary hover:border-primary hover:text-primary'
                  )}
                >
                  {EMOJI[cat.nome] ?? '📋'} {cat.nome}
                </button>
              ))}
        </div>

        {/* Griglia prodotti */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card p-4 h-32 animate-pulse bg-border/20" />
              ))
            : prodottiFiltrati.map(p => (
                <button
                  key={p.id}
                  onClick={() => aggiungi(p)}
                  className="card text-left hover:border-primary hover:shadow-elevated transition-all active:scale-95 p-4 cursor-pointer"
                >
                  <div className="text-2xl mb-2">{EMOJI[catNome(p.categoria_id)] ?? '🍴'}</div>
                  <div className="font-semibold text-sm text-text-primary leading-tight">{p.nome}</div>
                  {p.descrizione && (
                    <div className="text-xs text-text-muted mt-1 line-clamp-2">{p.descrizione}</div>
                  )}
                  <div className="mt-3 font-bold text-primary">{formatCurrency(p.prezzo)}</div>
                </button>
              ))}
          {!loading && prodottiFiltrati.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-muted text-sm">
              Nessun prodotto disponibile in questa categoria
            </div>
          )}
        </div>
      </div>

    {/* ── Pannello destro: carrello ── */}
    <div className={clsx(
      "w-full md:w-[340px] lg:w-[400px] xl:w-[460px] flex-shrink-0 flex flex-col bg-surface border border-border rounded-2xl shadow-card h-full overflow-hidden",
      mobileTab !== 'carrello' && 'hidden md:flex'
    )}>
      {/* Unico contenitore scrollabile interno */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">

          {/* Canale + cliente */}
          <div className="card p-4">
            <label className="label">Canale ordine</label>
            <div className="grid grid-cols-3 gap-2">
              {(['banco', 'telefono', 'online'] as Canale[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCanale(c)}
                  className={clsx(
                    'py-2 rounded-xl text-xs font-semibold capitalize transition-all',
                    canale === c ? 'bg-primary text-white' : 'bg-bg border border-border text-text-secondary'
                  )}
                >
                  {c === 'banco' ? '🪑 Banco' : c === 'telefono' ? '📞 Telefono' : '🌐 Online'}
                </button>
              ))}
            </div>
            {/* Nome + Cellulare banco (opzionali) */}
            <div className="mt-3 flex flex-col gap-2">
              <div>
                <label className="label"><User size={10} className="inline" /> Nome cliente <span className="text-text-muted font-normal">(opzionale)</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Es. Mario Rossi"
                  value={nomeBanco}
                  onChange={e => setNomeBanco(e.target.value.replace(/[^a-zA-Z\s'-\u00C0-\u00FF]/g, ''))}
                />
              </div>
              <div>
                <label className="label"><Phone size={10} className="inline" /> Cellulare <span className="text-text-muted font-normal">(opzionale)</span></label>
                <input
                  type="tel"
                  className="input"
                  placeholder="Es. +39 333 1234567"
                  value={telefonoBanco}
                  onChange={e => setTelefonoBanco(e.target.value.replace(/[^\d\s\+\-\(\)]/g, ''))}
                />
              </div>
            </div>
          </div>

          {/* Lista articoli */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary flex items-center gap-2">
                <ShoppingCart size={16} /> Carrello
              </h3>
              {numArticoli > 0 && (
                <span className="badge bg-primary/10 text-primary">{numArticoli} art.</span>
              )}
            </div>

            {righe.length === 0 && (
              <div className="text-center py-8 text-text-muted text-sm">
                <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
                Carrello vuoto
              </div>
            )}

            <div className="flex flex-col gap-2">
              {righe.map(r => (
                <div key={r.prodotto.id} className="flex flex-col bg-bg rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 p-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate">{r.prodotto.nome}</div>
                      <div className="text-xs text-text-muted">{formatCurrency(r.prodotto.prezzo)} × {r.quantita}</div>
                      {r.note && (
                        <div className="text-xs text-info mt-0.5 italic truncate">✎ {r.note}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => cambiaQta(r.prodotto.id, -1)} className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center hover:bg-bg hover:border-primary active:scale-95 transition-all">
                        <Minus size={14} className="text-text-secondary" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{r.quantita}</span>
                      <button onClick={() => cambiaQta(r.prodotto.id, 1)} className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center hover:bg-bg hover:border-primary active:scale-95 transition-all">
                        <Plus size={14} className="text-text-secondary" />
                      </button>
                    </div>
                    <div className="text-xs font-bold text-text-primary w-14 text-right">{formatCurrency(r.prodotto.prezzo * r.quantita)}</div>
                    <button onClick={() => rimuovi(r.prodotto.id)} className="text-danger hover:text-red-700 ml-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="px-2.5 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <StickyNote size={11} className="text-text-muted flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Nota (es. senza cipolla, ben cotta…)"
                        value={r.note}
                        onChange={e => cambiaNote(r.prodotto.id, e.target.value)}
                        className="flex-1 text-xs bg-surface border border-border rounded-lg px-2 py-1.5 placeholder:text-text-muted/60 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nota ordine */}
          {righe.length > 0 && (
            <div className="card p-3">
              <label className="label text-xs">Nota generale ordine</label>
              <textarea
                className="input text-xs resize-none"
                rows={2}
                placeholder="Note per la cucina sull'intero ordine..."
                value={nota}
                onChange={e => setNota(e.target.value)}
              />
            </div>
          )}

          {/* Totali + azione */}
          <div className="card p-4">
            <div className="flex flex-col gap-2 text-sm mb-4">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotale</span><span>{formatCurrency(subtotale)}</span>
              </div>
              <div className="flex flex-col gap-1.5 text-text-secondary">
                <div className="flex items-center justify-between">
                  <span>Sconto %</span>
                  <input
                    type="number" min={0} max={100} value={sconto}
                    onChange={e => setSconto(Number(e.target.value))}
                    className="w-16 text-right bg-bg border border-border rounded-xl px-2 py-1 text-sm font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex gap-1 justify-end flex-wrap">
                  {([0, 10, 15, 20, 50] as number[]).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSconto(val)}
                      className={clsx(
                        'px-2 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95',
                        sconto === val
                          ? 'bg-primary text-white border-primary'
                          : 'bg-bg border-border text-text-secondary hover:border-primary hover:text-primary'
                      )}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Sezione Coupon */}
              <div className="flex flex-col gap-1.5 text-text-secondary border-t border-border/40 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Codice Coupon</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Es. SCONTO10"
                    value={couponCodice}
                    onChange={e => setCouponCodice(e.target.value.toUpperCase())}
                    className="input py-1 text-xs flex-1 uppercase font-mono"
                    disabled={!!couponApplicato}
                  />
                  {couponApplicato ? (
                    <button
                      type="button"
                      onClick={() => { setCouponApplicato(null); setCouponCodice(''); }}
                      className="btn-danger py-1 text-xs px-2.5"
                    >
                      Rimuovi
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applicaCoupon}
                      disabled={verificandoCoupon || !couponCodice.trim()}
                      className="btn-secondary py-1 text-xs px-3 disabled:opacity-50"
                    >
                      {verificandoCoupon ? '...' : 'Applica'}
                    </button>
                  )}
                </div>
                {couponApplicato && (
                  <span className="text-[10px] text-success font-semibold">
                    ✓ Sconto {couponApplicato.codice} ({couponApplicato.tipo === 'percentuale' ? `${couponApplicato.valore}%` : formatCurrency(couponApplicato.valore)}) applicato.
                  </span>
                )}
              </div>

              {scontoEuro > 0 && (
                <div className="flex justify-between text-success text-xs font-semibold">
                  <span>Sconto Totale</span><span>-{formatCurrency(scontoEuro)}</span>
                </div>
              )}
              
              <div className="border-t border-border pt-2 flex justify-between font-bold text-text-primary text-base">
                <span>Totale</span><span>{formatCurrency(totale)}</span>
              </div>
            </div>

            <label className="label">Metodo di Pagamento</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['contanti', 'pos', 'online'] as Pagamento[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPagamento(p)}
                  className={clsx(
                    'py-2.5 rounded-xl text-xs font-semibold capitalize transition-all active:scale-95',
                    pagamento === p
                      ? 'bg-primary text-white shadow-card'
                      : 'bg-bg border border-border text-text-secondary hover:border-primary hover:text-primary'
                  )}
                >
                  {p === 'contanti' ? '💵 Contanti' : p === 'pos' ? '💳 POS' : '🌐 Online'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={svuotaCarrello}
                className="btn-secondary flex-1 justify-center"
              >
                <Trash2 size={14} /> Svuota
              </button>
              <button
                onClick={invia}
                disabled={invio || righe.length === 0}
                className="btn-primary flex-1 justify-center disabled:opacity-60"
              >
                {invio
                  ? <><RefreshCw size={14} className="animate-spin" /> Invio...</>
                  : <><Receipt size={14} /> Invia ordine</>}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Cart Button for Mobile */}
      {mobileTab === 'menu' && numArticoli > 0 && (
        <button
          onClick={() => setMobileTab('carrello')}
          className="md:hidden fixed bottom-6 right-6 bg-primary text-white p-4 rounded-full shadow-lg flex items-center gap-2 hover:bg-primary-hover active:scale-95 transition-all z-40"
        >
          <ShoppingCart size={20} />
          <span className="text-sm font-bold bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
            {numArticoli}
          </span>
          <span className="text-sm font-semibold">{formatCurrency(totale)}</span>
        </button>
      )}
    </div>
  );
}
