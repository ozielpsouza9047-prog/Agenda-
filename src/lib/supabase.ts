import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DebtItem, GoalItem, UserProfile } from '../types';

// Retrieve environment variables with fallback (isomorphic for Vite browser and Node/testing)
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});
const supabaseUrl = (env.VITE_SUPABASE_URL || 'https://ihjpxxlotdmxvrccbukf.supabase.co').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rb7DK-hVidb3_zgYFE00jw_3GcU2BgI').trim();

/**
 * Checks if a provided key is a secret service_role key.
 * Security rule: NEVER allow service_role or sb_secret_ keys in frontend client.
 */
export const isSecretKey = (key: string): boolean => {
  const clean = (key || '').trim().toLowerCase();
  return clean.startsWith('sb_secret_') || clean.includes('service_role');
};

/**
 * Checks if key is still an unconfigured placeholder.
 */
export const isPlaceholderKey = (key: string): boolean => {
  const clean = (key || '').trim().toLowerCase();
  return (
    !clean ||
    clean.includes('coloque_aqui') ||
    clean.includes('sua_chave') ||
    clean.includes('your_anon_key') ||
    clean.includes('your-anon-key') ||
    clean === 'coloque_aqui_sua_chave_publica_sb_publishable'
  );
};

/**
 * Validates public key format:
 * - Accepts new Supabase publishable keys: "sb_publishable_..."
 * - Accepts standard Supabase anon JWT keys: "eyJ..."
 * - Rejects secret keys ("sb_secret_", "service_role")
 * - Rejects unconfigured placeholders
 */
export const isValidPublicKey = (key: string): boolean => {
  const clean = (key || '').trim();
  if (!clean || isSecretKey(clean) || isPlaceholderKey(clean)) {
    return false;
  }
  return clean.startsWith('sb_publishable_') || clean.startsWith('eyJ') || clean.length >= 20;
};

// Check if credentials are validly provided for live operation
export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    supabaseUrl.startsWith('http') &&
    isValidPublicKey(supabaseAnonKey)
  );
};

// Configuration inspection state
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  hasUrl: Boolean(supabaseUrl && supabaseUrl.startsWith('http')),
  hasKey: Boolean(supabaseAnonKey),
  isPlaceholder: isPlaceholderKey(supabaseAnonKey),
  isSecretBlocked: isSecretKey(supabaseAnonKey),
  isPublishableFormat: supabaseAnonKey.startsWith('sb_publishable_'),
  isJwtFormat: supabaseAnonKey.startsWith('eyJ'),
  isConfigured: isSupabaseConfigured(),
};

// Singleton client instance (safe creation with security protection against secret keys)
export const supabase: SupabaseClient | null = (() => {
  if (isSecretKey(supabaseAnonKey)) {
    console.error(
      '[Supabase Security] BLOQUEIO CRÍTICO: Chave "sb_secret_" ou "service_role" detectada. Chaves de serviço/secretas NUNCA devem ser usadas no frontend para proteger privilégios administrativos. O cliente foi desabilitado.'
    );
    return null;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('[Supabase Init Error]:', err);
    return null;
  }
})();

// Diagnostic details interface
export interface SupabaseDiagnostics {
  url: string;
  projectRef: string | null;
  gatewayReachable: boolean;
  httpStatus: number | null;
  keyStatus: 'valid_publishable' | 'valid_jwt' | 'placeholder' | 'secret_blocked' | 'missing' | 'invalid';
  authHealthOk: boolean;
  schemaStatus: 'applied' | 'pending_schema' | 'unauthorized' | 'unknown';
  details: string;
  testedAt: string;
}

/**
 * Tests live connection to the configured Supabase instance
 */
export async function testSupabaseConnection(): Promise<SupabaseDiagnostics> {
  const testedAt = new Date().toISOString();
  const url = supabaseUrl;

  const keyStatus = isSecretKey(supabaseAnonKey)
    ? 'secret_blocked'
    : isPlaceholderKey(supabaseAnonKey)
    ? 'placeholder'
    : !supabaseAnonKey
    ? 'missing'
    : supabaseAnonKey.startsWith('sb_publishable_')
    ? 'valid_publishable'
    : supabaseAnonKey.startsWith('eyJ')
    ? 'valid_jwt'
    : isValidPublicKey(supabaseAnonKey)
    ? 'valid_publishable'
    : 'invalid';

  const diag: SupabaseDiagnostics = {
    url: url || '(não configurada)',
    projectRef: null,
    gatewayReachable: false,
    httpStatus: null,
    keyStatus,
    authHealthOk: false,
    schemaStatus: 'unknown',
    details: '',
    testedAt,
  };

  if (!url || !url.startsWith('http')) {
    diag.details = 'VITE_SUPABASE_URL ausente ou inválida no .env.';
    return diag;
  }

  if (keyStatus === 'secret_blocked') {
    diag.details = 'CHAVE SECRETA BLOQUEADA: Nunca utilize sb_secret_ ou service_role no frontend.';
    return diag;
  }

  try {
    const headers: Record<string, string> = {};
    if (isValidPublicKey(supabaseAnonKey)) {
      headers['apikey'] = supabaseAnonKey;
      headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
    }

    const res = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers,
    });

    diag.gatewayReachable = true;
    diag.httpStatus = res.status;
    const ref = res.headers.get('sb-project-ref');
    if (ref) diag.projectRef = ref;

    if (res.ok) {
      diag.authHealthOk = true;
    }

    if (keyStatus === 'placeholder') {
      diag.schemaStatus = 'unauthorized';
      diag.details = `Instância do Supabase online (${diag.projectRef || 'ihjpxxlotdmxvrccbukf'}), mas a chave pública ainda é o placeholder. Configure sua chave real sb_publishable_... ou anon no .env.`;
      return diag;
    }

    if (supabase) {
      const { error } = await supabase.from('debts').select('id').limit(1);
      if (!error) {
        diag.schemaStatus = 'applied';
        diag.details = 'Conexão Supabase OK. Tabelas e RLS operacionais no banco.';
      } else {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          diag.schemaStatus = 'pending_schema';
          diag.details = 'Banco acessível, porém a tabela "debts" não foi encontrada. Aplique o supabase/schema.sql no SQL Editor.';
        } else if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
          diag.schemaStatus = 'applied';
          diag.details = 'Tabelas encontradas e protegidas por RLS (autenticação de usuário necessária para acesso aos dados).';
        } else if (error.message?.includes('JWT') || error.message?.includes('API key')) {
          diag.schemaStatus = 'unauthorized';
          diag.details = `Chave pública recusada pelo Supabase: ${error.message}`;
        } else {
          diag.schemaStatus = 'unknown';
          diag.details = `Aviso do banco de dados: ${error.message}`;
        }
      }
    } else {
      diag.details = 'Cliente Supabase aguardando chave pública válida.';
    }
  } catch (err: any) {
    diag.details = `Erro de rede ao conectar com ${url}: ${err?.message || err}`;
  }

  return diag;
}


// ==========================================
// AUTHENTICATION SERVICES
// ==========================================

export async function getCurrentAuthUser(): Promise<User | null> {
  if (!supabase) return null;
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return null;
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      if (error.name !== 'AuthSessionMissingError') {
        console.warn('Supabase auth.getUser error:', error.message);
      }
      return null;
    }
    return user;
  } catch (err) {
    console.error('Error getting current auth user:', err);
    return null;
  }
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase não está configurado. Configure as variáveis de ambiente.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  if (!supabase) throw new Error('Supabase não está configurado. Configure as variáveis de ambiente.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error signing out:', error);
}

// ==========================================
// PROFILE PERSISTENCE (RLS PROTECTED)
// ==========================================

export async function fetchCloudProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching cloud profile:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      name: data.name || '',
      email: data.email || '',
      avatarUrl: data.avatar_url || '',
      currency: data.currency || 'BRL',
      createdAt: data.created_at ? new Date(data.created_at).toLocaleDateString('pt-BR') : 'Data não disponível',
      role: 'user',
      hideValuesOnDashboard: Boolean(data.hide_values_on_dashboard),
      allowAiDataAnalysis: data.allow_ai_data_analysis !== false,
      biometricLock: Boolean(data.biometric_lock),
      notificationPreferences: data.notification_preferences || {
        enabled: true,
        notify7Days: true,
        notify3Days: true,
        notify1Day: true,
        notifyDueDay: true,
        notifyOverdue: true,
        emailSummary: false,
      },
    };
  } catch (err) {
    console.error('Error loading cloud profile:', err);
    return null;
  }
}

export async function saveCloudProfile(profile: UserProfile, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: profile.name,
        email: profile.email,
        avatar_url: profile.avatarUrl || null,
        currency: profile.currency,
        hide_values_on_dashboard: profile.hideValuesOnDashboard,
        allow_ai_data_analysis: profile.allowAiDataAnalysis,
        biometric_lock: profile.biometricLock,
        notification_preferences: profile.notificationPreferences,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving cloud profile:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving cloud profile:', err);
    return false;
  }
}

// ==========================================
// USER-SCOPED ID NORMALIZATION (PREVENTS CROSS-USER SHORT ID COLLISIONS)
// Local IDs ('1', '2', 'goal-1') remain untouched in localStorage.
// In Supabase, IDs are deterministically scoped as `${userId}:${localId}`.
// ==========================================

export function toCloudScopedId(userId: string, localId: string): string {
  const cleanUser = (userId || '').trim();
  const cleanId = String(localId || '').trim();
  if (!cleanUser || !cleanId) return cleanId;
  const prefix = `${cleanUser}:`;
  return cleanId.startsWith(prefix) ? cleanId : `${prefix}${cleanId}`;
}

export function fromCloudScopedId(userId: string, cloudId: string): string {
  const cleanUser = (userId || '').trim();
  const cleanId = String(cloudId || '').trim();
  if (!cleanUser || !cleanId) return cleanId;
  const prefix = `${cleanUser}:`;
  return cleanId.startsWith(prefix) ? cleanId.slice(prefix.length) : cleanId;
}

function buildDebtFingerprint(d: { title: string; creditor: string; dueDate: string; totalAmount: number }): string {
  return [
    (d.title || '').trim().toLowerCase(),
    (d.creditor || '').trim().toLowerCase(),
    (d.dueDate || '').trim(),
    Number(d.totalAmount || 0).toFixed(2),
  ].join('|');
}

function buildGoalFingerprint(g: { title: string; targetPayoffDate: string }): string {
  return [
    (g.title || '').trim().toLowerCase(),
    (g.targetPayoffDate || '').trim(),
  ].join('|');
}

// ==========================================
// DEBTS CRUD (RLS PROTECTED)
// ==========================================

export async function fetchCloudDebts(userId: string): Promise<DebtItem[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cloud debts:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: fromCloudScopedId(userId, String(row.id)),
      title: row.title,
      creditor: row.creditor,
      category: row.category,
      totalAmount: Number(row.total_amount) || 0,
      remainingAmount: Number(row.remaining_amount) || 0,
      monthlyPayment: Number(row.monthly_payment) || 0,
      dueDate: row.due_date,
      status: row.status,
      installmentsTotal: Number(row.installments_total) || 1,
      installmentsPaid: Number(row.installments_paid) || 0,
      interestRate: Number(row.interest_rate) || 0,
    }));
  } catch (err) {
    console.error('Error in fetchCloudDebts:', err);
    return null;
  }
}

export async function saveCloudDebt(debt: DebtItem, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const scopedId = toCloudScopedId(userId, debt.id);
    const { error } = await supabase
      .from('debts')
      .upsert({
        id: scopedId,
        user_id: userId,
        title: debt.title,
        creditor: debt.creditor,
        category: debt.category,
        total_amount: debt.totalAmount,
        remaining_amount: debt.remainingAmount,
        monthly_payment: debt.monthlyPayment,
        due_date: debt.dueDate,
        status: debt.status,
        installments_total: debt.installmentsTotal,
        installments_paid: debt.installmentsPaid,
        interest_rate: debt.interestRate,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving debt to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception saving debt to Supabase:', err);
    return false;
  }
}

export async function deleteCloudDebt(debtId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const scopedId = toCloudScopedId(userId, debtId);
    const { error } = await supabase
      .from('debts')
      .delete()
      .in('id', [debtId, scopedId])
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting debt from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception deleting debt from Supabase:', err);
    return false;
  }
}

// ==========================================
// SAFE DATA MIGRATION FROM LOCALSTORAGE
// Never deletes or overwrites automatically. Validates session, schema, and permissions first.
// ==========================================

export interface RecordMigrationReport {
  type: 'debt' | 'goal';
  localId: string;
  cloudId: string;
  title: string;
  status: 'imported' | 'skipped' | 'failed';
  detail: string;
}

export interface MigrationPreview {
  ready: boolean;
  blockingError: string | null;
  missingTables: string[];
  verifiedUserId: string | null;
  verifiedUserEmail: string | null;
  debtsTotalLocal: number;
  debtsToImport: DebtItem[];
  debtsAlreadyInCloud: DebtItem[];
  goalsTotalLocal: number;
  goalsToImport: GoalItem[];
  goalsAlreadyInCloud: GoalItem[];
}

export interface MigrationResult {
  totalFound: number;
  migrated: number;
  skipped: number;
  failed: number;
  hasErrors: boolean;
  errors: string[];
  records: RecordMigrationReport[];
}

/**
 * Step 1: Read-only pre-validation and preview before any migration write.
 * Verifies active authenticated session, table existence ('profiles', 'debts', 'goals'),
 * RLS read permissions, and calculates exact new vs. already-migrated items.
 */
export async function prepareLocalMigrationPreview(
  localDebts: DebtItem[],
  localGoals: GoalItem[],
  expectedUserId: string
): Promise<MigrationPreview> {
  const preview: MigrationPreview = {
    ready: false,
    blockingError: null,
    missingTables: [],
    verifiedUserId: null,
    verifiedUserEmail: null,
    debtsTotalLocal: localDebts.length,
    debtsToImport: [],
    debtsAlreadyInCloud: [],
    goalsTotalLocal: localGoals.length,
    goalsToImport: [],
    goalsAlreadyInCloud: [],
  };

  if (!supabase || !isSupabaseConfigured()) {
    preview.blockingError = 'O cliente Supabase não está configurado. Verifique as variáveis de ambiente.';
    return preview;
  }

  try {
    // 1. Validate active authenticated session and confirm user identity matches
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session?.user) {
      preview.blockingError = 'Sessão de autenticação inválida ou expirada. Faça login novamente antes de migrar.';
      return preview;
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user || user.id !== expectedUserId) {
      preview.blockingError = 'Não foi possível confirmar a identidade do usuário autenticado na sessão atual.';
      return preview;
    }

    preview.verifiedUserId = user.id;
    preview.verifiedUserEmail = user.email || null;

    // 2. Check required remote tables ('profiles', 'debts', 'goals') and RLS read permission
    const requiredTables = ['profiles', 'debts', 'goals'] as const;
    for (const table of requiredTables) {
      const filterCol = table === 'profiles' ? 'id' : 'user_id';
      const { error: probeErr } = await supabase
        .from(table)
        .select('id')
        .eq(filterCol, user.id)
        .limit(1);

      if (probeErr) {
        if (probeErr.code === 'PGRST205' || probeErr.code === '42P01' || probeErr.message?.includes('schema cache')) {
          preview.missingTables.push(table);
        } else if (probeErr.code === '42501' || probeErr.message?.includes('permission denied') || probeErr.message?.includes('row-level security')) {
          preview.blockingError = `Erro de permissão RLS ao consultar a tabela "${table}" (${probeErr.code || '42501'}): ${probeErr.message}`;
          return preview;
        } else {
          preview.blockingError = `Falha ao validar a tabela "${table}" no Supabase (${probeErr.code || 'erro'}): ${probeErr.message}`;
          return preview;
        }
      }
    }

    if (preview.missingTables.length > 0) {
      preview.blockingError = `O schema remoto no Supabase ainda não está pronto. Tabelas ausentes: ${preview.missingTables.join(', ')}. Execute primeiro o script supabase/schema.sql no SQL Editor do Supabase antes de iniciar a migração.`;
      return preview;
    }

    // 3. Inspect existing debts for this authenticated user to avoid duplicates
    const { data: existingDebtRows, error: debtFetchErr } = await supabase
      .from('debts')
      .select('id, title, creditor, due_date, total_amount')
      .eq('user_id', user.id);

    if (debtFetchErr) {
      preview.blockingError = `Erro ao consultar dívidas existentes do usuário: ${debtFetchErr.message}`;
      return preview;
    }

    const existingDebtIds = new Set<string>();
    const existingDebtFingerprints = new Set<string>();
    for (const row of existingDebtRows || []) {
      const rawId = String(row.id);
      existingDebtIds.add(rawId);
      existingDebtIds.add(fromCloudScopedId(user.id, rawId));
      existingDebtFingerprints.add(
        buildDebtFingerprint({
          title: row.title,
          creditor: row.creditor,
          dueDate: row.due_date,
          totalAmount: Number(row.total_amount) || 0,
        })
      );
    }

    const seenLocalDebtKeys = new Set<string>();
    for (const debt of localDebts) {
      const scopedId = toCloudScopedId(user.id, debt.id);
      const fp = buildDebtFingerprint(debt);
      if (
        existingDebtIds.has(debt.id) ||
        existingDebtIds.has(scopedId) ||
        existingDebtFingerprints.has(fp) ||
        seenLocalDebtKeys.has(scopedId) ||
        seenLocalDebtKeys.has(fp)
      ) {
        preview.debtsAlreadyInCloud.push(debt);
      } else {
        seenLocalDebtKeys.add(scopedId);
        seenLocalDebtKeys.add(fp);
        preview.debtsToImport.push(debt);
      }
    }

    // 4. Inspect existing goals for this authenticated user to avoid duplicates
    const { data: existingGoalRows, error: goalFetchErr } = await supabase
      .from('goals')
      .select('id, title, target_payoff_date')
      .eq('user_id', user.id);

    if (goalFetchErr) {
      preview.blockingError = `Erro ao consultar metas existentes do usuário: ${goalFetchErr.message}`;
      return preview;
    }

    const existingGoalIds = new Set<string>();
    const existingGoalFingerprints = new Set<string>();
    for (const row of existingGoalRows || []) {
      const rawId = String(row.id);
      existingGoalIds.add(rawId);
      existingGoalIds.add(fromCloudScopedId(user.id, rawId));
      existingGoalFingerprints.add(
        buildGoalFingerprint({
          title: row.title,
          targetPayoffDate: row.target_payoff_date,
        })
      );
    }

    const seenLocalGoalKeys = new Set<string>();
    for (const goal of localGoals) {
      const scopedId = toCloudScopedId(user.id, goal.id);
      const fp = buildGoalFingerprint(goal);
      if (
        existingGoalIds.has(goal.id) ||
        existingGoalIds.has(scopedId) ||
        existingGoalFingerprints.has(fp) ||
        seenLocalGoalKeys.has(scopedId) ||
        seenLocalGoalKeys.has(fp)
      ) {
        preview.goalsAlreadyInCloud.push(goal);
      } else {
        seenLocalGoalKeys.add(scopedId);
        seenLocalGoalKeys.add(fp);
        preview.goalsToImport.push(goal);
      }
    }

    preview.ready = true;
    return preview;
  } catch (err: any) {
    preview.blockingError = `Erro inesperado ao validar prévia da migração: ${err?.message || err}`;
    return preview;
  }
}

/**
 * Step 2: Executes the confirmed migration of local debts and goals for the authenticated user.
 * Never deletes or modifies localStorage. Reports status per record and never declares success on error.
 */
export async function migrateLocalDebtsToSupabase(
  localDebts: DebtItem[],
  userId: string,
  localGoals: GoalItem[] = []
): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalFound: localDebts.length + localGoals.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    hasErrors: false,
    errors: [],
    records: [],
  };

  // Run full readiness and preview verification before writing anything
  const preview = await prepareLocalMigrationPreview(localDebts, localGoals, userId);
  if (!preview.ready || !preview.verifiedUserId) {
    const errMsg = preview.blockingError || 'A validação prévia da migração falhou.';
    result.errors.push(errMsg);
    result.hasErrors = true;
    return result;
  }

  const verifiedUserId = preview.verifiedUserId;

  // Record skipped debts
  for (const skippedDebt of preview.debtsAlreadyInCloud) {
    result.skipped += 1;
    result.records.push({
      type: 'debt',
      localId: skippedDebt.id,
      cloudId: toCloudScopedId(verifiedUserId, skippedDebt.id),
      title: skippedDebt.title,
      status: 'skipped',
      detail: 'Já existente na nuvem para este usuário (mantido sem duplicar).',
    });
  }

  // Record skipped goals
  for (const skippedGoal of preview.goalsAlreadyInCloud) {
    result.skipped += 1;
    result.records.push({
      type: 'goal',
      localId: skippedGoal.id,
      cloudId: toCloudScopedId(verifiedUserId, skippedGoal.id),
      title: skippedGoal.title,
      status: 'skipped',
      detail: 'Meta já existente na nuvem para este usuário (mantida sem duplicar).',
    });
  }

  // Import only new debts with user-scoped ID
  for (const debt of preview.debtsToImport) {
    const cloudId = toCloudScopedId(verifiedUserId, debt.id);
    const nowIso = new Date().toISOString();

    const { error: insertErr } = await supabase!
      .from('debts')
      .insert({
        id: cloudId,
        user_id: verifiedUserId,
        title: debt.title,
        creditor: debt.creditor,
        category: debt.category,
        total_amount: debt.totalAmount,
        remaining_amount: debt.remainingAmount,
        monthly_payment: debt.monthlyPayment,
        due_date: debt.dueDate,
        status: debt.status,
        installments_total: debt.installmentsTotal,
        installments_paid: debt.installmentsPaid,
        interest_rate: debt.interestRate,
        created_at: nowIso,
        updated_at: nowIso,
      });

    if (insertErr) {
      result.failed += 1;
      const errDetail = `Falha ao importar dívida "${debt.title}" (${insertErr.code || 'erro'}): ${insertErr.message}`;
      result.errors.push(errDetail);
      result.records.push({
        type: 'debt',
        localId: debt.id,
        cloudId,
        title: debt.title,
        status: 'failed',
        detail: `${insertErr.code || 'Erro'}: ${insertErr.message}`,
      });
    } else {
      result.migrated += 1;
      result.records.push({
        type: 'debt',
        localId: debt.id,
        cloudId,
        title: debt.title,
        status: 'imported',
        detail: 'Importada com sucesso e vinculada ao usuário autenticado.',
      });
    }
  }

  // Import only new goals with user-scoped ID
  for (const goal of preview.goalsToImport) {
    const cloudId = toCloudScopedId(verifiedUserId, goal.id);
    const nowIso = new Date().toISOString();

    const { error: insertErr } = await supabase!
      .from('goals')
      .insert({
        id: cloudId,
        user_id: verifiedUserId,
        title: goal.title,
        monthly_reduction_goal: goal.monthlyReductionGoal,
        extra_payment_goal: goal.extraPaymentGoal,
        target_payoff_date: goal.targetPayoffDate,
        created_at: nowIso,
        updated_at: nowIso,
      });

    if (insertErr) {
      result.failed += 1;
      const errDetail = `Falha ao importar meta "${goal.title}" (${insertErr.code || 'erro'}): ${insertErr.message}`;
      result.errors.push(errDetail);
      result.records.push({
        type: 'goal',
        localId: goal.id,
        cloudId,
        title: goal.title,
        status: 'failed',
        detail: `${insertErr.code || 'Erro'}: ${insertErr.message}`,
      });
    } else {
      result.migrated += 1;
      result.records.push({
        type: 'goal',
        localId: goal.id,
        cloudId,
        title: goal.title,
        status: 'imported',
        detail: 'Meta importada com sucesso e vinculada ao usuário autenticado.',
      });
    }
  }

  result.hasErrors = result.failed > 0 || result.errors.length > 0;
  return result;
}

