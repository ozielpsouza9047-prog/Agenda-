import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DebtItem, GoalItem, UserProfile } from '../types';

// Retrieve environment variables (isomorphic for Vite browser and Node/testing)
const viteEnv: Record<string, any> =
  typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const nodeEnv: Record<string, any> =
  typeof process !== 'undefined' && process.env ? process.env : {};

const sanitizeEnvValue = (val: unknown): string =>
  String(val ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();

const rawSupabaseUrl = sanitizeEnvValue(
  viteEnv.VITE_SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || ''
).replace(/\/+$/, '');

const rawSupabaseAnonKey = sanitizeEnvValue(
  viteEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || ''
);

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
    clean === 'coloque_aqui_sua_chave_publica_sb_publishable' ||
    clean === 'coloque_aqui_sua_chave_publica_anon_ou_sb_publishable'
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

const supabaseUrl = isValidSupabaseUrl(rawSupabaseUrl) ? rawSupabaseUrl : '';
const supabaseAnonKey = rawSupabaseAnonKey;

// Check if credentials are validly provided for live operation
export const isSupabaseConfigured = (): boolean => {
  return (
    isValidSupabaseUrl(supabaseUrl) &&
    isValidPublicKey(supabaseAnonKey)
  );
};

// Configuration inspection state (never exposes the key value)
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
  userId: string,
  currentName?: string
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

  const resolvedName =
    (currentName || '').trim() ||
    verifiedUser.user_metadata?.name ||
    verifiedUser.email?.split('@')[0] ||
    'Usuário';

  // 3. Immediately update local user-scoped profile cache so any auth event sees the new photo & name
  if (typeof localStorage !== 'undefined') {
    const userProfileKey = `divida_zero_profile_${verifiedUser.id}`;
    try {
      const existingRaw = localStorage.getItem(userProfileKey) || localStorage.getItem('divida_zero_profile');
      const existingObj = existingRaw ? JSON.parse(existingRaw) : {};
      const updatedCache = {
        ...existingObj,
        name: resolvedName,
        email: verifiedUser.email || existingObj.email || '',
        avatarUrl: finalAvatarUrl,
      };
      localStorage.setItem(userProfileKey, JSON.stringify(updatedCache));
      localStorage.setItem('divida_zero_profile', JSON.stringify(updatedCache));
    } catch {
      // Ignore storage quota errors
    }
  }

  // 4. Persist avatar_url and name in public.profiles (strictly for auth.uid() = id)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: verifiedUser.id,
        name: resolvedName,
        email: verifiedUser.email || '',
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    console.warn('Warning updating avatar_url in profiles:', profileError.message);
    if (!storageUsed) {
      throw new Error(`Falha ao salvar a foto no perfil na nuvem (${profileError.code || 'RLS'}): ${profileError.message}`);
    }
  }

  // 5. Sync with Supabase Auth user_metadata (only set avatar_url if it's a public URL to keep JWT small)
  try {
    const metadataUpdate: Record<string, any> = {
      name: resolvedName,
    };
    if (storageUsed && finalAvatarUrl.startsWith('http')) {
      metadataUpdate.avatar_url = finalAvatarUrl;
    }
    await supabase.auth.updateUser({
      data: metadataUpdate,
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

    // 3. Clear avatarUrl in local user-scoped profile cache
    if (typeof localStorage !== 'undefined') {
      const userProfileKey = `divida_zero_profile_${verifiedUser.id}`;
      try {
        const existingRaw = localStorage.getItem(userProfileKey) || localStorage.getItem('divida_zero_profile');
        if (existingRaw) {
          const existingObj = JSON.parse(existingRaw);
          const updatedCache = { ...existingObj, avatarUrl: '' };
          localStorage.setItem(userProfileKey, JSON.stringify(updatedCache));
          localStorage.setItem('divida_zero_profile', JSON.stringify(updatedCache));
        }
      } catch {
        // Ignore storage errors
      }
    }

    // 4. Clear in auth.users metadata
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
      const initialName = meta.name || verifiedUser.email?.split('@')[0] || 'Usuário';
      try {
        await supabase.from('profiles').upsert(
          {
            id: verifiedUser.id,
            name: initialName,
            email: verifiedUser.email || '',
            avatar_url: meta.avatar_url || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch {
        // Ignore if trigger already created row concurrently
      }
      return {
        name: initialName,
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

    const dbName = (data.name || '').trim();
    const resolvedName =
      dbName && dbName !== 'Usuário Dívida Zero'
        ? dbName
        : meta.name || dbName || verifiedUser.email?.split('@')[0] || 'Usuário';

    return {
      name: resolvedName,
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

// ==========================================
// FINANCIAL AI ASSISTANT & GEMINI INTEGRATION (USER-ISOLATED, ZERO HALLUCINATION)
// Helps the authenticated user organize debts, analyze installments, plan payments,
// and understand payoff strategies (Avalanche, Bola de Neve, Vencimento) using
// strictly their own authenticated records.
// ==========================================

export interface CategoryBreakdownItem {
  category: string;
  count: number;
  remainingAmount: number;
  monthlyPayment: number;
  sharePercent: number;
}

export interface StrategyRankingItem {
  position: number;
  id: string;
  title: string;
  creditor: string;
  category: string;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  estimatedMonthlyInterestCost: number;
  dueDate: string;
  status: DebtItem['status'];
  installmentsRemaining: number;
}

export interface UserFinancialAnalysis {
  hasActiveDebts: boolean;
  totalDebtsCount: number;
  activeDebtsCount: number;
  settledDebtsCount: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingDueCount: number;
  upcomingDueAmount: number;
  onTimeCount: number;
  onTimeAmount: number;
  totalOriginalAmount: number;
  totalRemainingAmount: number;
  totalAmortizedAmount: number;
  amortizedPercent: number;
  totalMonthlyPayment: number;
  totalEstimatedMonthlyInterest: number;
  totalInstallmentsContracted: number;
  totalInstallmentsPaid: number;
  totalInstallmentsRemaining: number;
  monthlyIncome: number;
  hasConfiguredIncome: boolean;
  incomeCommitmentPercent: number | null;
  extraMonthlyTarget: number;
  hasConfiguredExtraTarget: boolean;
  debtsWithoutMonthlyPayment: string[];
  debtsWithoutInterestRate: string[];
  canCalculateExactPayoffTimeline: boolean;
  standardPayoffMonths: number | null;
  acceleratedPayoffMonths: number | null;
  monthsSavedWithExtra: number | null;
  missingDataForCompletePlan: string[];
  dueNext7Days: DebtItem[];
  dueNext30Days: DebtItem[];
  categories: CategoryBreakdownItem[];
  avalancheOrder: StrategyRankingItem[];
  snowballOrder: StrategyRankingItem[];
  urgencyOrder: StrategyRankingItem[];
  activeGoalsCount: number;
}

export interface AiChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface AiConversationSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
}

export interface AskFinancialAssistantParams {
  prompt: string;
  userId?: string;
  debts: DebtItem[];
  goals?: GoalItem[];
  profile?: UserProfile;
  history?: AiChatMessage[];
}

export interface AskFinancialAssistantResult {
  reply: string;
  source: 'gemini' | 'local_engine' | 'privacy_restricted';
  analysis: UserFinancialAnalysis;
}

function formatBRL(value: number, currency: string = 'BRL'): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch {
    return `R$ ${(Number(value) || 0).toFixed(2)}`;
  }
}

/**
 * Returns the storage key strictly isolated for the authenticated user's AI conversations.
 */
export function getUserConversationsStorageKey(userId?: string): string | null {
  const cleanId = (userId || '').trim();
  if (!cleanId) return null;
  return `divida_zero_ai_conversations_${cleanId}`;
}

/**
 * Loads all saved AI conversations for the authenticated user.
 * Migrates any legacy single-session chat if present for the same userId.
 */
export function loadUserAiConversations(
  userId: string | undefined,
  initialMessage: AiChatMessage
): AiConversationSession[] {
  const storageKey = getUserConversationsStorageKey(userId);
  const nowIso = new Date().toISOString();
  const defaultSession: AiConversationSession = {
    id: `conv-${Date.now()}`,
    title: 'Conversa 1',
    createdAt: nowIso,
    updatedAt: nowIso,
    messages: [initialMessage],
  };

  if (!storageKey || typeof localStorage === 'undefined') {
    return [defaultSession];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(
          (c: any) => c && typeof c.id === 'string' && Array.isArray(c.messages) && c.messages.length > 0
        );
        if (valid.length > 0) {
          return valid;
        }
      }
    }

    // Check if there was a session in sessionStorage for this same userId
    if (typeof sessionStorage !== 'undefined' && userId) {
      const legacyRaw = sessionStorage.getItem(`divida_zero_ai_chat_${userId}`);
      if (legacyRaw) {
        const legacyMsgs = JSON.parse(legacyRaw);
        if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
          const migrated: AiConversationSession = {
            ...defaultSession,
            messages: legacyMsgs,
          };
          localStorage.setItem(storageKey, JSON.stringify([migrated]));
          return [migrated];
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  return [defaultSession];
}

/**
 * Persists the authenticated user's conversations in user-isolated storage.
 */
export function saveUserAiConversations(
  userId: string | undefined,
  conversations: AiConversationSession[]
): void {
  const storageKey = getUserConversationsStorageKey(userId);
  if (!storageKey || typeof localStorage === 'undefined') return;
  try {
    const trimmed = conversations.slice(0, 15).map((c) => ({
      ...c,
      messages: (c.messages || []).slice(-30),
    }));
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Computes a complete, deterministic financial analysis strictly from the user's real debts,
 * goals, and profile. Never invents or assumes values when data is missing.
 */
export function buildUserFinancialAnalysis(
  debts: DebtItem[],
  goals: GoalItem[] = [],
  profile?: UserProfile
): UserFinancialAnalysis {
  const safeDebts = Array.isArray(debts) ? debts : [];
  const safeGoals = Array.isArray(goals) ? goals : [];

  const activeDebts = safeDebts.filter((d) => d.status !== 'quitado');
  const settledDebts = safeDebts.filter((d) => d.status === 'quitado');
  const overdueDebts = activeDebts.filter((d) => d.status === 'atrasado');
  const upcomingDueDebts = activeDebts.filter((d) => d.status === 'proximo_vencimento');
  const onTimeDebts = activeDebts.filter((d) => d.status === 'em_dia');

  const totalOriginalAmount = safeDebts.reduce((acc, d) => acc + (Number(d.totalAmount) || 0), 0);
  const totalRemainingAmount = activeDebts.reduce((acc, d) => acc + (Number(d.remainingAmount) || 0), 0);
  const totalAmortizedAmount = Math.max(0, totalOriginalAmount - totalRemainingAmount);
  const amortizedPercent =
    totalOriginalAmount > 0 ? Math.min(100, Math.round((totalAmortizedAmount / totalOriginalAmount) * 100)) : 0;

  const totalMonthlyPayment = activeDebts.reduce((acc, d) => acc + (Number(d.monthlyPayment) || 0), 0);
  const overdueAmount = overdueDebts.reduce((acc, d) => acc + (Number(d.remainingAmount) || 0), 0);
  const upcomingDueAmount = upcomingDueDebts.reduce((acc, d) => acc + (Number(d.remainingAmount) || 0), 0);
  const onTimeAmount = onTimeDebts.reduce((acc, d) => acc + (Number(d.remainingAmount) || 0), 0);

  const totalEstimatedMonthlyInterest = activeDebts.reduce((acc, d) => {
    const rate = Math.max(0, Number(d.interestRate) || 0);
    const rem = Math.max(0, Number(d.remainingAmount) || 0);
    return acc + rem * (rate / 100);
  }, 0);

  const totalInstallmentsContracted = activeDebts.reduce(
    (acc, d) => acc + Math.max(1, Number(d.installmentsTotal) || 1),
    0
  );
  const totalInstallmentsPaid = activeDebts.reduce(
    (acc, d) => acc + Math.max(0, Number(d.installmentsPaid) || 0),
    0
  );
  const totalInstallmentsRemaining = activeDebts.reduce((acc, d) => {
    const total = Math.max(1, Number(d.installmentsTotal) || 1);
    const paid = Math.max(0, Number(d.installmentsPaid) || 0);
    return acc + Math.max(0, total - paid);
  }, 0);

  const monthlyIncome = Math.max(0, Number(profile?.monthlyIncome) || 0);
  const hasConfiguredIncome = monthlyIncome > 0;
  const incomeCommitmentPercent =
    hasConfiguredIncome ? Math.round((totalMonthlyPayment / monthlyIncome) * 1000) / 10 : null;

  // Only use an extra monthly payment target if the user actually registered it in their goals
  const extraFromGoals = safeGoals.reduce((acc, g) => acc + (Number(g.extraPaymentGoal) || 0), 0);
  const hasConfiguredExtraTarget = extraFromGoals > 0;
  const extraMonthlyTarget = hasConfiguredExtraTarget ? extraFromGoals : 0;

  const debtsWithoutMonthlyPayment = activeDebts
    .filter((d) => (Number(d.monthlyPayment) || 0) <= 0)
    .map((d) => d.title);

  const debtsWithoutInterestRate = activeDebts
    .filter((d) => (Number(d.interestRate) || 0) <= 0)
    .map((d) => d.title);

  const canCalculateExactPayoffTimeline =
    activeDebts.length > 0 &&
    totalRemainingAmount > 0 &&
    totalMonthlyPayment > 0 &&
    debtsWithoutMonthlyPayment.length === 0;

  const standardPayoffMonths = canCalculateExactPayoffTimeline
    ? Math.ceil(totalRemainingAmount / totalMonthlyPayment)
    : null;

  const acceleratedPayoffMonths =
    canCalculateExactPayoffTimeline && hasConfiguredExtraTarget
      ? Math.ceil(totalRemainingAmount / (totalMonthlyPayment + extraMonthlyTarget))
      : null;

  const monthsSavedWithExtra =
    standardPayoffMonths !== null && acceleratedPayoffMonths !== null
      ? Math.max(0, standardPayoffMonths - acceleratedPayoffMonths)
      : null;

  const missingDataForCompletePlan: string[] = [];
  if (activeDebts.length === 0) {
    missingDataForCompletePlan.push('Nenhuma dívida ativa cadastrada (valor, parcela e vencimento).');
  } else {
    if (debtsWithoutMonthlyPayment.length > 0) {
      missingDataForCompletePlan.push(
        `Valor da parcela mensal não informado para: ${debtsWithoutMonthlyPayment.join(', ')}.`
      );
    }
    if (debtsWithoutInterestRate.length > 0) {
      missingDataForCompletePlan.push(
        `Taxa de juros mensal não informada para: ${debtsWithoutInterestRate.join(', ')}.`
      );
    }
    if (!hasConfiguredIncome) {
      missingDataForCompletePlan.push('Renda mensal líquida do usuário não informada no perfil.');
    }
    if (!hasConfiguredExtraTarget) {
      missingDataForCompletePlan.push(
        'Valor extra mensal disponível para antecipar parcelas (além das parcelas normais) ainda não informado.'
      );
    }
  }

  // Due date windows (next 7 and 30 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const dueNext7Days = activeDebts.filter((d) => {
    if (!d.dueDate) return false;
    const parsed = new Date(`${d.dueDate}T00:00:00`);
    if (isNaN(parsed.getTime())) return false;
    return parsed >= today && parsed <= in7Days;
  });

  const dueNext30Days = activeDebts.filter((d) => {
    if (!d.dueDate) return false;
    const parsed = new Date(`${d.dueDate}T00:00:00`);
    if (isNaN(parsed.getTime())) return false;
    return parsed >= today && parsed <= in30Days;
  });

  // Category aggregation
  const catMap = new Map<string, { count: number; remainingAmount: number; monthlyPayment: number }>();
  for (const d of activeDebts) {
    const cat = d.category || 'Outros';
    const current = catMap.get(cat) || { count: 0, remainingAmount: 0, monthlyPayment: 0 };
    current.count += 1;
    current.remainingAmount += Number(d.remainingAmount) || 0;
    current.monthlyPayment += Number(d.monthlyPayment) || 0;
    catMap.set(cat, current);
  }

  const categories: CategoryBreakdownItem[] = Array.from(catMap.entries())
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      remainingAmount: Math.round(stats.remainingAmount * 100) / 100,
      monthlyPayment: Math.round(stats.monthlyPayment * 100) / 100,
      sharePercent:
        totalRemainingAmount > 0 ? Math.round((stats.remainingAmount / totalRemainingAmount) * 100) : 0,
    }))
    .sort((a, b) => b.remainingAmount - a.remainingAmount);

  const toRankingItem = (d: DebtItem, idx: number): StrategyRankingItem => {
    const rem = Number(d.remainingAmount) || 0;
    const rate = Number(d.interestRate) || 0;
    const totalInst = Math.max(1, Number(d.installmentsTotal) || 1);
    const paidInst = Math.max(0, Number(d.installmentsPaid) || 0);
    return {
      position: idx + 1,
      id: d.id,
      title: d.title,
      creditor: d.creditor,
      category: d.category,
      remainingAmount: rem,
      monthlyPayment: Number(d.monthlyPayment) || 0,
      interestRate: rate,
      estimatedMonthlyInterestCost: Math.round(rem * (rate / 100) * 100) / 100,
      dueDate: d.dueDate,
      status: d.status,
      installmentsRemaining: Math.max(0, totalInst - paidInst),
    };
  };

  // Strategy 1: Avalanche (Highest interest rate first, tie-break by highest remaining balance)
  const avalancheOrder = [...activeDebts]
    .sort((a, b) => {
      if (b.interestRate !== a.interestRate) return b.interestRate - a.interestRate;
      return b.remainingAmount - a.remainingAmount;
    })
    .map(toRankingItem);

  // Strategy 2: Bola de Neve / Snowball (Lowest remaining amount first, tie-break by highest interest rate)
  const snowballOrder = [...activeDebts]
    .sort((a, b) => {
      if (a.remainingAmount !== b.remainingAmount) return a.remainingAmount - b.remainingAmount;
      return b.interestRate - a.interestRate;
    })
    .map(toRankingItem);

  // Strategy 3: Urgency / Vencimento (Overdue first, then earliest due date)
  const statusWeight = (s: DebtItem['status']) => {
    if (s === 'atrasado') return 0;
    if (s === 'proximo_vencimento') return 1;
    return 2;
  };
  const urgencyOrder = [...activeDebts]
    .sort((a, b) => {
      const wDiff = statusWeight(a.status) - statusWeight(b.status);
      if (wDiff !== 0) return wDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .map(toRankingItem);

  return {
    hasActiveDebts: activeDebts.length > 0,
    totalDebtsCount: safeDebts.length,
    activeDebtsCount: activeDebts.length,
    settledDebtsCount: settledDebts.length,
    overdueCount: overdueDebts.length,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    upcomingDueCount: upcomingDueDebts.length,
    upcomingDueAmount: Math.round(upcomingDueAmount * 100) / 100,
    onTimeCount: onTimeDebts.length,
    onTimeAmount: Math.round(onTimeAmount * 100) / 100,
    totalOriginalAmount: Math.round(totalOriginalAmount * 100) / 100,
    totalRemainingAmount: Math.round(totalRemainingAmount * 100) / 100,
    totalAmortizedAmount: Math.round(totalAmortizedAmount * 100) / 100,
    amortizedPercent,
    totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
    totalEstimatedMonthlyInterest: Math.round(totalEstimatedMonthlyInterest * 100) / 100,
    totalInstallmentsContracted,
    totalInstallmentsPaid,
    totalInstallmentsRemaining,
    monthlyIncome,
    hasConfiguredIncome,
    incomeCommitmentPercent,
    extraMonthlyTarget,
    hasConfiguredExtraTarget,
    debtsWithoutMonthlyPayment,
    debtsWithoutInterestRate,
    canCalculateExactPayoffTimeline,
    standardPayoffMonths,
    acceleratedPayoffMonths,
    monthsSavedWithExtra,
    missingDataForCompletePlan,
    dueNext7Days,
    dueNext30Days,
    categories,
    avalancheOrder,
    snowballOrder,
    urgencyOrder,
    activeGoalsCount: safeGoals.length,
  };
}

/**
 * Generates a real-time AI recommendation based strictly on the authenticated user's debts.
 * Replaces static mock recommendations so no fictional data is ever displayed.
 */
export function buildDynamicAiRecommendation(
  debts: DebtItem[],
  profile?: UserProfile
): { title: string; description: string; tag: string } {
  const currency = profile?.currency || 'BRL';
  const analysis = buildUserFinancialAnalysis(debts, [], profile);

  if (!analysis.hasActiveDebts) {
    if (analysis.settledDebtsCount > 0) {
      return {
        title: 'Parabéns! Todas as suas dívidas cadastradas estão quitadas',
        description: `Você possui ${analysis.settledDebtsCount} contrato(s) quitado(s) e nenhum saldo devedor pendente. Use o Consultor IA para planejar seus próximos passos.`,
        tag: 'Dívida Zero Conquistada',
      };
    }
    return {
      title: 'Comece organizando seus compromissos financeiros',
      description:
        'Cadastre suas dívidas ou importe um boleto para que o Consultor IA calcule prioridades e prazos reais de quitação sob medida para você.',
      tag: 'Consultor IA Pronto',
    };
  }

  if (analysis.overdueCount > 0) {
    const topOverdue = analysis.urgencyOrder[0];
    return {
      title: `Prioridade Imediata: Regularizar ${analysis.overdueCount} conta(s) em atraso`,
      description: `A dívida "${topOverdue.title}" (${topOverdue.creditor}) está em atraso com saldo de ${formatBRL(topOverdue.remainingAmount, currency)}. Regularizá-la primeiro evita novas multas.`,
      tag: 'Alerta de Atraso',
    };
  }

  const topAvalanche = analysis.avalancheOrder[0];
  const topSnowball = analysis.snowballOrder[0];

  if (topAvalanche && topAvalanche.interestRate > 0) {
    return {
      title: `Estratégia Avalanche: Priorizar ${topAvalanche.title} (${topAvalanche.interestRate}% a.m.)`,
      description: `Este contrato com ${topAvalanche.creditor} tem a maior taxa de juros da sua carteira (cerca de ${formatBRL(topAvalanche.estimatedMonthlyInterestCost, currency)}/mês em juros). Quitar ele primeiro traz a maior economia.`,
      tag: 'Economia de Juros',
    };
  }

  return {
    title: `Estratégia Bola de Neve: Eliminar ${topSnowball.title}`,
    description: `Com saldo restante de ${formatBRL(topSnowball.remainingAmount, currency)}, quitar este contrato primeiro libera ${formatBRL(topSnowball.monthlyPayment, currency)}/mês no seu orçamento.`,
    tag: 'Fluxo de Caixa',
  };
}

/**
 * Extracts an explicit extra monthly payment amount if the user mentioned one in the prompt.
 */
function extractExplicitAmountFromPrompt(prompt: string): number | null {
  const match = prompt.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i);
  if (!match) return null;
  const raw = match[1].replace(/\./g, '').replace(',', '.');
  const val = parseFloat(raw);
  return isNaN(val) || val <= 0 ? null : val;
}

/**
 * Deterministic, zero-hallucination local financial advisor engine.
 * Responds in simple, welcoming, objective Brazilian Portuguese.
 * Only presents payoff values, priorities, and deadlines when calculable from real data;
 * asks clarifying questions when information is missing before estimating.
 */
export function generateDeterministicAssistantReply(
  prompt: string,
  analysis: UserFinancialAnalysis,
  debts: DebtItem[],
  goals: GoalItem[] = [],
  profile?: UserProfile
): string {
  const currency = profile?.currency || 'BRL';
  const userName = (profile?.name || 'Usuário').split(' ')[0];
  const q = (prompt || '').toLowerCase();
  const explicitAmount = extractExplicitAmountFromPrompt(prompt);

  if (!analysis.hasActiveDebts) {
    if (analysis.settledDebtsCount > 0) {
      return `Que ótima notícia, ${userName}! Todas as suas ${analysis.settledDebtsCount} dívida(s) cadastradas já constam como quitadas (saldo devedor atual: ${formatBRL(0, currency)}).\n\nSe você tiver algum novo compromisso financeiro ou quiser simular um planejamento, me conte: qual é o valor da conta, da parcela mensal e a data de vencimento?`;
    }
    return `Olá, ${userName}! Fico feliz em te ajudar a organizar sua vida financeira. No momento, você ainda não tem nenhuma dívida cadastrada na sua conta.\n\nPara eu montar seu plano de quitação com valores e prazos reais sem chutar nenhum número, você pode cadastrar suas contas no botão **"Nova Dívida"** ou me contar aqui:\n• Quais são as suas dívidas atuais e o valor restante de cada uma?\n• Qual é o valor da parcela mensal e a taxa de juros (se souber)?\n• Quanto você consegue separar por mês para os pagamentos?`;
  }

  // 1. Organizar dívidas / visão geral / categorias / prioridades
  if (
    q.includes('organizar') ||
    q.includes('organize') ||
    q.includes('resumo') ||
    q.includes('categoria') ||
    q.includes('classific') ||
    q.includes('visão geral') ||
    q.includes('visao geral')
  ) {
    const catLines = analysis.categories
      .map(
        (c) =>
          `• **${c.category}**: ${c.count} conta(s) — Saldo de ${formatBRL(c.remainingAmount, currency)} (${c.sharePercent}% do total)`
      )
      .join('\n');

    const urgencyLines = analysis.urgencyOrder
      .slice(0, 5)
      .map(
        (d) =>
          `${d.position}º **${d.title}** (${d.creditor}) — Saldo: ${formatBRL(d.remainingAmount, currency)} | Parcela: ${d.monthlyPayment > 0 ? formatBRL(d.monthlyPayment, currency) : 'não informada'} | Vencimento: ${d.dueDate} (${d.status === 'atrasado' ? 'Em atraso' : d.status === 'proximo_vencimento' ? 'Vence em breve' : 'Em dia'})`
      )
      .join('\n');

    return [
      `${userName}, organizei suas **${analysis.activeDebtsCount} dívida(s) ativa(s)** de forma simples para você visualizar onde está cada valor:`,
      '',
      `• **Total que falta pagar:** ${formatBRL(analysis.totalRemainingAmount, currency)} (você já quitou ${analysis.amortizedPercent}% do valor original)`,
      `• **Soma das parcelas mensais:** ${formatBRL(analysis.totalMonthlyPayment, currency)}`,
      `• **Situação dos prazos:** ${analysis.overdueCount} em atraso (${formatBRL(analysis.overdueAmount, currency)}), ${analysis.upcomingDueCount} vencendo em breve e ${analysis.onTimeCount} em dia.`,
      '',
      '📂 **Por Categoria:**',
      catLines,
      '',
      '🎯 **Ordem de Atenção (da mais urgente para a menos urgente):**',
      urgencyLines,
    ].join('\n');
  }

  // 2. Plano de Quitação / Estratégias (Avalanche vs Bola de Neve) / Prazos
  if (
    q.includes('plano') ||
    q.includes('planejar') ||
    q.includes('quitação') ||
    q.includes('quitacao') ||
    q.includes('estratégia') ||
    q.includes('estrategia') ||
    q.includes('avalanche') ||
    q.includes('bola de neve') ||
    q.includes('snowball') ||
    q.includes('quitar') ||
    q.includes('prazo')
  ) {
    const topAv = analysis.avalancheOrder[0];
    const topSn = analysis.snowballOrder[0];

    const prioritySection: string[] = [
      `Aqui está o seu diagnóstico de quitação baseado apenas nos dados que você já cadastrou, ${userName}:`,
      '',
      `💰 **Valores Atuais Confirmados:**`,
      `• Saldo devedor total: **${formatBRL(analysis.totalRemainingAmount, currency)}** (${analysis.activeDebtsCount} dívida(s) ativa(s))`,
      `• Compromisso mensal atual com parcelas: **${formatBRL(analysis.totalMonthlyPayment, currency)}/mês**`,
    ];

    if (analysis.overdueCount > 0) {
      prioritySection.push(
        `• **Prioridade nº 1 (Urgente):** Regularizar primeiro a(s) ${analysis.overdueCount} conta(s) em atraso (${debts
          .filter((d) => d.status === 'atrasado')
          .map((d) => `${d.title} — ${formatBRL(d.remainingAmount, currency)}`)
          .join(', ')}) para interromper multas.`
      );
    }

    prioritySection.push('');
    prioritySection.push('🧭 **Como escolher sua ordem de quitação:**');

    if (analysis.debtsWithoutInterestRate.length === activeDebtsCountOrZero(analysis)) {
      prioritySection.push(
        `• **Método Avalanche (Maior juros primeiro):** Notei que você ainda não informou a taxa de juros mensal das suas dívidas. Sem essa informação, ainda não consigo calcular qual contrato cobra mais juros.`
      );
    } else {
      prioritySection.push(
        `• **Método Avalanche (Economizar juros):** Comece amortizando **${topAv.title}** (${topAv.creditor}), que tem a maior taxa de juros cadastrada (**${topAv.interestRate}% ao mês**, custando cerca de ${formatBRL(topAv.estimatedMonthlyInterestCost, currency)}/mês em juros).`
      );
    }

    prioritySection.push(
      `• **Método Bola de Neve (Liberar fôlego rápido):** Comece quitando **${topSn.title}** (${topSn.creditor}), que tem o menor saldo restante (**${formatBRL(topSn.remainingAmount, currency)}**). Ao eliminar essa conta, você libera **${formatBRL(topSn.monthlyPayment, currency)}/mês** para usar na próxima dívida.`
    );

    // Check if we can calculate timelines or if we need to ask questions first
    const extraAvailable =
      explicitAmount && (q.includes('extra') || q.includes('mais') || q.includes('aport') || q.includes('r$'))
        ? explicitAmount
        : analysis.hasConfiguredExtraTarget
        ? analysis.extraMonthlyTarget
        : null;

    prioritySection.push('');
    prioritySection.push('⏳ **Prazos Calculados:**');

    if (analysis.canCalculateExactPayoffTimeline && analysis.standardPayoffMonths !== null) {
      prioritySection.push(
        `• Mantendo o pagamento das parcelas atuais (${formatBRL(analysis.totalMonthlyPayment, currency)}/mês), o prazo calculado para quitar o saldo atual é de **${analysis.standardPayoffMonths} meses**.`
      );
      if (extraAvailable && extraAvailable > 0) {
        const accelMonths = Math.ceil(
          analysis.totalRemainingAmount / (analysis.totalMonthlyPayment + extraAvailable)
        );
        const saved = Math.max(0, analysis.standardPayoffMonths - accelMonths);
        prioritySection.push(
          `• Com o valor extra de **${formatBRL(extraAvailable, currency)}/mês** (totalizando ${formatBRL(analysis.totalMonthlyPayment + extraAvailable, currency)}/mês), seu prazo estimado cai para **${accelMonths} meses** (economia de **${saved} meses**).`
        );
      }
    } else {
      prioritySection.push(
        `• Ainda não calculei o prazo final em meses porque falta o valor da parcela mensal em: **${analysis.debtsWithoutMonthlyPayment.join(', ')}**.`
      );
    }

    // Ask welcoming questions if any data is missing to complete/refine the plan
    const questionsToAsk: string[] = [];
    if (analysis.debtsWithoutMonthlyPayment.length > 0) {
      questionsToAsk.push(
        `Qual é o valor da parcela mensal que você paga em **${analysis.debtsWithoutMonthlyPayment.join(', ')}**?`
      );
    }
    if (analysis.debtsWithoutInterestRate.length > 0) {
      questionsToAsk.push(
        `Você sabe a taxa de juros mensal de **${analysis.debtsWithoutInterestRate.join(', ')}** para eu calcular a economia exata no método Avalanche?`
      );
    }
    if (!analysis.hasConfiguredIncome) {
      questionsToAsk.push(
        `Qual é a sua renda mensal aproximada hoje? (Assim consigo verificar se as parcelas de ${formatBRL(analysis.totalMonthlyPayment, currency)} cabem com folga no seu orçamento).`
      );
    }
    if (!extraAvailable) {
      questionsToAsk.push(
        `Além das parcelas normais de ${formatBRL(analysis.totalMonthlyPayment, currency)}/mês, você conseguiria separar algum valor extra por mês para adiantar a quitação? Se sim, quanto?`
      );
    }

    if (questionsToAsk.length > 0) {
      prioritySection.push('');
      prioritySection.push(
        '💬 **Para eu ajustar esse plano exatamente para a sua realidade sem chutar nenhum valor, me conta:**'
      );
      for (const question of questionsToAsk) {
        prioritySection.push(`• ${question}`);
      }
    }

    return prioritySection.join('\n');
  }

  // 3. Análise de Parcelas / impacto de nova parcela
  if (
    q.includes('parcela') ||
    q.includes('adicionar') ||
    q.includes('prestação') ||
    q.includes('prestacao') ||
    q.includes('comprometimento')
  ) {
    const hasExplicitNewInstallment =
      q.includes('adicionar') || q.includes('nova parcela') || q.includes('novo parcelamento');

    if (hasExplicitNewInstallment) {
      if (!explicitAmount) {
        return `${userName}, hoje suas parcelas somam **${formatBRL(analysis.totalMonthlyPayment, currency)} por mês**.\n\nPara eu calcular exatamente como ficará seu orçamento sem estimar no escuro, me diz: **qual seria o valor mensal dessa nova parcela e por quantos meses?**`;
      }
      const newTotal = analysis.totalMonthlyPayment + explicitAmount;
      const newIncomeShare = analysis.hasConfiguredIncome
        ? ` (o que representará **${Math.round((newTotal / analysis.monthlyIncome) * 1000) / 10}%** da sua renda mensal de ${formatBRL(analysis.monthlyIncome, currency)})`
        : '';
      const incomeQuestion = !analysis.hasConfiguredIncome
        ? `\n\n💬 *Dica: Se quiser que eu avalie se esse valor fica pesado no seu bolso, me conte qual é a sua renda mensal atual.*`
        : '';

      return `📈 **Simulação com a Nova Parcela:**\n• Suas parcelas atuais: ${formatBRL(analysis.totalMonthlyPayment, currency)}/mês\n• Nova parcela informada: + ${formatBRL(explicitAmount, currency)}/mês\n• **Novo total mensal:** **${formatBRL(newTotal, currency)}/mês**${newIncomeShare}.\n\n${analysis.overdueCount > 0 ? '⚠️ Como você tem conta(s) em atraso no momento, o mais seguro é regularizá-las antes de assumir uma nova parcela.' : 'Avalie se esse novo total mensal mantém uma reserva tranquila para suas despesas do dia a dia.'}${incomeQuestion}`;
    }

    const debtInstallmentsList = debts
      .filter((d) => d.status !== 'quitado')
      .map((d) => {
        const remInst = Math.max(0, (Number(d.installmentsTotal) || 1) - (Number(d.installmentsPaid) || 0));
        return `• **${d.title}**: ${d.installmentsPaid} de ${d.installmentsTotal} pagas (faltam **${remInst}** parcelas de ${formatBRL(d.monthlyPayment, currency)})`;
      })
      .join('\n');

    const incomeLine =
      analysis.incomeCommitmentPercent !== null
        ? `\n• **Peso na sua renda (${formatBRL(analysis.monthlyIncome, currency)}):** **${analysis.incomeCommitmentPercent}%** ${analysis.incomeCommitmentPercent > 30 ? '(acima dos 30% recomendados — merece atenção)' : '(dentro do limite saudável de até 30%)'}`
        : `\n• *Observação: Sua renda mensal ainda não foi informada no perfil. Se quiser me dizer quanto recebe por mês, calculo quantos % da sua renda estão comprometidos.*`;

    return [
      `📑 **Análise das suas Parcelas Atuais, ${userName}:**`,
      `• **Total mensal das parcelas:** ${formatBRL(analysis.totalMonthlyPayment, currency)}/mês${incomeLine}`,
      `• **Andamento geral:** Você já pagou **${analysis.totalInstallmentsPaid}** de ${analysis.totalInstallmentsContracted} parcelas (restam **${analysis.totalInstallmentsRemaining} parcelas** ao todo).`,
      '',
      '📋 **Detalhamento por dívida:**',
      debtInstallmentsList,
    ].join('\n');
  }

  // 4. Vencimentos próximos / mês atual / atrasadas
  if (
    q.includes('mês') ||
    q.includes('mes') ||
    q.includes('7 dias') ||
    q.includes('vencem') ||
    q.includes('vencimento') ||
    q.includes('atrasada') ||
    q.includes('atraso')
  ) {
    if (q.includes('atrasada') || q.includes('atraso')) {
      const overdue = debts.filter((d) => d.status === 'atrasado');
      if (overdue.length === 0) {
        return `Que tranquilidade, ${userName}! Você **não tem nenhuma conta atrasada** no momento. Todas as suas ${analysis.activeDebtsCount} dívida(s) ativa(s) estão em dia.`;
      }
      const list = overdue
        .map(
          (d) =>
            `• **${d.title}** (${d.creditor}) — Saldo: ${formatBRL(d.remainingAmount, currency)} | Parcela: ${formatBRL(d.monthlyPayment, currency)} | Venceu em: ${d.dueDate}`
        )
        .join('\n');
      return `No momento você tem **${overdue.length} conta(s) em atraso**, somando **${formatBRL(analysis.overdueAmount, currency)}** de saldo:\n\n${list}\n\nMinha sugestão é dar prioridade a elas primeiro para evitar novos juros e multas. Você gostaria de planejar como regularizar essas contas este mês?`;
    }

    const next7Text =
      analysis.dueNext7Days.length > 0
        ? `Nos próximos 7 dias vencem **${analysis.dueNext7Days.length} conta(s)**:\n` +
          analysis.dueNext7Days
            .map((d) => `• **${d.title}** (${d.creditor}) em ${d.dueDate} — Parcela: **${formatBRL(d.monthlyPayment, currency)}**`)
            .join('\n')
        : 'Você **não tem nenhuma conta vencendo nos próximos 7 dias**.';

    return [
      `🗓️ **Resumo dos seus Pagamentos deste Mês, ${userName}:**`,
      `• **Total das parcelas do mês:** ${formatBRL(analysis.totalMonthlyPayment, currency)}`,
      `• **Contas em atraso:** ${analysis.overdueCount > 0 ? `${analysis.overdueCount} conta(s) (${formatBRL(analysis.overdueAmount, currency)})` : 'Nenhuma'}`,
      '',
      next7Text,
    ].join('\n');
  }

  // 5. Pergunta sobre total devido
  if (q.includes('total') || q.includes('quanto ainda devo') || q.includes('saldo devedor')) {
    return `💰 **Seu Saldo Devedor Atual, ${userName}:**\n• **Total que falta pagar:** ${formatBRL(analysis.totalRemainingAmount, currency)} (em ${analysis.activeDebtsCount} dívida(s) ativa(s))\n• **Valor que você já quitou:** ${formatBRL(analysis.totalAmortizedAmount, currency)} (${analysis.amortizedPercent}% do total inicial)\n• **Soma das parcelas mensais:** ${formatBRL(analysis.totalMonthlyPayment, currency)}/mês`;
  }

  // Resposta padrão acolhedora e objetiva
  const topAvalanche = analysis.avalancheOrder[0];
  const topSnowball = analysis.snowballOrder[0];
  return [
    `Olá, ${userName}! Olhando para os seus dados reais hoje (${analysis.activeDebtsCount} dívida(s) ativa(s)):`,
    `• **Saldo restante total:** ${formatBRL(analysis.totalRemainingAmount, currency)}`,
    `• **Soma das parcelas no mês:** ${formatBRL(analysis.totalMonthlyPayment, currency)}`,
    `• **Maior juros (Avalanche):** ${topAvalanche.title} (${topAvalanche.interestRate}% a.m.)`,
    `• **Menor saldo (Bola de Neve):** ${topSnowball.title} (${formatBRL(topSnowball.remainingAmount, currency)})`,
    '',
    'Se quiser que eu monte um plano completo de quitação com prazos para o seu bolso, me diga quanto você consegue destinar por mês para pagar suas dívidas!',
  ].join('\n');
}

function activeDebtsCountOrZero(analysis: UserFinancialAnalysis): number {
  return analysis.activeDebtsCount || 0;
}

/**
 * Consults the Gemini Financial Assistant using the authenticated user's isolated data.
 * Reuses the Supabase session verification and `/api/ai-chat` Gemini backend endpoint,
 * with automatic fallback to the deterministic calculation engine.
 */
export async function askFinancialAssistant(
  params: AskFinancialAssistantParams
): Promise<AskFinancialAssistantResult> {
  const { prompt, userId, debts, goals = [], profile, history = [] } = params;

  // 1. Verify authenticated user session if Supabase is active (strict user isolation)
  let verifiedUser: User | null = null;
  let accessToken: string | null = null;
  if (supabase && isSupabaseConfigured()) {
    verifiedUser = await getVerifiedSessionUser(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && (!userId || session.user?.id === userId)) {
        accessToken = session.access_token;
      }
    } catch {
      // Ignore session read error
    }
  }

  // 2. Ensure goals include the authenticated user's saved goals if not explicitly passed
  let effectiveGoals = Array.isArray(goals) && goals.length > 0 ? goals : [];
  const effectiveUserId = verifiedUser?.id || userId;
  if (effectiveGoals.length === 0 && typeof localStorage !== 'undefined' && effectiveUserId) {
    try {
      const rawGoals = localStorage.getItem(`divida_zero_goals_${effectiveUserId}`);
      if (rawGoals) {
        const parsed = JSON.parse(rawGoals);
        if (Array.isArray(parsed)) effectiveGoals = parsed;
      }
    } catch {
      // Ignore parse error
    }
  }

  // 3. Compute deterministic analysis strictly from the user's own data
  const analysis = buildUserFinancialAnalysis(debts, effectiveGoals, profile);

  // 4. Respect user's privacy setting allowAiDataAnalysis
  if (profile && profile.allowAiDataAnalysis === false) {
    const localReply = generateDeterministicAssistantReply(
      prompt,
      analysis,
      debts,
      effectiveGoals,
      profile
    );
    return {
      reply: `${localReply}\n\n🔒 *Nota de Privacidade: A análise externa por IA está desativada nas preferências do seu perfil. Esta resposta foi gerada 100% localmente no seu dispositivo.*`,
      source: 'privacy_restricted',
      analysis,
    };
  }

  // 5. Call the server-side Gemini endpoint (/api/ai-chat) with the user's isolated financial context
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        prompt: prompt.trim(),
        userId: effectiveUserId || 'authenticated-user',
        debtsContext: debts,
        goalsContext: effectiveGoals,
        profileContext: profile
          ? {
              name: profile.name,
              currency: profile.currency,
              monthlyIncome: profile.monthlyIncome || 0,
              occupation: profile.occupation || '',
              financialBio: profile.financialBio || '',
            }
          : undefined,
        analysisContext: {
          activeDebtsCount: analysis.activeDebtsCount,
          settledDebtsCount: analysis.settledDebtsCount,
          overdueCount: analysis.overdueCount,
          overdueAmount: analysis.overdueAmount,
          totalRemainingAmount: analysis.totalRemainingAmount,
          totalAmortizedAmount: analysis.totalAmortizedAmount,
          amortizedPercent: analysis.amortizedPercent,
          totalMonthlyPayment: analysis.totalMonthlyPayment,
          totalEstimatedMonthlyInterest: analysis.totalEstimatedMonthlyInterest,
          totalInstallmentsContracted: analysis.totalInstallmentsContracted,
          totalInstallmentsPaid: analysis.totalInstallmentsPaid,
          totalInstallmentsRemaining: analysis.totalInstallmentsRemaining,
          hasConfiguredIncome: analysis.hasConfiguredIncome,
          incomeCommitmentPercent: analysis.incomeCommitmentPercent,
          hasConfiguredExtraTarget: analysis.hasConfiguredExtraTarget,
          extraMonthlyTarget: analysis.extraMonthlyTarget,
          canCalculateExactPayoffTimeline: analysis.canCalculateExactPayoffTimeline,
          standardPayoffMonths: analysis.standardPayoffMonths,
          acceleratedPayoffMonths: analysis.acceleratedPayoffMonths,
          monthsSavedWithExtra: analysis.monthsSavedWithExtra,
          debtsWithoutMonthlyPayment: analysis.debtsWithoutMonthlyPayment,
          debtsWithoutInterestRate: analysis.debtsWithoutInterestRate,
          missingDataForCompletePlan: analysis.missingDataForCompletePlan,
          avalancheTop: analysis.avalancheOrder[0] || null,
          snowballTop: analysis.snowballOrder[0] || null,
          categories: analysis.categories,
        },
        history: history.slice(-8),
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data?.reply && typeof data.reply === 'string' && data.reply.trim()) {
      return {
        reply: data.reply.trim(),
        source: 'gemini',
        analysis,
      };
    }
    throw new Error('Empty AI reply');
  } catch {
    // 6. Fallback to deterministic local advisor engine using 100% real user data
    const fallbackReply = generateDeterministicAssistantReply(
      prompt,
      analysis,
      debts,
      effectiveGoals,
      profile
    );
    return {
      reply: fallbackReply,
      source: 'local_engine',
      analysis,
    };
  }
}


