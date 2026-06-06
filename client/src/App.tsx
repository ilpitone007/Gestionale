import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
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
  return utente ? <>{children}</> : <Navigate to="/login" replace />;
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
              <Route path="/menu"         element={<Menu />} />
              <Route path="/inventario"   element={<Inventario />} />
              <Route path="/consegne"     element={<Consegne />} />
              <Route path="/clienti"      element={<Clienti />} />
              <Route path="/report"       element={<Report />} />
              <Route path="/storico"      element={<Storico />} />
              <Route path="/impostazioni" element={<Impostazioni />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
