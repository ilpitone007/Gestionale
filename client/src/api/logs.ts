import api from './client';

export interface Log {
  id: number;
  messaggio: string;
  stack?: string | null;
  metodo?: string | null;
  url?: string | null;
  creato_il: string;
}

export const getLogs = () =>
  api.get<Log[]>('/logs').then(r => r.data);

export const clearLogs = () =>
  api.delete<{ messaggio: string }>('/logs').then(r => r.data);
