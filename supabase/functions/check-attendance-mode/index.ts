import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'https://n8n.maringaai.com.br/webhook/maia-beach-tennis-demo'

type CallerTenant = {
  empresaId: string
  tipoUsuario: 'adm' | 'sup' | 'opr'
}

async function getCallerTenant(req: Request): Promise<CallerTenant> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Nao autorizado')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: userError } = await callerClient.auth.getUser()
  if (userError || !user) throw new Error('Nao autorizado')

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: usuario, error: usuarioError } = await adminClient
    .from('usuarios')
    .select('empresa_id, tipo_usuario, ativo')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (usuarioError) throw new Error(usuarioError.message)
  if (!usuario || !usuario.ativo || !usuario.empresa_id) throw new Error('Usuario sem empresa ativa')
  if (!['adm', 'sup', 'opr'].includes(usuario.tipo_usuario)) {
    throw new Error('Perfil sem permissao para consultar attendance mode')
  }

  return {
    empresaId: usuario.empresa_id,
    tipoUsuario: usuario.tipo_usuario as 'adm' | 'sup' | 'opr',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { conversa_id } = await req.json()
    const callerTenant = await getCallerTenant(req)
    const empresa_id = callerTenant.empresaId

    if (!conversa_id) {
      return new Response(JSON.stringify({ error: 'Missing conversa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[check-attendance-mode] Checking for conversa ${conversa_id}`)

    // Query n8n/Redis for attendanceMode
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, { method: 'GET' })

    if (!n8nResponse.ok) {
      console.error(`[check-attendance-mode] n8n returned ${n8nResponse.status}`)
      return new Response(JSON.stringify({ error: 'Failed to query n8n', status: n8nResponse.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await n8nResponse.json()
    console.log(`[check-attendance-mode] n8n response:`, JSON.stringify(result))

    const attendanceMode = result?.attendanceMode || result?.attendance_mode || 'automated'

    if (attendanceMode === 'human') {
      console.log(`[check-attendance-mode] Mode is human, updating conversa to esperando_tria`)

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const { error } = await supabase
        .from('conversas')
        .update({ status: 'esperando_tria', updated_at: new Date().toISOString() })
        .eq('id', conversa_id)
        .eq('empresa_id', empresa_id)
        .eq('status', 'bot')

      if (error) {
        console.error(`[check-attendance-mode] Error updating conversa:`, error)
        return new Response(JSON.stringify({ error: 'Failed to update conversa' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, action: 'moved_to_esperando_tria' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[check-attendance-mode] Mode is ${attendanceMode}, no action needed`)
    return new Response(JSON.stringify({ success: true, action: 'none', mode: attendanceMode }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error(`[check-attendance-mode] Error:`, error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
