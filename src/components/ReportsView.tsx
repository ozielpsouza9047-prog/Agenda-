import React, { useState } from 'react';
import { DebtItem } from '../types';
import { BarChart3, Download, TrendingDown, Wallet, CheckCircle2, Calendar, ShieldCheck, Zap } from 'lucide-react';

interface ReportsViewProps {
  debts: DebtItem[];
  isDark: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ debts, isDark }) => {
  const [extraPayment, setExtraPayment] = useState<number>(200);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalOriginal = debts.reduce((acc, d) => acc + d.totalAmount, 0);
  const totalRemaining = debts.filter(d => d.status !== 'quitado').reduce((acc, d) => acc + d.remainingAmount, 0);
  const totalPaid = Math.max(0, totalOriginal - totalRemaining);

  // Group by Creditor
  const byCreditor: { [key: string]: number } = {};
  debts.forEach(d => {
    byCreditor[d.creditor] = (byCreditor[d.creditor] || 0) + d.remainingAmount;
  });

  // Group by Category
  const byCategory: { [key: string]: number } = {};
  debts.forEach(d => {
    byCategory[d.category] = (byCategory[d.category] || 0) + d.remainingAmount;
  });

  // Payoff calculation estimation
  const totalMonthly = debts.filter(d => d.status !== 'quitado').reduce((acc, d) => acc + d.monthlyPayment, 0);
  const standardMonths = totalMonthly > 0 ? Math.ceil(totalRemaining / totalMonthly) : 0;
  const optimizedMonths = (totalMonthly + extraPayment) > 0 ? Math.ceil(totalRemaining / (totalMonthly + extraPayment)) : 0;
  const monthsSaved = Math.max(0, standardMonths - optimizedMonths);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Relatórios Financeiros & Análise de Quitação
          </h2>
          <p className="text-xs opacity-60">
            Demonstrativo consolidado de saldos, despesas por categoria e simulações de quitação
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all print:hidden"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório em PDF</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <span className="text-xs opacity-60 block mb-1">Total das Dívidas (Original)</span>
          <h3 className="text-xl font-bold font-mono tabular-nums text-purple-400">{formatCurrency(totalOriginal)}</h3>
        </div>
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <span className="text-xs opacity-60 block mb-1">Valores Pagos</span>
          <h3 className="text-xl font-bold font-mono tabular-nums text-emerald-400">{formatCurrency(totalPaid)}</h3>
        </div>
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <span className="text-xs opacity-60 block mb-1">Saldo Restante em Aberto</span>
          <h3 className="text-xl font-bold font-mono tabular-nums text-rose-400">{formatCurrency(totalRemaining)}</h3>
        </div>
      </div>

      {/* Grid: Creditor & Category Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despesas por Credor */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Despesas por Credor
          </h3>
          <div className="space-y-3 text-xs">
            {Object.entries(byCreditor).map(([creditor, amount], idx) => {
              const pct = totalRemaining > 0 ? Math.round((amount / totalRemaining) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>{creditor}</span>
                    <span className="font-mono text-purple-400">{formatCurrency(amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Despesas por Categoria
          </h3>
          <div className="space-y-3 text-xs">
            {Object.entries(byCategory).map(([cat, amount], idx) => {
              const pct = totalRemaining > 0 ? Math.round((amount / totalRemaining) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>{cat}</span>
                    <span className="font-mono text-cyan-400">{formatCurrency(amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payoff Forecast Simulator */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Simulador de Quitação Antecipada (Estimativa)
            </h3>
            <p className="text-xs opacity-60">Adicione pagamentos mensais extras para antecipar a quitação total das dívidas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-2">
            <label className="block text-xs font-medium opacity-80">Pagamento Extra Mensal: <strong className="font-mono text-purple-400">{formatCurrency(extraPayment)}</strong></label>
            <input
              type="range"
              min="0"
              max="1500"
              step="50"
              value={extraPayment}
              onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
              className="w-full accent-purple-600 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-purple-600/10 border border-purple-500/20 text-center">
            <span className="block text-xs opacity-60 font-mono">Prazo Padrão</span>
            <span className="text-xl font-bold font-mono">{standardMonths} meses</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="block text-xs opacity-60 font-mono">Prazo com Extra</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{optimizedMonths} meses (Economia de {monthsSaved} meses)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
