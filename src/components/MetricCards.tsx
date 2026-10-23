import React from 'react';
import { Wallet, Calendar, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { FinancialSummary } from '../types';

interface MetricCardsProps {
  summary: FinancialSummary;
  isDark: boolean;
  hideValues?: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary, isDark, hideValues = false }) => {
  const formatCurrency = (val: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getDaysDiffBadge = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'Sem data';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d atrasado`;
    if (diffDays === 0) return 'Vence hoje';
    if (diffDays === 1) return 'Amanhã';
    return `Em ${diffDays} dias`;
  };

  const cards = [
    {
      title: 'Total das Dívidas',
      value: formatCurrency(summary.totalDebts),
      subtitle: 'Saldo devedor consolidado',
      icon: Wallet,
      color: 'from-purple-600 to-indigo-600',
      textColor: 'text-purple-400',
      badge: summary.totalDebts === 0 ? 'Dívida Zero' : 'Em amortização',
      badgeColor: summary.totalDebts === 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    },
    {
      title: 'Valor Previsto para o Mês',
      value: formatCurrency(summary.projectedMonthAmount),
      subtitle: 'Parcelas ativas no período',
      icon: TrendingUp,
      color: 'from-blue-600 to-cyan-600',
      textColor: 'text-cyan-400',
      badge: `${summary.upcomingInstallmentsCount} ${summary.upcomingInstallmentsCount === 1 ? 'parcela' : 'parcelas'}`,
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    },
    {
      title: 'Próximo Vencimento',
      value: formatCurrency(summary.nextDueAmount),
      subtitle: `${summary.nextDueTitle} (${summary.nextDueDate})`,
      icon: Calendar,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-400',
      badge: getDaysDiffBadge(summary.nextDueDate),
      badgeColor: summary.nextDueDate !== 'N/A' && new Date(summary.nextDueDate) < new Date() ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      title: 'Contas Atrasadas',
      value: formatCurrency(summary.overdueAmount),
      subtitle: `${summary.overdueCount} contas pendentes`,
      icon: AlertTriangle,
      color: 'from-rose-600 to-red-700',
      textColor: 'text-rose-400',
      badge: summary.overdueCount > 0 ? 'Ação prioritária' : 'Em dia',
      badgeColor: summary.overdueCount > 0 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Próximas Parcelas',
      value: hideValues ? '•••' : `${summary.upcomingInstallmentsCount} ativas`,
      subtitle: 'Fluxo programado próximo trimestre',
      icon: Clock,
      color: 'from-purple-500 to-pink-600',
      textColor: 'text-pink-400',
      badge: 'Previsível',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative p-5 rounded-2xl border transition-all duration-300 group hover:-translate-y-1 ${
              isDark
                ? 'bg-neutral-900/90 border-neutral-800/80 hover:border-purple-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]'
                : 'bg-white border-slate-200/80 hover:border-purple-300 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`px-2.5 py-0.5 text-[10px] font-mono font-medium rounded-full border ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            <p className="text-xs font-medium opacity-60 mb-1">{card.title}</p>
            <h3 className={`text-xl font-bold font-mono tabular-nums tracking-tight mb-1 ${card.textColor}`}>
              {card.value}
            </h3>
            <p className="text-[11px] opacity-70 truncate">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
};
