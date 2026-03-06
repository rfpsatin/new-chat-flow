import {
  assertAdminTenantRole,
  corsHeaders,
  createSignedState,
  createSupabaseClients,
  getCallerContext,
} from '../_shared/google-drive.ts'

type StartBody = {
  empresa_id?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { admin } = createSupabaseClients(req)
    const caller = await getCallerContext(req)
    assertAdminTenantRole(caller)

    const body = (await req.json().catch(() => ({}))) as StartBody
    const targetEmpresaId = body.empresa_id || caller.empresaId
    if (!targetEmpresaId) {
      throw new Error('Empresa nao informada')
    }

    if (!caller.isSuperAdmin && caller.empresaId !== targetEmpresaId) {
      throw new Error('Sem permissao para conectar outra empresa')
    }

    const { data: empresa, error: empresaError } = await admin
      .from('empresas')
      .select('id')
      .eq('id', targetEmpresaId)
      .maybeSingle()
    if (empresaError) throw new Error(empresaError.message)
    if (!empresa) throw new Error('Empresa nao encontrada')

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    if (!clientId || !redirectUri) {
      throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI')
    }

    const state = await createSignedState({
      empresa_id: targetEmpresaId,
      user_id: caller.authUserId,
      exp: Date.now() + 10 * 60 * 1000,
    })

    const scope = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'openid',
      'email',
      'profile',
    ].join(' ')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('include_granted_scopes', 'true')
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)

    return new Response(
      JSON.stringify({
        success: true,
        auth_url: authUrl.toString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

