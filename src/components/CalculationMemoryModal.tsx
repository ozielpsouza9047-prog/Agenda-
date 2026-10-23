import React from 'react';
import { X, Calculator, ShieldCheck, ArrowRight } from 'lucide-react';

interface CalculationMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoryItems: { label: string; formula: string; value: string }[];
  totalDebts: number;
  projectedMonth: number;
  overdueAmount: number;
  isDark: boolean;
}

export const CalculationMemoryModal: React.FC<CalculationMemoryModalProps> = ({
  isOpen,
  onClose,
  memoryItems,
  totalDebts,
  projectedMonth,
  overdueAmount,
  isDark
}) => {
  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl relative max-h-[90vh] flex flex-col ${
        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-purple-500/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Memória de Cálculo Automática</h3>
            <p className="text-xs opacity-60">Demonstrativo analítico de saldos, parcelas e projeções</p>
          </div>
        </div>

        {/* Summary Mini Bar */}
        <div className={`grid grid-cols-3 gap-3 p-4 rounded-xl mb-4 text-xs font-mono ${
          isDark ? 'bg-neutral-950/80 border border-neutral-800' : 'bg-slate-50 border border-slate-200'
        }`}>
          <div>
            <span className="block opacity-65 text-[10px] uppercase">Total em Aberto</span>
            <span className="font-bold text-purple-400">{formatCurrency(totalDebts)}</span>
          </div>
          <div>
            <span className="block opacity-65 text-[10px] uppercase">Previsto Mês</span>
            <span className="font-bold text-cyan-400">{formatCurrency(projectedMonth)}</span>
          </div>
          <div>
            <span className="block opacity-65 text-[10px] uppercase">Atrasado</span>
            <span className="font-bold text-rose-400">{formatCurrency(overdueAmount)}</span>
          </div>
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {memoryItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border ${
                isDark ? 'bg-neutral-950/40 border-neutral-800' : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span>{item.label}</span>
                <span className="font-mono text-purple-400">{item.value}</span>
              </div>
              <p className="font-mono text-[11px] opacity-70">{item.formula}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 mt-4 border-t border-inherit flex items-center justify-between text-xs">
          <span className="opacity-60 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Recálculo automático validado sem duplicações
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-white bg-purple-600 hover:bg-purple-500 font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
