export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export function parseDateUTC(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('Z') || dateStr.includes('T')) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}

export function formatDate(isoString: string): string {
  return parseDateUTC(isoString).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function tempoTrascorso(isoString: string): string {
  const diff = Math.floor((Date.now() - parseDateUTC(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}

export function statoOrdineLabel(stato: string): string {
  const labels: Record<string, string> = {
    ricevuto: 'Ricevuto', in_preparazione: 'In preparazione', pronto: 'Pronto',
    in_consegna: 'In consegna', completato: 'Completato', annullato: 'Annullato'
  };
  return labels[stato] ?? stato;
}

export function disponibilitaLabel(d: boolean, q?: number, soglia?: number): 'disponibile' | 'esaurito' | 'scorte_basse' {
  if (!d || (q !== undefined && q === 0)) return 'esaurito';
  if (q !== undefined && soglia !== undefined && q < soglia) return 'scorte_basse';
  return 'disponibile';
}
