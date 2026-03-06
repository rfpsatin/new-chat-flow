import {
  corsHeaders,
  createSupabaseClients,
  decryptSecret,
  encryptSecret,
  ensureTenantRootFolder,
  verifySignedState,
} from '../_shared/google-drive.ts'

function buildHtml(message: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Google Drive conectado</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f6f7fb; margin: 0; padding: 24px; }
      .card { max-width: 560px; margin: 40px auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; }
      h1 { margin-top: 0; font-size: 22px; }
      p { color: #374151; line-height: 1.4; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Integracao Google Drive</h1>
      <p>${message}</p>
      <p>Voce pode fechar esta aba e voltar ao sistema.</p>
    </div>
  </body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { admin } = createSupabaseClients(req)
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      throw new Error(`Google OAuth error: ${error}`)
    }

    if (!code || !state) {
      throw new Error('Missing code/state in callback')
    }

    const stateData = await verifySignedState(state)

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Google OAuth env vars')
    }

    const tokenBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Falha ao obter token Google')
    }

    const googleUserResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const googleUser = await googleUserResponse.json()
    if (!googleUserResponse.ok || !googleUser.email) {
      throw new Error(googleUser.error?.message || 'Falha ao obter perfil Google')
    }

    const { data: currentConfig } = await admin
      .from('empresa_google_drive_config')
      .select('refresh_token_encrypted, google_drive_root_folder_id')
      .eq('empresa_id', stateData.empresa_id)
      .maybeSingle()

    const refreshToken =
      tokenData.refresh_token ||
      (currentConfig?.refresh_token_encrypted
        ? await decryptSecret(currentConfig.refresh_token_encrypted)
        : null)

    if (!refreshToken) {
      throw new Error('Google nao retornou refresh token. Tente reconectar com permissao completa.')
    }

    const encryptedAccess = await encryptSecret(tokenData.access_token as string)
    const encryptedRefresh = await encryptSecret(refreshToken)
    const expiresIn = Number(tokenData.expires_in || 3600)
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
    const rootFolderId =
      currentConfig?.google_drive_root_folder_id ||
      (await ensureTenantRootFolder(tokenData.access_token as string, stateData.empresa_id))

    const { error: upsertError } = await admin.from('empresa_google_drive_config').upsert({
      empresa_id: stateData.empresa_id,
      connected_by_auth_user_id: stateData.user_id,
      google_user_email: googleUser.email as string,
      google_drive_root_folder_id: rootFolderId,
      access_token_encrypted: encryptedAccess,
      refresh_token_encrypted: encryptedRefresh,
      token_expires_at: tokenExpiresAt,
      scopes: Array.isArray(tokenData.scope) ? tokenData.scope : String(tokenData.scope || '').split(' ').filter(Boolean),
      updated_at: new Date().toISOString(),
      connected_at: new Date().toISOString(),
      last_error: null,
    })
    if (upsertError) throw new Error(upsertError.message)

    const successRedirect = Deno.env.get('GOOGLE_DRIVE_CONNECT_SUCCESS_URL')
    if (successRedirect) {
      const redirectUrl = new URL(successRedirect)
      redirectUrl.searchParams.set('status', 'connected')
      redirectUrl.searchParams.set('empresa_id', stateData.empresa_id)
      return Response.redirect(redirectUrl.toString(), 302)
    }

    return new Response(buildHtml('Conexao concluida com sucesso.'), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const errorRedirect = Deno.env.get('GOOGLE_DRIVE_CONNECT_ERROR_URL')
    if (errorRedirect) {
      const redirectUrl = new URL(errorRedirect)
      redirectUrl.searchParams.set('status', 'error')
      redirectUrl.searchParams.set('message', message)
      return Response.redirect(redirectUrl.toString(), 302)
    }
    return new Response(buildHtml(`Erro na conexao: ${message}`), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
})

