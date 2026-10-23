import React from 'react';
import { Sun, Moon, Shield, Bell, User, Lock, Smartphone } from 'lucide-react';

interface SettingsViewProps {
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ isDark, setIsDark }) => {
  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl">
      <div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Configurações da Conta & Preferências
        </h2>
        <p className="text-xs opacity-60">
          Gerencie seu tema visual, preferências de notificação e segurança de dados
        </p>
      </div>

      <div className="space-y-4">
        {/* Theme Appearance Section */}
        <div className={`p-6 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Tema Visual (Dark / Light)
            </h3>
            <p className="text-xs opacity-60 mt-0.5">
              Alternar entre o tema escuro preto com roxo neon e o tema claro limpo.
            </p>
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              isDark
                ? 'bg-neutral-950 border-purple-500/40 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                : 'bg-slate-100 border-slate-300 text-purple-700'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Tema Escuro Neon Ativo' : 'Tema Claro Ativo'}</span>
          </button>
        </div>

        {/* Profile Info Section */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Dados do Perfil
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block opacity-60 mb-1">Nome Completo</label>
              <input
                type="text"
                defaultValue="Oziel Souza"
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block opacity-60 mb-1">E-mail Cadastrado</label>
              <input
                type="email"
                defaultValue="ozielpsouza9047@gmail.com"
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Notifications & Security */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Notificações & Alertas de Vencimento
          </h3>
          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded accent-purple-600 w-4 h-4" />
              <span>Alertar via push 2 dias antes do vencimento</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded accent-purple-600 w-4 h-4" />
              <span>Receber resumo semanal de quitação gerado por IA</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
