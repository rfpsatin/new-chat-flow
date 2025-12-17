import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhapiMessage {
  id: string
  from: string
  from_name?: string
  chat_id: string
  timestamp: number
  type: string
  text?: {
    body: string
  }
  image?: {
    caption?: string
    link?: string
  }
  document?: {
    filename?: string
    link?: string
  }
}

interface WhapiEvent {
  event?: {
    type: string
    messages?: WhapiMessage[]
  }
  messages?: WhapiMessage[]
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== WHAPI WEBHOOK RECEIVED ==========`)
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
    const body: WhapiEvent = await req.json()
    console.log(`[${requestId}] Raw payload:`, JSON.stringify(body, null, 2))

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

    // Extract messages - Whapi can send in different formats
    const messages = body.event?.messages || body.messages || []
    
    if (messages.length === 0) {
      console.log(`[${requestId}] No messages in payload, acknowledging`)
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[${requestId}] Processing ${messages.length} message(s)`)

    let processedCount = 0
    const errors: string[] = []

    for (const message of messages) {
      try {
        console.log(`[${requestId}] ---- Processing message ${message.id} ----`)
        console.log(`[${requestId}] From: ${message.from}`)
        console.log(`[${requestId}] Type: ${message.type}`)
        
        // Extract WhatsApp number (remove @s.whatsapp.net or @c.us)
        const whatsappNumero = message.from
          .replace('@s.whatsapp.net', '')
          .replace('@c.us', '')
        
        console.log(`[${requestId}] WhatsApp number: ${whatsappNumero}`)

        // 1. Find or create contact
        let contato = await findOrCreateContato(
          supabase, 
          empresaId, 
          whatsappNumero, 
          message.from_name,
          requestId
        )

        if (!contato) {
          throw new Error('Failed to find or create contact')
        }

        // 2. Find active conversation or create new one
        let conversa = await findOrCreateConversa(
          supabase,
          empresaId,
          contato.id,
          requestId
        )

        if (!conversa) {
          throw new Error('Failed to find or create conversation')
        }

        // 3. Extract message content
        const conteudo = extractMessageContent(message)
        console.log(`[${requestId}] Message content: ${conteudo.substring(0, 100)}...`)

        // 4. Insert message
        const { error: msgError } = await supabase
          .from('mensagens_ativas')
          .insert({
            empresa_id: empresaId,
            conversa_id: conversa.id,
            contato_id: contato.id,
            direcao: 'in',
            tipo_remetente: 'cliente',
            conteudo: conteudo,
            payload: message,
          })

        if (msgError) {
          console.error(`[${requestId}] ERROR inserting message:`, msgError)
          throw msgError
        }

        console.log(`[${requestId}] Message inserted successfully`)

        // 5. Update conversation last_message_at
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

        processedCount++
        console.log(`[${requestId}] Message ${message.id} processed successfully`)

      } catch (msgError) {
        const errorMsg = msgError instanceof Error ? msgError.message : String(msgError)
        console.error(`[${requestId}] ERROR processing message ${message.id}:`, errorMsg)
        errors.push(`Message ${message.id}: ${errorMsg}`)
      }
    }

    console.log(`[${requestId}] ========== WEBHOOK COMPLETE ==========`)
    console.log(`[${requestId}] Processed: ${processedCount}/${messages.length}`)

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount,
      total: messages.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${requestId}] FATAL ERROR:`, errorMsg)
    
    // Always return 200 to prevent Whapi retries
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
  whatsappNumero: string,
  nome: string | undefined,
  requestId: string
) {
  console.log(`[${requestId}] Finding contact: ${whatsappNumero}`)
  
  // Try to find existing contact
  const { data: existingContato, error: findError } = await supabase
    .from('contatos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('whatsapp_numero', whatsappNumero)
    .maybeSingle()

  if (findError) {
    console.error(`[${requestId}] ERROR finding contact:`, findError)
    throw findError
  }

  if (existingContato) {
    console.log(`[${requestId}] Found existing contact: ${existingContato.id}`)
    
    // Update name if we have one and contact doesn't
    if (nome && !existingContato.nome) {
      const { error: updateError } = await supabase
        .from('contatos')
        .update({ nome })
        .eq('id', existingContato.id)
      
      if (!updateError) {
        console.log(`[${requestId}] Updated contact name to: ${nome}`)
      }
    }
    
    return existingContato
  }

  // Create new contact
  console.log(`[${requestId}] Creating new contact`)
  const { data: newContato, error: createError } = await supabase
    .from('contatos')
    .insert({
      empresa_id: empresaId,
      whatsapp_numero: whatsappNumero,
      nome: nome || null,
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
  requestId: string
) {
  console.log(`[${requestId}] Finding conversation for contact: ${contatoId}`)
  
  // Find the most recent conversation for this contact (any status)
  const { data: ultimaConversa, error: findError } = await supabase
    .from('conversas')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('contato_id', contatoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) {
    console.error(`[${requestId}] ERROR finding conversation:`, findError)
    throw findError
  }

  // If conversation exists and is closed, reopen it
  if (ultimaConversa && ultimaConversa.status === 'encerrado') {
    console.log(`[${requestId}] Found closed conversation: ${ultimaConversa.id}, reopening...`)
    
    const { error: updateError } = await supabase
      .from('conversas')
      .update({
        status: 'fila_humano',
        encerrado_em: null,
        encerrado_por_id: null,
        motivo_encerramento_id: null,
        agente_responsavel_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', ultimaConversa.id)

    if (updateError) {
      console.error(`[${requestId}] ERROR reopening conversation:`, updateError)
      throw updateError
    }

    console.log(`[${requestId}] Conversation reopened: ${ultimaConversa.id}`)
    return { ...ultimaConversa, status: 'fila_humano' }
  }

  // If conversation exists and is active, use it
  if (ultimaConversa) {
    console.log(`[${requestId}] Found active conversation: ${ultimaConversa.id} (status: ${ultimaConversa.status})`)
    return ultimaConversa
  }

  // No conversation exists, create new one
  console.log(`[${requestId}] Creating new conversation`)
  const { data: newConversa, error: createError } = await supabase
    .from('conversas')
    .insert({
      empresa_id: empresaId,
      contato_id: contatoId,
      status: 'fila_humano',
      canal: 'whatsapp',
      iniciado_por: 'cliente',
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

function extractMessageContent(message: WhapiMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '[texto vazio]'
    case 'image':
      return message.image?.caption || '[imagem]'
    case 'document':
      return `[documento: ${message.document?.filename || 'arquivo'}]`
    case 'audio':
      return '[áudio]'
    case 'video':
      return '[vídeo]'
    case 'sticker':
      return '[figurinha]'
    case 'location':
      return '[localização]'
    case 'contact':
      return '[contato]'
    default:
      return `[${message.type || 'mensagem'}]`
  }
}
