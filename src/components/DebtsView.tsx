import React, { useState } from 'react';
import { DebtItem } from '../types';
import { Search, Plus, Trash2, Edit3, ShieldAlert, Calendar, CheckCircle2, AlertTriangle, Layers, Grid, List } from 'lucide-react';

interface DebtsViewProps {
  debts: DebtItem[];
  isDark: boolean;
  onOpenAddDebt: () => void;
  onEditDebt: (debt: DebtItem) => void;
  onDeleteDebt: (id: string) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  isDark,
  onOpenAddDebt,
  onEditDebt,
  onDeleteDebt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = debt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          debt.creditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          debt.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || debt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const confirmAndDelete = (id: string) => {
    onDeleteDebt(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Minhas Dívidas & Passivos
          </h2>
          <p className="text-xs opacity-60">
            Gerenciamento completo de saldos, parcelas pagas e prazos de vencimento
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-purple-600 text-white' : opacityText(isDark)
              }`}
              title="Visualização em Cards"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-purple-600 text-white' : opacityText(isDark)
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenAddDebt}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Dívida</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 opacity-40" />
          <input
            type="text"
            placeholder="Buscar por descrição, credor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border outline-none transition-all ${
              isDark
                ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
            }`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'atrasado', label: 'Atrasadas' },
            { id: 'proximo_vencimento', label: 'Próximas' },
            { id: 'em_dia', label: 'Em Dia' },
            { id: 'quitado', label: 'Quitadas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : isDark
                    ? 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredDebts.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <ShieldAlert className="w-12 h-12 mx-auto text-purple-400 mb-3 opacity-60" />
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Nenhuma dívida cadastrada
          </h3>
          <p className="text-xs opacity-60 mt-1 mb-4">Adicione suas dívidas para começar o monitoramento com IA.</p>
          <button
            onClick={onOpenAddDebt}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md"
          >
            Cadastrar Primeira Dívida
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Modern Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDebts.map(debt => {
            const remainingInst = Math.max(0, debt.installmentsTotal - debt.installmentsPaid);
            const progressPercent = Math.min(100, Math.round((debt.installmentsPaid / debt.installmentsTotal) * 100));

            return (
              <div
                key={debt.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1 ${
                  isDark
                    ? 'bg-neutral-900/90 border-neutral-800 hover:border-purple-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                    : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className={`px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-md ${
                        isDark ? 'bg-neutral-800 text-purple-300' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {debt.category}
                      </span>
                      <h3 className={`text-base font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {debt.title}
                      </h3>
                      <p className="text-xs opacity-60">{debt.creditor}</p>
                    </div>

                    <span className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded-full border ${
                      debt.status === 'atrasado'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : debt.status === 'proximo_vencimento'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : debt.status === 'quitado'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {debt.status === 'atrasado' ? 'Atrasado' : debt.status === 'proximo_vencimento' ? 'Próximo' : debt.status === 'quitado' ? 'Quitada' : 'Em Dia'}
                    </span>
                  </div>

                  {/* Financial Values Box */}
                  <div className={`p-3.5 rounded-xl my-4 ${
                    isDark ? 'bg-neutral-950/60 border border-neutral-800' : 'bg-slate-50 border border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] opacity-60">Saldo Devedor</span>
                      <span className="text-[11px] opacity-60">Parcela</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold font-mono tabular-nums text-purple-400">
                        {formatCurrency(debt.remainingAmount)}
                      </span>
                      <span className="text-sm font-semibold font-mono tabular-nums">
                        {formatCurrency(debt.monthlyPayment)}
                      </span>
                    </div>
                  </div>

                  {/* Installments info & Progress */}
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between opacity-80">
                      <span>Parcelas Pagas: <strong className="font-mono">{debt.installmentsPaid}</strong> / {debt.installmentsTotal}</span>
                      <span>Restantes: <strong className="font-mono text-purple-400">{remainingInst}</strong></span>
                    </div>
                    <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>

                  {/* Next Due Date */}
                  <div className="flex items-center gap-2 text-xs opacity-70 mb-4">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Próximo vencimento: <strong className="font-mono">{debt.dueDate}</strong></span>
                  </div>
                </div>

                {/* Card Actions: Edit & Delete */}
                <div className={`pt-4 border-t flex items-center justify-end gap-2 ${
                  isDark ? 'border-neutral-800' : 'border-slate-100'
                }`}>
                  <button
                    onClick={() => onEditDebt(debt)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(debt.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      isDark ? 'border-neutral-800 text-rose-400 hover:bg-rose-500/10' : 'border-slate-200 text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                  isDark ? 'border-neutral-800 text-neutral-400 bg-neutral-950/50' : 'border-slate-200 text-slate-500 bg-slate-50'
                }`}>
                  <th className="py-4 px-6">Dívida / Credor</th>
                  <th className="py-4 px-4">Categoria</th>
                  <th className="py-4 px-4">Saldo Devedor</th>
                  <th className="py-4 px-4">Parcelas (Pagas/Tot)</th>
                  <th className="py-4 px-4">Valor Parcela</th>
                  <th className="py-4 px-4">Próx. Vencimento</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit text-xs">
                {filteredDebts.map(debt => (
                  <tr key={debt.id} className={`transition-colors ${
                    isDark ? 'hover:bg-neutral-950/30 border-neutral-800' : 'hover:bg-slate-50/80 border-slate-200'
                  }`}>
                    <td className="py-4 px-6">
                      <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{debt.title}</div>
                      <div className="text-[11px] opacity-60">{debt.creditor}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 text-[10px] font-medium rounded-md ${
                        isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {debt.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold tabular-nums text-purple-400">
                      {formatCurrency(debt.remainingAmount)}
                    </td>
                    <td className="py-4 px-4 font-mono tabular-nums">
                      {debt.installmentsPaid} / {debt.installmentsTotal}
                    </td>
                    <td className="py-4 px-4 font-mono tabular-nums opacity-80">
                      {formatCurrency(debt.monthlyPayment)}
                    </td>
                    <td className="py-4 px-4 font-mono tabular-nums opacity-80">
                      {debt.dueDate}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditDebt(debt)}
                          className={`p-2 rounded-lg border transition-colors ${
                            isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Editar Dívida"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(debt.id)}
                          className={`p-2 rounded-lg border transition-colors ${
                            isDark ? 'border-neutral-800 text-rose-400 hover:bg-rose-500/10' : 'border-slate-200 text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Excluir Dívida"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
            isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-xs opacity-80 mb-6 leading-relaxed">
              Tem certeza de que deseja excluir esta dívida? Esta ação removerá o registro do seu painel e não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmAndDelete(deleteConfirmId)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function opacityText(isDark: boolean) {
  return isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900';
}
