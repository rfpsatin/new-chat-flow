import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface RescheduleRequest {
  campanha_id?: string
  agendado_para?: string
}

type CallerTenant = {
  usuarioId: string
  empresaId: string
}

async function getCallerTenant(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<CallerTenant> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Nao autorizado')
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser()

  if (userError || !user) {
    throw new Error('Nao autorizado')
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: usuario, error: usuarioError } = await adminClient
    .from('usuarios')
    .select('id, empresa_id, ativo')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (usuarioError) throw new Error(usuarioError.message)
  if (!usuario || !usuario.ativo || !usuario.empresa_id) {
    throw new Error('Usuario sem empresa ativa')
  }

  return {
    usuarioId: usuario.id,
    empresaId: usuario.empresa_id,
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== RESCHEDULE CAMPAIGN ERRORS ==========`)

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
    const body: RescheduleRequest = await req.json().catch(() => ({}))
    const campanhaId = body.campanha_id
    const agendadoPara = body.agendado_para

    if (!campanhaId || !agendadoPara) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['campanha_id', 'agendado_para'],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerTenant = await getCallerTenant(req, supabaseUrl, serviceRoleKey)

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const nowIso = new Date().toISOString()

    // Garantir que a campanha pertence à empresa do usuário
    const { data: campanha, error: campFetchError } = await supabase
      .from('campanhas')
      .select('id, empresa_id')
      .eq('id', campanhaId)
      .maybeSingle()

    if (campFetchError) {
      console.error(`[${requestId}] Error fetching campanha:`, campFetchError)
      return new Response(JSON.stringify({ error: 'Erro ao buscar campanha' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!campanha || campanha.empresa_id !== callerTenant.empresaId) {
      return new Response(JSON.stringify({ error: 'Campanha não pertence à empresa do usuário' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1) Voltar apenas os destinatários com erro_envio para pendente
    const { error: destError } = await supabase
      .from('campanha_destinatarios')
      .update({
        status_envio: 'pendente',
        ultima_tentativa_em: nowIso,
      })
      .eq('campanha_id', campanhaId)
      .eq('status_envio', 'erro_envio')

    if (destError) {
      console.error(`[${requestId}] Error updating destinatarios:`, destError)
      return new Response(JSON.stringify({ error: destError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Reagendar a campanha
    const { error: campUpdateError } = await supabase
      .from('campanhas')
      .update({
        status: 'agendada',
        agendado_para: agendadoPara,
        updated_at: nowIso,
      })
      .eq('id', campanhaId)

    if (campUpdateError) {
      console.error(`[${requestId}] Error updating campanha:`, campUpdateError)
      return new Response(JSON.stringify({ error: campUpdateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        campanha_id: campanhaId,
        agendado_para: agendadoPara,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${requestId}] FATAL:`, msg)
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

