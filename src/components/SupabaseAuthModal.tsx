import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  Database,
  KeyRound,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  SUPABASE_CONFIG,
  testSupabaseConnection,
  SupabaseDiagnostics,
  PROVISIONAL_CREDENTIALS,
} from '../lib/supabase';

interface AuthenticatedProfilePreview {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onAuthSuccess: (email: string, name?: string) => void;
  requireAuth?: boolean;
  authenticatedProfile?: AuthenticatedProfilePreview | null;
  savedAvatarUrl?: string;
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  requireAuth = false,
  authenticatedProfile = null,
  savedAvatarUrl = '',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'setup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<SupabaseDiagnostics | null>(null);

  if (!isOpen) return null;

  const configured = isSupabaseConfigured();

  // Reuse the same profile photo saved in the user's profile inside the panel
  const activeAvatarUrl = authenticatedProfile?.avatarUrl || savedAvatarUrl || '';

  const getInitials = (rawName: string) => {
    const cleaned = rawName.trim();
    if (!cleaned) return '';
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayInitials = authenticatedProfile?.name
    ? getInitials(authenticatedProfile.name)
    : mode === 'signup' && name.trim()
    ? getInitials(name)
    : '';

  const handleTestConnection = async () => {
    setIsDiagnosing(true);
    try {
      const res = await testSupabaseConnection();
      setDiagResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleCopySql = () => {
    const sql = `-- Dívida Zero AI - Supabase Schema with RLS (Zero-DROP)
create extension if not exists "uuid-ossp";

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Usuário Dívida Zero',
  email text,
  avatar_url text,
  currency text not null default 'BRL',
  role text not null default 'user',
  hide_values_on_dashboard boolean not null default false,
  allow_ai_data_analysis boolean not null default true,
  biometric_lock boolean not null default false,
  notification_preferences jsonb not null default '{"enabled": true, "notify7Days": true, "notify3Days": true, "notify1Day": true, "notifyDueDay": true, "notifyOverdue": true, "emailSummary": false}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Debts
create table if not exists public.debts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  creditor text not null,
  category text not null default 'Outros',
  total_amount numeric(12, 2) not null default 0,
  remaining_amount numeric(12, 2) not null default 0,
  monthly_payment numeric(12, 2) not null default 0,
  due_date text not null,
  status text not null default 'em_dia',
  installments_total integer not null default 1,
  installments_paid integer not null default 0,
  interest_rate numeric(6, 2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id)
);

-- 3. Installments
create table if not exists public.installments (
  id text not null,
  debt_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_number integer not null,
  amount numeric(12, 2) not null default 0,
  due_date text not null,
  status text not null default 'pendente',
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id),
  foreign key (user_id, debt_id) references public.debts(user_id, id) on delete cascade
);

-- 4. Payments
create table if not exists public.payments (
  id text not null,
  debt_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  payment_date text not null,
  payment_type text not null default 'regular',
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id),
  foreign key (user_id, debt_id) references public.debts(user_id, id) on delete cascade
);

-- 5. Goals
create table if not exists public.goals (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  monthly_reduction_goal numeric(12, 2) not null default 0,
  extra_payment_goal numeric(12, 2) not null default 0,
  target_payoff_date text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id)
);

-- Permissions
grant usage on schema public to postgres, anon, authenticated, service_role, supabase_auth_admin;
revoke all on table public.profiles, public.debts, public.installments, public.payments, public.goals from public, anon;
grant select, insert, update, delete on table public.profiles, public.debts, public.installments, public.payments, public.goals to authenticated;
grant all privileges on table public.profiles, public.debts, public.installments, public.payments, public.goals to postgres, service_role, supabase_auth_admin;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.debts enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.goals enable row level security;

-- Veja o script completo de reconciliação com as 20 políticas RLS e trigger seguro em supabase/schema.sql`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!configured) {
      setErrorMessage('Supabase ainda não configurado com a chave pública real.');
      return;
    }

    if (mode === 'reset') {
      if (!email) {
        setErrorMessage('Por favor, informe seu e-mail para recuperar a senha.');
        return;
      }
      setIsLoading(true);
      try {
        await requestPasswordReset(email);
        setSuccessMessage('Instruções de recuperação de senha enviadas para o seu e-mail!');
      } catch (err: any) {
        console.error('Password reset error:', err);
        setErrorMessage(err?.message || 'Erro ao solicitar recuperação de senha.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const res = await signUpWithEmail(email, password, name);
        if (res.user && res.session) {
          setSuccessMessage('Conta criada com sucesso! Você já está autenticado.');
          setTimeout(() => {
            onAuthSuccess(email, name || email.split('@')[0]);
            onClose();
          }, 1200);
        } else if (res.user && !res.session) {
          setSuccessMessage(
            'Conta registrada! Confirme seu e-mail para ativar a sessão autenticada antes de fazer login.'
          );
          setMode('signin');
        }
      } else {
        const res = await signInWithEmail(email, password);
        if (res.user && res.session) {
          setSuccessMessage('Login efetuado com sucesso!');
          setTimeout(() => {
            onAuthSuccess(email, res.user.user_metadata?.name || email.split('@')[0]);
            onClose();
          }, 800);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err?.message || 'Erro ao processar autenticação.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'E-mail ou senha incorretos.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou desative "Confirm email" em Authentication > Providers > Email no Supabase.';
      } else if (msg.includes('User already registered')) {
        msg = 'Este e-mail já está cadastrado. Alterne para a aba de Entrar.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'A senha deve conter no mínimo 6 caracteres.';
      } else if (msg.includes('Database error saving new user')) {
        msg = 'Erro de permissão no trigger de criação de perfil do banco. Execute o script atualizado supabase/schema.sql no SQL Editor.';
      } else if (msg.includes('Signups not allowed')) {
        msg = 'O cadastro de novos usuários está desativado nas configurações de Auth do Supabase.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 min-h-screen w-full overflow-y-auto bg-[#030306] text-slate-100 flex flex-col justify-between selection:bg-purple-500/30 selection:text-purple-200">
      {/* Futuristic Black & Neon Purple Ambient Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Top Neon Purple Halo behind the Avatar */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[420px] rounded-full bg-purple-600/25 blur-[140px] transition-all duration-700" />
        <div className="absolute top-28 left-1/2 -translate-x-1/2 w-[320px] h-[320px] rounded-full bg-fuchsia-600/15 blur-[110px]" />
        <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[380px] rounded-full bg-violet-700/15 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(168,85,247,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(168,85,247,0.35) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      {/* Top Minimal Bar */}
      <header className="relative z-10 w-full px-5 sm:px-10 lg:px-16 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-sm sm:text-base font-bold tracking-tight text-white">
            Dívida Zero AI
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-purple-300/80">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Sessão Criptografada</span>
            <span aria-hidden="true">·</span>
            <span>RLS Ativo</span>
          </div>

          {!requireAuth && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-purple-500/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <X className="w-4 h-4" />
              <span>Voltar ao Painel</span>
            </button>
          )}
        </div>
      </header>

      {/* Full-Screen Open Profile Experience (No Centered Modal Box) */}
      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-6 sm:py-10 flex flex-col items-center justify-center">
        {/* 1. Large Top Profile Photo / Avatar */}
        <section className="w-full flex flex-col items-center text-center mb-8 sm:mb-10 transition-all duration-300">
          <div className="relative group mb-6">
            {/* Outer Neon Glow Ring */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-violet-500 opacity-60 blur-lg group-hover:opacity-90 transition-opacity duration-500" />

            {/* Avatar Circle */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-[3px] bg-gradient-to-tr from-purple-500 via-fuchsia-400 to-indigo-500 shadow-[0_0_45px_rgba(168,85,247,0.45)] transition-transform duration-300 group-hover:scale-[1.02]">
              <div className="w-full h-full rounded-full bg-[#07070D] flex items-center justify-center overflow-hidden border-4 border-[#030306]">
                {activeAvatarUrl ? (
                  <img
                    src={activeAvatarUrl}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                ) : displayInitials ? (
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-wider bg-gradient-to-br from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                    {displayInitials}
                  </span>
                ) : (
                  <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
                )}
              </div>
            </div>

            {/* Verified Shield Badge */}
            <div className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#0B0B14] text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-500/50">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* 2. Name and Welcome Message Directly Below Avatar */}
          <div className="space-y-2.5 max-w-xl">
            <p className="text-xs sm:text-sm font-medium text-purple-400 tracking-wide">
              {authenticatedProfile?.name
                ? 'Perfil Conectado · Dívida Zero AI'
                : mode === 'signup'
                ? 'Novo Perfil · Dívida Zero AI'
                : mode === 'reset'
                ? 'Segurança da Conta · Dívida Zero AI'
                : 'Dívida Zero AI · Controle Financeiro Inteligente'}
            </p>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {authenticatedProfile?.name
                ? `Olá, ${authenticatedProfile.name}`
                : mode === 'signup'
                ? name.trim()
                  ? `Bem-vindo, ${name.trim().split(' ')[0]}`
                  : 'Crie sua Conta Pessoal'
                : mode === 'reset'
                ? 'Recuperar Senha de Acesso'
                : 'Bem-vindo de Volta'}
            </h1>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg mx-auto">
              {authenticatedProfile?.email
                ? `Sessão ativa para ${authenticatedProfile.email}. Seus dados financeiros estão sincronizados com segurança.`
                : mode === 'signup'
                ? 'Configure seu perfil para acessar o painel de dívidas, metas de quitação e inteligência financeira.'
                : mode === 'reset'
                ? 'Digite seu e-mail cadastrado abaixo e enviaremos um link seguro para redefinir sua senha.'
                : 'Acesse seu perfil para gerenciar suas dívidas, parcelas e planejamento de quitação em tempo real.'}
            </p>
          </div>
        </section>

        {/* 3. Main Interactive Controls & Open Form Area */}
        <section className="w-full max-w-xl mx-auto space-y-7">
          {!configured ? (
            /* Credentials Missing Notice */
            <div className="space-y-5">
              <div className="p-5 rounded-2xl border bg-amber-950/30 border-amber-800/60 text-amber-200">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1.5">
                    <p className="font-semibold text-sm">Configuração Pendente</p>
                    <p className="opacity-90 leading-relaxed">
                      O projeto <strong className="font-mono text-amber-300">ihjpxxlotdmxvrccbukf</strong> está identificado, mas falta configurar uma credencial pública real do Supabase.
                    </p>
                    <p className="text-[11px] opacity-80">
                      A autenticação em nuvem permanece desativada até que a chave pública (<code className="px-1 py-0.5 rounded bg-black/20 font-mono">anon</code> ou <code className="px-1 py-0.5 rounded bg-black/20 font-mono">sb_publishable_</code>) seja configurada nas variáveis de ambiente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border text-xs space-y-2.5 bg-white/[0.02] border-white/10 text-slate-300">
                <div className="flex justify-between items-center text-[11px] text-slate-400 pb-1 border-b border-white/10">
                  <span className="font-semibold">Status da Configuração</span>
                  <span className="text-[10px] text-amber-400 font-medium">Autenticação Desativada</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">URL do Projeto:</span>
                  <span className={SUPABASE_CONFIG.hasUrl ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                    {SUPABASE_CONFIG.hasUrl ? 'Configurada (ihjpxxlotdmxvrccbukf)' : 'Pendente'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Chave Pública:</span>
                  <span className={
                    SUPABASE_CONFIG.isSecretBlocked
                      ? 'text-rose-400 font-medium'
                      : SUPABASE_CONFIG.hasKey
                      ? 'text-emerald-400 font-medium'
                      : 'text-amber-400 font-medium'
                  }>
                    {SUPABASE_CONFIG.isSecretBlocked
                      ? 'Bloqueada (chave secreta detectada)'
                      : SUPABASE_CONFIG.hasKey
                      ? 'Configurada'
                      : 'Pendente de configuração'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 bg-rose-950/20 border-rose-900/40 text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Aviso de Segurança:</strong> Nunca coloque a chave <code className="font-mono">sb_secret_</code> ou <code className="font-mono">service_role</code> no frontend. O sistema aceita exclusivamente a chave pública <code className="font-mono">anon</code> ou <code className="font-mono">sb_publishable_</code>.
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isDiagnosing}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all disabled:opacity-50"
                >
                  {isDiagnosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  <span>{isDiagnosing ? 'Testando conexão com o gateway...' : 'Testar Conexão em Tempo Real'}</span>
                </button>

                {diagResult && (
                  <div className={`mt-3 p-3.5 rounded-2xl border text-xs space-y-1 ${
                    diagResult.gatewayReachable
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span>Gateway Supabase: {diagResult.gatewayReachable ? 'Online (Acessível)' : 'Inacessível'}</span>
                      <span className="font-mono text-[10px]">{diagResult.projectRef || 'ihjpxxlotdmxvrccbukf'}</span>
                    </div>
                    <p className="text-[11px] opacity-80">{diagResult.details}</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl border text-xs space-y-2.5 bg-white/[0.02] border-white/10 text-slate-300">
                <p className="font-medium text-purple-400 flex items-center gap-1.5">
                  <Database className="w-4 h-4" /> Script SQL com RLS Pronto (supabase/schema.sql)
                </p>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Contém as 5 tabelas (<code className="font-mono text-purple-300">profiles, debts, installments, payments, goals</code>) e isolamento com RLS (<code className="font-mono text-purple-300">auth.uid() = user_id</code>).
                </p>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium border border-purple-500/30 transition-all"
                >
                  {copiedSql ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'SQL Completo Copiado!' : 'Copiar DDL Completo com RLS'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Primary Action Switcher: "Entrar" & "Criar conta" + "Recuperar senha" toggle */}
              <div className="space-y-3">
                <div
                  role="tablist"
                  aria-label="Ações principais de acesso"
                  className="grid grid-cols-2 gap-3 sm:gap-4"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signin'}
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`min-h-[50px] py-3 px-5 rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                      mode === 'signin'
                        ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.45)] border border-purple-400/40'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10'
                    }`}
                  >
                    Entrar
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signup'}
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`min-h-[50px] py-3 px-5 rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                      mode === 'signup'
                        ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.45)] border border-purple-400/40'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10'
                    }`}
                  >
                    Criar conta
                  </button>
                </div>

                {/* Smooth Toggle for "Recuperar senha" on the same screen */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'reset' ? 'signin' : 'reset');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`text-xs sm:text-sm font-medium py-1.5 px-4 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                      mode === 'reset'
                        ? 'text-purple-300 bg-purple-500/15 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                        : 'text-slate-400 hover:text-purple-300'
                    }`}
                  >
                    {mode === 'reset' ? '← Voltar para Entrar na conta' : 'Esqueceu sua senha? Recuperar senha'}
                  </button>
                </div>
              </div>

              {/* Provisional Credentials 1-Tap Access */}
              {mode === 'signin' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-purple-100 space-y-2.5 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold flex items-center gap-2 text-purple-300">
                      <KeyRound className="w-4 h-4 text-purple-400" />
                      Acesso Rápido Provisório
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        setEmail(PROVISIONAL_CREDENTIALS.email);
                        setPassword(PROVISIONAL_CREDENTIALS.password);
                        setErrorMessage(null);
                        setIsLoading(true);
                        try {
                          const res = await signInWithEmail(
                            PROVISIONAL_CREDENTIALS.email,
                            PROVISIONAL_CREDENTIALS.password
                          );
                          if (res.user) {
                            setSuccessMessage('Acesso liberado com sucesso!');
                            setTimeout(() => {
                              onAuthSuccess(
                                PROVISIONAL_CREDENTIALS.email,
                                res.user.user_metadata?.name || PROVISIONAL_CREDENTIALS.name
                              );
                              onClose();
                            }, 500);
                          }
                        } catch (err: any) {
                          setErrorMessage(err?.message || 'Erro ao entrar.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      Entrar Agora (1 Toque)
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono text-purple-200/90 pt-0.5">
                    <div className="truncate">E-mail: <strong>{PROVISIONAL_CREDENTIALS.email}</strong></div>
                    <div>Senha: <strong>{PROVISIONAL_CREDENTIALS.password}</strong></div>
                  </div>
                </div>
              )}

              {/* Error & Success Feedback */}
              {errorMessage && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                    <span className="leading-relaxed">{errorMessage}</span>
                  </div>
                  {errorMessage.includes('confirmado') && (
                    <button
                      type="button"
                      onClick={() => {
                        const confirmSql = `-- Confirma imediatamente a conta provisória e habilita troca de e-mail direta pelo app
UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${PROVISIONAL_CREDENTIALS.email}';

CREATE OR REPLACE FUNCTION public.update_my_email_direct(new_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  UPDATE auth.users
  SET email = lower(trim(new_email)),
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = auth.uid();
  UPDATE public.profiles
  SET email = lower(trim(new_email)),
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_my_email_direct(text) TO authenticated;`;
                        navigator.clipboard.writeText(confirmSql);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 3000);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      {copiedSql ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedSql ? 'SQL de Liberação Copiado! Cole no SQL Editor' : 'Copiar SQL de Liberação Imediata'}</span>
                    </button>
                  )}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Open Full-Screen Form Inputs */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'signup' && (
                  <div className="transition-all duration-300">
                    <label
                      htmlFor="auth-name-input"
                      className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
                    >
                      Seu Nome Completo
                    </label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/70 pointer-events-none" />
                      <input
                        id="auth-name-input"
                        type="text"
                        autoComplete="name"
                        placeholder="Ex: Oziel Souza"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full min-h-[54px] pl-12 pr-4 py-3.5 text-sm sm:text-base rounded-2xl bg-white/[0.04] border border-purple-500/25 text-white placeholder:text-slate-500 focus:border-purple-400 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/30 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email-input"
                    className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/70 pointer-events-none" />
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-h-[54px] pl-12 pr-4 py-3.5 text-sm sm:text-base rounded-2xl bg-white/[0.04] border border-purple-500/25 text-white placeholder:text-slate-500 focus:border-purple-400 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div className="transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor="auth-password-input"
                        className="block text-xs sm:text-sm font-medium text-slate-300"
                      >
                        Senha
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('reset');
                            setErrorMessage(null);
                            setSuccessMessage(null);
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors focus-visible:outline-none focus-visible:underline"
                        >
                          Recuperar senha
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/70 pointer-events-none" />
                      <input
                        id="auth-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        placeholder="Mínimo de 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full min-h-[54px] pl-12 pr-12 py-3.5 text-sm sm:text-base rounded-2xl bg-white/[0.04] border border-purple-500/25 text-white placeholder:text-slate-500 focus:border-purple-400 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/30 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[56px] mt-3 py-4 px-6 rounded-2xl text-sm sm:text-base font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white shadow-[0_0_35px_rgba(168,85,247,0.45)] flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Conectando ao Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'signup'
                          ? 'Criar conta e acessar painel'
                          : mode === 'reset'
                          ? 'Enviar link de recuperação de senha'
                          : 'Entrar no Dívida Zero AI'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* Subtle Open Footer with Cloud Status Check */}
      <footer className="relative z-10 w-full px-5 sm:px-10 py-5 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span>Dívida Zero AI</span>
          <span aria-hidden="true">·</span>
          <span>Isolamento de dados por usuário (RLS)</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isDiagnosing}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-purple-300 transition-colors"
          >
            {isDiagnosing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : (
              <Database className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{isDiagnosing ? 'Verificando gateway...' : 'Verificar conexão Supabase'}</span>
          </button>

          {diagResult && (
            <span className={diagResult.gatewayReachable ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {diagResult.gatewayReachable ? 'Gateway Online' : 'Gateway Inacessível'}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};
