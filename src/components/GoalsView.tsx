import React, { useState, useEffect } from 'react';
import { DebtItem, GoalItem } from '../types';
import { fetchCloudGoals, saveCloudGoal, deleteCloudGoal } from '../lib/supabase';
import { Target, Plus, Trash2, Edit3, Calendar } from 'lucide-react';

interface GoalsViewProps {
  debts: DebtItem[];
  isDark: boolean;
  userId?: string;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ debts, isDark, userId }) => {
  const storageKey = userId ? `divida_zero_goals_${userId}` : 'divida_zero_goals';

  const [goals, setGoals] = useState<GoalItem[]>(() => {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('divida_zero_goals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse goals', e);
      }
    }
    return [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [monthlyReductionGoal, setMonthlyReductionGoal] = useState('1200');
  const [extraPaymentGoal, setExtraPaymentGoal] = useState('300');
  const [targetPayoffDate, setTargetPayoffDate] = useState('2026-12-30');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (userId) {
      fetchCloudGoals(userId).then((cloudGoals) => {
        if (isMounted && cloudGoals && cloudGoals.length > 0) {
          setGoals(cloudGoals);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(goals));
    localStorage.setItem('divida_zero_goals', JSON.stringify(goals));
  }, [goals, storageKey]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: GoalItem = {
      id: editingId || `goal-${Date.now()}`,
      title,
      monthlyReductionGoal: parseFloat(monthlyReductionGoal) || 1000,
      extraPaymentGoal: parseFloat(extraPaymentGoal) || 250,
      targetPayoffDate: targetPayoffDate || '2026-12-31',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (editingId) {
      setGoals(goals.map(g => g.id === editingId ? newItem : g));
    } else {
      setGoals([newItem, ...goals]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setTitle('');

    if (userId) {
      await saveCloudGoal(newItem, userId);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    if (userId) {
      await deleteCloudGoal(id, userId);
    }
  };

  const handleEditGoal = (goal: GoalItem) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setMonthlyReductionGoal(goal.monthlyReductionGoal.toString());
    setExtraPaymentGoal(goal.extraPaymentGoal.toString());
    setTargetPayoffDate(goal.targetPayoffDate);
    setIsModalOpen(true);
  };

  // Calculate actual realized payments from paid installments
  const totalPaidSoFar = debts.reduce((acc, d) => acc + (d.monthlyPayment * d.installmentsPaid), 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Target className="w-6 h-6 text-purple-400" />
            <span>Minhas Metas de Quitação</span>
          </h2>
          <p className="text-xs opacity-60">
            Defina metas mensais de redução e acompanhe seu progresso real com base nos pagamentos registrados
          </p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setTitle('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {goals.map(goal => {
          const progressPercent = Math.min(100, Math.round((totalPaidSoFar / (goal.monthlyReductionGoal * 3)) * 100));

          return (
            <div
              key={goal.id}
              className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Meta Ativa
                    </span>
                    <h3 className={`text-base font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {goal.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditGoal(goal)}
                      className="p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-purple-500/10 transition-colors"
                      title="Editar Meta"
                    >
                      <Edit3 className="w-4 h-4 text-purple-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-rose-500/10 transition-colors"
                      title="Excluir Meta"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-neutral-950/60 border border-neutral-800' : 'bg-slate-50 border border-slate-200'}`}>
                    <span className="block opacity-60 text-[10px] uppercase">Redução Mensal Meta</span>
                    <span className="font-bold font-mono text-purple-400">{formatCurrency(goal.monthlyReductionGoal)}</span>
                  </div>
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-neutral-950/60 border border-neutral-800' : 'bg-slate-50 border border-slate-200'}`}>
                    <span className="block opacity-60 text-[10px] uppercase">Pagamento Extra Alvo</span>
                    <span className="font-bold font-mono text-cyan-400">{formatCurrency(goal.extraPaymentGoal)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs mb-4">
                  <div className="flex items-center justify-between opacity-80">
                    <span>Progresso Realizado: <strong className="font-mono text-emerald-400">{formatCurrency(totalPaidSoFar)}</strong></span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-emerald-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs opacity-70">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Data desejada para quitação: <strong className="font-mono">{goal.targetPayoffDate}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
            isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-base font-bold mb-4">{editingId ? 'Editar Meta' : 'Definir Nova Meta'}</h3>

            <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium opacity-80 mb-1">Título da Meta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Quitação total até o final do ano"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium opacity-80 mb-1">Redução Mensal (R$)</label>
                  <input
                    type="number"
                    step="50"
                    value={monthlyReductionGoal}
                    onChange={(e) => setMonthlyReductionGoal(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-medium opacity-80 mb-1">Pagamento Extra (R$)</label>
                  <input
                    type="number"
                    step="50"
                    value={extraPaymentGoal}
                    onChange={(e) => setExtraPaymentGoal(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium opacity-80 mb-1">Data Desejada de Quitação</label>
                <input
                  type="date"
                  value={targetPayoffDate}
                  onChange={(e) => setTargetPayoffDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border ${
                    isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-purple-600 hover:bg-purple-500 font-semibold shadow-md"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
