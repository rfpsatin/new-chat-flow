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
    throw new Error('Perfil sem permissao para encerrar atendimento')
  }

  return {
    empresaId: usuario.empresa_id,
    tipoUsuario: usuario.tipo_usuario as 'adm' | 'sup' | 'opr',
  }
}

async function updateAttendanceMode(numeroParticipante: string, channelId: string, conversaId: string) {
  console.log(`[close-service] Updating attendanceMode to automated for numero_participante ${numeroParticipante}, channel_ID ${channelId}`)

  const payload = {
    attendanceMode: 'automated',
    action: 'update',
    numero_participante: numeroParticipante,
    channel_ID: channelId,
    conversa_id: conversaId,
  }

  console.log(`[close-service] Payload: ${JSON.stringify(payload)}`)
  console.log(`[close-service] Attempting POST to ${N8N_WEBHOOK_URL}`)

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log(`[close-service] POST status: ${response.status}`)
    console.log(`[close-service] POST response body: ${responseText.substring(0, 500)}`)

    if (response.ok) {
      console.log(`[close-service] POST succeeded`)
      return true
    }

    console.error(`[close-service] POST failed with status: ${response.status}`)
    return false
  } catch (error) {
    console.error(`[close-service] POST failed with exception:`, error)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { conversa_id, chat_id } = await req.json()
    const callerTenant = await getCallerTenant(req)
    const empresa_id = callerTenant.empresaId

    if (!conversa_id) {
      return new Response(JSON.stringify({ error: 'Missing conversa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[close-service] Received request for conversa=${conversa_id}, empresa=${empresa_id}, chat_id=${chat_id}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let resolvedChatId = chat_id

    // If chat_id not provided, look it up from the database
    if (!resolvedChatId) {
      console.log(`[close-service] chat_id not provided, looking up from database...`)

      const { data: conversa, error: convError } = await supabase
        .from('conversas')
        .select('contato_id')
        .eq('id', conversa_id)
        .eq('empresa_id', empresa_id)
        .single()

      if (convError || !conversa) {
        console.error(`[close-service] Failed to find conversa:`, convError)
        return new Response(JSON.stringify({ error: 'Conversa not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: contato, error: contatoError } = await supabase
        .from('contatos')
        .select('whatsapp_numero')
        .eq('id', conversa.contato_id)
        .single()

      if (contatoError || !contato) {
        console.error(`[close-service] Failed to find contato:`, contatoError)
        return new Response(JSON.stringify({ error: 'Contato not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      resolvedChatId = contato.whatsapp_numero
      console.log(`[close-service] Resolved chat_id from database: ${resolvedChatId}`)
    }

    // Fetch whapi_token from empresas table
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('whapi_token')
      .eq('id', empresa_id)
      .single()

    if (empresaError || !empresa || !empresa.whapi_token) {
      console.error(`[close-service] Failed to find empresa or whapi_token:`, empresaError)
      return new Response(JSON.stringify({ error: 'Empresa or whapi_token not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[close-service] Resolved channel_ID (whapi_token) for empresa ${empresa_id}`)

    const result = await updateAttendanceMode(resolvedChatId, empresa.whapi_token, conversa_id)
    console.log(`[close-service] Final result: ${result}`)

    return new Response(JSON.stringify({ success: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(`[close-service] Error:`, error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
