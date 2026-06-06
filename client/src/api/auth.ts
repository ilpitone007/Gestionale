import api from './client';

export interface LoginResponse {
  token: string;
  utente: {
    id: number;
    username: string;
    nome: string;
    cognome: string;
    ruolo: string;
  };
}

export const login = (username: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { username, password }).then(r => r.data);

export const me = () =>
  api.get<LoginResponse['utente']>('/auth/me').then(r => r.data);
