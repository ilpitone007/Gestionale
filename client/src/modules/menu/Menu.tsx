import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Tag, Pizza } from 'lucide-react';
import { formatCurrency } from '@/utils';
import { clsx } from 'clsx';
import { useToast } from '@/contexts/ToastContext';
import { getProdotti, creaProdotto, aggiornaProdotto, eliminaProdotto, toggleDisponibileProdotto } from '@/api/prodotti';
import { getCategorie, creaCategoria, aggiornaCategoria, eliminaCategoria } from '@/api/categorie';
import type { ProdottoAPI } from '@/api/prodotti';
import type { CategoriaAPI } from '@/api/categorie';

// ─── Stato form prodotto vuoto ────────────────────────────────────────────────
const prodottoVuoto = {
  categoria_id: 0,
  nome: '',
  descrizione: '',
  prezzo: '',
  costo: '',
  personalizzabile: 0 as 0 | 1,
  disponibile: 1 as 0 | 1,
};

// ─── Modale prodotto ──────────────────────────────────────────────────────────
function ModaleProdotto({
  categorie,
  editing,
  onClose,
  onSaved,
}: {
  categorie: CategoriaAPI[];
  editing: ProdottoAPI | null;
  onClose: () => void;
  onSaved: (p: ProdottoAPI) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    ...prodottoVuoto,
    ...(editing
      ? {
          categoria_id: editing.categoria_id,
          nome: editing.nome,
          descrizione: editing.descrizione,
          prezzo: String(editing.prezzo),
          costo: String(editing.costo),
          personalizzabile: editing.personalizzabile,
          disponibile: editing.disponibile,
        }
      : {}),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const salva = async () => {
    if (!form.nome.trim()) { toast.error('Il nome è obbligatorio'); return; }
    if (!form.categoria_id) { toast.error('Seleziona una categoria'); return; }
    if (form.prezzo === '' || form.costo === '') { toast.error('Prezzo e costo sono obbligatori'); return; }
    setSaving(true);
    try {
      const body = {
        categoria_id: Number(form.categoria_id),
        nome: form.nome.trim(),
        descrizione: form.descrizione.trim(),
        prezzo: parseFloat(form.prezzo as string),
        costo: parseFloat(form.costo as string),
        personalizzabile: form.personalizzabile,
        disponibile: form.disponibile,
      };
      const result = editing
        ? await aggiornaProdotto(editing.id, body)
        : await creaProdotto(body);
      toast.success(editing ? 'Prodotto aggiornato!' : 'Prodotto creato!');
      onSaved(result);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errore?: string } } })?.response?.data?.errore || 'Errore salvataggio';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-surface border border-border rounded-2xl shadow-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pizza size={18} className="text-primary" />
            </div>
            <h2 className="font-bold text-text-primary text-lg">
              {editing ? 'Modifica prodotto' : 'Nuovo prodotto'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Categoria */}
          <div>
            <label className="label">Categoria *</label>
            <select
              className="select w-full"
              value={form.categoria_id}
              onChange={e => set('categoria_id', Number(e.target.value))}
            >
              <option value={0}>— Seleziona categoria —</option>
              {categorie.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Nome */}
          <div>
            <label className="label">Nome *</label>
            <input
              className="input w-full"
              placeholder="es. Margherita"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="label">Descrizione</label>
            <textarea
              className="input w-full resize-none"
              rows={2}
              placeholder="Ingredienti o note brevi..."
              value={form.descrizione}
              onChange={e => set('descrizione', e.target.value)}
            />
          </div>

          {/* Prezzo / Costo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prezzo vendita (€) *</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.prezzo}
                onChange={e => set('prezzo', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Costo produzione (€) *</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.costo}
                onChange={e => set('costo', e.target.value)}
              />
            </div>
          </div>

          {/* Margine calcolato */}
          {form.prezzo && form.costo && Number(form.prezzo) > 0 && (
            <div className="bg-success/5 border border-success/20 rounded-xl p-3 text-sm">
              <span className="text-text-secondary">Margine stimato: </span>
              <span className="font-bold text-success">
                {formatCurrency(Number(form.prezzo) - Number(form.costo))}
                &nbsp;({((1 - Number(form.costo) / Number(form.prezzo)) * 100).toFixed(0)}%)
              </span>
            </div>
          )}

          {/* Toggle personalizzabile */}
          <div className="flex items-center justify-between bg-bg rounded-xl p-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">Personalizzabile</div>
              <div className="text-xs text-text-muted">Il cliente può modificare gli ingredienti</div>
            </div>
            <button
              onClick={() => set('personalizzabile', form.personalizzabile ? 0 : 1)}
              className={clsx('transition-colors', form.personalizzabile ? 'text-primary' : 'text-border')}
            >
              {form.personalizzabile
                ? <ToggleRight size={32} />
                : <ToggleLeft size={32} />}
            </button>
          </div>

          {/* Toggle disponibile */}
          <div className="flex items-center justify-between bg-bg rounded-xl p-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">Disponibile</div>
              <div className="text-xs text-text-muted">Visibile nel menu e in cassa</div>
            </div>
            <button
              onClick={() => set('disponibile', form.disponibile ? 0 : 1)}
              className={clsx('transition-colors', form.disponibile ? 'text-success' : 'text-border')}
            >
              {form.disponibile
                ? <ToggleRight size={32} />
                : <ToggleLeft size={32} />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button className="btn-secondary flex-1" onClick={onClose}>Annulla</button>
          <button
            className="btn-primary flex-1"
            onClick={salva}
            disabled={saving}
          >
            {saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : 'Crea prodotto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modale categoria ─────────────────────────────────────────────────────────
function ModaleCategoria({
  tutteCategorie,
  editing,
  onClose,
  onSaved,
}: {
  tutteCategorie: CategoriaAPI[];
  editing: CategoriaAPI | null;
  onClose: () => void;
  onSaved: (c: CategoriaAPI) => void;
}) {
  const toast = useToast();
  const [nome, setNome] = useState(editing?.nome ?? '');
  const [padreId, setPadreId] = useState<number | null>(editing?.categoria_padre_id ?? null);
  const [ordine, setOrdine] = useState(String(editing?.ordine_visualizzazione ?? 0));
  const [saving, setSaving] = useState(false);

  const salva = async () => {
    if (!nome.trim()) { toast.error('Il nome è obbligatorio'); return; }
    setSaving(true);
    try {
      const body = {
        nome: nome.trim(),
        categoria_padre_id: padreId,
        ordine_visualizzazione: Number(ordine),
      };
      const result = editing
        ? await aggiornaCategoria(editing.id, body)
        : await creaCategoria(body);
      toast.success(editing ? 'Categoria aggiornata!' : 'Categoria creata!');
      onSaved(result);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errore?: string } } })?.response?.data?.errore || 'Errore salvataggio';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const opzioniPadre = tutteCategorie.filter(c => c.id !== editing?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-surface border border-border rounded-2xl shadow-elevated w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet/10 flex items-center justify-center">
              <Tag size={18} className="text-violet" />
            </div>
            <h2 className="font-bold text-text-primary text-lg">
              {editing ? 'Modifica categoria' : 'Nuova categoria'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="label">Nome categoria *</label>
            <input
              className="input w-full"
              placeholder="es. Pizze, Bevande, Fritti..."
              value={nome}
              onChange={e => setNome(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Categoria padre (opzionale)</label>
            <select
              className="select w-full"
              value={padreId ?? ''}
              onChange={e => setPadreId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Nessuna (categoria radice) —</option>
              {opzioniPadre.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Ordine visualizzazione</label>
            <input
              className="input w-full"
              type="number"
              min="0"
              placeholder="0"
              value={ordine}
              onChange={e => setOrdine(e.target.value)}
            />
            <p className="text-xs text-text-muted mt-1">I numeri bassi appaiono prima nel menu</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button className="btn-secondary flex-1" onClick={onClose}>Annulla</button>
          <button
            className="btn-primary flex-1"
            onClick={salva}
            disabled={saving}
          >
            {saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : 'Crea categoria'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principale Menu ───────────────────────────────────────────────
export default function Menu() {
  const toast = useToast();
  const [prodotti, setProdotti] = useState<ProdottoAPI[]>([]);
  const [categorie, setCategorie] = useState<CategoriaAPI[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [tab, setTab] = useState<'prodotti' | 'categorie'>('prodotti');
  const [catSelezionata, setCatSelezionata] = useState<number | null>(null);
  const [espanse, setEspanse] = useState<Set<number>>(new Set());

  // Modali
  const [modaleProdotto, setModaleProdotto] = useState<{ open: boolean; editing: ProdottoAPI | null }>({ open: false, editing: null });
  const [modaleCategoria, setModaleCategoria] = useState<{ open: boolean; editing: CategoriaAPI | null }>({ open: false, editing: null });

  const carica = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([getProdotti(), getCategorie()]);
      setProdotti(prods);
      setCategorie(cats);
    } catch {
      toast.error('Impossibile caricare i dati.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carica(); }, [carica]);

  // ─── Categorie helpers ──────────────────────────────────────────────
  const radici = categorie.filter(c => c.categoria_padre_id === null);
  const prodottiFiltrati = catSelezionata
    ? prodotti.filter(p => p.categoria_id === catSelezionata)
    : prodotti;

  const toggleEspansa = (id: number) => {
    setEspanse(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Toggle disponibilità prodotto ─────────────────────────────────
  const toggleDisp = async (p: ProdottoAPI) => {
    try {
      const updated = await toggleDisponibileProdotto(p.id, p.disponibile === 0);
      setProdotti(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch {
      toast.error('Errore durante il cambio di disponibilità.');
    }
  };

  // ─── Toggle attiva categoria ────────────────────────────────────────
  const toggleAttivaCategoria = async (c: CategoriaAPI) => {
    try {
      const updated = await aggiornaCategoria(c.id, { attiva: c.attiva ? 0 : 1 });
      setCategorie(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch {
      toast.error('Errore durante il cambio di stato.');
    }
  };

  // ─── Elimina prodotto ───────────────────────────────────────────────
  const elimProdotto = async (p: ProdottoAPI) => {
    if (!confirm(`Eliminare "${p.nome}"? L'operazione non è reversibile.`)) return;
    try {
      await eliminaProdotto(p.id);
      setProdotti(prev => prev.filter(x => x.id !== p.id));
      toast.success('Prodotto eliminato.');
    } catch {
      toast.error('Errore durante l\'eliminazione.');
    }
  };

  // ─── Elimina categoria ──────────────────────────────────────────────
  const elimCategoria = async (c: CategoriaAPI) => {
    if (!confirm(`Eliminare la categoria "${c.nome}"? I prodotti associati rimarranno senza categoria.`)) return;
    try {
      await eliminaCategoria(c.id);
      setCategorie(prev => prev.filter(x => x.id !== c.id));
      toast.success('Categoria eliminata.');
    } catch {
      toast.error('Errore durante l\'eliminazione.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header tabs + azioni */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
          {(['prodotti', 'categorie'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all',
                tab === t ? 'bg-primary text-white shadow-card' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {t === 'prodotti' ? '🍕 Prodotti' : '🏷️ Categorie'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === 'prodotti' && (
            <button
              className="btn-primary"
              onClick={() => setModaleProdotto({ open: true, editing: null })}
            >
              <Plus size={15} /> Nuovo prodotto
            </button>
          )}
          {tab === 'categorie' && (
            <button
              className="btn-primary"
              onClick={() => setModaleCategoria({ open: true, editing: null })}
            >
              <Plus size={15} /> Nuova categoria
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB: PRODOTTI ─── */}
      {tab === 'prodotti' && (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile Category Selector (horizontal scrolling) */}
          <div className="md:hidden flex overflow-x-auto gap-2 pb-2 mb-2 flex-shrink-0">
            <button
              onClick={() => setCatSelezionata(null)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                catSelezionata === null
                  ? 'bg-primary text-white'
                  : 'bg-white border border-border text-text-secondary'
              )}
            >
              Tutti ({prodotti.length})
            </button>
            {categorie.map(c => (
              <button
                key={c.id}
                onClick={() => setCatSelezionata(c.id)}
                className={clsx(
                  'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
                  catSelezionata === c.id
                    ? 'bg-primary text-white'
                    : 'bg-white border border-border text-text-secondary'
                )}
              >
                <span>{c.nome}</span>
                <span className="opacity-70 text-[10px]">({prodotti.filter(p => p.categoria_id === c.id).length})</span>
              </button>
            ))}
          </div>

          {/* Sidebar filtro categorie (Desktop) */}
          <div className="hidden md:flex w-48 flex-shrink-0 flex-col gap-2">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider px-2 mb-1">Categoria</div>
            <button
              onClick={() => setCatSelezionata(null)}
              className={clsx(
                'text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                catSelezionata === null
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-bg hover:text-text-primary'
              )}
            >
              Tutti ({prodotti.length})
            </button>
            {categorie.map(c => (
              <button
                key={c.id}
                onClick={() => setCatSelezionata(c.id)}
                className={clsx(
                  'text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all flex justify-between items-center',
                  catSelezionata === c.id
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-bg hover:text-text-primary'
                )}
              >
                <span>{c.nome}</span>
                <span className="text-xs opacity-70">{prodotti.filter(p => p.categoria_id === c.id).length}</span>
              </button>
            ))}
          </div>

          {/* Griglia prodotti */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card h-40 animate-pulse bg-border/20" />
                ))}
              </div>
            ) : prodottiFiltrati.length === 0 ? (
              <div className="card text-center py-16 text-text-muted">
                <Pizza size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Nessun prodotto</p>
                <p className="text-sm mt-1">Crea il primo prodotto con il pulsante in alto</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prodottiFiltrati.map(p => {
                  const catNome = categorie.find(c => c.id === p.categoria_id)?.nome ?? '—';
                  const margine = p.prezzo - p.costo;
                  const marginePerc = p.prezzo > 0 ? ((margine / p.prezzo) * 100).toFixed(0) : '0';
                  return (
                    <div
                      key={p.id}
                      className={clsx(
                        'card p-5 flex flex-col gap-3 transition-all',
                        !p.disponibile && 'opacity-60'
                      )}
                    >
                      {/* Top */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-text-primary truncate">{p.nome}</div>
                          <div className="text-xs text-text-muted mt-0.5">{catNome}</div>
                        </div>
                        <span className={clsx(
                          'badge text-xs flex-shrink-0',
                          p.disponibile ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        )}>
                          {p.disponibile ? 'Disponibile' : 'Esaurito'}
                        </span>
                      </div>

                      {p.descrizione && (
                        <p className="text-xs text-text-muted line-clamp-2">{p.descrizione}</p>
                      )}

                      {/* Prezzi */}
                      <div className="flex items-center gap-3 mt-auto">
                        <div>
                          <div className="text-xs text-text-muted">Prezzo</div>
                          <div className="font-bold text-primary text-lg">{formatCurrency(p.prezzo)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted">Costo</div>
                          <div className="font-semibold text-text-secondary">{formatCurrency(p.costo)}</div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="text-xs text-text-muted">Margine</div>
                          <div className={clsx('font-bold text-sm', margine >= 0 ? 'text-success' : 'text-danger')}>
                            {formatCurrency(margine)} ({marginePerc}%)
                          </div>
                        </div>
                      </div>

                      {/* Azioni */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <button
                          onClick={() => toggleDisp(p)}
                          title={p.disponibile ? 'Imposta come esaurito' : 'Imposta come disponibile'}
                          className={clsx(
                            'p-1.5 rounded-lg transition-colors',
                            p.disponibile ? 'text-success hover:bg-success/10' : 'text-border hover:bg-bg'
                          )}
                        >
                          {p.disponibile ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button
                          onClick={() => setModaleProdotto({ open: true, editing: p })}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-bg hover:text-primary transition-colors"
                          title="Modifica"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => elimProdotto(p)}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors ml-auto"
                          title="Elimina"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: CATEGORIE ─── */}
      {tab === 'categorie' && (
        <div className="flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-16 animate-pulse bg-border/20" />
            ))
          ) : categorie.length === 0 ? (
            <div className="card text-center py-16 text-text-muted">
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Nessuna categoria</p>
              <p className="text-sm mt-1">Crea la prima categoria con il pulsante in alto</p>
            </div>
          ) : (
            radici.map(cat => {
              const figlie = categorie.filter(c => c.categoria_padre_id === cat.id);
              const numProdotti = prodotti.filter(p => p.categoria_id === cat.id).length;
              const isEspansa = espanse.has(cat.id);
              return (
                <div key={cat.id} className="card p-0 overflow-hidden">
                  {/* Riga categoria radice */}
                  <div className="flex items-center gap-4 p-4">
                    <div
                      className={clsx(
                        'w-3 h-3 rounded-full flex-shrink-0',
                        cat.attiva ? 'bg-success' : 'bg-border'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-text-primary">{cat.nome}</div>
                      <div className="text-xs text-text-muted">
                        {numProdotti} prodotto{numProdotti !== 1 ? 'i' : ''}
                        {figlie.length > 0 && ` · ${figlie.length} sottocategoria${figlie.length !== 1 ? 'e' : ''}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Ord. {cat.ordine_visualizzazione}</span>
                      <button
                        onClick={() => toggleAttivaCategoria(cat)}
                        className={clsx(
                          'transition-colors',
                          cat.attiva ? 'text-success' : 'text-border hover:text-text-muted'
                        )}
                        title={cat.attiva ? 'Disattiva' : 'Attiva'}
                      >
                        {cat.attiva ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        onClick={() => setModaleCategoria({ open: true, editing: cat })}
                        className="p-1.5 rounded-lg text-text-muted hover:bg-bg hover:text-primary transition-colors"
                        title="Modifica"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => elimCategoria(cat)}
                        className="p-1.5 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        title="Elimina"
                      >
                        <Trash2 size={14} />
                      </button>
                      {figlie.length > 0 && (
                        <button
                          onClick={() => toggleEspansa(cat.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-bg transition-colors"
                        >
                          {isEspansa ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sottocategorie espanse */}
                  {isEspansa && figlie.length > 0 && (
                    <div className="border-t border-border bg-bg">
                      {figlie.map(f => {
                        const numF = prodotti.filter(p => p.categoria_id === f.id).length;
                        return (
                          <div key={f.id} className="flex items-center gap-4 px-6 py-3 border-b border-border/50 last:border-0">
                            <div className="w-2 h-2 rounded-full bg-border flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-text-secondary">{f.nome}</div>
                              <div className="text-xs text-text-muted">{numF} prodotti</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setModaleCategoria({ open: true, editing: f })}
                                className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-primary transition-colors"
                                title="Modifica"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => elimCategoria(f)}
                                className="p-1.5 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                                title="Elimina"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Modali ─── */}
      {modaleProdotto.open && (
        <ModaleProdotto
          categorie={categorie}
          editing={modaleProdotto.editing}
          onClose={() => setModaleProdotto({ open: false, editing: null })}
          onSaved={saved => {
            setProdotti(prev =>
              modaleProdotto.editing
                ? prev.map(p => p.id === saved.id ? saved : p)
                : [...prev, saved]
            );
            setModaleProdotto({ open: false, editing: null });
          }}
        />
      )}

      {modaleCategoria.open && (
        <ModaleCategoria
          tutteCategorie={categorie}
          editing={modaleCategoria.editing}
          onClose={() => setModaleCategoria({ open: false, editing: null })}
          onSaved={saved => {
            setCategorie(prev =>
              modaleCategoria.editing
                ? prev.map(c => c.id === saved.id ? saved : c)
                : [...prev, saved]
            );
            setModaleCategoria({ open: false, editing: null });
          }}
        />
      )}
    </div>
  );
}
