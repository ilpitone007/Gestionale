import api from './client';

export type StatoOrdineAPI = 'ricevuto' | 'in_preparazione' | 'pronto' | 'ritirato' | 'annullato';

export interface RigaOrdineAPI {
  id?: number;
  ordine_id?: number;
  prodotto_id: number;
  quantita: number;
  prezzo_unitario?: number;
  nota?: string;
  prodotto?: {
    id: number;
    nome: string;
    prezzo: number;
  };
}

export interface OrdineAPI {
  id: number;
  numero_ordine: string;
  cliente_id: number | null;
  nome_banco: string | null;      // Nome libero per ordini senza cliente registrato
  telefono_banco: string | null;  // Cellulare opzionale
  utente_id: number;
  stato: StatoOrdineAPI;
  canale: string;
  metodo_pagamento: string;
  totale: number;
  sconto: number;
  nota: string;
  creato_il: string;
  pronto_il: string | null;
  ritirato_il: string | null;
  cliente?: {
    id: number;
    nome: string;
    cognome: string;
    telefono: string;
  } | null;
  operatore?: {
    id: number;
    username: string;
    nome: string;
    cognome: string;
  } | null;
  righe?: RigaOrdineAPI[];
}

export interface CreaOrdineBody {
  canale: string;
  metodo_pagamento: string;
  righe: { prodotto_id: number; quantita: number; nota?: string }[];
  cliente_id?: number;
  nome_banco?: string;
  telefono_banco?: string;
  nota?: string;
  sconto?: number;
  coupon_codice?: string;
}

export const getOrdini = (params?: { stato?: string; limit?: number }) =>
  api.get<OrdineAPI[]>('/ordini', { params }).then(r => r.data);

export const getOrdineById = (id: number) =>
  api.get<OrdineAPI>(`/ordini/${id}`).then(r => r.data);

export const creaOrdine = (body: CreaOrdineBody) =>
  api.post<OrdineAPI>('/ordini', body).then(r => r.data);

export const aggiornaStatoOrdine = (id: number, stato: StatoOrdineAPI) =>
  api.put<OrdineAPI>(`/ordini/${id}/stato`, { stato }).then(r => r.data);

export interface AggiornaOrdineBody {
  righe: { prodotto_id: number; quantita: number; prezzo_unitario?: number; nota?: string }[];
  nota?: string;
  canale?: string;
  metodo_pagamento?: string;
  sconto?: number;
  nome_banco?: string;
  telefono_banco?: string;
  coupon_codice?: string;
}

export const aggiornaOrdine = (id: number, body: AggiornaOrdineBody) =>
  api.put<OrdineAPI>(`/ordini/${id}`, body).then(r => r.data);

