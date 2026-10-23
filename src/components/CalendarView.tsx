import React, { useState } from 'react';
import { DebtItem } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Clock, Filter, Check, ShieldCheck, ArrowRight } from 'lucide-react';

interface CalendarViewProps {
  debts: DebtItem[];
  isDark: boolean;
  onUpdateDebt: (updatedDebt: DebtItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ debts, isDark, onUpdateDebt }) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredDebts = debts.filter(debt => {
    if (statusFilter === 'todos') return true;
    return debt.status === statusFilter;
  });

  const handleOpenPaymentModal = (debt: DebtItem) => {
    setSelectedDebt(debt);
    setPaymentAmount(debt.monthlyPayment.toString());
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedDebt) return;

    const paidIncrement = 1;
    const newPaid = Math.min(selectedDebt.installmentsTotal, selectedDebt.installmentsPaid + paidIncrement);
    const paidVal = parseFloat(paymentAmount) || selectedDebt.monthlyPayment;
    const newRemaining = Math.max(0, selectedDebt.remainingAmount - paidVal);

    const updated: DebtItem = {
      ...selectedDebt,
      installmentsPaid: newPaid,
      remainingAmount: newRemaining,
      status: newPaid >= selectedDebt.installmentsTotal ? 'quitado' : 'em_dia'
    };

    onUpdateDebt(updated);
    setPaymentModalOpen(false);
    setSelectedDebt(null);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Calendário Financeiro & Vencimentos
          </h2>
          <p className="text-xs opacity-60">
            Acompanhe pagamentos diários, semanais e mensais com marcação de quitação
          </p>
        </div>

        {/* View Mode & Period Toggles */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            {(['month', 'week', 'day'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                  viewMode === mode ? 'bg-purple-600 text-white shadow-md' : isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'month' ? 'Mês' : mode === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Filter className="w-4 h-4 text-purple-400" />
          <span>Filtrar Compromissos:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'atrasado', label: 'Vencidos / Atrasados' },
            { id: 'proximo_vencimento', label: 'Próximos' },
            { id: 'em_dia', label: 'Em Dia' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : isDark ? 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid & Commitment Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Commitments List grouped by date */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border space-y-4 ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b border-inherit">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Compromissos do Período ({filteredDebts.length})
            </h3>
            <span className="text-xs font-mono opacity-60">Outubro / 2026</span>
          </div>

          <div className="space-y-3">
            {filteredDebts.map(debt => {
              const isOverdue = debt.status === 'atrasado';
              const isPaid = debt.status === 'quitado';

              return (
                <div
                  key={debt.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isDark
                      ? 'bg-neutral-950/60 border-neutral-800 hover:border-purple-500/40'
                      : 'bg-slate-50 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isPaid
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isOverdue
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {isPaid ? <CheckCircle2 className="w-5 h-5" /> : isOverdue ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{debt.title}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${
                          isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          isOverdue ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isPaid ? 'Quitado' : isOverdue ? 'Atrasado' : 'A Vencer'}
                        </span>
                      </div>
                      <p className="text-xs opacity-60 mt-0.5">
                        {debt.creditor} · Vencimento: <strong className="font-mono">{debt.dueDate}</strong> · Parcela {debt.installmentsPaid + 1}/{debt.installmentsTotal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono tabular-nums text-purple-400">
                        {formatCurrency(debt.monthlyPayment)}
                      </span>
                      <span className="block text-[10px] opacity-60">Previsto</span>
                    </div>

                    {!isPaid && (
                      <button
                        onClick={() => handleOpenPaymentModal(debt)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all whitespace-nowrap"
                      >
                        Pagar Parcela
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Mini Calendar Summary */}
        <div className="space-y-4">
          <div className={`p-6 rounded-2xl border ${
            isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Resumo do Calendário
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-600/10 border border-purple-500/20">
                <span className="opacity-80">Total Previsto Outubro</span>
                <span className="font-bold font-mono text-purple-400">
                  {formatCurrency(debts.filter(d => d.status !== 'quitado').reduce((acc, d) => acc + d.monthlyPayment, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="opacity-80">Contas Vencidas</span>
                <span className="font-bold font-mono text-rose-400">
                  {formatCurrency(debts.filter(d => d.status === 'atrasado').reduce((acc, d) => acc + d.monthlyPayment, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="opacity-80">Contas Quitadas</span>
                <span className="font-bold font-mono text-emerald-400">
                  {debts.filter(d => d.status === 'quitado').length} contratos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {paymentModalOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
            isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Registrar Pagamento de Parcela</h3>
                <p className="text-xs opacity-60">{selectedDebt.title}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs mb-6">
              <div>
                <label className="block font-medium opacity-80 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium opacity-80 mb-1">Valor Efetivamente Pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
