// @version 4 — deploy target: hyizldxjiwjeruxqrqbv
// n8n-reset-human-mode v3
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'https://n8n.maringaai.com.br/webhook/whatsapp_cinemkt'

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
    throw new Error('Perfil sem permissao para resetar human_mode')
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

    console.log(`[n8n-reset-human-mode] Received request for conversa=${conversa_id}, empresa=${empresa_id}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: conversa, error: convError } = await supabase
      .from('conversas')
      .select('n8n_webhook_id, origem, channel, contato_id, human_mode, origem_final')
      .eq('id', conversa_id)
      .eq('empresa_id', empresa_id)
      .single()

    if (convError || !conversa) {
      console.error(`[n8n-reset-human-mode] Failed to find conversa:`, convError)
      return new Response(JSON.stringify({ error: 'Conversa not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let recipientNumber = conversa.n8n_webhook_id

    if (!recipientNumber) {
      const { data: contato, error: contatoError } = await supabase
        .from('contatos')
        .select('whatsapp_numero')
        .eq('id', conversa.contato_id)
        .single()

      if (contatoError || !contato) {
        console.error(`[n8n-reset-human-mode] Failed to find contato:`, contatoError)
        return new Response(JSON.stringify({ error: 'Contato not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      recipientNumber = contato.whatsapp_numero
    }

    // Limpar sufixo do WhatsApp se existir, manter apenas dígitos
    const cleanNumber = recipientNumber.replace(/@(s\.whatsapp\.net|c\.us)$/, '').replace(/\D/g, '')
    const chatId = `${cleanNumber}@s.whatsapp.net`

    console.log(`[n8n-reset-human-mode] Resetting human_mode for number: ${cleanNumber}`)

    // Resetar human_mode no banco de dados
    await supabase
      .from('conversas')
      .update({ human_mode: false, updated_at: new Date().toISOString() })
      .eq('id', conversa_id)
      .eq('empresa_id', empresa_id)

    // Enviar ao n8n no formato que o Code node espera (Whapi-like)
    // para que o Redis seja atualizado corretamente.
    // Usa from_me=true + marker #"human_mode=false"# para que o Code
    // extraia o valor e o fluxo atualize o Redis.
    const payload = {
      messages: [{
        id: `reset-${Date.now()}`,
        from_me: true,
        type: 'text',
        chat_id: chatId,
        timestamp: Math.floor(Date.now() / 1000),
        source: 'api',
        text: { body: `#"human_mode=false"# [reset]` },
        from: cleanNumber,
      }],
      event: { type: 'messages', event: 'post' },
    }

    console.log(`[n8n-reset-human-mode] Sending formatted payload to n8n`)

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
      console.log(`[n8n-reset-human-mode] n8n response: ${response.status} - ${responseText.substring(0, 300)}`)

      return new Response(JSON.stringify({ success: true, redis_reset: response.ok }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (fetchError) {
      console.error(`[n8n-reset-human-mode] n8n call failed:`, fetchError)
      return new Response(JSON.stringify({
        success: true,
        redis_reset: false,
        warning: 'DB updated but n8n/Redis reset failed - TTL will expire in ~10min',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error(`[n8n-reset-human-mode] Error:`, error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
