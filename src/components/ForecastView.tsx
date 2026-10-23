import React from 'react';
import { FinancialSummary } from '../types';
import { TrendingUp, Calendar, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

interface ForecastViewProps {
  summary: FinancialSummary;
  isDark: boolean;
}

export const ForecastView: React.FC<ForecastViewProps> = ({ summary, isDark }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const months = [
    { month: 'Outubro / 2026', total: 3090.00, status: 'Atual (Com Atrasos)', color: 'bg-purple-600' },
    { month: 'Novembro / 2026', total: 2450.00, status: 'Previsto', color: 'bg-indigo-600' },
    { month: 'Dezembro / 2026', total: 2450.00, status: 'Previsto (13º Salário)', color: 'bg-cyan-600' },
    { month: 'Janeiro / 2027', total: 2100.00, status: 'Previsto', color: 'bg-blue-600' },
    { month: 'Fevereiro / 2027', total: 1850.00, status: 'Previsto', color: 'bg-purple-500' },
    { month: 'Março / 2027', total: 1500.00, status: 'Previsto', color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Previsões de Fluxo & Linha do Tempo
        </h2>
        <p className="text-xs opacity-60">
          Projeção de pagamento dos próximos meses com foco na redução de juros compostos
        </p>
      </div>

      {/* Summary card */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400">Projeção Dívida Zero</span>
            <h3 className={`text-2xl font-bold font-mono tabular-nums mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Quitação Total em 14 Meses
            </h3>
            <p className="text-xs opacity-70 mt-1">
              Seguindo a estratégia sugerida, você economizará até R$ 4.850 em juros acumulados até o encerramento dos contratos.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-purple-600/10 border border-purple-500/20 text-center">
            <span className="block text-xs opacity-60 font-mono">Economia Estimada</span>
            <span className="text-xl font-bold font-mono text-purple-400">R$ 4.850,00</span>
          </div>
        </div>
      </div>

      {/* Monthly timeline grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((item, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl border transition-all duration-300 ${
              isDark
                ? 'bg-neutral-900/90 border-neutral-800 hover:border-purple-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold font-mono opacity-80">{item.month}</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {item.status}
              </span>
            </div>

            <div className="my-3">
              <span className="text-2xl font-extrabold font-mono tabular-nums text-purple-400">
                {formatCurrency(item.total)}
              </span>
              <span className="block text-[11px] opacity-60 mt-0.5">Comprometimento mensal</span>
            </div>

            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-4">
              <div
                className={`h-full ${item.color}`}
                style={{ width: `${Math.max(20, 100 - idx * 12)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
