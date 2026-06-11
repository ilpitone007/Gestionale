import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/modules/auth/Login';
import Dashboard from '@/modules/dashboard/Dashboard';
import Cassa from '@/modules/cassa/Cassa';
import Ordini from '@/modules/ordini/Ordini';
import Cucina from '@/modules/cucina/Cucina';
import Menu from '@/modules/menu/Menu';
import Inventario from '@/modules/inventario/Inventario';
import Consegne from '@/modules/consegne/Consegne';
import Clienti from '@/modules/clienti/Clienti';
import Report from '@/modules/report/Report';
import Storico from '@/modules/storico/Storico';
import Impostazioni from '@/modules/impostazioni/Impostazioni';

function ProtectedRoute({ children, ruoli }: { children: React.ReactNode; ruoli?: string[] }) {
  const { utente, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-text-secondary font-medium">Caricamento...</span>
        </div>
      </div>
    );
  }
  if (!utente) {
    return <Navigate to="/login" replace />;
  }
  if (ruoli && !ruoli.includes(utente.ruolo)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { utente, loading } = useAuth();
  if (loading) return null;
  return !utente ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <OrdersProvider>
          <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"    element={<Dashboard />} />
                <Route path="/cassa"        element={<Cassa />} />
                <Route path="/ordini"       element={<Ordini />} />
                <Route path="/cucina"       element={<Cucina />} />
                <Route path="/menu"         element={<ProtectedRoute ruoli={['titolare']}><Menu /></ProtectedRoute>} />
                <Route path="/inventario"   element={<ProtectedRoute ruoli={['titolare', 'responsabile']}><Inventario /></ProtectedRoute>} />
                <Route path="/consegne"     element={<Consegne />} />
                <Route path="/clienti"      element={<ProtectedRoute ruoli={['titolare', 'responsabile']}><Clienti /></ProtectedRoute>} />
                <Route path="/report"       element={<ProtectedRoute ruoli={['titolare', 'responsabile']}><Report /></ProtectedRoute>} />
                <Route path="/storico"      element={<ProtectedRoute ruoli={['titolare', 'responsabile']}><Storico /></ProtectedRoute>} />
                <Route path="/impostazioni" element={<ProtectedRoute ruoli={['titolare']}><Impostazioni /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          </ToastProvider>
        </OrdersProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
