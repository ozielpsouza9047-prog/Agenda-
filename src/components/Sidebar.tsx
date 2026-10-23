import React from 'react';
import { LayoutDashboard, Wallet, Calendar, BarChart3, Sparkles, Settings, ShieldAlert } from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isDark }) => {
  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'debts' as ActiveTab, label: 'Minhas Dívidas', icon: Wallet },
    { id: 'forecast' as ActiveTab, label: 'Calendário & Fluxo', icon: Calendar },
    { id: 'reports' as ActiveTab, label: 'Relatórios', icon: BarChart3 },
    { id: 'ai_advisor' as ActiveTab, label: 'IA Dívida Zero', icon: Sparkles, badge: 'IA' },
    { id: 'settings' as ActiveTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className={`hidden md:flex flex-col w-64 border-r transition-colors duration-200 shrink-0 ${
      isDark ? 'bg-neutral-950 border-neutral-900 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-inherit">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
            Dívida Zero
          </span>
          <span className="block text-[10px] font-mono tracking-widest text-purple-400 uppercase">
            AI Assistant
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider opacity-60">
          Menu Principal
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? isDark
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'bg-purple-50 text-purple-900 border border-purple-200'
                  : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'opacity-70'}`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Footer Card */}
      <div className="p-4 border-t border-inherit">
        <div className={`p-3 rounded-xl flex items-center gap-3 ${isDark ? 'bg-neutral-900/80 border border-neutral-800' : 'bg-slate-50 border border-slate-200'}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            OP
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">Oziel Souza</p>
            <p className="text-[11px] opacity-60 truncate">Plano Inteligente</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
