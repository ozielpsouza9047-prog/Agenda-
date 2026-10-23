import React from 'react';
import { MetricCards } from './MetricCards';
import { FinancialSummary, DebtItem } from '../types';
import { aiRecommendations } from '../mockData';
import { Sparkles, ArrowRight, AlertTriangle, CheckCircle2, ChevronRight, Plus, ShieldCheck, Zap } from 'lucide-react';

interface DashboardViewProps {
  summary: FinancialSummary;
  debts: DebtItem[];
  isDark: boolean;
  onOpenAddDebt: () => void;
  setActiveTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  debts,
  isDark,
  onOpenAddDebt,
  setActiveTab
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: DebtItem['status']) => {
    switch (status) {
      case 'atrasado':
        return <span className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Atrasado</span>;
      case 'proximo_vencimento':
        return <span className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Vence Hoje/Amanhã</span>;
      case 'em_dia':
        return <span className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Em Dia</span>;
      case 'quitado':
        return <span className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Quitado</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 5 Core Metric Cards */}
      <MetricCards summary={summary} isDark={isDark} />

      {/* AI Recommendation Banner */}
      <div className={`relative overflow-hidden p-6 rounded-2xl border ${
        isDark
          ? 'bg-gradient-to-r from-purple-950/40 via-neutral-900 to-indigo-950/40 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
          : 'bg-gradient-to-r from-purple-50 via-white to-indigo-50 border-purple-200 shadow-sm'
      }`}>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-600 text-white shadow-lg shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  DICA DE QUITAÇÃO IA
                </span>
                <span className="text-xs opacity-60">Atualizado hoje</span>
              </div>
              <h2 className={`text-base md:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {aiRecommendations[0].title}
              </h2>
              <p className="text-xs md:text-sm opacity-80 mt-1 max-w-2xl">
                {aiRecommendations[0].description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('ai_advisor')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all flex items-center gap-2"
            >
              <span>Ver Simulação Completa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Critical Debts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Debts */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border ${
          isDark ? 'bg-neutral-900/85 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Contas Urgentes & Próximas
              </h3>
              <p className="text-xs opacity-60">Prioridade de pagamento recomendada pela IA</p>
            </div>
            <button
              onClick={() => setActiveTab('debts')}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <span>Ver todas ({debts.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {debts.slice(0, 4).map((debt) => (
              <div
                key={debt.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isDark
                    ? 'bg-neutral-950/50 border-neutral-800/80 hover:border-neutral-700'
                    : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    debt.status === 'atrasado'
                      ? 'bg-rose-500/20 text-rose-400'
                      : debt.status === 'proximo_vencimento'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {debt.title}
                    </h4>
                    <p className="text-xs opacity-60">
                      {debt.creditor} · Vencimento: <span className="font-mono">{debt.dueDate}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono tabular-nums text-purple-400">
                      {formatCurrency(debt.remainingAmount)}
                    </p>
                    <p className="text-[10px] opacity-60">Parcela: {formatCurrency(debt.monthlyPayment)}</p>
                  </div>
                  <div>{getStatusBadge(debt.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Quick Actions & Financial Health Score */}
        <div className="space-y-6">
          {/* Health Score Card */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? 'bg-neutral-900/85 border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Saúde Financeira Dívida Zero
            </h3>

            <div className="flex items-center justify-center my-6">
              <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-purple-600/20 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                <div className="absolute inset-0 rounded-full border-8 border-purple-500 border-t-transparent animate-spin-slow" style={{ animationDuration: '15s' }} />
                <div className="text-center">
                  <span className="text-3xl font-extrabold font-mono tabular-nums text-purple-400">68</span>
                  <span className="block text-[10px] uppercase font-mono tracking-wider opacity-60">Índice Bom</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-center opacity-70 mb-4">
              Seu nível de endividamento reduziu 12% nos últimos 30 dias com as ações recomendadas.
            </p>

            <div className="space-y-2">
              <button
                onClick={onOpenAddDebt}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Nova Dívida</span>
              </button>
              <button
                onClick={() => setActiveTab('forecast')}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Simular Quitação Antecipada
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
