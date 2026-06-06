import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import StatCard from '@/components/cards/StatCard';
import { clsx } from 'clsx';
import { useToast } from '@/contexts/ToastContext';
import { getIngredienti, toggleDisponibileIngrediente } from '@/api/ingredienti';
import type { IngredienteAPI } from '@/api/ingredienti';
import { formatCurrency } from '@/utils';

const tipoColor: Record<string, string> = {
  base: 'bg-info/10 text-info',
  extra: 'bg-violet/10 text-violet',
  premium: 'bg-warning/10 text-warning',
};

export default function Inventario() {
  const toast = useToast();
  const [ingredienti, setIngredienti] = useState<IngredienteAPI[]>([]);
  const [cerca, setCerca] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const carica = useCallback(async () => {
    try {
      const data = await getIngredienti();
      setIngredienti(data);
    } catch {
      toast.error('Impossibile caricare gli ingredienti dal server.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carica(); }, [carica]);

  const filtrati = ingredienti.filter(i =>
    i.nome.toLowerCase().includes(cerca.toLowerCase()) ||
    i.tipo.toLowerCase().includes(cerca.toLowerCase())
  );

  const disponibili = ingredienti.filter(i => i.disponibile).length;
  const nonDisponibili = ingredienti.filter(i => !i.disponibile).length;

  const toggleDisponibile = async (i: IngredienteAPI) => {
    setTogglingId(i.id);
    try {
      const updated = await toggleDisponibileIngrediente(i.id, !i.disponibile);
      setIngredienti(prev => prev.map(x => x.id === i.id ? { ...x, disponibile: updated.disponibile } : x));
      toast.success(`${i.nome}: ${updated.disponibile ? 'disponibile' : 'non disponibile'}`);
    } catch {
      toast.error('Errore durante il salvataggio.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Totale ingredienti" value={ingredienti.length}  icon={AlertTriangle} color="blue" />
        <StatCard label="Disponibili"         value={disponibili}        icon={AlertTriangle} color="green" />
        <StatCard label="Non disponibili"     value={nonDisponibili}     icon={AlertTriangle} color="red" />
        <StatCard label="Categorie tipo"      value={[...new Set(ingredienti.map(i => i.tipo))].length} icon={AlertTriangle} color="orange" />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Cerca ingrediente..."
            value={cerca}
            onChange={e => setCerca(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => toast.info('Apertura form nuovo ingrediente...')}>
          <Plus size={16} /> Aggiungi
        </button>
      </div>

      {/* Table (hidden on mobile, visible on desktop/tablet) */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Nome', 'Tipo', 'Prezzo aggiunta', 'Disponibile', 'Azioni'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="table-cell">
                          <div className="h-4 bg-border/50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtrati.map(i => (
                    <tr key={i.id} className="hover:bg-bg transition-colors">
                      <td className="table-cell font-semibold text-text-primary">{i.nome}</td>
                      <td className="table-cell">
                        <span className={clsx('badge', tipoColor[i.tipo] ?? 'bg-gray-100 text-gray-600')}>
                          {i.tipo}
                        </span>
                      </td>
                      <td className="table-cell text-text-secondary">
                        {i.prezzo_aggiunta > 0
                          ? <span className="text-info font-semibold">+{formatCurrency(i.prezzo_aggiunta)}</span>
                          : <span className="text-text-muted text-xs">incluso</span>}
                      </td>
                      <td className="table-cell">
                        <span className={clsx(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                          i.disponibile ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        )}>
                          {i.disponibile ? '✓ Disponibile' : '✗ Non disponibile'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => toggleDisponibile(i)}
                          disabled={togglingId === i.id}
                          title={i.disponibile ? 'Segna non disponibile' : 'Segna disponibile'}
                          className="text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                        >
                          {i.disponibile
                            ? <ToggleRight size={22} className="text-success" />
                            : <ToggleLeft size={22} />}
                        </button>
                      </td>
                    </tr>
                  ))}
              {!loading && filtrati.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-text-muted py-12">
                    Nessun ingrediente trovato
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile view: Card list */}
      <div className="flex flex-col gap-3 sm:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse bg-border/20 h-24" />
          ))
        ) : filtrati.length === 0 ? (
          <div className="card text-center py-12 text-text-muted">Nessun ingrediente trovato</div>
        ) : (
          filtrati.map(i => (
            <div key={i.id} className="card p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-text-primary text-sm">{i.nome}</h4>
                  <span className="text-[10px] text-text-secondary font-mono uppercase">ID: #{i.id}</span>
                </div>
                <span className={clsx('badge text-[10px] px-2 py-0.5', tipoColor[i.tipo] ?? 'bg-gray-100 text-gray-600')}>
                  {i.tipo}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-3 text-xs">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Prezzo Extra</span>
                  <span className="font-bold text-text-secondary">
                    {i.prezzo_aggiunta > 0 ? `+${formatCurrency(i.prezzo_aggiunta)}` : 'Incluso'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full font-semibold text-[10px]',
                    i.disponibile ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  )}>
                    {i.disponibile ? 'Disponibile' : 'Non disp.'}
                  </span>
                  <button
                    onClick={() => toggleDisponibile(i)}
                    disabled={togglingId === i.id}
                    className="text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {i.disponibile ? <ToggleRight size={22} className="text-success" /> : <ToggleLeft size={22} />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
