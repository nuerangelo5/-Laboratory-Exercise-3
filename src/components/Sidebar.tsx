import React from 'react';
import {
  ArrowLeftRight,
  BookOpenCheck,
  LayoutDashboard,
  LogOut,
  MonitorSpeaker,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ActiveSection } from '../types/database';

interface SidebarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  userEmail: string;
  userName?: string;
  equipmentCount: number;
  overdueCount: number;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  userEmail,
  userName,
  equipmentCount,
  overdueCount,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: Array<{
    id: ActiveSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    metric?: string;
    metricTone?: 'default' | 'danger';
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'equipment',
      label: 'Equipment',
      icon: MonitorSpeaker,
      metric: String(equipmentCount),
      metricTone: 'default',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: ArrowLeftRight,
      metric: overdueCount > 0 ? `${overdueCount} overdue` : undefined,
      metricTone: 'danger',
    },
    {
      id: 'docs',
      label: 'SAD Docs & Testing',
      icon: BookOpenCheck,
    },
  ];

  const handleNavClick = (id: ActiveSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      {/* Brand Wordmark */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            CampusGear
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-5 space-y-1">
        <p className="px-3 pb-2 text-xs font-medium text-slate-500">
          Laboratory Custody
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.metric && (
                <span
                  className={`text-xs font-mono tabular-nums shrink-0 ${
                    item.metricTone === 'danger'
                      ? 'text-red-700 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  {item.metric}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Authenticated Custodian Footer */}
      <div className="p-4 border-t border-slate-200 space-y-3 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {userName || 'Equipment Custodian'}
          </p>
          <p className="text-xs text-slate-500 truncate">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
