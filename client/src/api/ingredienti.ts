import api from './client';

export interface IngredienteAPI {
  id: number;
  nome: string;
  prezzo_aggiunta: number;
  tipo: string; // 'base' | 'extra' | 'premium'
  disponibile: 0 | 1;
}

export const getIngredienti = () =>
  api.get<IngredienteAPI[]>('/ingredienti').then(r => r.data);

export const toggleDisponibileIngrediente = (id: number, disponibile: boolean) =>
  api.put<IngredienteAPI>(`/ingredienti/${id}`, { disponibile: disponibile ? 1 : 0 }).then(r => r.data);
