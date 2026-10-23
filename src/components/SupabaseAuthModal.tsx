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
  Loader2
} from 'lucide-react';
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  SUPABASE_CONFIG,
  testSupabaseConnection,
  SupabaseDiagnostics,
} from '../lib/supabase';

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onAuthSuccess: (email: string, name?: string) => void;
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({
  isOpen,
  onClose,
  isDark,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'setup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<SupabaseDiagnostics | null>(null);

  if (!isOpen) return null;

  const configured = isSupabaseConfigured();

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
    const sql = `-- Dívida Zero AI - Supabase Schema with RLS
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
  notification_preferences jsonb not null default '{"enabled": true}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Debts
create table if not exists public.debts (
  id text primary key,
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
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Installments
create table if not exists public.installments (
  id text primary key,
  debt_id text not null references public.debts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_number integer not null,
  amount numeric(12, 2) not null,
  due_date text not null,
  status text not null default 'pendente',
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Payments
create table if not exists public.payments (
  id text primary key,
  debt_id text not null references public.debts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null,
  payment_date text not null,
  payment_type text not null default 'regular',
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Goals
create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  monthly_reduction_goal numeric(12, 2) not null default 0,
  extra_payment_goal numeric(12, 2) not null default 0,
  target_payoff_date text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indices
create index if not exists idx_debts_user_id on public.debts(user_id);
create index if not exists idx_installments_user_id on public.installments(user_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_goals_user_id on public.goals(user_id);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.debts enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.goals enable row level security;

-- Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can manage own debts" on public.debts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own installments" on public.installments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own payments" on public.payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own goals" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger for auto profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();`;

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

    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const res = await signUpWithEmail(email, password, name);
        if (res.user) {
          setSuccessMessage('Conta criada com sucesso! Você já está autenticado.');
          setTimeout(() => {
            onAuthSuccess(email, name || email.split('@')[0]);
            onClose();
          }, 1200);
        }
      } else {
        const res = await signInWithEmail(email, password);
        if (res.user) {
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
      } else if (msg.includes('User already registered')) {
        msg = 'Este e-mail já está cadastrado. Alterne para a aba de Login.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'A senha deve conter no mínimo 6 caracteres.';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 transition-all max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-neutral-800/30 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Conexão Supabase Cloud</h2>
            <p className="text-xs opacity-60">Sincronização em nuvem e isolamento por RLS</p>
          </div>
        </div>

        {/* Credentials Missing Notice */}
        {!configured ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-purple-950/30 border-purple-800/60 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5">
                  <p className="font-semibold text-sm">Status da Conexão Supabase</p>
                  <p className="opacity-90 leading-relaxed">
                    A URL do projeto <strong className="font-mono text-purple-300">ihjpxxlotdmxvrccbukf</strong> está conectada e acessível via Cloudflare Gateway.
                  </p>
                  <p className="text-[11px] opacity-80">
                    Para ativar a autenticação real e a persistência protegida por RLS, substitua a chave de exemplo <code className="px-1 py-0.5 rounded bg-black/20 font-mono">COLOQUE_AQUI_SUA_CHAVE_PUBLICA_SB_PUBLISHABLE</code> no arquivo <code className="font-mono text-purple-300">.env</code> pela chave pública real gerada no seu painel.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Config Summary */}
            <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
              isDark ? 'bg-neutral-950 border-neutral-800 text-emerald-400' : 'bg-slate-100 border-slate-200 text-emerald-700'
            }`}>
              <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                <span>Variáveis no arquivo .env:</span>
                <span className="text-[10px] text-amber-400">Aguardando chave pública</span>
              </div>
              <div className="break-all text-[11px]"><span className="text-slate-400">VITE_SUPABASE_URL=</span>{SUPABASE_CONFIG.url || 'https://ihjpxxlotdmxvrccbukf.supabase.co'}</div>
              <div className="break-all text-[11px]"><span className="text-slate-400">VITE_SUPABASE_ANON_KEY=</span>{SUPABASE_CONFIG.isPlaceholder ? 'COLOQUE_AQUI_SUA_CHAVE_PUBLICA_SB_PUBLISHABLE (Pendente)' : '●●●●●●●●●●'}</div>
            </div>

            {/* Security Notice */}
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              isDark ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Aviso de Segurança:</strong> Nunca coloque a chave <code className="font-mono">sb_secret_</code> ou <code className="font-mono">service_role</code> no frontend. O sistema aceita exclusivamente a chave pública <code className="font-mono">anon</code> (iniciada com <code className="font-mono">eyJ...</code>) ou <code className="font-mono">sb_publishable_</code>.
              </div>
            </div>

            {/* Live Diagnostic Button */}
            <div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isDiagnosing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all disabled:opacity-50"
              >
                {isDiagnosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                <span>{isDiagnosing ? 'Testando conexão com o gateway...' : 'Testar Conexão em Tempo Real'}</span>
              </button>

              {diagResult && (
                <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1 ${
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

            {/* SQL Copy Section */}
            <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              isDark ? 'bg-neutral-950/50 border-neutral-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <p className="font-medium text-purple-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Script SQL com RLS Pronto (supabase/schema.sql)
              </p>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Contém as 5 tabelas (<code className="font-mono text-purple-300">profiles, debts, installments, payments, goals</code>), índices de alta performance e isolamento estrito com RLS (<code className="font-mono text-purple-300">auth.uid() = user_id</code>).
              </p>
              <button
                type="button"
                onClick={handleCopySql}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium border border-purple-500/30 transition-all"
              >
                {copiedSql ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'SQL Completo Copiado!' : 'Copiar DDL Completo com RLS'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition-all"
            >
              Continuar no Modo Local (Dados Seguros no Navegador)
            </button>
          </div>
        ) : (
          /* Real Auth Form */
          <div>
            {/* Tabs: Entrar / Criar Conta */}
            <div className={`flex rounded-xl p-1 mb-5 border ${
              isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-80">Seu Nome Completo</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                    <input
                      type="text"
                      placeholder="Ex: Oziel Souza"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                        isDark ? 'bg-neutral-950 border-neutral-800 focus:border-purple-500' : 'bg-slate-50 border-slate-200 focus:border-purple-400'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                  <input
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                      isDark ? 'bg-neutral-950 border-neutral-800 focus:border-purple-500' : 'bg-slate-50 border-slate-200 focus:border-purple-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 opacity-40" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo de 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                      isDark ? 'bg-neutral-950 border-neutral-800 focus:border-purple-500' : 'bg-slate-50 border-slate-200 focus:border-purple-400'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando ao Supabase...</span>
                  </>
                ) : (
                  <span>{mode === 'signup' ? 'Cadastrar e Ativar RLS' : 'Entrar na Conta'}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
