import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login as apiLogin, me as apiMe } from '@/api/auth';

interface UtenteAuth {
  id: number;
  username: string;
  nome: string;
  cognome: string;
  ruolo: string;
}

interface AuthContextType {
  utente: UtenteAuth | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utente, setUtente] = useState<UtenteAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('utente');
    if (token && userData) {
      try {
        setUtente(JSON.parse(userData));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('utente');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('utente', JSON.stringify(data.utente));
    setUtente(data.utente);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('utente');
    setUtente(null);
  };

  return (
    <AuthContext.Provider value={{ utente, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
