import React from 'react';
import { LayoutDashboard, Wallet, Calendar, Sparkles, Settings } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, isDark }) => {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Início', icon: LayoutDashboard },
    { id: 'debts' as ActiveTab, label: 'Dívidas', icon: Wallet },
    { id: 'forecast' as ActiveTab, label: 'Calendário', icon: Calendar },
    { id: 'ai_advisor' as ActiveTab, label: 'IA Assist', icon: Sparkles },
    { id: 'settings' as ActiveTab, label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav aria-label="Navegação inferior mobile" className={`md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t flex items-center justify-around px-2 backdrop-blur-md transition-colors duration-200 ${
      isDark ? 'bg-neutral-950/90 border-neutral-900 text-neutral-400' : 'bg-white/90 border-slate-200 text-slate-600'
    }`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
              isActive
                ? 'text-purple-400 font-semibold'
                : isDark ? 'hover:text-white' : 'hover:text-slate-900'
            }`}
          >
            <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-purple-400 animate-bounce' : 'opacity-70'}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
