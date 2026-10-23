import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DebtItem, UserProfile } from '../types';

// Retrieve environment variables with fallback (isomorphic for Vite browser and Node/testing)
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

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
      id: String(row.id),
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
    const { error } = await supabase
      .from('debts')
      .upsert({
        id: debt.id,
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
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId)
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
// Never deletes or overwrites automatically. Checks existing IDs to avoid duplicate rows.
// ==========================================

export interface MigrationResult {
  totalFound: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

export async function migrateLocalDebtsToSupabase(
  localDebts: DebtItem[],
  userId: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalFound: localDebts.length,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  if (!supabase) {
    result.errors.push('Supabase não está configurado.');
    return result;
  }

  try {
    // 1. Fetch current debts in Supabase to verify which IDs already exist
    const { data: existingRows, error: fetchErr } = await supabase
      .from('debts')
      .select('id, title, creditor')
      .eq('user_id', userId);

    if (fetchErr) {
      result.errors.push(`Erro ao verificar dados existentes na nuvem: ${fetchErr.message}`);
      return result;
    }

    const existingIds = new Set((existingRows || []).map((r: any) => String(r.id)));

    // 2. Insert only debts that don't already exist in the user's Supabase storage
    for (const debt of localDebts) {
      if (existingIds.has(debt.id)) {
        result.skipped += 1;
        continue;
      }

      const { error: insertErr } = await supabase
        .from('debts')
        .insert({
          id: debt.id,
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertErr) {
        result.errors.push(`Falha ao migrar "${debt.title}": ${insertErr.message}`);
      } else {
        result.migrated += 1;
      }
    }
  } catch (err: any) {
    result.errors.push(`Erro inesperado durante a migração: ${err?.message || err}`);
  }

  return result;
}
