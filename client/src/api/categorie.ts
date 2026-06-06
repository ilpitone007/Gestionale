import api from './client';

export interface CategoriaAPI {
  id: number;
  nome: string;
  categoria_padre_id: number | null;
  ordine_visualizzazione: number;
  attiva: 0 | 1;
}

export interface CreaCategoriaBody {
  nome: string;
  categoria_padre_id?: number | null;
  ordine_visualizzazione?: number;
}

export const getCategorie = () =>
  api.get<CategoriaAPI[]>('/categorie').then(r => r.data);

export const creaCategoria = (body: CreaCategoriaBody) =>
  api.post<CategoriaAPI>('/categorie', body).then(r => r.data);

export const aggiornaCategoria = (id: number, body: Partial<CreaCategoriaBody & { attiva: 0 | 1 }>) =>
  api.put<CategoriaAPI>(`/categorie/${id}`, body).then(r => r.data);

export const eliminaCategoria = (id: number) =>
  api.delete(`/categorie/${id}`).then(r => r.data);
