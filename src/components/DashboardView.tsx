import React, { useRef, useState } from 'react';
import { MetricCards } from './MetricCards';
import { FinancialSummary, DebtItem, UserProfile } from '../types';
import { uploadProfileAvatar, buildDynamicAiRecommendation } from '../lib/supabase';
import { Sparkles, ArrowRight, ChevronRight, Plus, Zap, Camera, User, Loader2 } from 'lucide-react';

interface DashboardViewProps {
  summary: FinancialSummary;
  debts: DebtItem[];
  isDark: boolean;
  onOpenAddDebt: () => void;
  setActiveTab: (tab: any) => void;
  hideValues?: boolean;
  userProfile?: UserProfile;
  userId?: string;
  onUpdateProfile?: (updated: UserProfile) => Promise<void> | void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  debts,
  isDark,
  onOpenAddDebt,
  setActiveTab,
  hideValues = false,
  userProfile,
  userId,
  onUpdateProfile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const formatCurrency = (val: number) => {
    if (hideValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getInitials = (n: string) => {
    const clean = (n || '').trim();
    if (!clean) return 'DZ';
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const handleQuickAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile || !onUpdateProfile) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) return;
    setIsUploadingPhoto(true);
    try {
      if (userId) {
        const result = await uploadProfileAvatar(file, userId, userProfile.name);
        await onUpdateProfile({
          ...userProfile,
          avatarUrl: result.avatarUrl,
        });
      } else {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = String(ev.target?.result || '');
          await onUpdateProfile({
            ...userProfile,
            avatarUrl: dataUrl,
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Error uploading avatar from home screen:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
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

  const displayName = userProfile?.name || 'Usuário';
  const displayAvatar = userProfile?.avatarUrl || '';
  const dynamicAiRec = buildDynamicAiRecommendation(debts, userProfile);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* User Profile Bar on the Home Screen (Tela Inicial) */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isDark
            ? 'bg-neutral-900/90 border-neutral-800 shadow-[0_8px_30px_rgba(0,0,0,0.35)]'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative group shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQuickAvatarChange}
            />
            <button
              type="button"
              disabled={isUploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="relative block focus:outline-none"
              title="Toque para selecionar uma foto da galeria"
            >
              {isUploadingPhoto ? (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-neutral-900 border-2 border-purple-500 flex items-center justify-center text-purple-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.35)]"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base border-2 border-purple-400/40 shadow-md">
                  {getInitials(displayName)}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center border border-purple-300/40 shadow-sm">
                <Camera className="w-2.5 h-2.5" />
              </span>
            </button>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-wider text-purple-400">
              Painel Pessoal · Dívida Zero AI
            </p>
            <h2 className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Olá, {displayName}
            </h2>
            <p className="text-xs opacity-65 truncate">
              {userProfile?.email || 'Resumo financeiro sincronizado na sua conta'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isUploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{displayAvatar ? 'Trocar Foto' : 'Foto da Galeria'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
              isDark
                ? 'bg-neutral-950 border-neutral-800 text-purple-300 hover:border-purple-500/50 hover:bg-purple-500/10'
                : 'bg-slate-50 border-slate-200 text-purple-700 hover:bg-purple-50'
            }`}
          >
            <User className="w-3.5 h-3.5 text-purple-400" />
            <span>Meu Perfil</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <MetricCards summary={summary} isDark={isDark} hideValues={hideValues} />

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
                  {dynamicAiRec.tag.toUpperCase()}
                </span>
                <span className="text-xs opacity-60">Dados reais da sua conta</span>
              </div>
              <h2 className={`text-base md:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {dynamicAiRec.title}
              </h2>
              <p className="text-xs md:text-sm opacity-80 mt-1 max-w-2xl">
                {dynamicAiRec.description}
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

            {(() => {
              const totalOriginal = debts.reduce((acc, d) => acc + d.totalAmount, 0);
              const totalRemaining = debts.reduce((acc, d) => acc + (d.status !== 'quitado' ? d.remainingAmount : 0), 0);
              const hasOverdue = debts.some(d => d.status === 'atrasado');
              const ratioPaid = totalOriginal > 0 ? (totalOriginal - totalRemaining) / totalOriginal : 1;
              let calculatedScore = debts.length === 0 ? 100 : Math.min(100, Math.max(10, Math.round(ratioPaid * 100)));
              if (hasOverdue) calculatedScore = Math.max(15, calculatedScore - 25);

              const scoreLabel = calculatedScore >= 80 ? 'Excelente' : calculatedScore >= 60 ? 'Índice Bom' : calculatedScore >= 40 ? 'Índice Regular' : 'Atenção';
              const progressPercent = totalOriginal > 0 ? Math.round(ratioPaid * 100) : 100;

              return (
                <>
                  <div className="flex items-center justify-center my-6">
                    <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-purple-600/20 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                      <div className="absolute inset-0 rounded-full border-8 border-purple-500 border-t-transparent animate-spin-slow" style={{ animationDuration: '15s' }} />
                      <div className="text-center">
                        <span className="text-3xl font-extrabold font-mono tabular-nums text-purple-400">{calculatedScore}</span>
                        <span className="block text-[10px] uppercase font-mono tracking-wider opacity-60">{scoreLabel}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-center opacity-70 mb-4">
                    {progressPercent}% do saldo global amortizado.{hasOverdue ? ' Priorize contas em atraso para recuperar pontos.' : ' Seus pagamentos mantêm seu índice elevado.'}
                  </p>
                </>
              );
            })()}

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
