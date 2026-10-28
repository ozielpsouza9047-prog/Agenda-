import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DebtItem, GoalItem, UserProfile } from '../types';

// Retrieve environment variables (isomorphic for Vite browser and Node/testing)
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});
const DEFAULT_SUPABASE_URL = 'https://ihjpxxlotdmxvrccbukf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_rb7DK-hVidb3_zgYFE00jw_3GcU2BgI';
const rawSupabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const rawSupabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * Checks if a value is an unconfigured placeholder or literal variable name.
 */
export const isPlaceholderOrLiteral = (value: string): boolean => {
  const clean = (value || '').trim().toLowerCase();
  return (
    !clean ||
    clean === 'vite_supabase_url' ||
    clean === 'vite_supabase_anon_key' ||
    clean.startsWith('vite_') ||
    clean.includes('coloque_aqui') ||
    clean.includes('sua_chave') ||
    clean.includes('sua_url') ||
    clean.includes('your_anon_key') ||
    clean.includes('your-anon-key') ||
    clean.includes('your_supabase_url') ||
    clean.includes('placeholder') ||
    clean === 'undefined' ||
    clean === 'null' ||
    clean === 'coloque_aqui_sua_chave_publica_sb_publishable'
  );
};

/**
 * Validates that a Supabase URL is a real HTTP/HTTPS endpoint and not a literal variable name or placeholder.
 */
export const isValidSupabaseUrl = (url: string): boolean => {
  const clean = (url || '').trim();
  if (!clean || isPlaceholderOrLiteral(clean)) {
    return false;
  }
  try {
    const parsed = new URL(clean);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
};

/**
 * Checks if a provided key is a secret service_role key.
 * Security rule: NEVER allow service_role or sb_secret_ keys in frontend client.
 */
export const isSecretKey = (key: string): boolean => {
  const clean = (key || '').trim().toLowerCase();
  return clean.startsWith('sb_secret_') || clean.includes('service_role');
};

/**
 * Checks if key is still an unconfigured placeholder or literal variable name.
 */
export const isPlaceholderKey = (key: string): boolean => {
  return isPlaceholderOrLiteral(key);
};

/**
 * Validates public key format:
 * - Accepts new Supabase publishable keys: "sb_publishable_..."
 * - Accepts standard Supabase anon JWT keys: "eyJ..." (3-part JWT)
 * - Rejects secret keys ("sb_secret_", "service_role")
 * - Rejects unconfigured placeholders and literal variable names
 */
export const isValidPublicKey = (key: string): boolean => {
  const clean = (key || '').trim();
  if (!clean || isSecretKey(clean) || isPlaceholderKey(clean)) {
    return false;
  }
  const isPublishable = clean.startsWith('sb_publishable_') && clean.length > 20;
  const isJwt = clean.startsWith('eyJ') && clean.split('.').length === 3 && clean.length > 40;
  return isPublishable || isJwt;
};

const supabaseUrl = isValidSupabaseUrl(rawSupabaseUrl) ? rawSupabaseUrl : DEFAULT_SUPABASE_URL;
const supabaseAnonKey = isSecretKey(rawSupabaseAnonKey)
  ? rawSupabaseAnonKey
  : isValidPublicKey(rawSupabaseAnonKey)
  ? rawSupabaseAnonKey
  : DEFAULT_SUPABASE_ANON_KEY;

// Check if credentials are validly provided for live operation
export const isSupabaseConfigured = (): boolean => {
  return (
    isValidSupabaseUrl(supabaseUrl) &&
    isValidPublicKey(supabaseAnonKey)
  );
};

// Configuration inspection state
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  hasUrl: isValidSupabaseUrl(supabaseUrl),
  hasKey: isValidPublicKey(supabaseAnonKey),
  isPlaceholder: isPlaceholderKey(supabaseAnonKey),
  isSecretBlocked: isSecretKey(supabaseAnonKey),
  isPublishableFormat: isValidPublicKey(supabaseAnonKey) && supabaseAnonKey.startsWith('sb_publishable_'),
  isJwtFormat: isValidPublicKey(supabaseAnonKey) && supabaseAnonKey.startsWith('eyJ'),
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
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
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

  const keyStatus = !supabaseAnonKey
    ? 'missing'
    : isSecretKey(supabaseAnonKey)
    ? 'secret_blocked'
    : isPlaceholderKey(supabaseAnonKey)
    ? 'placeholder'
    : isValidPublicKey(supabaseAnonKey)
    ? supabaseAnonKey.startsWith('sb_publishable_')
      ? 'valid_publishable'
      : 'valid_jwt'
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

  if (!isValidSupabaseUrl(url)) {
    diag.details = 'URL do projeto ausente ou inválida.';
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

    if (keyStatus === 'missing' || keyStatus === 'placeholder' || keyStatus === 'invalid') {
      diag.schemaStatus = 'unauthorized';
      diag.details = `Instância do Supabase online (${diag.projectRef || 'ihjpxxlotdmxvrccbukf'}), mas a credencial pública real está pendente de configuração. A autenticação permanece desativada até ser configurada.`;
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
          diag.details = 'Banco acessível, porém as tabelas do schema public (profiles, debts, installments, payments, goals) ainda não foram encontradas (PGRST205). Execute o arquivo supabase/schema.sql no SQL Editor do Supabase.';
        } else if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
          diag.schemaStatus = 'applied';
          diag.details = 'Tabelas encontradas e protegidas por RLS e privilégios restritos à role authenticated (faça login para acessar seus dados).';
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

/**
 * Verifies that an active authenticated JWT session exists in Supabase Auth
 * and matches the expected userId before querying or mutating RLS-protected tables.
 * Prevents unauthenticated 'anon' table queries (42501 permission denied) and
 * cross-user RLS policy violations (auth.uid() mismatch).
 */
async function getVerifiedSessionUser(expectedUserId?: string): Promise<User | null> {
  if (!supabase) return null;
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token || !session?.user) {
      return null;
    }
    if (expectedUserId && session.user.id !== expectedUserId) {
      console.warn('[Supabase RLS Guard] ID do usuário diverge da sessão autenticada ativa.');
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

export async function getCurrentAuthUser(): Promise<User | null> {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('divida_zero_active_session_user');
    localStorage.removeItem('divida_zero_custom_credentials');
  }

  if (!supabase) return null;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!sessionError && session?.user) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        return user;
      }
      // Preserve valid persisted session user if offline or during token refresh
      return session.user;
    }
  } catch (err) {
    console.error('Error getting current auth user:', err);
  }

  return null;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase não está configurado. Configure as variáveis de ambiente.');
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  if (!supabase) throw new Error('Supabase não está configurado. Configure as variáveis de ambiente.');
  const cleanEmail = email.trim().toLowerCase();
  const displayName = (name || '').trim() || cleanEmail.split('@')[0];

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      data: {
        name: displayName,
      },
    },
  });

  if (error) throw error;

  let activeUser = data.user;
  let activeSession = data.session;

  // If the account was auto-confirmed on the database side, establish the persistent session immediately
  if (activeUser && !activeSession) {
    const signInAttempt = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (!signInAttempt.error && signInAttempt.data.session) {
      activeUser = signInAttempt.data.user;
      activeSession = signInAttempt.data.session;
    }
  }

  // Ensure the authenticated user's profile row exists in public.profiles (respecting RLS auth.uid() = id)
  if (activeUser && activeSession) {
    try {
      await supabase.from('profiles').upsert(
        {
          id: activeUser.id,
          name: displayName,
          email: cleanEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch {
      // Profile trigger may have already created the row
    }
  }

  return {
    user: activeUser,
    session: activeSession,
  };
}

export async function updateUserCredentials(params: {
  newEmail?: string;
  newPassword?: string;
  currentEmail?: string;
}): Promise<{ emailUpdated: boolean; passwordUpdated: boolean; message: string }> {
  const cleanEmail = params.newEmail?.trim().toLowerCase();
  const cleanPassword = params.newPassword?.trim();

  if (!cleanEmail && !cleanPassword) {
    throw new Error('Informe um novo e-mail ou uma nova senha para atualizar.');
  }

  if (cleanPassword && cleanPassword.length < 6) {
    throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
  }

  const verifiedUser = await getVerifiedSessionUser();
  if (!supabase || !verifiedUser) {
    throw new Error('Sessão expirada ou não autenticada. Faça login novamente para atualizar suas credenciais.');
  }

  let emailUpdated = false;
  let passwordUpdated = false;
  const messages: string[] = [];

  // 1. Update password if provided
  if (cleanPassword) {
    const { error: pwdError } = await supabase.auth.updateUser({
      password: cleanPassword,
    });
    if (pwdError) {
      throw new Error(`Erro ao atualizar senha no Supabase: ${pwdError.message}`);
    }
    passwordUpdated = true;
    messages.push('Senha atualizada com sucesso na nuvem!');
  }

  // 2. Update email if provided and changed
  if (cleanEmail && cleanEmail !== (verifiedUser.email || '').toLowerCase()) {
    // Try direct RPC first (if user installed the instant email change helper)
    const { error: rpcError } = await supabase.rpc('update_my_email_direct', {
      new_email: cleanEmail,
    });

    if (!rpcError) {
      await supabase.auth.refreshSession();
      emailUpdated = true;
      messages.push(`E-mail alterado imediatamente para ${cleanEmail}!`);
    } else {
      // Standard Supabase Auth updateUser
      const { error: emailError } = await supabase.auth.updateUser({
        email: cleanEmail,
      });
      if (emailError) {
        throw new Error(`Erro ao solicitar troca de e-mail: ${emailError.message}`);
      }
      // Also update public.profiles email so UI reflects the target email
      await supabase
        .from('profiles')
        .update({ email: cleanEmail, updated_at: new Date().toISOString() })
        .eq('id', verifiedUser.id);

      emailUpdated = true;
      messages.push(`E-mail atualizado para ${cleanEmail} (caso o Supabase exija confirmação por link, verifique sua caixa de entrada).`);
    }
  }

  return {
    emailUpdated,
    passwordUpdated,
    message: messages.join(' ') || 'Dados de acesso atualizados com sucesso!',
  };
}

export async function requestPasswordReset(email: string) {
  if (!supabase) throw new Error('Supabase não está configurado. Configure as variáveis de ambiente.');
  const cleanEmail = email.trim().toLowerCase();
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo,
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('divida_zero_active_session_user');
    localStorage.removeItem('divida_zero_custom_credentials');
  }
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error signing out:', error);
}

// ==========================================
// PROFILE & AVATAR STORAGE PERSISTENCE (RLS PROTECTED)
// ==========================================

export const AVATARS_BUCKET = 'avatars';

export interface AvatarUploadResult {
  avatarUrl: string;
  storageUsed: boolean;
  bucketConfigured: boolean;
  message: string;
}

/**
 * Compresses and resizes an image file in the browser using HTML5 Canvas.
 * Ensures mobile gallery photos (which are often 4MB-12MB) upload rapidly
 * and also provides a lightweight Data URL fallback if the Storage bucket is not yet created.
 */
export async function optimizeAvatarImage(
  file: File,
  maxDimension = 512,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string; mimeType: string; ext: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem selecionado.'));
    reader.onload = () => {
      const dataUrlSource = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      img.onload = () => {
        try {
          let width = img.width || maxDimension;
          let height = img.height || maxDimension;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              blob: file,
              dataUrl: dataUrlSource,
              mimeType: file.type || 'image/jpeg',
              ext: 'jpg',
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const outputMime = 'image/jpeg';
          const optimizedDataUrl = canvas.toDataURL(outputMime, quality);

          canvas.toBlob(
            (blob) => {
              resolve({
                blob: blob || file,
                dataUrl: optimizedDataUrl,
                mimeType: outputMime,
                ext: 'jpg',
              });
            },
            outputMime,
            quality
          );
        } catch {
          resolve({
            blob: file,
            dataUrl: dataUrlSource,
            mimeType: file.type || 'image/jpeg',
            ext: 'jpg',
          });
        }
      };
      img.src = dataUrlSource;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads the authenticated user's profile photo to Supabase Storage bucket 'avatars'
 * inside the user-isolated path `<auth.uid()>/avatar-<timestamp>.jpg`, then persists
 * the resulting URL in `public.profiles.avatar_url` and `auth.users` metadata.
 * If the 'avatars' bucket has not been created yet in the remote Supabase project,
 * safely persists the optimized image in `public.profiles.avatar_url` so the user's
 * photo is never lost.
 */
export async function uploadProfileAvatar(
  file: File,
  userId: string
): Promise<AvatarUploadResult> {
  if (!supabase) {
    throw new Error('Cliente Supabase não configurado.');
  }

  const verifiedUser = await getVerifiedSessionUser(userId);
  if (!verifiedUser) {
    throw new Error('Sessão inválida ou expirada. Faça login novamente para alterar sua foto.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido (JPG, PNG, WEBP ou GIF) da sua galeria.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('A imagem selecionada excede 10 MB. Escolha uma foto menor.');
  }

  // 1. Optimize image for fast mobile upload
  const optimized = await optimizeAvatarImage(file, 512, 0.85);
  const filePath = `${verifiedUser.id}/avatar-${Date.now()}.${optimized.ext}`;

  let finalAvatarUrl = optimized.dataUrl;
  let storageUsed = false;
  let bucketConfigured = true;

  // 2. Attempt upload to Supabase Storage bucket 'avatars' (scoped to verifiedUser.id folder)
  try {
    // Clean up older avatar files in the user's own folder if accessible
    const { data: existingFiles } = await supabase.storage
      .from(AVATARS_BUCKET)
      .list(verifiedUser.id, { limit: 20 });

    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(filePath, optimized.blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: optimized.mimeType,
      });

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        finalAvatarUrl = publicUrlData.publicUrl;
        storageUsed = true;
      }

      if (existingFiles && existingFiles.length > 0) {
        const oldPaths = existingFiles
          .map((f) => `${verifiedUser.id}/${f.name}`)
          .filter((p) => p !== filePath);
        if (oldPaths.length > 0) {
          await supabase.storage.from(AVATARS_BUCKET).remove(oldPaths);
        }
      }
    } else {
      const msg = (uploadError.message || '').toLowerCase();
      if (
        msg.includes('bucket not found') ||
        msg.includes('not found') ||
        msg.includes('row-level security') ||
        msg.includes('permission')
      ) {
        bucketConfigured = false;
      }
    }
  } catch {
    bucketConfigured = false;
  }

  // 3. Persist avatar_url in public.profiles (strictly for auth.uid() = id)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: verifiedUser.id,
        name:
          verifiedUser.user_metadata?.name ||
          verifiedUser.email?.split('@')[0] ||
          'Usuário',
        email: verifiedUser.email || '',
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    console.warn('Warning updating avatar_url in profiles:', profileError.message);
  }

  // 4. Sync with Supabase Auth user_metadata (only if it's a public URL to keep JWT small)
  try {
    await supabase.auth.updateUser({
      data: {
        avatar_url: storageUsed ? finalAvatarUrl : '',
      },
    });
  } catch {
    // Non-fatal metadata update
  }

  return {
    avatarUrl: finalAvatarUrl,
    storageUsed,
    bucketConfigured,
    message: storageUsed
      ? 'Foto de perfil enviada para o Supabase Storage (bucket avatars) e salva no seu perfil!'
      : 'Foto otimizada e salva com segurança no seu perfil na nuvem (public.profiles)!',
  };
}

/**
 * Removes the authenticated user's profile photo from Supabase Storage and clears
 * `avatar_url` in `public.profiles` so the default avatar is restored.
 */
export async function removeProfileAvatar(
  userId: string,
  currentAvatarUrl?: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return false;

    // 1. Delete files inside the user's folder in 'avatars' bucket if present
    try {
      const { data: existingFiles } = await supabase.storage
        .from(AVATARS_BUCKET)
        .list(verifiedUser.id, { limit: 20 });

      if (existingFiles && existingFiles.length > 0) {
        const pathsToRemove = existingFiles.map((f) => `${verifiedUser.id}/${f.name}`);
        await supabase.storage.from(AVATARS_BUCKET).remove(pathsToRemove);
      } else if (currentAvatarUrl && currentAvatarUrl.includes(`/avatars/${verifiedUser.id}/`)) {
        const pathAfterBucket = currentAvatarUrl.split('/avatars/')[1]?.split('?')[0];
        if (pathAfterBucket && pathAfterBucket.startsWith(`${verifiedUser.id}/`)) {
          await supabase.storage.from(AVATARS_BUCKET).remove([pathAfterBucket]);
        }
      }
    } catch {
      // Ignore if bucket is not created yet
    }

    // 2. Clear avatar_url in public.profiles for this authenticated user
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verifiedUser.id);

    if (error) {
      console.error('Error clearing avatar in profiles:', error.message);
      return false;
    }

    // 3. Clear in auth.users metadata
    try {
      await supabase.auth.updateUser({
        data: { avatar_url: '' },
      });
    } catch {
      // Non-fatal
    }

    return true;
  } catch (err) {
    console.error('Error removing profile avatar:', err);
    return false;
  }
}

export async function fetchCloudProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  try {
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', verifiedUser.id)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('Error fetching cloud profile:', error.message);
      }
      return null;
    }

    const meta = verifiedUser.user_metadata || {};
    const rawNotif = (data?.notification_preferences && typeof data.notification_preferences === 'object')
      ? data.notification_preferences
      : {};
    const personalInfo = rawNotif.personal_info || {};

    if (!data) {
      return {
        name: meta.name || verifiedUser.email?.split('@')[0] || 'Usuário',
        email: verifiedUser.email || '',
        avatarUrl: meta.avatar_url || '',
        phone: meta.phone || '',
        occupation: meta.occupation || '',
        monthlyIncome: Number(meta.monthly_income) || 0,
        financialBio: meta.financial_bio || '',
        currency: 'BRL',
        createdAt: verifiedUser.created_at
          ? new Date(verifiedUser.created_at).toLocaleDateString('pt-BR')
          : 'Data não disponível',
        role: 'user',
        hideValuesOnDashboard: false,
        allowAiDataAnalysis: true,
        biometricLock: false,
        notificationPreferences: {
          enabled: true,
          notify7Days: true,
          notify3Days: true,
          notify1Day: true,
          notifyDueDay: true,
          notifyOverdue: true,
          emailSummary: false,
        },
      };
    }

    return {
      name: data.name || meta.name || verifiedUser.email?.split('@')[0] || '',
      email: data.email || verifiedUser.email || '',
      avatarUrl: data.avatar_url || meta.avatar_url || '',
      phone: personalInfo.phone ?? meta.phone ?? '',
      occupation: personalInfo.occupation ?? meta.occupation ?? '',
      monthlyIncome: Number(personalInfo.monthlyIncome ?? meta.monthly_income ?? 0) || 0,
      financialBio: personalInfo.financialBio ?? meta.financial_bio ?? '',
      currency: data.currency || 'BRL',
      createdAt: data.created_at ? new Date(data.created_at).toLocaleDateString('pt-BR') : 'Data não disponível',
      role: 'user',
      hideValuesOnDashboard: Boolean(data.hide_values_on_dashboard),
      allowAiDataAnalysis: data.allow_ai_data_analysis !== false,
      biometricLock: Boolean(data.biometric_lock),
      notificationPreferences: {
        enabled: rawNotif.enabled !== false,
        notify7Days: rawNotif.notify7Days !== false,
        notify3Days: rawNotif.notify3Days !== false,
        notify1Day: rawNotif.notify1Day !== false,
        notifyDueDay: rawNotif.notifyDueDay !== false,
        notifyOverdue: rawNotif.notifyOverdue !== false,
        emailSummary: Boolean(rawNotif.emailSummary),
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
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return false;

    const cleanName = (profile.name || '').trim() || verifiedUser.email?.split('@')[0] || 'Usuário';
    const cleanEmail = (profile.email || verifiedUser.email || '').trim().toLowerCase();

    const notificationPayload = {
      ...profile.notificationPreferences,
      personal_info: {
        phone: (profile.phone || '').trim(),
        occupation: (profile.occupation || '').trim(),
        monthlyIncome: Number(profile.monthlyIncome) || 0,
        financialBio: (profile.financialBio || '').trim(),
      },
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: verifiedUser.id,
          name: cleanName,
          email: cleanEmail,
          avatar_url: profile.avatarUrl || null,
          currency: profile.currency,
          hide_values_on_dashboard: profile.hideValuesOnDashboard,
          allow_ai_data_analysis: profile.allowAiDataAnalysis,
          biometric_lock: profile.biometricLock,
          notification_preferences: notificationPayload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('Error saving cloud profile:', error.message);
      return false;
    }

    // Sync personal metadata into Supabase Auth user_metadata as well
    try {
      const isPublicUrl = Boolean(profile.avatarUrl && profile.avatarUrl.startsWith('http'));
      await supabase.auth.updateUser({
        data: {
          name: cleanName,
          phone: (profile.phone || '').trim(),
          occupation: (profile.occupation || '').trim(),
          monthly_income: Number(profile.monthlyIncome) || 0,
          financial_bio: (profile.financialBio || '').trim(),
          ...(isPublicUrl ? { avatar_url: profile.avatarUrl } : {}),
        },
      });
    } catch {
      // Non-fatal metadata sync
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
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return null;

    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', verifiedUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.error('Error fetching cloud debts:', error.message);
      }
      return null;
    }

    return (data || []).map((row: any) => ({
      id: fromCloudScopedId(verifiedUser.id, String(row.id)),
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
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return false;

    const scopedId = toCloudScopedId(verifiedUser.id, debt.id);
    const payload = {
      id: scopedId,
      user_id: verifiedUser.id,
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
    };

    let { error } = await supabase
      .from('debts')
      .upsert(payload, { onConflict: 'user_id,id' });

    // Fallback if remote table uses single-column PK (id) without composite unique constraint
    if (error && error.code === '42P10') {
      const retry = await supabase.from('debts').upsert(payload, { onConflict: 'id' });
      error = retry.error;
    }

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
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return false;

    const scopedId = toCloudScopedId(verifiedUser.id, debtId);
    const { error } = await supabase
      .from('debts')
      .delete()
      .in('id', [debtId, scopedId])
      .eq('user_id', verifiedUser.id);

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
// GOALS CRUD (RLS PROTECTED)
// ==========================================

export async function fetchCloudGoals(userId: string): Promise<GoalItem[] | null> {
  if (!supabase) return null;
  try {
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return null;

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', verifiedUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.error('Error fetching cloud goals:', error.message);
      }
      return null;
    }

    return (data || []).map((row: any) => ({
      id: fromCloudScopedId(verifiedUser.id, String(row.id)),
      title: row.title,
      monthlyReductionGoal: Number(row.monthly_reduction_goal) || 0,
      extraPaymentGoal: Number(row.extra_payment_goal) || 0,
      targetPayoffDate: row.target_payoff_date,
      createdAt: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
    }));
  } catch (err) {
    console.error('Error in fetchCloudGoals:', err);
    return null;
  }
}

export async function saveCloudGoal(goal: GoalItem, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return false;

    const scopedId = toCloudScopedId(verifiedUser.id, goal.id);
    const payload = {
      id: scopedId,
      user_id: verifiedUser.id,
      title: goal.title,
      monthly_reduction_goal: goal.monthlyReductionGoal,
      extra_payment_goal: goal.extraPaymentGoal,
      target_payoff_date: goal.targetPayoffDate,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from('goals')
      .upsert(payload, { onConflict: 'user_id,id' });

    if (error && error.code === '42P10') {
      const retry = await supabase.from('goals').upsert(payload, { onConflict: 'id' });
      error = retry.error;
    }

    if (error) {
      console.error('Error saving goal to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception saving goal to Supabase:', err);
    return false;
  }
}

export async function deleteCloudGoal(goalId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const verifiedUser = await getVerifiedSessionUser(userId);
    if (!verifiedUser) return false;

    const scopedId = toCloudScopedId(verifiedUser.id, goalId);
    const { error } = await supabase
      .from('goals')
      .delete()
      .in('id', [goalId, scopedId])
      .eq('user_id', verifiedUser.id);

    if (error) {
      console.error('Error deleting goal from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception deleting goal from Supabase:', err);
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
      preview.blockingError =
        'Você já está conectado ao aplicativo! Para enviar os registros para as tabelas da nuvem do Supabase, confirme o e-mail no painel do Supabase (desative "Confirm email" em Authentication > Providers > Email ou execute no SQL Editor: UPDATE auth.users SET email_confirmed_at = now();) e reconecte sua conta.';
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

