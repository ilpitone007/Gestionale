export type Ruolo = 'admin' | 'manager' | 'cassiere' | 'cucina' | 'rider';

export interface Utente {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  ruolo: Ruolo;
  stato: 'attivo' | 'inattivo';
  ultimoAccesso?: string;
}

export type StatoOrdine = 'ricevuto' | 'in_preparazione' | 'pronto' | 'in_consegna' | 'completato' | 'annullato';
export type TipoOrdine = 'sala' | 'asporto' | 'delivery';
export type CanalOrdine = 'cassa' | 'telefono' | 'app' | 'web';

export interface RigaOrdine {
  prodottoId: number;
  nome: string;
  quantita: number;
  prezzoUnitario: number;
  extra?: string[];
  note?: string;
}

export interface Ordine {
  id: string;
  numero: string;
  cliente?: string;
  telefono?: string;
  tipo: TipoOrdine;
  canale: CanalOrdine;
  stato: StatoOrdine;
  creatoAl: string;
  priorita: 'normale' | 'alta' | 'urgente';
  tavolo?: number;
  indirizzo?: string;
  righe: RigaOrdine[];
  subtotale: number;
  sconto: number;
  totale: number;
  metodoPagamento: 'contanti' | 'carta' | 'alla_consegna';
  note?: string;
  rider?: string;
}

export type DisponibilitaProdotto = 'disponibile' | 'esaurito' | 'scorte_basse';

export interface Prodotto {
  id: number;
  sku: string;
  nome: string;
  categoria: string;
  descrizione?: string;
  prezzo: number;
  costo: number;
  iva: number;
  margine: number;
  marginePerc: number;
  attivo: boolean;
  disponibile: boolean;
  personalizzabile: boolean;
  tempoPrepMin: number;
  ingredienti?: string[];
  allergeni?: string[];
  ultimaModifica?: string;
}

export interface Ingrediente {
  id: number;
  codice: string;
  nome: string;
  categoria: string;
  quantita: number;
  unita: string;
  sogliMinima: number;
  costoUnitario: number;
  prezzoExtra: number;
  disponibile: boolean;
  ultimaModifica?: string;
}

export type SegmentoCliente = 'nuovo' | 'occasionale' | 'affezionato' | 'vip';

export interface Cliente {
  id: number;
  codice: string;
  nome: string;
  cognome: string;
  telefono: string;
  email?: string;
  segmento: SegmentoCliente;
  stato: 'attivo' | 'inattivo';
  totaleOrdini: number;
  spesaTotale: number;
  scontrinoMedio: number;
  ultimoOrdine?: string;
  clienteDa?: string;
  indirizzi?: { etichetta: string; indirizzo: string; note?: string }[];
  note?: string;
}

export interface Rider {
  id: number;
  nome: string;
  stato: 'disponibile' | 'in_consegna' | 'pausa';
  consegneOggi: number;
  ultimaAttivita?: string;
}
