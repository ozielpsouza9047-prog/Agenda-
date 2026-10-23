import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Sun,
  Moon,
  Shield,
  Bell,
  Lock,
  Download,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Coins,
  Calendar,
  Sparkles,
  Info,
  X,
  Cloud,
  Database
} from 'lucide-react';
import { UserProfile, DebtItem } from '../types';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  debts: DebtItem[];
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenAuthModal?: () => void;
  isCloudConnected?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  debts,
  isDark,
  setIsDark,
  onLogout,
  onDeleteAccount,
  onOpenAuthModal,
  isCloudConnected = false,
}) => {
  // Local form state initialized from profile
  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>(profile.currency || 'BRL');
  const [hideValues, setHideValues] = useState(profile.hideValuesOnDashboard);
  const [allowAi, setAllowAi] = useState(profile.allowAiDataAnalysis);
  const [biometricLock, setBiometricLock] = useState(profile.biometricLock);

  // Notifications preferences
  const [notifPreferences, setNotifPreferences] = useState(profile.notificationPreferences);

  // UI feedback & modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Avatar upload handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarUrl(result);
      const updated: UserProfile = {
        ...profile,
        avatarUrl: result,
      };
      onUpdateProfile(updated);
      showToast('Foto de perfil atualizada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    const updated: UserProfile = {
      ...profile,
      avatarUrl: '',
    };
    onUpdateProfile(updated);
    showToast('Foto de perfil removida.');
  };

  // Save changes handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('O nome não pode estar em branco.');
      return;
    }

    const updated: UserProfile = {
      ...profile,
      name: name.trim(),
      avatarUrl,
      currency,
      hideValuesOnDashboard: hideValues,
      allowAiDataAnalysis: allowAi,
      biometricLock,
      notificationPreferences: notifPreferences,
    };

    onUpdateProfile(updated);
    showToast('Perfil e preferências salvos com sucesso!');
  };

  // Export personal data handler
  const handleExportPersonalData = () => {
    const personalDataPayload = {
      tipoDocumento: 'Relatório e Backup de Dados Pessoais (LGPD)',
      sistema: 'Dívida Zero AI',
      geradoEm: new Date().toISOString(),
      perfilUsuario: {
        nome: profile.name,
        email: profile.email,
        dataCriacaoConta: profile.createdAt,
        moedaPadrao: profile.currency,
        preferencias: {
          ocultarValoresNaTelaInicial: profile.hideValuesOnDashboard,
          permitirAnaliseIA: profile.allowAiDataAnalysis,
          bloqueioBiometrico: profile.biometricLock,
          notificacoes: profile.notificationPreferences,
        },
      },
      resumoFinanceiro: {
        totalDividasCadastradas: debts.length,
        saldoDevedorTotal: debts
          .filter((d) => d.status !== 'quitado')
          .reduce((acc, d) => acc + d.remainingAmount, 0),
        dividas: debts.map((d) => ({
          id: d.id,
          descricao: d.title,
          creditor: d.creditor,
          categoria: d.category,
          valorTotal: d.totalAmount,
          saldoRestante: d.remainingAmount,
          valorParcela: d.monthlyPayment,
          vencimento: d.dueDate,
          status: d.status,
          parcelasTotais: d.installmentsTotal,
          parcelasPagas: d.installmentsPaid,
        })),
      },
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(personalDataPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `divida_zero_dados_pessoais_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Arquivo de dados pessoais exportado com sucesso!');
  };

  // User initials for fallback avatar
  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 p-4 rounded-xl shadow-xl bg-purple-600 text-white text-xs font-semibold flex items-center gap-2 border border-purple-400/30 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header section */}
      <div>
        <h2
          className={`text-xl md:text-2xl font-bold flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          <User className="w-6 h-6 text-purple-400" />
          <span>Meu Perfil</span>
        </h2>
        <p className="text-xs md:text-sm opacity-60 mt-0.5">
          Gerencie seus dados pessoais, moedas, preferências de notificação e privacidade
        </p>
      </div>

      {/* Profile Overview Card with Avatar */}
      <div
        className={`p-6 rounded-2xl border ${
          isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Upload Badge */}
          <div className="relative group shrink-0">
            <div
              className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-bold text-2xl border-2 transition-all ${
                avatarUrl
                  ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-600 text-white border-purple-400/40 shadow-md'
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitials(name || 'Oziel Souza')}</span>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />

            {/* Camera change trigger button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-md transition-transform active:scale-90"
              title="Alterar Foto de Perfil"
              aria-label="Alterar Foto de Perfil"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Profile details */}
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className={`text-lg md:text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {name || 'Usuário'}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Conta Verificada
              </span>
            </div>

            <p className="text-xs font-mono opacity-60">{profile.email}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs opacity-70">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Membro desde {profile.createdAt || 'Outubro de 2026'}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Função: Usuário Individual (Padrão)</span>
              </div>
            </div>

            {avatarUrl && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-[11px] text-rose-400 hover:text-rose-300 underline"
                >
                  Remover foto personalizada
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Dados Pessoais & Moeda */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-inherit">
            <User className="w-4 h-4 text-purple-400" />
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Dados da Conta e Moeda
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium opacity-80 mb-1.5">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border outline-none text-xs transition-colors ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
                }`}
                placeholder="Ex: Oziel Souza"
              />
            </div>

            <div>
              <label className="block font-medium opacity-80 mb-1.5">
                E-mail (Identificador do Usuário)
              </label>
              <input
                type="email"
                disabled
                value={profile.email}
                className={`w-full p-2.5 rounded-xl border outline-none text-xs opacity-60 cursor-not-allowed ${
                  isDark ? 'bg-neutral-950/50 border-neutral-800 text-neutral-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              />
              <span className="block text-[10px] opacity-50 mt-1">
                O e-mail é o identificador único da conta e garante isolamento dos dados.
              </span>
            </div>
          </div>

          {/* Cloud Persistence & Supabase Auth Info */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isCloudConnected
              ? isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : isDark ? 'bg-neutral-950/40 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isCloudConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                <Cloud className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold block">
                  {isCloudConnected ? 'Nuvem Supabase Ativa (RLS Habilitado)' : 'Armazenamento Local no Navegador'}
                </span>
                <span className="text-[11px] opacity-75">
                  {isCloudConnected
                    ? 'Suas dívidas e parcelas estão seguras e isoladas exclusivamente na sua conta.'
                    : 'Conecte sua conta Supabase para sincronização em múltiplos aparelhos.'}
                </span>
              </div>
            </div>

            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm flex items-center gap-1.5 transition-all shrink-0"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isCloudConnected ? 'Gerenciar Conexão' : 'Conectar Supabase'}</span>
              </button>
            )}
          </div>

          {/* Moeda Padrão */}
          <div className="pt-2">
            <label className="block font-medium text-xs opacity-80 mb-1.5">
              Moeda Preferencial do Painel
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'BRL', label: 'BRL — Real Brasileiro (R$)', symbol: 'R$' },
                { id: 'USD', label: 'USD — Dólar Americano ($)', symbol: '$' },
                { id: 'EUR', label: 'EUR — Euro (€)', symbol: '€' },
              ].map((cur) => (
                <button
                  key={cur.id}
                  type="button"
                  onClick={() => setCurrency(cur.id as any)}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                    currency === cur.id
                      ? 'bg-purple-600/20 text-purple-300 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                      : isDark
                      ? 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="font-mono text-sm">{cur.symbol}</span>
                  <span className="text-[11px] text-center truncate">{cur.label.split('—')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nível de permissão informativo */}
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
              isDark ? 'bg-neutral-950/50 border border-neutral-800 text-neutral-300' : 'bg-slate-50 border border-slate-200 text-slate-600'
            }`}
          >
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Permissões Administrativas:</strong> Seu perfil possui privilégios de Usuário Final. Por diretriz de segurança, regras administrativas e permissões de banco não são alteradas pelo painel do usuário.
            </div>
          </div>
        </div>

        {/* Section 2: Aparência e Tema */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-inherit">
            {isDark ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Tema e Aparência
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isDark ? 'Tema Escuro (Preto & Roxo Neon)' : 'Tema Claro (Modo Diurno)'}
              </p>
              <p className="text-xs opacity-60 mt-0.5">
                Escolha a paleta visual mais confortável para o seu uso no celular e no computador.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all shrink-0 ${
                isDark
                  ? 'bg-neutral-950 border-purple-500/40 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:bg-neutral-800'
                  : 'bg-slate-100 border-slate-300 text-purple-800 hover:bg-slate-200 shadow-sm'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-700" />}
              <span>{isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}</span>
            </button>
          </div>
        </div>

        {/* Section 3: Privacidade e Segurança */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-inherit">
            <Lock className="w-4 h-4 text-purple-400" />
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Privacidade e Segurança
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Ocultar valores */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-inherit">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <span className="font-semibold block">Modo Discreto (Ocultar Saldos)</span>
                  <span className="text-[11px] opacity-60">
                    Oculta valores financeiros na tela inicial para maior discrição em locais públicos.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hideValues}
                onChange={(e) => setHideValues(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
              />
            </div>

            {/* Análise de IA */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-inherit">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold block">Análise Inteligente por IA</span>
                  <span className="text-[11px] opacity-60">
                    Permite que a IA financeira elabore recomendações e estratégias de amortização personalizadas.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowAi}
                onChange={(e) => setAllowAi(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
              />
            </div>

            {/* Bloqueio Biométrico */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-inherit">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold block">Solicitar Autenticação ao Abrir o App</span>
                  <span className="text-[11px] opacity-60">
                    Exige validação biométrica ou PIN de segurança do dispositivo para desbloqueio rápido.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={biometricLock}
                onChange={(e) => setBiometricLock(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Preferências de Notificações */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-inherit">
            <Bell className="w-4 h-4 text-purple-400" />
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Preferências de Notificações
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-inherit cursor-pointer">
              <div>
                <span className="font-semibold block">Notificações Gerais Ativas</span>
                <span className="text-[11px] opacity-60">Habilita lembretes locais e push no dispositivo.</span>
              </div>
              <input
                type="checkbox"
                checked={notifPreferences.enabled}
                onChange={(e) =>
                  setNotifPreferences({ ...notifPreferences, enabled: e.target.checked })
                }
                className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
              />
            </label>

            {notifPreferences.enabled && (
              <div className="pl-4 space-y-2.5 pt-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPreferences.notify7Days}
                    onChange={(e) =>
                      setNotifPreferences({ ...notifPreferences, notify7Days: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>Alertar 7 dias antes do vencimento</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPreferences.notify3Days}
                    onChange={(e) =>
                      setNotifPreferences({ ...notifPreferences, notify3Days: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>Alertar 3 dias antes do vencimento</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPreferences.notify1Day}
                    onChange={(e) =>
                      setNotifPreferences({ ...notifPreferences, notify1Day: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>Alertar 1 dia antes do vencimento</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPreferences.notifyDueDay}
                    onChange={(e) =>
                      setNotifPreferences({ ...notifPreferences, notifyDueDay: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>Avisar no dia do vencimento</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPreferences.notifyOverdue}
                    onChange={(e) =>
                      setNotifPreferences({ ...notifPreferences, notifyOverdue: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>Alerta imediato para parcelas atrasadas</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPreferences.emailSummary}
                    onChange={(e) =>
                      setNotifPreferences({ ...notifPreferences, emailSummary: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>Resumo semanal de quitação por e-mail</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all active:scale-95"
          >
            Salvar Todas as Preferências
          </button>
        </div>
      </form>

      {/* Section 5: Exportação de Dados Pessoais & Sessão */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 pb-2 border-b border-inherit">
          <Download className="w-4 h-4 text-purple-400" />
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Exportação de Dados e Sessão
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold">Portabilidade de Dados Pessoais (LGPD)</p>
            <p className="text-xs opacity-60 mt-0.5">
              Baixe um arquivo estruturado com todo o histórico do seu perfil e contratos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportPersonalData}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              isDark
                ? 'border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20'
                : 'border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar Meus Dados Pessoais</span>
          </button>
        </div>

        <div className="pt-3 border-t border-inherit flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold">Encerrar Sessão</p>
            <p className="text-xs opacity-60 mt-0.5">
              Desconecta a conta com segurança neste dispositivo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              isDark
                ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>

      {/* Section 6: Zona de Perigo / Exclusão Definitiva */}
      <div
        className={`p-6 rounded-2xl border border-rose-500/30 ${
          isDark ? 'bg-rose-950/10' : 'bg-rose-50/60'
        }`}
      >
        <div className="flex items-center gap-2 mb-2 text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-bold">Zona de Perigo — Exclusão Definitiva</h3>
        </div>

        <p className="text-xs opacity-70 mb-4 leading-relaxed">
          A exclusão definitiva da conta apagará permanentemente todos os seus dados cadastrados, histórico de amortização, metas e configurações no dispositivo. Esta ação não poderá ser desfeita.
        </p>

        <button
          type="button"
          onClick={() => {
            setDeleteConfirmationText('');
            setShowDeleteModal(true);
          }}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-all flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Excluir Conta Definitivamente</span>
        </button>
      </div>

      {/* Modal: Logout Confirmation */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <LogOut className="w-5 h-5 text-purple-400" />
                <span>Confirmar Saída</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs opacity-80 mb-6 leading-relaxed">
              Deseja realmente sair da conta do Dívida Zero AI? Suas configurações e dados salvos continuarão preservados para o seu próximo acesso.
            </p>

            <div className="flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className={`px-4 py-2.5 rounded-xl border ${
                  isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all"
              >
                Sim, Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Secure Account Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isDark ? 'bg-neutral-900 border-rose-500/40 text-white' : 'bg-white border-rose-300 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <div className="p-2.5 rounded-xl bg-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-500">Exclusão Permanente</h3>
                <p className="text-xs opacity-70">Ação irreversível de segurança</p>
              </div>
            </div>

            <p className="text-xs opacity-80 mb-4 leading-relaxed">
              Para confirmar que realmente deseja apagar todos os seus registros de dívidas, metas, histórico e perfil de usuário, digite a palavra <strong className="font-mono text-rose-400">EXCLUIR</strong> abaixo:
            </p>

            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="Digite EXCLUIR para confirmar"
              className={`w-full p-2.5 rounded-xl border outline-none font-mono text-xs mb-6 ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 text-white focus:border-rose-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            />

            <div className="flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={`px-4 py-2.5 rounded-xl border ${
                  isDark ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText !== 'EXCLUIR'}
                onClick={() => {
                  setShowDeleteModal(false);
                  onDeleteAccount();
                }}
                className={`px-5 py-2.5 rounded-xl font-semibold text-white transition-all shadow-md ${
                  deleteConfirmationText === 'EXCLUIR'
                    ? 'bg-rose-600 hover:bg-rose-500 cursor-pointer'
                    : 'bg-rose-900/50 opacity-40 cursor-not-allowed'
                }`}
              >
                Apagar Minha Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
