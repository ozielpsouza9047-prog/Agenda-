import React, { useState } from 'react';
import { DebtItem } from '../types';
import { Target, TrendingDown, Zap, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PayoffPlannerViewProps {
  debts: DebtItem[];
  isDark: boolean;
}

export const PayoffPlannerView: React.FC<PayoffPlannerViewProps> = ({ debts, isDark }) => {
  const [extraMonthly, setExtraMonthly] = useState<number>(300);
  const [selectedStrategy, setSelectedStrategy] = useState<'snowball' | 'avalanche' | 'duedate'>('snowball');

  const activeDebts = debts.filter(d => d.status !== 'quitado');
  const totalRemaining = activeDebts.reduce((acc, d) => acc + d.remainingAmount, 0);
  const totalMonthly = activeDebts.reduce((acc, d) => acc + d.monthlyPayment, 0);
  const totalAvailable = totalMonthly + extraMonthly;

  // Sort debts based on selected strategy
  const sortedDebts = [...activeDebts].sort((a, b) => {
    if (selectedStrategy === 'snowball') {
      return a.remainingAmount - b.remainingAmount; // Lowest debt first
    } else if (selectedStrategy === 'avalanche') {
      return b.interestRate - a.interestRate; // Highest interest first
    } else {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); // Earliest due date first
    }
  });

  const estimatedMonths = totalAvailable > 0 ? Math.ceil(totalRemaining / totalAvailable) : 0;
  const standardMonths = totalMonthly > 0 ? Math.ceil(totalRemaining / totalMonthly) : 0;
  const monthsSaved = Math.max(0, standardMonths - estimatedMonths);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      <div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Planejador de Quitação Estratégica
        </h2>
        <p className="text-xs opacity-60">
          Simule estratégias de quitação acelerada (Bola de Neve, Avalanche e Vencimento) com base nos seus dados reais
        </p>
      </div>

      {/* Extra Monthly Input Card */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Quanto você pode pagar a mais por mês?
            </h3>
            <p className="text-xs opacity-60">Valor além das parcelas mínimas atuais ({formatCurrency(totalMonthly)})</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="50"
              value={extraMonthly}
              onChange={(e) => setExtraMonthly(parseFloat(e.target.value) || 0)}
              className={`w-36 p-2.5 rounded-xl border outline-none font-mono text-sm font-bold text-purple-400 ${
                isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
            <span className="text-xs font-semibold opacity-70">R$ / mês</span>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-inherit text-xs">
          <div>
            <span className="block opacity-60">Orçamento Total Mensal</span>
            <span className="text-base font-bold font-mono text-purple-400">{formatCurrency(totalAvailable)}</span>
          </div>
          <div>
            <span className="block opacity-60">Previsão Estimada de Quitação</span>
            <span className="text-base font-bold font-mono text-cyan-400">{estimatedMonths} meses</span>
          </div>
          <div>
            <span className="block opacity-60">Tempo Economizado</span>
            <span className="text-base font-bold font-mono text-emerald-400">{monthsSaved} meses mais rápido</span>
          </div>
        </div>
      </div>

      {/* Strategy Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: 'snowball', title: '1. Menor Dívida Primeiro (Bola de Neve)', desc: 'Foco em vitórias rápidas eliminando saldos menores.' },
          { id: 'avalanche', title: '2. Maior Juros Primeiro (Avalanche)', desc: 'Foco na economia máxima eliminando juros caros.' },
          { id: 'duedate', title: '3. Prioridade por Vencimento', desc: 'Foco em zerar contas com prazos mais apertados.' },
        ].map(strat => (
          <button
            key={strat.id}
            onClick={() => setSelectedStrategy(strat.id as any)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedStrategy === strat.id
                ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                : isDark ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <h4 className="text-xs font-bold mb-1">{strat.title}</h4>
            <p className="text-[11px] opacity-70 leading-relaxed">{strat.desc}</p>
          </button>
        ))}
      </div>

      {/* Suggested Payment Order */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Ordem Sugerida de Pagamento (Estratégia Ativa)
        </h3>

        <div className="space-y-3 text-xs">
          {sortedDebts.map((debt, idx) => (
            <div
              key={debt.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                isDark ? 'bg-neutral-950/50 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-mono font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{debt.title}</h4>
                  <p className="text-[11px] opacity-60">{debt.creditor} · Juros: {debt.interestRate}% a.m. · Vencimento: {debt.dueDate}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono font-bold text-purple-400">{formatCurrency(debt.remainingAmount)}</span>
                <span className="block text-[10px] opacity-60">Saldo devedor</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Nota: As simulações de quitação são estimativas baseadas nos valores informados. Confirme sempre com sua instituição financeira antes de liquidar contratos.</span>
        </div>
      </div>
    </div>
  );
};
