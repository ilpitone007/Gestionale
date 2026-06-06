import api from './client';

export interface ClienteAPI {
  id: number;
  nome: string;
  cognome: string;
  telefono: string;
  email: string | null;
  note: string | null;
  punti_fedelta: number;
  contatore_pizze: number;
  creato_il: string;
  ultimo_ordine: string | null;
}

export const getClienti = () =>
  api.get<ClienteAPI[]>('/clienti').then(r => r.data);

export const getClienteById = (id: number) =>
  api.get<ClienteAPI>(`/clienti/${id}`).then(r => r.data);

export const cercaClientePerTelefono = (telefono: string) =>
  api.get<ClienteAPI[]>('/clienti', { params: { telefono } }).then(r => r.data);

export interface CreaClienteBody {
  nome: string;
  cognome: string;
  telefono: string;
  email?: string;
  note?: string;
}

export const creaCliente = (body: CreaClienteBody) =>
  api.post<ClienteAPI>('/clienti', body).then(r => r.data);

export const aggiornaCliente = (id: number, body: Partial<CreaClienteBody>) =>
  api.put<ClienteAPI>(`/clienti/${id}`, body).then(r => r.data);

export const eliminaCliente = (id: number) =>
  api.delete(`/clienti/${id}`).then(r => r.data);

