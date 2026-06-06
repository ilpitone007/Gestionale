import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: number; type: ToastType; message: string; }
interface ToastContextType { success: (m: string) => void; error: (m: string) => void; warning: (m: string) => void; info: (m: string) => void; }

const ToastContext = createContext<ToastContextType | null>(null);

const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
const colors = { success: 'border-l-success text-success', error: 'border-l-danger text-danger', warning: 'border-l-warning text-warning', info: 'border-l-info text-info' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const ctx = {
    success: (m: string) => addToast('success', m),
    error: (m: string) => addToast('error', m),
    warning: (m: string) => addToast('warning', m),
    info: (m: string) => addToast('info', m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`flex items-center gap-3 bg-white border-l-4 ${colors[t.type]} rounded-xl px-4 py-3 shadow-elevated min-w-[280px] animate-in fade-in slide-in-from-bottom-2`}>
              <Icon size={16} className="flex-shrink-0" />
              <span className="text-sm text-text-primary font-medium flex-1">{t.message}</span>
              <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
