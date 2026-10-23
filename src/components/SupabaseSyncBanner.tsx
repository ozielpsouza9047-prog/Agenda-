import React, { useState } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  ArrowRight,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react';
import { DebtItem } from '../types';
import { migrateLocalDebtsToSupabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface SupabaseSyncBannerProps {
  authUser: User | null;
  debts: DebtItem[];
  isDark: boolean;
  onOpenAuthModal: () => void;
  onRefreshCloudData: () => Promise<void>;
}

export const SupabaseSyncBanner: React.FC<SupabaseSyncBannerProps> = ({
  authUser,
  debts,
  isDark,
  onOpenAuthModal,
  onRefreshCloudData,
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const configured = isSupabaseConfigured();

  const handleMigrate = async () => {
    if (!authUser) {
      onOpenAuthModal();
      return;
    }

    setIsMigrating(true);
    setMigrationStatus(null);

    try {
      // Retrieve debts from localStorage directly to guarantee we have all local records
      let localDebtsToMigrate: DebtItem[] = debts;
      const rawSaved = localStorage.getItem('divida_zero_debts');
      if (rawSaved) {
        try {
          localDebtsToMigrate = JSON.parse(rawSaved);
        } catch (e) {
          console.error(e);
        }
      }

      const res = await migrateLocalDebtsToSupabase(localDebtsToMigrate, authUser.id);
      
      if (res.errors.length > 0 && res.migrated === 0) {
        setMigrationStatus({
          success: false,
          message: `Erro na migração: ${res.errors.join('; ')}`,
        });
      } else {
        setMigrationStatus({
          success: true,
          message: `Migração concluída com sucesso! ${res.migrated} dívidas salvas na nuvem (${res.skipped} mantidas sem duplicar).`,
        });
        await onRefreshCloudData();
      }
    } catch (err: any) {
      setMigrationStatus({
        success: false,
        message: `Falha na migração: ${err?.message || err}`,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // Status 1: Not configured or not logged in
  if (!configured || !authUser) {
    return (
      <div className={`p-3.5 mb-6 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <CloudOff className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Armazenamento Local Ativo
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                {configured ? 'Não Autenticado' : 'Nuvem Não Vinculada'}
              </span>
            </div>
            <p className="text-[11px] opacity-60">
              {configured
                ? 'Faça login para salvar suas dívidas no Supabase com isolamento RLS.'
                : 'Conecte o Supabase para sincronização em nuvem e isolamento por usuário.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAuthModal}
          className="self-stretch sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Database className="w-4 h-4" />
          <span>{configured ? 'Entrar / Criar Conta' : 'Configurar Supabase'}</span>
        </button>
      </div>
    );
  }

  // Status 2: Authenticated with Supabase
  return (
    <div className={`p-4 mb-6 rounded-2xl border transition-all space-y-3 ${
      isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Supabase Conectado · RLS Ativo
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {authUser.email}
              </span>
            </div>
            <p className="text-[11px] opacity-60">
              Isolamento por usuário garantido. Somente sua conta tem acesso a essas dívidas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => onRefreshCloudData()}
            className={`p-2 rounded-xl border text-xs transition-all ${
              isDark ? 'border-neutral-800 hover:bg-neutral-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Recarregar dados da nuvem"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleMigrate}
            disabled={isMigrating}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isMigrating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Migrando dados...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Migrar Dados Locais</span>
              </>
            )}
          </button>
        </div>
      </div>

      {migrationStatus && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
          migrationStatus.success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {migrationStatus.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{migrationStatus.message}</span>
        </div>
      )}
    </div>
  );
};
