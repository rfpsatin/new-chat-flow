// @version 1 — deploy target: hyizldxjiwjeruxqrqbv
// Edge Function para enviar respostas humanas de conversas webchat (n8n-webhook-cinemkt) para o n8n whatsapp_cinemkt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'https://n8n.maringaai.com.br/webhook/whatsapp_cinemkt'

interface WebchatHumanReplyRequest {
  empresa_id?: string
  conversa_id?: string
  mensagem?: string
  remetente_id?: string | null
  reply_to_whatsapp_id?: string | null
}

interface ConversaRow {
  id: string
  empresa_id: string
  n8n_webhook_id: string | null
  origem: string | null
  channel: string | null
  human_mode: boolean | null
}

function isN8nWebchatConversa(conversa: ConversaRow): boolean {
  const origem = (conversa.origem || '').trim().toLowerCase()
  const channel = (conversa.channel || '').trim()

  const isWebOrigem = origem === 'web-chat'
  const hasChannel = !!channel
  const isWhatsAppChannel = channel === 'WhatsApp'

  return isWebOrigem || (hasChannel && !isWhatsAppChannel)
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== WEBCHAT HUMAN REPLY ==========`)
  console.log(`[${requestId}] Method: ${req.method}`)

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
    const body: WebchatHumanReplyRequest = await req.json().catch(() => ({}))
    console.log(`[${requestId}] Body:`, JSON.stringify(body, null, 2))

    const empresa_id = body.empresa_id
    const conversa_id = body.conversa_id
    const mensagem = body.mensagem
    const remetente_id = body.remetente_id ?? null
    const reply_to_whatsapp_id = body.reply_to_whatsapp_id ?? null

    if (!empresa_id || !conversa_id || !mensagem) {
      console.error(`[${requestId}] Missing required fields`)
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['empresa_id', 'conversa_id', 'mensagem'],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: conversa, error: conversaError } = await supabase
      .from('conversas')
      .select('id, empresa_id, n8n_webhook_id, origem, channel, human_mode')
      .eq('id', conversa_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle<ConversaRow>()

    if (conversaError || !conversa) {
      console.error(`[${requestId}] Conversa not found`, conversaError)
      return new Response(
        JSON.stringify({ error: 'Conversa not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch empresa to get whapi_channel_name (channel_id)
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('whapi_channel_name')
      .eq('id', empresa_id)
      .maybeSingle()

    if (empresaError) {
      console.error(`[${requestId}] Error fetching empresa`, empresaError)
    }

    const channelId = empresa?.whapi_channel_name || null

    if (!conversa.n8n_webhook_id) {
      console.error(
        `[${requestId}] Invalid conversa for webchat reply: missing n8n_webhook_id`,
      )
      return new Response(
        JSON.stringify({
          error: 'Conversa is not linked to n8n webhook',
          reason: 'missing_n8n_webhook_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!isN8nWebchatConversa(conversa)) {
      console.error(
        `[${requestId}] Conversa does not look like webchat/n8n conversation`,
      )
      return new Response(
        JSON.stringify({
          error: 'Conversa is not a webchat/n8n conversation',
          reason: 'invalid_channel_or_origem',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Normalize channel to lowercase for n8n compatibility
    const channelNormalized = conversa.channel ? conversa.channel.toLowerCase() : null

    const n8nPayload: Record<string, unknown> = {
      to: conversa.n8n_webhook_id,
      body: mensagem,
      source: 'web-chat',
      channel: channelNormalized,
      channel_id: channelId,
      attendence: true,
      empresa_id,
      conversa_id,
      remetente_id,
    }

    if (reply_to_whatsapp_id) {
      n8nPayload.reply_to_whatsapp_id = reply_to_whatsapp_id
    }

    console.log(
      `[${requestId}] Sending human_reply to n8n for conversa=${conversa_id}, to=${conversa.n8n_webhook_id}`,
    )

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    })

    const n8nText = await n8nResponse.text().catch(() => '')
    console.log(
      `[${requestId}] n8n response: ${n8nResponse.status} - ${n8nText.substring(
        0,
        500,
      )}`,
    )

    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to send human reply to n8n',
          status: n8nResponse.status,
          body: n8nText.substring(0, 500),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let parsed: unknown = null
    try {
      parsed = n8nText ? JSON.parse(n8nText) : null
    } catch {
      parsed = n8nText
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversa_id,
        empresa_id,
        n8n_response: parsed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${requestId}] FATAL:`, msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

