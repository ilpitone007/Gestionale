import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ClipboardList, BookOpen,
  Package, Truck, Users, BarChart3, History, Settings,
  LogOut, ChefHat, ChevronLeft, ChevronRight, Wifi
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const { utente, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const m = settings.mostraModuli;

  const navItems = [
    { path: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard, sempre: true },
    { path: '/cassa',        label: 'Cassa',            icon: ShoppingCart,    sempre: true },
    { path: '/ordini',       label: 'Ordini',           icon: ClipboardList,   sempre: true },
    { path: '/cucina',       label: 'Cucina',           icon: ChefHat,         sempre: true },
    { path: '/menu',         label: 'Menu',             icon: BookOpen,        sempre: true },
    { path: '/inventario',   label: 'Inventario',       icon: Package,         sempre: false, visibile: m.inventario },
    { path: '/consegne',     label: 'Consegne',         icon: Truck,           sempre: false, visibile: m.consegne },
    { path: '/clienti',      label: 'Clienti',          icon: Users,           sempre: false, visibile: m.clienti },
    { path: '/report',       label: 'Report',           icon: BarChart3,       sempre: false, visibile: m.report },
    { path: '/storico',      label: 'Storico ordini',   icon: History,         sempre: false, visibile: m.storico },
    { path: '/impostazioni', label: 'Impostazioni',     icon: Settings,        sempre: true },
  ].filter(item => item.sempre || item.visibile);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}
      <aside
        className={clsx(
          'flex flex-col h-screen bg-sidebar transition-all duration-300 flex-shrink-0 z-50',
          // Desktop styles
          collapsed ? 'md:w-16' : 'md:w-60',
          // Mobile styles
          'fixed inset-y-0 left-0 md:relative',
          mobileOpen ? 'translate-x-0 w-60' : '-translate-x-full md:translate-x-0'
        )}
      >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-tight">Gestionale</div>
            <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
              <Wifi size={10} className="text-success" /> Online
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto flex flex-col gap-0.5">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen?.(false);
              }}
              title={collapsed ? item.label : undefined}
              className={clsx(
                isActive ? 'sidebar-link-active' : 'sidebar-link',
                collapsed && 'justify-center px-0 py-3'
              )}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/10">
        {!collapsed && utente && (
          <div className="px-3 py-2 mb-2">
            <div className="text-white text-sm font-semibold">{utente.nome} {utente.cognome}</div>
            <div className="text-slate-400 text-xs capitalize">{utente.ruolo}</div>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Esci' : undefined}
          className={clsx(
            'sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10',
            collapsed && 'justify-center px-0 py-3'
          )}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Esci</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
