import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Minus, Trash2, Save, RefreshCw, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/contexts/ToastContext';
import { getProdotti } from '@/api/prodotti';
import { getCategorie } from '@/api/categorie';
import { aggiornaOrdine } from '@/api/ordini';
import { formatCurrency } from '@/utils';
import type { OrdineAPI, RigaOrdineAPI } from '@/api/ordini';
import type { ProdottoAPI } from '@/api/prodotti';

interface RigaEdit {
  prodotto_id: number;
  nome: string;
  prezzo_unitario: number;
  quantita: number;
  nota: string;
}

interface EditOrdineProps {
  ordine: OrdineAPI;
  onClose: () => void;
  onSaved: (ordineAggiornato: OrdineAPI) => void;
}

export default function EditOrdine({ ordine, onClose, onSaved }: EditOrdineProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [righe, setRighe] = useState<RigaEdit[]>([]);
  const [nota, setNota] = useState(ordine.nota ?? '');
  const [canale, setCanale] = useState(ordine.canale);
  const [pagamento, setPagamento] = useState(ordine.metodo_pagamento);
  const [nomeBanco, setNomeBanco] = useState(ordine.nome_banco ?? '');
  const [telefonoBanco, setTelefonoBanco] = useState(ordine.telefono_banco ?? '');

  // Prodotti per aggiunta
  const [prodotti, setProdotti] = useState<ProdottoAPI[]>([]);
  const [cerca, setCerca] = useState('');
  const [mostraRicerca, setMostraRicerca] = useState(false);
  const [categorie, setCategorie] = useState<Record<number, string>>({});

  // Inizializza le righe dall'ordine
  useEffect(() => {
    const r: RigaEdit[] = (ordine.righe ?? []).map((rr: RigaOrdineAPI) => ({
      prodotto_id: rr.prodotto_id,
      nome: rr.prodotto?.nome ?? `Prodotto #${rr.prodotto_id}`,
      prezzo_unitario: rr.prezzo_unitario ?? rr.prodotto?.prezzo ?? 0,
      quantita: rr.quantita,
      nota: rr.nota ?? '',
    }));
    setRighe(r);
  }, [ordine]);

  const caricaProdotti = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([getProdotti(), getCategorie()]);
      setProdotti(prods.filter(p => p.disponibile));
      const mappa: Record<number, string> = {};
      cats.forEach(c => { mappa[c.id] = c.nome; });
      setCategorie(mappa);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { caricaProdotti(); }, [caricaProdotti]);

  const cambiaQta = (idx: number, delta: number) => {
    setRighe(prev => {
      const next = [...prev];
      const nuovaQta = next[idx].quantita + delta;
      if (nuovaQta <= 0) return next.filter((_, i) => i !== idx);
      next[idx] = { ...next[idx], quantita: nuovaQta };
      return next;
    });
  };

  const cambiaNote = (idx: number, note: string) => {
    setRighe(prev => prev.map((r, i) => i === idx ? { ...r, nota: note } : r));
  };

  const aggiungiProdotto = (p: ProdottoAPI) => {
    setRighe(prev => {
      const idx = prev.findIndex(r => r.prodotto_id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantita: next[idx].quantita + 1 };
        return next;
      }
      return [...prev, {
        prodotto_id: p.id,
        nome: p.nome,
        prezzo_unitario: p.prezzo,
        quantita: 1,
        nota: '',
      }];
    });
    setCerca('');
    setMostraRicerca(false);
  };

  const subtotale = righe.reduce((acc, r) => acc + r.prezzo_unitario * r.quantita, 0);
  const totale = Math.max(0, subtotale - (ordine.sconto ?? 0));

  const prodottiFiltrati = prodotti.filter(p =>
    cerca.length >= 2 && p.nome.toLowerCase().includes(cerca.toLowerCase())
  );

  const salva = async () => {
    if (righe.length === 0) { toast.error('Aggiungi almeno un prodotto'); return; }
    setSaving(true);
    try {
      const aggiornato = await aggiornaOrdine(ordine.id, {
        righe: righe.map(r => ({
          prodotto_id: r.prodotto_id,
          quantita: r.quantita,
          prezzo_unitario: r.prezzo_unitario,
          nota: r.nota || undefined,
        })),
        nota: nota || undefined,
        canale,
        metodo_pagamento: pagamento,
        sconto: ordine.sconto,
        nome_banco: nomeBanco.trim() || undefined,
        telefono_banco: telefonoBanco.trim() || undefined,
      });
      toast.success('Ordine modificato con successo!');
      onSaved(aggiornato);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errore?: string } } })?.response?.data?.errore
        || 'Errore durante il salvataggio';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-text-primary text-lg">Modifica ordine #{ordine.numero_ordine}</h2>
            <p className="text-xs text-text-muted mt-0.5">Solo ordini in stato "ricevuto" o "in preparazione"</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Canale + Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Canale</label>
              <select className="select" value={canale} onChange={e => setCanale(e.target.value)}>
                <option value="banco">🪑 Banco</option>
                <option value="telefono">📞 Telefono</option>
                <option value="online">🌐 Online</option>
              </select>
            </div>
            <div>
              <label className="label">Pagamento</label>
              <select className="select" value={pagamento} onChange={e => setPagamento(e.target.value)}>
                <option value="contanti">Contanti</option>
                <option value="pos">POS (Carta)</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          {/* Nome cliente + cellulare se ordine banco (senza cliente registrato) */}
          {ordine.cliente_id === null && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nome cliente (opzionale)</label>
                <input
                  className="input"
                  placeholder="Es. Mario Rossi"
                  value={nomeBanco}
                  onChange={e => setNomeBanco(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Cellulare (opzionale)</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="Es. 333 1234567"
                  value={telefonoBanco}
                  onChange={e => setTelefonoBanco(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Ricerca prodotto da aggiungere */}
          <div className="relative">
            <label className="label">Aggiungi prodotto</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className="input pl-8"
                placeholder="Cerca prodotto da aggiungere…"
                value={cerca}
                onChange={e => { setCerca(e.target.value); setMostraRicerca(true); }}
                onFocus={() => setMostraRicerca(true)}
              />
            </div>
            {mostraRicerca && prodottiFiltrati.length > 0 && (
              <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-surface border border-border rounded-xl shadow-elevated max-h-48 overflow-y-auto">
                {prodottiFiltrati.map(p => (
                  <button
                    key={p.id}
                    onClick={() => aggiungiProdotto(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg text-sm transition-colors text-left"
                  >
                    <span className="text-text-primary">{p.nome}</span>
                    <span className="text-primary font-semibold ml-4">{formatCurrency(p.prezzo)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista righe */}
          <div className="flex flex-col gap-2">
            {righe.length === 0 && (
              <div className="text-center py-6 text-text-muted text-sm">Nessun prodotto — cerca e aggiungi</div>
            )}
            {righe.map((r, idx) => (
              <div key={idx} className="card p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{r.nome}</div>
                    <div className="text-xs text-text-muted">{formatCurrency(r.prezzo_unitario)} × {r.quantita} = <span className="font-bold text-primary">{formatCurrency(r.prezzo_unitario * r.quantita)}</span></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => cambiaQta(idx, -1)} className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center hover:bg-border">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{r.quantita}</span>
                    <button onClick={() => cambiaQta(idx, 1)} className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center hover:bg-border">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => setRighe(prev => prev.filter((_, i) => i !== idx))} className="text-danger hover:text-red-700 ml-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Nota riga (es. senza cipolla)…"
                  value={r.nota}
                  onChange={e => cambiaNote(idx, e.target.value)}
                  className="text-xs input py-1.5"
                />
              </div>
            ))}
          </div>

          {/* Nota ordine */}
          <div>
            <label className="label">Nota ordine</label>
            <textarea
              className="input text-sm resize-none"
              rows={2}
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Note generali per la cucina…"
            />
          </div>

          {/* Totale */}
          <div className="card p-3 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotale</span><span>{formatCurrency(subtotale)}</span>
            </div>
            {(ordine.sconto ?? 0) > 0 && (
              <div className="flex justify-between text-success">
                <span>Sconto</span><span>-{formatCurrency(ordine.sconto ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-text-primary border-t border-border pt-1.5">
              <span>Totale</span><span className="text-primary">{formatCurrency(totale)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Annulla
          </button>
          <button
            onClick={salva}
            disabled={saving || righe.length === 0}
            className={clsx('btn-primary flex-1 justify-center', (saving || righe.length === 0) && 'opacity-60 cursor-not-allowed')}
          >
            {saving ? <><RefreshCw size={14} className="animate-spin" /> Salvataggio…</> : <><Save size={14} /> Salva modifiche</>}
          </button>
        </div>
      </div>
    </div>
  );
}
