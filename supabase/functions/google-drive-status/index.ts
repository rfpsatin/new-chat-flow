import { corsHeaders, createSupabaseClients, getCallerContext } from '../_shared/google-drive.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { admin } = createSupabaseClients(req)
    const caller = await getCallerContext(req)
    const url = new URL(req.url)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const requestedEmpresaId =
      url.searchParams.get('empresa_id') || (body as { empresa_id?: string }).empresa_id || null
    const targetEmpresaId = requestedEmpresaId || caller.empresaId

    if (!targetEmpresaId) {
      throw new Error('Empresa nao informada')
    }
    if (!caller.isSuperAdmin && targetEmpresaId !== caller.empresaId) {
      throw new Error('Sem permissao para consultar outra empresa')
    }

    const { data, error } = await admin
      .from('empresa_google_drive_config')
      .select('empresa_id, google_user_email, google_drive_root_folder_id, token_expires_at, connected_at, updated_at, last_error')
      .eq('empresa_id', targetEmpresaId)
      .maybeSingle()
    if (error) throw new Error(error.message)

    return new Response(
      JSON.stringify({
        connected: !!data,
        config: data || null,
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

