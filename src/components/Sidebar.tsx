import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  BarChart3,
  Target,
  Trophy,
  Sparkles,
  Settings,
  ShieldAlert,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
  userProfile?: UserProfile;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  userProfile,
  isCollapsed,
  onToggleCollapse,
  onLogout,
}) => {
  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'debts' as ActiveTab, label: 'Minhas Dívidas', icon: Wallet },
    { id: 'forecast' as ActiveTab, label: 'Calendário & Fluxo', icon: Calendar },
    { id: 'reports' as ActiveTab, label: 'Relatórios', icon: BarChart3 },
    { id: 'planner' as ActiveTab, label: 'Planejador', icon: Target },
    { id: 'goals' as ActiveTab, label: 'Minhas Metas', icon: Trophy },
    { id: 'ai_advisor' as ActiveTab, label: 'IA Dívida Zero', icon: Sparkles, badge: 'IA' },
    { id: 'profile' as ActiveTab, label: 'Meu Perfil', icon: User },
    { id: 'settings' as ActiveTab, label: 'Configurações', icon: Settings },
  ];

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const userName = userProfile?.name || 'Oziel Souza';

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    // On mobile screens, collapse back to icon rail after selecting a destination
    if (typeof window !== 'undefined' && window.innerWidth < 768 && !isCollapsed) {
      onToggleCollapse();
    }
  };

  return (
    <>
      {/* Mobile Backdrop when expanded so tapping outside collapses smoothly */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onToggleCollapse}
          aria-hidden="true"
        />
      )}

      {/* Spacer for mobile layout when sidebar is expanded as overlay */}
      {!isCollapsed && <div className="w-16 shrink-0 md:hidden" aria-hidden="true" />}

      <aside
        className={`flex flex-col border-r transition-all duration-300 shrink-0 select-none ${
          isCollapsed
            ? 'relative z-30 w-16 md:w-20'
            : 'fixed md:relative inset-y-0 left-0 z-50 md:z-30 w-64 shadow-2xl md:shadow-none'
        } ${
          isDark
            ? 'bg-neutral-950 border-neutral-900 text-neutral-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Brand Header + Collapse/Expand Small Arrow Button */}
        <div
          className={`relative flex items-center h-20 border-b border-inherit transition-all ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4 md:px-5'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-bold text-base md:text-lg tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent block truncate">
                  Dívida Zero
                </span>
                <span className="block text-[10px] font-mono tracking-widest text-purple-400 uppercase truncate">
                  AI Assistant
                </span>
              </div>
            )}
          </div>

          {/* Small Arrow Button to Collapse / Expand Sidebar */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${
              isCollapsed
                ? 'absolute -right-3.5 top-6 z-40 shadow-md'
                : ''
            } ${
              isDark
                ? 'bg-neutral-900 border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white'
                : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-600 hover:text-white'
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Common Navigation Links */}
        <div
          className={`flex-1 py-5 space-y-1.5 overflow-y-auto ${
            isCollapsed ? 'px-2' : 'px-3.5'
          }`}
        >
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider opacity-60">
              Menu Principal
            </div>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`w-full flex items-center rounded-xl font-medium text-sm transition-all duration-200 ${
                  isCollapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? isDark
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                      : 'bg-purple-50 text-purple-900 border border-purple-200'
                    : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-purple-400' : 'opacity-75'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="whitespace-nowrap truncate">{item.label}</span>
                  )}
                </div>
                {!isCollapsed && item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Separated Bottom Section: Profile Summary + Logout Button at the Very End */}
        <div
          className={`border-t border-inherit space-y-2 ${
            isCollapsed ? 'p-2 pb-20 md:pb-3' : 'p-3.5 pb-20 md:pb-4'
          }`}
        >
          {/* User Profile Quick Card */}
          <button
            type="button"
            onClick={() => handleSelectTab('profile')}
            className={`w-full rounded-xl flex items-center transition-all ${
              isCollapsed ? 'justify-center p-2' : 'p-2.5 gap-3 text-left'
            } ${
              activeTab === 'profile'
                ? isDark
                  ? 'bg-purple-600/20 border border-purple-500/40'
                  : 'bg-purple-50 border border-purple-200'
                : isDark
                ? 'bg-neutral-900/80 border border-neutral-800 hover:border-purple-500/30'
                : 'bg-slate-50 border border-slate-200 hover:border-purple-200'
            }`}
            title="Ver Meu Perfil"
          >
            {userProfile?.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userName}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border border-purple-400/40 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
                {getInitials(userName)}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{userName}</p>
                <p className="text-[11px] opacity-60 truncate">Meu Perfil</p>
              </div>
            )}
          </button>

          {/* Separated "Sair" Button at the End of the Internal Sidebar Menu */}
          <button
            type="button"
            onClick={onLogout}
            title="Sair da conta"
            aria-label="Sair da conta"
            className={`w-full flex items-center rounded-xl font-semibold text-sm transition-all border ${
              isCollapsed
                ? 'justify-center p-2.5'
                : 'justify-start gap-3 px-3.5 py-2.5'
            } ${
              isDark
                ? 'bg-rose-950/25 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-500'
                : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white'
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

