import React, { useState } from 'react';
import {
  CloudOff,
  RefreshCw,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCheck2
} from 'lucide-react';
import { DebtItem, GoalItem } from '../types';
import {
  prepareLocalMigrationPreview,
  migrateLocalDebtsToSupabase,
  isSupabaseConfigured,
  MigrationPreview,
  MigrationResult,
} from '../lib/supabase';
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
  const [isCheckingPreview, setIsCheckingPreview] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [previewData, setPreviewData] = useState<MigrationPreview | null>(null);
  const [migrationReport, setMigrationReport] = useState<MigrationResult | null>(null);
  const [blockingAlert, setBlockingAlert] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const readLocalRecords = (): { localDebts: DebtItem[]; localGoals: GoalItem[] } => {
    let localDebts: DebtItem[] = debts;
    const rawDebts = localStorage.getItem('divida_zero_debts');
    if (rawDebts) {
      try {
        const parsed = JSON.parse(rawDebts);
        if (Array.isArray(parsed)) localDebts = parsed;
      } catch (e) {
        console.error('Erro ao ler divida_zero_debts do localStorage:', e);
      }
    }

    let localGoals: GoalItem[] = [];
    const rawGoals = localStorage.getItem('divida_zero_goals');
    if (rawGoals) {
      try {
        const parsed = JSON.parse(rawGoals);
        if (Array.isArray(parsed)) localGoals = parsed;
      } catch (e) {
        console.error('Erro ao ler divida_zero_goals do localStorage:', e);
      }
    }

    return { localDebts, localGoals };
  };

  // Step 1: Validate session, remote schema & permissions, and show preview before any write
  const handlePreparePreview = async () => {
    if (!authUser) {
      onOpenAuthModal();
      return;
    }

    setIsCheckingPreview(true);
    setBlockingAlert(null);
    setPreviewData(null);
    setMigrationReport(null);

    try {
      const { localDebts, localGoals } = readLocalRecords();
      const preview = await prepareLocalMigrationPreview(localDebts, localGoals, authUser.id);

      if (!preview.ready) {
        setBlockingAlert(
          preview.blockingError ||
            'Não foi possível validar o schema remoto para migração. Verifique se as tabelas foram criadas.'
        );
      } else {
        setPreviewData(preview);
      }
    } catch (err: any) {
      setBlockingAlert(`Erro ao validar prévia da migração: ${err?.message || err}`);
    } finally {
      setIsCheckingPreview(false);
    }
  };

  // Step 2: Execute migration only after explicit user confirmation
  const handleConfirmMigration = async () => {
    if (!authUser || !previewData?.ready) return;

    setIsMigrating(true);
    setBlockingAlert(null);

    try {
      const { localDebts, localGoals } = readLocalRecords();
      const res = await migrateLocalDebtsToSupabase(localDebts, authUser.id, localGoals);
      setMigrationReport(res);
      setPreviewData(null);

      if (!res.hasErrors && res.migrated > 0) {
        await onRefreshCloudData();
      }
    } catch (err: any) {
      setBlockingAlert(`Falha inesperada durante a migração: ${err?.message || err}`);
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

  const totalToImportCount = previewData
    ? previewData.debtsToImport.length + previewData.goalsToImport.length
    : 0;

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
              Isolamento por usuário garantido. Seus dados locais permanecem preservados no navegador.
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
            onClick={handlePreparePreview}
            disabled={isCheckingPreview || isMigrating}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isCheckingPreview ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validando schema...</span>
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

      {/* Blocking Error Banner (Schema not ready, invalid session, or RLS error) */}
      {blockingAlert && (
        <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-400 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Migração interrompida antes do envio</p>
              <p className="opacity-90 leading-relaxed">{blockingAlert}</p>
            </div>
          </div>
          <button
            onClick={() => setBlockingAlert(null)}
            className="p-1 rounded-lg hover:bg-rose-500/20 transition-all shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Explicit Confirmation Preview Modal/Panel */}
      {previewData && previewData.ready && (
        <div className={`p-4 rounded-xl border text-xs space-y-3 ${
          isDark ? 'bg-neutral-950/90 border-purple-500/30 text-slate-200' : 'bg-purple-50/60 border-purple-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-purple-400">
              <FileCheck2 className="w-4 h-4" />
              <span>Prévia da Importação Segura (Confirmação Obrigatória)</span>
            </div>
            <button
              onClick={() => setPreviewData(null)}
              className="p-1 rounded-lg opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className={`p-2.5 rounded-lg border ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
            }`}>
              <p className="font-semibold mb-1">Dívidas Locais (divida_zero_debts)</p>
              <p className="text-[11px] text-emerald-400 font-medium">
                • {previewData.debtsToImport.length} nova(s) para importar
              </p>
              <p className="text-[11px] opacity-70">
                • {previewData.debtsAlreadyInCloud.length} já existente(s) na nuvem (ignoradas)
              </p>
            </div>

            <div className={`p-2.5 rounded-lg border ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
            }`}>
              <p className="font-semibold mb-1">Metas Locais (divida_zero_goals)</p>
              <p className="text-[11px] text-emerald-400 font-medium">
                • {previewData.goalsToImport.length} nova(s) para importar
              </p>
              <p className="text-[11px] opacity-70">
                • {previewData.goalsAlreadyInCloud.length} já existente(s) na nuvem (ignoradas)
              </p>
            </div>
          </div>

          <p className="text-[11px] opacity-75">
            Os registros serão vinculados exclusivamente à conta <strong>{previewData.verifiedUserEmail}</strong> com IDs isolados por usuário. Nenhum dado do seu <code>localStorage</code> será apagado.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPreviewData(null)}
              disabled={isMigrating}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isDark ? 'border-neutral-700 hover:bg-neutral-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmMigration}
              disabled={isMigrating || totalToImportCount === 0}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importando registros...</span>
                </>
              ) : totalToImportCount === 0 ? (
                <span>Todos os registros já estão na nuvem</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar Importação ({totalToImportCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Per-Record Migration Result Report (Never declares success if hasErrors is true) */}
      {migrationReport && (
        <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
          migrationReport.hasErrors
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              {migrationReport.hasErrors ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>
                {migrationReport.hasErrors
                  ? `Migração concluída com falhas: ${migrationReport.migrated} importado(s), ${migrationReport.failed} falha(s), ${migrationReport.skipped} ignorado(s).`
                  : `Importação concluída sem erros: ${migrationReport.migrated} importado(s) e ${migrationReport.skipped} mantido(s) sem duplicar.`}
              </span>
            </div>
            <button
              onClick={() => setMigrationReport(null)}
              className="p-1 rounded-lg opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {migrationReport.records.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 pt-1 border-t border-current/10">
              {migrationReport.records.map((rec, idx) => (
                <div key={`${rec.type}-${rec.localId}-${idx}`} className="flex items-center justify-between gap-2 text-[11px] py-0.5">
                  <span className="truncate font-medium">
                    [{rec.type === 'debt' ? 'Dívida' : 'Meta'}] {rec.title} <span className="opacity-60">(ID local: {rec.localId})</span>
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    rec.status === 'imported'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : rec.status === 'skipped'
                      ? 'bg-slate-500/20 text-slate-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {rec.status === 'imported' ? 'Importado' : rec.status === 'skipped' ? 'Ignorado (Já existe)' : `Falhou (${rec.detail})`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
