import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

export type CallerContext = {
  authUserId: string
  empresaId: string | null
  tipoUsuario: 'adm' | 'sup' | 'opr' | null
  isSuperAdmin: boolean
}

type DriveConfigRow = {
  empresa_id: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at: string
  google_drive_root_folder_id: string
}

export function createSupabaseClients(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const caller = createClient(supabaseUrl, anonKey, {
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return { supabaseUrl, serviceRoleKey, authHeader, admin, caller }
}

export async function getCallerContext(req: Request): Promise<CallerContext> {
  const { authHeader, admin, caller } = createSupabaseClients(req)

  if (!authHeader) {
    throw new Error('Nao autorizado')
  }

  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser()
  if (userError || !user) {
    throw new Error('Nao autorizado')
  }

  const { data: usuario, error: usuarioError } = await admin
    .from('usuarios')
    .select('empresa_id, tipo_usuario, ativo')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (usuarioError) {
    throw new Error(usuarioError.message)
  }

  const { data: superAdmin, error: superAdminError } = await admin
    .from('super_admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (superAdminError) {
    throw new Error(superAdminError.message)
  }

  const isSuperAdmin = !!superAdmin
  const empresaId = usuario?.ativo ? usuario.empresa_id : null
  const tipoUsuario = (usuario?.ativo ? usuario.tipo_usuario : null) as CallerContext['tipoUsuario']

  if (!isSuperAdmin && !empresaId) {
    throw new Error('Usuario sem empresa ativa')
  }

  return {
    authUserId: user.id,
    empresaId,
    tipoUsuario,
    isSuperAdmin,
  }
}

export function assertAdminTenantRole(context: CallerContext) {
  if (context.isSuperAdmin) return
  if (context.tipoUsuario !== 'adm') {
    throw new Error('Apenas administradores podem conectar Google Drive')
  }
}

function getCryptoKeyBytes() {
  const keyBase64 = Deno.env.get('GOOGLE_TOKEN_ENCRYPTION_KEY')
  if (!keyBase64) {
    throw new Error('Missing GOOGLE_TOKEN_ENCRYPTION_KEY')
  }
  return Uint8Array.from(atob(keyBase64), (char) => char.charCodeAt(0))
}

function toBase64Url(bytes: Uint8Array) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

export async function encryptSecret(plainText: string) {
  const keyBytes = getCryptoKeyBytes()
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainText)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`
}

export async function decryptSecret(payload: string) {
  const [ivPart, dataPart] = payload.split('.')
  if (!ivPart || !dataPart) {
    throw new Error('Invalid encrypted payload')
  }
  const keyBytes = getCryptoKeyBytes()
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  const iv = fromBase64Url(ivPart)
  const encrypted = fromBase64Url(dataPart)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

type OAuthState = {
  empresa_id: string
  user_id: string
  exp: number
}

async function signStatePayload(payload: string) {
  const stateSecret = Deno.env.get('GOOGLE_OAUTH_STATE_SECRET')
  if (!stateSecret) {
    throw new Error('Missing GOOGLE_OAUTH_STATE_SECRET')
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(stateSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return toBase64Url(new Uint8Array(signature))
}

export async function createSignedState(data: OAuthState) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(data)))
  const sig = await signStatePayload(payload)
  return `${payload}.${sig}`
}

export async function verifySignedState(state: string): Promise<OAuthState> {
  const [payload, signature] = state.split('.')
  if (!payload || !signature) {
    throw new Error('Invalid OAuth state')
  }
  const expected = await signStatePayload(payload)
  if (expected !== signature) {
    throw new Error('Invalid OAuth state signature')
  }
  const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as OAuthState
  if (!parsed.empresa_id || !parsed.user_id || !parsed.exp) {
    throw new Error('Invalid OAuth state payload')
  }
  if (Date.now() > parsed.exp) {
    throw new Error('OAuth state expirado')
  }
  return parsed
}

export async function getGoogleAccessToken(
  admin: ReturnType<typeof createClient>,
  empresaId: string
): Promise<{ accessToken: string; driveFolderId: string }> {
  const { data: config, error: configError } = await admin
    .from('empresa_google_drive_config')
    .select(
      'empresa_id, access_token_encrypted, refresh_token_encrypted, token_expires_at, google_drive_root_folder_id'
    )
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (configError) throw new Error(configError.message)
  if (!config) throw new Error('Google Drive nao conectado para esta empresa')

  let accessToken = await decryptSecret((config as DriveConfigRow).access_token_encrypted)
  const refreshToken = await decryptSecret((config as DriveConfigRow).refresh_token_encrypted)
  const expiresAt = new Date((config as DriveConfigRow).token_expires_at).getTime()

  if (Date.now() >= expiresAt - 30_000) {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      throw new Error('Missing Google OAuth credentials')
    }

    const refreshBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshBody.toString(),
    })
    const refreshData = await refreshResponse.json()

    if (!refreshResponse.ok || !refreshData.access_token) {
      throw new Error(refreshData.error_description || refreshData.error || 'Falha ao atualizar token Google')
    }

    accessToken = refreshData.access_token as string
    const encryptedAccess = await encryptSecret(accessToken)
    const expiresIn = Number(refreshData.expires_in || 3600)
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const { error: updateError } = await admin
      .from('empresa_google_drive_config')
      .update({
        access_token_encrypted: encryptedAccess,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('empresa_id', empresaId)

    if (updateError) throw new Error(updateError.message)
  }

  return { accessToken, driveFolderId: (config as DriveConfigRow).google_drive_root_folder_id }
}

export async function ensureTenantRootFolder(accessToken: string, empresaId: string) {
  const folderName = `Hub-${empresaId}`
  const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })
  const createData = await createResp.json()
  if (!createResp.ok || !createData.id) {
    throw new Error(createData.error?.message || 'Falha ao criar pasta raiz no Google Drive')
  }
  return createData.id as string
}

