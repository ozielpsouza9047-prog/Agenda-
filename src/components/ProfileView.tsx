import React, { useState, useRef, useEffect } from 'react';
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
  Database,
  KeyRound,
  Mail,
  Loader2,
  ImagePlus,
  Phone,
  Briefcase,
  Wallet,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { UserProfile, DebtItem } from '../types';
import {
  updateUserCredentials,
  uploadProfileAvatar,
  removeProfileAvatar
} from '../lib/supabase';

interface ProfileViewProps {
  userId?: string;
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => Promise<void> | void;
  debts: DebtItem[];
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenAuthModal?: () => void;
  isCloudConnected?: boolean;
}

const STORAGE_BUCKET_SQL = `-- Execute no SQL Editor do Supabase para ativar o bucket 'avatars' com RLS por usuário:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatars public select" on storage.objects;
create policy "Avatars public select" on storage.objects for select to public using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);`;

export const ProfileView: React.FC<ProfileViewProps> = ({
  userId,
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
  // Local form state initialized and synchronized with profile
  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [occupation, setOccupation] = useState(profile.occupation || '');
  const [monthlyIncome, setMonthlyIncome] = useState<string>(
    profile.monthlyIncome ? String(profile.monthlyIncome) : ''
  );
  const [financialBio, setFinancialBio] = useState(profile.financialBio || '');
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>(profile.currency || 'BRL');
  const [hideValues, setHideValues] = useState(profile.hideValuesOnDashboard);
  const [allowAi, setAllowAi] = useState(profile.allowAiDataAnalysis);
  const [biometricLock, setBiometricLock] = useState(profile.biometricLock);

  // Avatar upload & storage status state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
    bucketMissing?: boolean;
  } | null>(null);
  const [showStorageSql, setShowStorageSql] = useState(false);
  const [copiedStorageSql, setCopiedStorageSql] = useState(false);

  // Credentials update state (email & password)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [credFeedback, setCredFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notifications preferences
  const [notifPreferences, setNotifPreferences] = useState(profile.notificationPreferences);

  // UI feedback & modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep form fields synchronized when cloud profile finishes loading
  useEffect(() => {
    setName(profile.name || '');
    setEmail(profile.email || '');
    setAvatarUrl(profile.avatarUrl || '');
    setPhone(profile.phone || '');
    setOccupation(profile.occupation || '');
    setMonthlyIncome(profile.monthlyIncome ? String(profile.monthlyIncome) : '');
    setFinancialBio(profile.financialBio || '');
    setCurrency(profile.currency || 'BRL');
    setHideValues(Boolean(profile.hideValuesOnDashboard));
    setAllowAi(profile.allowAiDataAnalysis !== false);
    setBiometricLock(Boolean(profile.biometricLock));
    if (profile.notificationPreferences) {
      setNotifPreferences(profile.notificationPreferences);
    }
  }, [profile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Handle changing email and/or password inside the app
  const handleUpdateCredentials = async () => {
    setCredFeedback(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = newPassword.trim();

    if (!trimmedEmail) {
      setCredFeedback({ type: 'error', text: 'O campo de e-mail não pode ficar vazio.' });
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      setCredFeedback({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (trimmedPassword && trimmedPassword !== confirmPassword.trim()) {
      setCredFeedback({ type: 'error', text: 'A confirmação de senha não confere com a nova senha.' });
      return;
    }

    setIsUpdatingCredentials(true);
    try {
      const result = await updateUserCredentials({
        newEmail: trimmedEmail !== profile.email.toLowerCase() ? trimmedEmail : undefined,
        newPassword: trimmedPassword || undefined,
        currentEmail: profile.email,
      });

      const updated: UserProfile = {
        ...profile,
        name: name.trim() || profile.name,
        email: trimmedEmail,
        avatarUrl,
        phone: phone.trim(),
        occupation: occupation.trim(),
        monthlyIncome: Number(monthlyIncome) || 0,
        financialBio: financialBio.trim(),
      };
      await onUpdateProfile(updated);
      setNewPassword('');
      setConfirmPassword('');
      setCredFeedback({ type: 'success', text: result.message });
      showToast('Credenciais atualizadas com sucesso!');
    } catch (err: any) {
      setCredFeedback({
        type: 'error',
        text: err?.message || 'Não foi possível atualizar as credenciais.',
      });
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  // Avatar upload handler (Mobile Gallery + Desktop File Picker -> Supabase Storage + public.profiles)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same photo again still triggers onChange
    e.target.value = '';
    setAvatarStatus(null);

    if (!file.type.startsWith('image/')) {
      setAvatarStatus({
        type: 'error',
        text: 'Selecione um arquivo de imagem válido (JPG, PNG, WEBP ou GIF) da sua galeria.',
      });
      showToast('Formato inválido. Escolha uma imagem da galeria.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAvatarStatus({
        type: 'error',
        text: 'A imagem selecionada excede 10 MB. Escolha uma foto menor da galeria.',
      });
      showToast('A imagem deve ter no máximo 10 MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      if (userId) {
        const currentDisplayName = name.trim() || profile.name;
        const result = await uploadProfileAvatar(file, userId, currentDisplayName);
        setAvatarUrl(result.avatarUrl);
        const updated: UserProfile = {
          ...profile,
          name: currentDisplayName,
          email: email.trim() || profile.email,
          avatarUrl: result.avatarUrl,
          phone: phone.trim(),
          occupation: occupation.trim(),
          monthlyIncome: Number(monthlyIncome) || 0,
          financialBio: financialBio.trim(),
          currency,
          hideValuesOnDashboard: hideValues,
          allowAiDataAnalysis: allowAi,
          biometricLock,
          notificationPreferences: notifPreferences,
        };
        await onUpdateProfile(updated);
        setAvatarStatus({
          type: result.storageUsed ? 'success' : 'info',
          text: result.message,
          bucketMissing: !result.bucketConfigured,
        });
        showToast('Foto de perfil salva com sucesso!');
      } else {
        // Fallback if no userId prop
        const reader = new FileReader();
        reader.onload = async (event) => {
          const resultDataUrl = event.target?.result as string;
          setAvatarUrl(resultDataUrl);
          const updated: UserProfile = {
            ...profile,
            avatarUrl: resultDataUrl,
          };
          await onUpdateProfile(updated);
          showToast('Foto de perfil atualizada!');
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setAvatarStatus({
        type: 'error',
        text: err?.message || 'Erro ao processar e salvar a foto de perfil.',
      });
      showToast('Não foi possível salvar a foto.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;
    setIsRemovingAvatar(true);
    setAvatarStatus(null);
    try {
      const previousUrl = avatarUrl;
      setAvatarUrl('');
      if (userId) {
        await removeProfileAvatar(userId, previousUrl);
      }
      const updated: UserProfile = {
        ...profile,
        name: name.trim() || profile.name,
        email: email.trim() || profile.email,
        avatarUrl: '',
        phone: phone.trim(),
        occupation: occupation.trim(),
        monthlyIncome: Number(monthlyIncome) || 0,
        financialBio: financialBio.trim(),
        currency,
        hideValuesOnDashboard: hideValues,
        allowAiDataAnalysis: allowAi,
        biometricLock,
        notificationPreferences: notifPreferences,
      };
      await onUpdateProfile(updated);
      setAvatarStatus({
        type: 'info',
        text: 'Foto removida. O avatar padrão foi restaurado no seu perfil.',
      });
      showToast('Foto de perfil removida.');
    } catch {
      showToast('Erro ao remover foto de perfil.');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  // Save changes handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      showToast('O nome completo não pode estar em branco.');
      return;
    }

    if (!cleanEmail) {
      showToast('O e-mail não pode estar em branco.');
      return;
    }

    setIsSavingProfile(true);
    try {
      // If user also edited their email in the personal data form, update auth email
      if (cleanEmail !== (profile.email || '').trim().toLowerCase()) {
        try {
          await updateUserCredentials({
            newEmail: cleanEmail,
            currentEmail: profile.email,
          });
        } catch (emailErr: any) {
          console.warn('Aviso ao sincronizar novo e-mail no Auth:', emailErr?.message);
        }
      }

      const updated: UserProfile = {
        ...profile,
        name: cleanName,
        email: cleanEmail,
        avatarUrl,
        phone: phone.trim(),
        occupation: occupation.trim(),
        monthlyIncome: Number(monthlyIncome) || 0,
        financialBio: financialBio.trim(),
        currency,
        hideValuesOnDashboard: hideValues,
        allowAiDataAnalysis: allowAi,
        biometricLock,
        notificationPreferences: notifPreferences,
      };

      await onUpdateProfile(updated);
      showToast('Dados pessoais e perfil salvos na nuvem!');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCopyStorageSql = async () => {
    try {
      await navigator.clipboard.writeText(STORAGE_BUCKET_SQL);
      setCopiedStorageSql(true);
      setTimeout(() => setCopiedStorageSql(false), 2500);
    } catch {
      showToast('Copie o código SQL manualmente.');
    }
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
        telefone: profile.phone || '',
        ocupacao: profile.occupation || '',
        rendaMensalEstimada: profile.monthlyIncome || 0,
        objetivoFinanceiro: profile.financialBio || '',
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

  // User initials for default fallback avatar
  const getInitials = (n: string) => {
    const clean = (n || '').trim();
    if (!clean) return 'DZ';
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto z-50 p-4 rounded-xl shadow-2xl bg-purple-600 text-white text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 border border-purple-400/30 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
            Personalize sua foto, edite seus dados pessoais e configure sua privacidade
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 self-start sm:self-auto">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span>Perfil Isolado por RLS (Acesso Exclusivo)</span>
        </div>
      </div>

      {/* Premium Mobile-First Profile Hero Card with Gallery Photo Upload & Default Avatar */}
      <div
        className={`relative overflow-hidden rounded-3xl border transition-all ${
          isDark
            ? 'bg-gradient-to-br from-[#120d24] via-neutral-900 to-[#090910] border-purple-500/25 shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
            : 'bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/40 border-slate-200 shadow-sm'
        }`}
      >
        {/* Subtle neon ambient glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />

        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar Container (Large & Touch-Friendly for Mobile) */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 opacity-60 blur-sm group-hover:opacity-90 transition-opacity" />
                <div
                  onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                  className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden flex items-center justify-center font-bold text-3xl border-2 cursor-pointer transition-all ${
                    avatarUrl
                      ? 'border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.35)] bg-neutral-950'
                      : 'bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white border-purple-300/50 shadow-lg'
                  }`}
                  title="Toque para escolher uma foto da galeria"
                >
                  {isUploadingAvatar ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-white">
                      <Loader2 className="w-7 h-7 animate-spin text-purple-200" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">
                        Salvando...
                      </span>
                    </div>
                  ) : avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name || 'Foto de Perfil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center select-none">
                      <span className="tracking-tight text-2xl sm:text-3xl font-extrabold">
                        {getInitials(name || profile.email || 'Usuário')}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-widest opacity-75 mt-0.5">
                        Avatar Padrão
                      </span>
                    </div>
                  )}
                </div>

                {/* Hidden File Input — opens mobile photo gallery on smartphones */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />

                {/* Floating Camera Action Button */}
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0.5 right-0.5 p-2.5 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)] border border-purple-300/40 transition-transform active:scale-90 disabled:opacity-50"
                  title="Selecionar foto da galeria"
                  aria-label="Selecionar foto da galeria"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile-Friendly Action Buttons for Gallery Photo */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  disabled={isUploadingAvatar || isRemovingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{avatarUrl ? 'Trocar Foto' : 'Escolher da Galeria'}</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    disabled={isUploadingAvatar || isRemovingAvatar}
                    onClick={handleRemoveAvatar}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 ${
                      isDark
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                        : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    {isRemovingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Remover</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Identity & Summary Info */}
            <div className="flex-1 text-center sm:text-left space-y-2.5 w-full min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3
                  className={`text-xl md:text-2xl font-extrabold truncate ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {name || 'Usuário'}
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Sessão Autenticada
                </span>
              </div>

              <p className="text-xs sm:text-sm font-mono opacity-75 truncate">{email || profile.email}</p>

              {(occupation || phone) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs opacity-80 pt-0.5">
                  {occupation && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                      <span>{occupation}</span>
                    </span>
                  )}
                  {phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-purple-400" />
                      <span>{phone}</span>
                    </span>
                  )}
                </div>
              )}

              {financialBio && (
                <p
                  className={`text-xs italic rounded-xl p-2.5 border ${
                    isDark
                      ? 'bg-neutral-950/50 border-neutral-800/80 text-neutral-300'
                      : 'bg-white/80 border-slate-200 text-slate-600'
                  }`}
                >
                  "{financialBio}"
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs opacity-70">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Membro desde {profile.createdAt || 'Outubro de 2026'}</span>
                </div>
                <span className="hidden sm:inline">·</span>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {avatarUrl ? 'Foto personalizada ativa' : 'Avatar padrão ativo'}
                  </span>
                </div>
              </div>

              {/* Feedback banner for avatar upload / storage status */}
              {avatarStatus && (
                <div
                  className={`mt-3 p-3 rounded-xl border text-xs text-left space-y-2 ${
                    avatarStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : avatarStatus.type === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {avatarStatus.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      )}
                      <span>{avatarStatus.text}</span>
                    </div>
                    {avatarStatus.bucketMissing && (
                      <button
                        type="button"
                        onClick={() => setShowStorageSql((prev) => !prev)}
                        className="text-[11px] font-semibold underline text-purple-300 hover:text-white shrink-0"
                      >
                        {showStorageSql ? 'Ocultar SQL Storage' : 'Configurar Bucket Storage'}
                      </button>
                    )}
                  </div>

                  {avatarStatus.bucketMissing && showStorageSql && (
                    <div className="pt-2 border-t border-purple-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] opacity-80">
                          Sua foto já está salva na tabela <code>public.profiles</code>. Para ativar também o bucket dedicado <code>avatars</code> no Supabase Storage, execute no SQL Editor:
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyStorageSql}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0"
                        >
                          {copiedStorageSql ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar SQL</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 rounded-lg bg-black/70 text-[10px] font-mono text-purple-200 overflow-x-auto max-h-36">
                        {STORAGE_BUCKET_SQL}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Dados Pessoais & Moeda */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border space-y-5 ${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-inherit">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" />
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Dados Pessoais e Financeiros
              </h3>
            </div>
            <span className="text-[11px] opacity-60">Salvo em public.profiles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium opacity-80 mb-1.5">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 rounded-xl border outline-none text-xs transition-colors ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
                  }`}
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium opacity-80 mb-1.5">
                E-mail da Conta *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 rounded-xl border outline-none text-xs transition-colors ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
                  }`}
                  placeholder="seuemail@exemplo.com"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium opacity-80 mb-1.5">
                Telefone / WhatsApp (opcional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 rounded-xl border outline-none text-xs transition-colors ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
                  }`}
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium opacity-80 mb-1.5">
                Profissão / Ocupação (opcional)
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 rounded-xl border outline-none text-xs transition-colors ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
                  }`}
                  placeholder="Ex: Analista, Autônomo, Empresário"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium opacity-80 mb-1.5">
                Renda Mensal Estimada (opcional)
              </label>
              <div className="relative">
                <Wallet className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 rounded-xl border outline-none text-xs transition-colors ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
                  }`}
                  placeholder="Ex: 4500.00"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium opacity-80 mb-1.5">
                Objetivo Financeiro Principal (opcional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                <input
                  type="text"
                  value={financialBio}
                  onChange={(e) => setFinancialBio(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 rounded-xl border outline-none text-xs transition-colors ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-400'
                  }`}
                  placeholder="Ex: Quitar cartões até dezembro e criar reserva"
                />
              </div>
            </div>
          </div>

          {/* Quick Save Button right inside Personal Data section for mobile convenience */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-inherit">
            <span className="text-[11px] opacity-60">
              Seus dados pessoais são privados e protegidos por RLS (somente sua conta pode visualizar ou editar).
            </span>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shrink-0"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando Perfil...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Dados Pessoais</span>
                </>
              )}
            </button>
          </div>

          {/* Trocar E-mail e Senha de Acesso */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold">Segurança: Alterar E-mail ou Senha de Acesso</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Ocultar Senha' : 'Mostrar Senha'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium opacity-80 mb-1">
                  Nova Senha (opcional)
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className={`w-full p-2.5 rounded-xl border outline-none text-xs transition-colors ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-white focus:border-purple-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-purple-400'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium opacity-80 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={`w-full p-2.5 rounded-xl border outline-none text-xs transition-colors ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-white focus:border-purple-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-purple-400'
                  }`}
                />
              </div>
            </div>

            {credFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  credFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {credFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{credFeedback.text}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] opacity-60">
                Atualiza o e-mail preenchido acima e/ou define sua nova senha pessoal no Supabase Auth.
              </span>
              <button
                type="button"
                disabled={isUpdatingCredentials}
                onClick={handleUpdateCredentials}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
              >
                {isUpdatingCredentials ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Atualizando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Atualizar E-mail / Senha</span>
                  </>
                )}
              </button>
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
                    ? 'Seu perfil, foto, dívidas e metas estão vinculados exclusivamente ao seu usuário autenticado.'
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
              <strong>Isolamento e Segurança (RLS):</strong> Cada usuário autenticado só pode visualizar e alterar o próprio perfil (<code>auth.uid() = id</code>) e sua própria pasta no Storage.
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
