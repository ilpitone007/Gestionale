import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { LogIn, Pizza, CheckCircle, Zap, Shield } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Accesso effettuato');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { errore?: string } } })?.response?.data?.errore
        || (err as Error).message
        || 'Credenziali non valide';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (u: string, p: string) => { setUsername(u); setPassword(p); };

  return (
    <div className="min-h-screen flex">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-sidebar p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl"><Pizza size={24} /></div>
          <span className="text-xl font-bold">Gestionale</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">Il tuo locale,<br/>sempre sotto controllo.</h2>
          <p className="text-slate-300 text-lg mb-10">Sistema POS professionale per la gestione completa della tua pizzeria.</p>
          <div className="flex flex-col gap-4">
            {[
              { icon: Zap,         text: 'Ordini in tempo reale con aggiornamento automatico' },
              { icon: CheckCircle, text: 'Gestione scorte e ingredienti integrata' },
              { icon: Shield,      text: 'Ruoli e permessi per ogni dipendente' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-slate-300">
                <div className="p-1.5 bg-white/10 rounded-lg"><Icon size={16} /></div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-500 text-sm">© 2026 Gestionale POS</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-bg">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="p-2 bg-primary rounded-xl"><Pizza size={20} className="text-white" /></div>
            <span className="text-xl font-bold text-text-primary">Gestionale</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Accedi</h1>
          <p className="text-text-secondary text-sm mb-8">Inserisci le tue credenziali per continuare</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="username" className="label">Nome utente</label>
              <input
                id="username"
                type="text"
                className="input"
                placeholder="titolare"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" id="btn-login" disabled={loading} className="btn-primary justify-center py-3 text-base">
              {loading
                ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                : <LogIn size={18} />}
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          {/* Quick-login accounts (only in development) */}
          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-surface border border-border rounded-xl">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Account demo</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['Titolare', 'titolare', 'titolare123'],
                  ['Responsabile', 'responsabile', 'responsabile123'],
                  ['Dipendente', 'dipendente', 'dipendente123'],
                ] as [string, string, string][]).map(([ruolo, u, p]) => (
                  <button
                    key={u}
                    onClick={() => quickLogin(u, p)}
                    className="text-left p-2.5 bg-bg rounded-lg hover:bg-border transition-colors"
                  >
                    <div className="text-xs font-semibold text-text-primary">{ruolo}</div>
                    <div className="text-xs text-text-muted">{u}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
