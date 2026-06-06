import React from 'react';
import { clsx } from 'clsx';

type Variante = 'disponibile' | 'esaurito' | 'scorte_basse' | 'completato' | 'in_preparazione' | 'in_consegna' | 'annullato' | 'urgente' | 'attivo' | 'inattivo' | 'ricevuto' | 'pronto' | 'ritirato' | 'normale' | 'alta';

const config: Record<Variante, { label: string; className: string }> = {
  disponibile:     { label: 'Disponibile',     className: 'bg-success/10 text-success' },
  esaurito:        { label: 'Esaurito',        className: 'bg-danger/10 text-danger' },
  scorte_basse:    { label: 'Scorte basse',    className: 'bg-warning/10 text-warning' },
  completato:      { label: 'Completato',      className: 'bg-success/10 text-success' },
  ricevuto:        { label: 'Ricevuto',        className: 'bg-blue-100 text-blue-700' },
  in_preparazione: { label: 'In preparazione', className: 'bg-info/10 text-info' },
  pronto:          { label: 'Pronto',          className: 'bg-success/10 text-success' },
  in_consegna:     { label: 'In consegna',     className: 'bg-violet/10 text-violet' },
  ritirato:        { label: 'Ritirato',        className: 'bg-gray-100 text-gray-600' },
  annullato:       { label: 'Annullato',       className: 'bg-danger/10 text-danger' },
  urgente:         { label: 'Urgente',         className: 'bg-danger/10 text-danger' },
  attivo:          { label: 'Attivo',          className: 'bg-success/10 text-success' },
  inattivo:        { label: 'Inattivo',        className: 'bg-gray-100 text-gray-500' },
  normale:         { label: 'Normale',         className: 'bg-gray-100 text-gray-600' },
  alta:            { label: 'Alta priorità',   className: 'bg-warning/10 text-warning' },
};

export default function StatusBadge({ stato }: { stato: Variante }) {
  const c = config[stato] ?? { label: stato, className: 'bg-gray-100 text-gray-600' };
  return <span className={clsx('badge', c.className)}>{c.label}</span>;
}
