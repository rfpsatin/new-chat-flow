// n8n-webhook-cinemkt v3
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface N8nCinemktPayload {
  to: string
  body: string
  source?: string
  /** Alternativa a source: alguns fluxos n8n enviam chat_name (ex.: "web-chat") */
  chat_name?: string
  channel?: string
  human_mode?: boolean
  resposta?: string
}

/**
 * Normaliza o campo channel:
 * - "comercial" → "Comercial"
 * - "mkt" → "Marketing"
 * - null/undefined/vazio → "WhatsApp" (quando não há channel, significa que veio do fluxo maia-beach-tennis-demo)
 */
function normalizeChannel(channel: string | null | undefined): string | null {
  if (!channel || channel.trim() === '') {
    return 'WhatsApp'
  }
  
  const normalized = channel.toLowerCase().trim()
  
  if (normalized === 'comercial') {
    return 'Comercial'
  }
  
  if (normalized === 'mkt') {
    return 'Marketing'
  }
  
  // Se não for nenhum dos valores esperados, retorna WhatsApp como padrão
  return 'WhatsApp'
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== N8N WEBHOOK CINEMKT RECEIVED ==========`)
  console.log(`[${requestId}] Method: ${req.method}`)
  console.log(`[${requestId}] URL: ${req.url}`)

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auto-detect empresa (first active)
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia')
      .eq('ativo', true)
      .limit(1)
      .single()

    if (empresaError || !empresa) {
      console.error(`[${requestId}] No active empresa found:`, empresaError)
      return new Response(JSON.stringify({ error: 'No active empresa found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const empresaId = empresa.id
    console.log(`[${requestId}] Empresa: ${empresa.nome_fantasia || empresaId}`)

    const body: N8nCinemktPayload = await req.json()
    console.log(`[${requestId}] Payload:`, JSON.stringify(body, null, 2))

    if (!body.to || !body.body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to and body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const n8nWebhookId = body.to
    const mensagemUsuario = body.body
    const source = body.source ?? body.chat_name ?? null
    const rawChannel = body.channel || null
    const channel = normalizeChannel(rawChannel) // Normaliza o channel antes de usar
    const humanMode = body.human_mode === true
    const respostaBot = body.resposta || null

    console.log(`[${requestId}] n8n_webhook_id: ${n8nWebhookId}, source: ${source}, channel (raw): ${rawChannel}, channel (normalized): ${channel}, human_mode: ${humanMode}`)

    // Find or create contact
    const contato = await findOrCreateContato(supabase, empresaId, n8nWebhookId, requestId)
    if (!contato) throw new Error('Failed to find or create contact')

    // Find or create conversation
    const conversa = await findOrCreateConversa(supabase, empresaId, contato.id, mensagemUsuario, n8nWebhookId, source, channel, humanMode, requestId)
    if (!conversa) throw new Error('Failed to find or create conversation')

    // Insert user message
    const { error: msgError } = await supabase
      .from('mensagens_ativas')
      .insert({
        empresa_id: empresaId,
        conversa_id: conversa.id,
        contato_id: contato.id,
        direcao: 'in',
        tipo_remetente: 'cliente',
        conteudo: mensagemUsuario,
        payload: body,
      })

    if (msgError) {
      console.error(`[${requestId}] ERROR inserting user message:`, msgError)
      throw msgError
    }

    console.log(`[${requestId}] User message inserted`)

    // Insert bot response if present
    if (respostaBot) {
      const { error: botMsgError } = await supabase
        .from('mensagens_ativas')
        .insert({
          empresa_id: empresaId,
          conversa_id: conversa.id,
          contato_id: contato.id,
          direcao: 'out',
          tipo_remetente: 'bot',
          conteudo: respostaBot,
          payload: { ...body, tipo: 'bot_response' },
        })

      if (botMsgError) {
        console.error(`[${requestId}] ERROR inserting bot message:`, botMsgError)
      } else {
        console.log(`[${requestId}] Bot message inserted`)
      }
    }

    // Update conversation timestamp
    await supabase
      .from('conversas')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', conversa.id)

    // Transfer to triage if human_mode
    if (humanMode && conversa.status === 'bot') {
      console.log(`[${requestId}] human_mode=true, transferring to triage`)
      await supabase
        .from('conversas')
        .update({ status: 'esperando_tria', updated_at: new Date().toISOString() })
        .eq('id', conversa.id)
        .eq('status', 'bot')
    }

    console.log(`[${requestId}] ========== COMPLETE ==========`)

    return new Response(JSON.stringify({ success: true, conversa_id: conversa.id, contato_id: contato.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${requestId}] FATAL ERROR:`, errorMsg)
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function findOrCreateContato(supabase: any, empresaId: string, n8nWebhookId: string, requestId: string) {
  const { data: existing, error: findError } = await supabase
    .from('contatos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('whatsapp_numero', n8nWebhookId)
    .maybeSingle()

  if (findError) throw findError
  if (existing) {
    console.log(`[${requestId}] Found contact: ${existing.id}`)
    return existing
  }

  const { data: newContato, error: createError } = await supabase
    .from('contatos')
    .insert({ empresa_id: empresaId, whatsapp_numero: n8nWebhookId, nome: null })
    .select()
    .single()

  if (createError) throw createError
  console.log(`[${requestId}] Created contact: ${newContato.id}`)
  return newContato
}

async function findOrCreateConversa(
  supabase: any, empresaId: string, contatoId: string, conteudo: string,
  n8nWebhookId: string, source: string | null, channel: string | null,
  humanMode: boolean, requestId: string
) {
  const { data: active, error: findError } = await supabase
    .from('conversas')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('contato_id', contatoId)
    .neq('status', 'encerrado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) throw findError

  if (active) {
    console.log(`[${requestId}] Found active conversa: ${active.id} (${active.status})`)
    const updateData: any = { updated_at: new Date().toISOString() }
    if (source !== null) updateData.source = source
    // Sempre atualiza o channel quando fornecido (já vem normalizado)
    if (channel !== null) updateData.channel = channel
    if (humanMode !== undefined) updateData.human_mode = humanMode
    if (n8nWebhookId) updateData.n8n_webhook_id = n8nWebhookId

    await supabase.from('conversas').update(updateData).eq('id', active.id)
    return { ...active, ...updateData }
  }

  const { data: newConversa, error: createError } = await supabase
    .from('conversas')
    .insert({
      empresa_id: empresaId,
      contato_id: contatoId,
      status: 'bot',
      canal: 'whatsapp',
      iniciado_por: 'cliente',
      source, channel, human_mode: humanMode, n8n_webhook_id: n8nWebhookId,
    })
    .select()
    .single()

  if (createError) throw createError
  console.log(`[${requestId}] Created conversa: ${newConversa.id}`)
  return newConversa
}
