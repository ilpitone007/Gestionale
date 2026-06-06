import api from './client';

export interface ProdottoAPI {
  id: number;
  categoria_id: number;
  nome: string;
  descrizione: string;
  prezzo: number;
  costo: number;
  personalizzabile: 0 | 1;
  disponibile: 0 | 1;
  ordine_visualizzazione: number;
}

export interface CreaProdottoBody {
  categoria_id: number;
  nome: string;
  descrizione?: string;
  prezzo: number;
  costo: number;
  personalizzabile?: 0 | 1;
  disponibile?: 0 | 1;
  ordine_visualizzazione?: number;
  ingredienti_ids?: number[];
}

export const getProdotti = () =>
  api.get<ProdottoAPI[]>('/prodotti').then(r => r.data);

export const creaProdotto = (body: CreaProdottoBody) =>
  api.post<ProdottoAPI>('/prodotti', body).then(r => r.data);

export const aggiornaProdotto = (id: number, body: Partial<CreaProdottoBody>) =>
  api.put<ProdottoAPI>(`/prodotti/${id}`, body).then(r => r.data);

export const eliminaProdotto = (id: number) =>
  api.delete(`/prodotti/${id}`).then(r => r.data);

export const toggleDisponibileProdotto = (id: number, disponibile: boolean) =>
  api.put<ProdottoAPI>(`/prodotti/${id}`, { disponibile: disponibile ? 1 : 0 }).then(r => r.data);
