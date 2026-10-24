import { supabase, SUPABASE_CONFIG } from './supabase';

export interface TableDiagnosticResult {
  table: string;
  readAccess: 'OK' | 'MISSING_TABLE' | 'PERMISSION_DENIED' | 'ERROR';
  rowCountSample: number;
  code: string;
  message: string;
}

export interface ConnectionDiagnosticReport {
  timestamp: string;
  configured: boolean;
  keyStatus: string;
  authStatus: 'AUTHENTICATED' | 'ANONYMOUS' | 'AUTH_ERROR';
  userId: string | null;
  userEmail: string | null;
  role: string;
  tables: TableDiagnosticResult[];
  diagnosisCategory:
    | 'NOT_CONFIGURED'
    | 'SCHEMA_MISSING'
    | 'AUTH_REQUIRED_ANON_BLOCKED'
    | 'READ_PERMISSION_ERROR'
    | 'READ_OK_CHECK_WRITE_OR_RLS'
    | 'AUTH_ERROR';
  summary: string;
}

const PUBLIC_TABLES = ['profiles', 'debts', 'installments', 'payments', 'goals'] as const;

/**
 * Script temporário de diagnóstico somente-leitura para verificar no console do navegador
 * se eventuais erros de permissão decorrem de:
 * 1. Autenticação (sessão inexistente / papel `anon` vs `authenticated`)
 * 2. Leitura / Schema (tabelas ausentes no schema `public` ou bloqueio de SELECT/RLS)
 * 3. Escrita (quando a leitura e a sessão estão íntegras, isolando o problema para INSERT/UPDATE)
 */
export async function runBrowserConnectionTest(): Promise<ConnectionDiagnosticReport> {
  const timestamp = new Date().toISOString();
  const keyStatus = SUPABASE_CONFIG.isSecretBlocked
    ? 'secret_blocked'
    : !SUPABASE_CONFIG.hasKey || SUPABASE_CONFIG.isPlaceholder
      ? 'missing_or_placeholder'
      : SUPABASE_CONFIG.isJwtFormat || SUPABASE_CONFIG.isPublishableFormat
        ? 'valid_public_key'
        : 'custom_key';

  console.group('🔍 [Dívida Zero AI] Diagnóstico de Conexão e Permissões Supabase');
  console.log('Horário da verificação:', timestamp);
  console.log('Configuração do cliente:', {
    url: SUPABASE_CONFIG.url,
    isConfigured: SUPABASE_CONFIG.isConfigured,
    hasUrl: SUPABASE_CONFIG.hasUrl,
    hasKey: SUPABASE_CONFIG.hasKey,
    keyStatus,
  });

  if (!supabase || !SUPABASE_CONFIG.isConfigured) {
    const report: ConnectionDiagnosticReport = {
      timestamp,
      configured: false,
      keyStatus,
      authStatus: 'AUTH_ERROR',
      userId: null,
      userEmail: null,
      role: 'none',
      tables: [],
      diagnosisCategory: 'NOT_CONFIGURED',
      summary: `Cliente Supabase não inicializado (status da chave: ${keyStatus}).`,
    };
    console.warn('⚠️ Diagnóstico interrompido:', report.summary);
    console.groupEnd();
    return report;
  }

  // 1. Verificar sessão de autenticação atual
  let authStatus: ConnectionDiagnosticReport['authStatus'] = 'ANONYMOUS';
  let userId: string | null = null;
  let userEmail: string | null = null;
  let role = 'anon';

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      authStatus = 'AUTH_ERROR';
      console.error('❌ Erro ao consultar sessão de autenticação:', sessionError.message);
    } else if (sessionData?.session?.user) {
      authStatus = 'AUTHENTICATED';
      userId = sessionData.session.user.id;
      userEmail = sessionData.session.user.email ?? null;
      role = sessionData.session.user.role || 'authenticated';
      console.log('✅ Sessão ativa detectada:', {
        userId,
        userEmail,
        role,
        expiresAt: sessionData.session.expires_at
          ? new Date(sessionData.session.expires_at * 1000).toISOString()
          : 'N/A',
      });
    } else {
      console.info(
        'ℹ️ Nenhuma sessão autenticada ativa no momento. ' +
          'As consultas às tabelas (profiles, debts, installments, payments, goals) são realizadas apenas após o login.'
      );
    }
  } catch (err: any) {
    authStatus = 'AUTH_ERROR';
    console.error('❌ Exceção ao verificar sessão:', err?.message || err);
  }

  // Se não houver sessão autenticada ativa, não consultar as tabelas antes do login
  if (authStatus !== 'AUTHENTICATED' || !userId) {
    const diagnosisCategory: ConnectionDiagnosticReport['diagnosisCategory'] =
      authStatus === 'AUTH_ERROR' ? 'AUTH_ERROR' : 'AUTH_REQUIRED_ANON_BLOCKED';
    const summary =
      authStatus === 'AUTH_ERROR'
        ? 'DIAGNÓSTICO [AUTENTICAÇÃO]: Falha ao verificar a sessão no Supabase Auth.'
        : 'Aguardando login: conecte-se com sua conta para testar e sincronizar as 5 tabelas (profiles, debts, installments, payments, goals) com o cliente autenticado.';

    console.info('🧭 Status do Diagnóstico:', summary);
    console.info(
      '💡 Dica: Após fazer login, execute `window.runSupabaseTestConnection()` no console para testar as 5 tabelas.'
    );
    console.groupEnd();

    return {
      timestamp,
      configured: true,
      keyStatus,
      authStatus,
      userId,
      userEmail,
      role,
      tables: [],
      diagnosisCategory,
      summary,
    };
  }

  // 2. Com sessão ativa, testar leitura básica nas 5 tabelas usando o cliente Supabase já autenticado
  const tables: TableDiagnosticResult[] = [];

  for (const table of PUBLIC_TABLES) {
    try {
      const filterColumn = table === 'profiles' ? 'id' : 'user_id';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(filterColumn, userId)
        .limit(1);

      if (!error) {
        tables.push({
          table: `public.${table}`,
          readAccess: 'OK',
          rowCountSample: Array.isArray(data) ? data.length : 0,
          code: '200_OK',
          message: 'Leitura autenticada permitida (SELECT OK)',
        });
      } else {
        const code = error.code || 'UNKNOWN';
        const msg = error.message || 'Erro desconhecido';
        const isMissing =
          code === 'PGRST205' ||
          code === '42P01' ||
          msg.includes('Could not find the table') ||
          msg.includes('does not exist');
        const isPermDenied =
          code === '42501' ||
          msg.toLowerCase().includes('permission denied') ||
          msg.toLowerCase().includes('row-level security');

        tables.push({
          table: `public.${table}`,
          readAccess: isMissing ? 'MISSING_TABLE' : isPermDenied ? 'PERMISSION_DENIED' : 'ERROR',
          rowCountSample: 0,
          code,
          message: msg,
        });
      }
    } catch (err: any) {
      tables.push({
        table: `public.${table}`,
        readAccess: 'ERROR',
        rowCountSample: 0,
        code: 'EXCEPTION',
        message: err?.message || String(err),
      });
    }
  }

  console.log('📊 Resultado de leitura autenticada por tabela (schema public):');
  console.table(tables);

  // 3. Classificar o resultado das 5 tabelas para a sessão autenticada
  const missingTables = tables.filter((t) => t.readAccess === 'MISSING_TABLE');
  const permDeniedTables = tables.filter((t) => t.readAccess === 'PERMISSION_DENIED');
  const okTables = tables.filter((t) => t.readAccess === 'OK');

  let diagnosisCategory: ConnectionDiagnosticReport['diagnosisCategory'] = 'READ_OK_CHECK_WRITE_OR_RLS';
  let summary = '';

  if (missingTables.length > 0) {
    diagnosisCategory = 'SCHEMA_MISSING';
    summary =
      `DIAGNÓSTICO [SCHEMA / LEITURA]: ${missingTables.length}/5 tabelas não foram encontradas no schema public (${missingTables
        .map((t) => t.table)
        .join(', ')} - código PGRST205/42P01).`;
  } else if (permDeniedTables.length > 0) {
    diagnosisCategory = 'READ_PERMISSION_ERROR';
    summary =
      `DIAGNÓSTICO [PERMISSÃO DE LEITURA]: Usuário autenticado (${userEmail || userId}), mas a leitura retornou 42501 em: ` +
      `${permDeniedTables.map((t) => t.table).join(', ')}.`;
  } else if (okTables.length === PUBLIC_TABLES.length) {
    diagnosisCategory = 'READ_OK_CHECK_WRITE_OR_RLS';
    summary =
      `DIAGNÓSTICO [AUTENTICAÇÃO E LEITURA OK]: Sessão ativa (${userEmail || userId}) e leitura (SELECT) confirmada nas 5 tabelas (profiles, debts, installments, payments, goals).`;
  } else {
    summary =
      `DIAGNÓSTICO [PARCIAL]: Sessão=${authStatus}, Tabelas OK=${okTables.length}/${PUBLIC_TABLES.length}. ` +
      'Verifique a tabela detalhada acima no console.';
  }

  console.log('🧭 Conclusão do Diagnóstico:', summary);
  console.info(
    '💡 Dica: Você pode reexecutar este teste a qualquer momento no console digitando: window.runSupabaseTestConnection()'
  );
  console.groupEnd();

  return {
    timestamp,
    configured: true,
    keyStatus,
    authStatus,
    userId,
    userEmail,
    role,
    tables,
    diagnosisCategory,
    summary,
  };
}

declare global {
  interface Window {
    runSupabaseTestConnection?: () => Promise<ConnectionDiagnosticReport>;
  }
}

if (typeof window !== 'undefined') {
  window.runSupabaseTestConnection = runBrowserConnectionTest;
}
