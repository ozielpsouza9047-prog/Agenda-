import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Wallet } from 'lucide-react';
import { DebtItem } from '../types';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDebt: (debt: DebtItem) => void;
  editingDebt?: DebtItem | null;
  isDark: boolean;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  onSaveDebt,
  editingDebt,
  isDark
}) => {
  const [title, setTitle] = useState('');
  const [creditor, setCreditor] = useState('');
  const [category, setCategory] = useState<DebtItem['category']>('Cartão de Crédito');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentsTotal, setInstallmentsTotal] = useState('1');
  const [installmentsPaid, setInstallmentsPaid] = useState('0');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('3.5');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingDebt) {
      setTitle(editingDebt.title);
      setCreditor(editingDebt.creditor);
      setCategory(editingDebt.category);
      setTotalAmount(editingDebt.totalAmount.toString());
      setInstallmentsTotal(editingDebt.installmentsTotal.toString());
      setInstallmentsPaid(editingDebt.installmentsPaid.toString());
      setMonthlyPayment(editingDebt.monthlyPayment.toString());
      setDueDate(editingDebt.dueDate);
      setInterestRate(editingDebt.interestRate.toString());
    } else {
      setTitle('');
      setCreditor('');
      setCategory('Cartão de Crédito');
      setTotalAmount('');
      setInstallmentsTotal('1');
      setInstallmentsPaid('0');
      setMonthlyPayment('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setInterestRate('3.5');
    }
    setErrorMsg('');
  }, [editingDebt, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Informe a descrição da dívida.');
      return;
    }
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) {
      setErrorMsg('Informe um valor total válido.');
      return;
    }

    const totalInst = parseInt(installmentsTotal) || 1;
    const paidInst = parseInt(installmentsPaid) || 0;
    const monthly = parseFloat(monthlyPayment) || (total / totalInst);
    const remaining = Math.max(0, total - (monthly * paidInst));

    const debtItem: DebtItem = {
      id: editingDebt ? editingDebt.id : `debt-${Date.now()}`,
      title,
      creditor: creditor.trim() || 'Credor Padrão',
      category,
      totalAmount: total,
      remainingAmount: remaining,
      monthlyPayment: monthly,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      status: paidInst >= totalInst ? 'quitado' : 'proximo_vencimento',
      installmentsTotal: totalInst,
      installmentsPaid: paidInst,
      interestRate: parseFloat(interestRate) || 0
    };

    onSaveDebt(debtItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl relative ${
        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-purple-500/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">
              {editingDebt ? 'Editar Dívida' : 'Cadastrar Nova Dívida'}
            </h3>
            <p className="text-xs opacity-60">Preencha os detalhes do passivo financeiro</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium opacity-80 mb-1">Descrição / Título da Dívida *</label>
            <input
              type="text"
              required
              placeholder="Ex: Cartão Nubank / Empréstimo Pessoal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full p-2.5 rounded-xl border outline-none ${
                isDark ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium opacity-80 mb-1">Credor / Instituição</label>
              <input
                type="text"
                placeholder="Ex: Banco Itaú, Loja X"
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block font-medium opacity-80 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Empréstimo">Empréstimo</option>
                <option value="Financiamento">Financiamento</option>
                <option value="Conta Básica">Conta Básica</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium opacity-80 mb-1">Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="2500.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block font-medium opacity-80 mb-1">Qtd. Parcelas</label>
              <input
                type="number"
                min="1"
                value={installmentsTotal}
                onChange={(e) => setInstallmentsTotal(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block font-medium opacity-80 mb-1">Parcelas Pagas</label>
              <input
                type="number"
                min="0"
                value={installmentsPaid}
                onChange={(e) => setInstallmentsPaid(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium opacity-80 mb-1">Valor da Parcela (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Automático ou livre"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block font-medium opacity-80 mb-1">Vencimento Inicial</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block font-medium opacity-80 mb-1">Juros (% a.m.)</label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl border transition-colors ${
                isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all font-semibold"
            >
              {editingDebt ? 'Salvar Alterações' : 'Cadastrar Dívida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
