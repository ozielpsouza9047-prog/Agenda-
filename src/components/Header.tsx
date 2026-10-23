import React from 'react';
import { Sun, Moon, Bell, Search, Menu, ShieldAlert, FileUp } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  onOpenMobileMenu: () => void;
  onOpenAddDebt: () => void;
  onOpenImportBoleto: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  isDark,
  setIsDark,
  onOpenMobileMenu,
  onOpenAddDebt,
  onOpenImportBoleto
}) => {
  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard': return 'Visão Geral & Indicadores';
      case 'debts': return 'Gerenciamento de Dívidas';
      case 'forecast': return 'Previsões & Fluxo de Caixa';
      case 'reports': return 'Relatórios Financeiros & Análises';
      case 'planner': return 'Planejador de Quitação Estratégica';
      case 'goals': return 'Minhas Metas de Quitação';
      case 'ai_advisor': return 'Consultor IA Dívida Zero';
      case 'settings': return 'Configurações da Conta';
    }
  };

  return (
    <header className={`sticky top-0 z-30 flex items-center justify-between h-20 px-6 border-b backdrop-blur-md transition-colors duration-200 ${
      isDark ? 'bg-neutral-950/80 border-neutral-900 text-white' : 'bg-white/80 border-slate-200 text-slate-900'
    }`}>
      {/* Left: Mobile Menu + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg border border-inherit hover:bg-purple-500/10 transition-colors"
          aria-label="Abrir Menu"
        >
          <Menu className="w-5 h-5 text-purple-400" />
        </button>

        <div className="flex items-center gap-3">
          <div className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight truncate">
              {getTabTitle(activeTab)}
            </h1>
            <p className="hidden md:block text-xs opacity-60">
              Controle inteligente e quitação acelerada de passivos
            </p>
          </div>
        </div>
      </div>

      {/* Right Actions: Search, Theme Toggle, Import PDF, Primary Button */}
      <div className="flex items-center gap-3">
        {/* Search input (desktop) */}
        <div className="hidden lg:flex items-center relative">
          <Search className="absolute left-3 w-4 h-4 opacity-40" />
          <input
            type="text"
            placeholder="Buscar dívida, credor..."
            className={`w-52 pl-9 pr-4 py-2 text-xs rounded-xl border outline-none transition-all ${
              isDark
                ? 'bg-neutral-900 border-neutral-800 text-white focus:border-purple-500/50'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
            }`}
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className={`p-2.5 rounded-xl border transition-all duration-200 ${
            isDark
              ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
              : 'bg-slate-50 border-slate-200 text-purple-700 hover:bg-slate-100 shadow-sm'
          }`}
          title={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Import PDF Boleto Button */}
        <button
          onClick={onOpenImportBoleto}
          className={`hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            isDark
              ? 'bg-neutral-900 border-neutral-800 text-purple-300 hover:bg-neutral-800 hover:border-purple-500/40'
              : 'bg-slate-50 border-slate-200 text-purple-800 hover:bg-slate-100'
          }`}
          title="Importar Boleto PDF"
        >
          <FileUp className="w-4 h-4 text-purple-400" />
          <span>Importar PDF</span>
        </button>

        {/* Primary CTA */}
        <button
          onClick={onOpenAddDebt}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all transform active:scale-95 whitespace-nowrap"
        >
          <span>+ Nova Dívida</span>
        </button>
      </div>
    </header>
  );
};
