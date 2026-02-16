// n8n-webhook-cinemkt v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface N8nCinemktPayload {
  to: string
  body: string
  source?: string
  channel?: string
  human_mode?: boolean
  resposta?: string
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== N8N WEBHOOK CINEMKT RECEIVED ==========`)
  console.log(`[${requestId}] Method: ${req.method}`)
  console.log(`[${requestId}] URL: ${req.url}`)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight request`)
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`)
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Extract empresa_id from query params
    const url = new URL(req.url)
    const empresaId = url.searchParams.get('empresa_id')
    
    console.log(`[${requestId}] empresa_id from query: ${empresaId}`)

    if (!empresaId) {
      console.error(`[${requestId}] ERROR: Missing empresa_id query parameter`)
      return new Response(JSON.stringify({ 
        error: 'Missing empresa_id query parameter',
        usage: 'Add ?empresa_id=YOUR_EMPRESA_UUID to the webhook URL'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse body
    const body: N8nCinemktPayload = await req.json()
    console.log(`[${requestId}] Raw payload:`, JSON.stringify(body, null, 2))

    // Validate required fields
    if (!body.to || !body.body) {
      console.error(`[${requestId}] ERROR: Missing required fields (to or body)`)
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: to and body are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify empresa exists
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia')
      .eq('id', empresaId)
      .maybeSingle()

    if (empresaError || !empresa) {
      console.error(`[${requestId}] ERROR: Invalid empresa_id:`, empresaError)
      return new Response(JSON.stringify({ error: 'Invalid empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[${requestId}] Empresa found: ${empresa.nome_fantasia || empresa.id}`)

    // Extract values from payload
    const n8nWebhookId = body.to // ex: "webchat-1771266325740"
    const mensagemUsuario = body.body
    const source = body.source || null
    const channel = body.channel || null
    const humanMode = body.human_mode === true
    const respostaBot = body.resposta || null

    console.log(`[${requestId}] Processing message from n8n_webhook_id: ${n8nWebhookId}`)
    console.log(`[${requestId}] source: ${source}, channel: ${channel}, human_mode: ${humanMode}`)

    // Find or create contact using n8n_webhook_id as whatsapp_numero
    // For n8n webhook, the "to" field is the unique identifier
    let contato = await findOrCreateContato(
      supabase,
      empresaId,
      n8nWebhookId,
      requestId
    )

    if (!contato) {
      throw new Error('Failed to find or create contact')
    }

    // Find or create conversation
    // First message creates new conversation, subsequent messages use existing active conversation
    const conversa = await findOrCreateConversa(
      supabase,
      empresaId,
      contato.id,
      mensagemUsuario,
      n8nWebhookId,
      source,
      channel,
      humanMode,
      requestId
    )

    if (!conversa) {
      throw new Error('Failed to find or create conversation')
    }

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

    console.log(`[${requestId}] User message inserted successfully`)

    // If bot response exists, insert it as bot message
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
        // Don't throw - user message was already inserted
      } else {
        console.log(`[${requestId}] Bot message inserted successfully`)
      }
    }

    // Update conversation last_message_at
    const { error: updateError } = await supabase
      .from('conversas')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversa.id)

    if (updateError) {
      console.error(`[${requestId}] ERROR updating conversation:`, updateError)
    }

    // Check if human_mode is true and transfer to triage
    if (humanMode && conversa.status === 'bot') {
      console.log(`[${requestId}] human_mode = true detected, transferring to triage...`)
      const { error: triageError } = await supabase
        .from('conversas')
        .update({ 
          status: 'esperando_tria', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', conversa.id)
        .eq('status', 'bot')
      
      if (triageError) {
        console.error(`[${requestId}] ERROR updating to esperando_tria:`, triageError)
      } else {
        console.log(`[${requestId}] Conversa moved to esperando_tria`)
      }
    }

    console.log(`[${requestId}] ========== WEBHOOK COMPLETE ==========`)

    return new Response(JSON.stringify({ 
      success: true,
      conversa_id: conversa.id,
      contato_id: contato.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${requestId}] FATAL ERROR:`, errorMsg)
    
    // Always return 200 to prevent n8n retries (or adjust based on n8n behavior)
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMsg 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function findOrCreateContato(
  supabase: any,
  empresaId: string,
  n8nWebhookId: string,
  requestId: string
) {
  console.log(`[${requestId}] Finding contact: ${n8nWebhookId}`)
  
  // Try to find existing contact by whatsapp_numero (which stores n8n_webhook_id for this webhook)
  const { data: existingContato, error: findError } = await supabase
    .from('contatos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('whatsapp_numero', n8nWebhookId)
    .maybeSingle()

  if (findError) {
    console.error(`[${requestId}] ERROR finding contact:`, findError)
    throw findError
  }

  if (existingContato) {
    console.log(`[${requestId}] Found existing contact: ${existingContato.id}`)
    return existingContato
  }

  // Create new contact
  console.log(`[${requestId}] Creating new contact`)
  const { data: newContato, error: createError } = await supabase
    .from('contatos')
    .insert({
      empresa_id: empresaId,
      whatsapp_numero: n8nWebhookId,
      nome: null, // n8n doesn't provide name in this webhook
    })
    .select()
    .single()

  if (createError) {
    console.error(`[${requestId}] ERROR creating contact:`, createError)
    throw createError
  }

  console.log(`[${requestId}] Created new contact: ${newContato.id}`)
  return newContato
}

async function findOrCreateConversa(
  supabase: any,
  empresaId: string,
  contatoId: string,
  conteudo: string,
  n8nWebhookId: string,
  source: string | null,
  channel: string | null,
  humanMode: boolean,
  requestId: string
) {
  console.log(`[${requestId}] Finding conversation for contact: ${contatoId}`)
  
  // Find active conversation (not encerrado) for this contact
  const { data: activeConversa, error: findError } = await supabase
    .from('conversas')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('contato_id', contatoId)
    .neq('status', 'encerrado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) {
    console.error(`[${requestId}] ERROR finding conversation:`, findError)
    throw findError
  }

  // If active conversation exists, use it and update metadata
  if (activeConversa) {
    console.log(`[${requestId}] Found active conversation: ${activeConversa.id} (status: ${activeConversa.status})`)
    
    // Update metadata if provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (source !== null) updateData.source = source
    if (channel !== null) updateData.channel = channel
    if (humanMode !== undefined) updateData.human_mode = humanMode
    if (n8nWebhookId) updateData.n8n_webhook_id = n8nWebhookId
    
    const { error: updateError } = await supabase
      .from('conversas')
      .update(updateData)
      .eq('id', activeConversa.id)
    
    if (updateError) {
      console.error(`[${requestId}] ERROR updating conversation metadata:`, updateError)
    }
    
    return { ...activeConversa, ...updateData }
  }

  // No active conversation exists - this is the first message
  // Create new conversation
  console.log(`[${requestId}] Creating new conversation (first message)`)
  const { data: newConversa, error: createError } = await supabase
    .from('conversas')
    .insert({
      empresa_id: empresaId,
      contato_id: contatoId,
      status: 'bot',
      canal: 'whatsapp',
      iniciado_por: 'cliente',
      source: source,
      channel: channel,
      human_mode: humanMode,
      n8n_webhook_id: n8nWebhookId,
    })
    .select()
    .single()

  if (createError) {
    console.error(`[${requestId}] ERROR creating conversation:`, createError)
    throw createError
  }

  console.log(`[${requestId}] Created new conversation: ${newConversa.id}`)
  return newConversa
}

