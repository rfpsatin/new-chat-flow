import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhapiMessage {
  id: string
  from: string
  from_me?: boolean
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
  interactive?: {
    header?: string
    body?: string
    footer?: string
    buttons?: Array<{ text: string; id: string; type?: string }>
  }
  list?: {
    header?: string
    body?: string
    footer?: string
    label?: string
    sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
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

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const empresaId = url.searchParams.get('empresa_id')

    if (!empresaId) {
      return new Response(JSON.stringify({ 
        error: 'Missing empresa_id query parameter',
        usage: 'Add ?empresa_id=YOUR_EMPRESA_UUID to the webhook URL'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: WhapiEvent = await req.json()
    console.log(`[${requestId}] Raw payload:`, JSON.stringify(body, null, 2))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia')
      .eq('id', empresaId)
      .maybeSingle()

    if (empresaError || !empresa) {
      return new Response(JSON.stringify({ error: 'Invalid empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[${requestId}] Empresa found: ${empresa.nome_fantasia || empresa.id}`)

    const messages = body.event?.messages || body.messages || []

    if (messages.length === 0) {
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
        console.log(`[${requestId}] From: ${message.from}, from_me: ${message.from_me}`)
        console.log(`[${requestId}] Type: ${message.type}`)

        // Para mensagens de entrada (from_me=false), o número do cliente vem em `from`.
        // Para mensagens de saída (from_me=true), o número do cliente vem em `chat_id`
        // (o `from` passa a ser o número da empresa).
        const rawNumber = message.from_me === true ? message.chat_id : message.from

        const whatsappNumero = rawNumber
          .replace('@s.whatsapp.net', '')
          .replace('@c.us', '')

        console.log(`[${requestId}] WhatsApp number: ${whatsappNumero}`)

        const contato = await findOrCreateContato(
          supabase,
          empresaId,
          whatsappNumero,
          message.from_name,
          requestId
        )

        if (!contato) {
          throw new Error('Failed to find or create contact')
        }

        const conteudo = extractMessageContent(message)
        console.log(`[${requestId}] Message content: ${conteudo.substring(0, 100)}...`)

        // Mensagens de saída (from_me=true) são registradas aqui somente quando NÃO
        // foram originadas pelo Hub (ex: respostas do bot via n8n/Envia Texto, pesquisa).
        // Mensagens do Hub contêm o marker #"human_mode=..."# e já foram inseridas
        // diretamente pelo frontend/start-conversation.
        if (message.from_me === true) {
          const textBody = message.text?.body || ''
          const isHubOriginated = /^#"human_mode=(true|false)"#/.test(textBody)

          if (isHubOriginated) {
            console.log(`[${requestId}] Skipping from_me=true with Hub marker (already inserted by Hub)`)
            processedCount++
            continue
          }

          console.log(`[${requestId}] Handling outgoing message (from_me=true, non-Hub)`)

          const { data: ultimaConversa, error: convError } = await supabase
            .from('conversas')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('contato_id', contato.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (convError) {
            console.error(`[${requestId}] ERROR finding conversation for outgoing message:`, convError)
            throw convError
          }

          if (!ultimaConversa) {
            console.log(`[${requestId}] No conversation found for outgoing message, skipping insert`)
            continue
          }

          const { error: outMsgError } = await supabase
            .from('mensagens_ativas')
            .insert({
              empresa_id: empresaId,
              conversa_id: ultimaConversa.id,
              contato_id: contato.id,
              direcao: 'out',
              tipo_remetente: 'bot',
              conteudo: conteudo,
              payload: message,
            })

          if (outMsgError) {
            console.error(`[${requestId}] ERROR inserting outgoing message:`, outMsgError)
            throw outMsgError
          }

          const { error: outUpdateError } = await supabase
            .from('conversas')
            .update({
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', ultimaConversa.id)

          if (outUpdateError) {
            console.error(`[${requestId}] ERROR updating conversation for outgoing message:`, outUpdateError)
          }

          processedCount++
          console.log(`[${requestId}] Outgoing message ${message.id} processed successfully`)
          continue
        }

        // Daqui para baixo, apenas mensagens de entrada (cliente)

        const conversa = await findOrCreateConversa(
          supabase,
          empresaId,
          contato.id,
          conteudo,
          requestId
        )

        if (!conversa) {
          throw new Error('Failed to find or create conversation')
        }

        // Vincular conversa à campanha se o contato respondeu após receber disparo
        const { data: destCampanha } = await supabase
          .from('campanha_destinatarios')
          .select('id, campanha_id')
          .eq('contato_id', contato.id)
          .in('status_envio', ['enviado', 'entregue', 'lido'])
          .is('conversa_id', null)
          .order('ultima_tentativa_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (destCampanha) {
          await supabase
            .from('campanha_destinatarios')
            .update({ conversa_id: conversa.id })
            .eq('id', destCampanha.id)
          await supabase
            .from('conversas')
            .update({ campanha_id: destCampanha.campanha_id, updated_at: new Date().toISOString() })
            .eq('id', conversa.id)
          console.log(`[${requestId}] Linked conversation to campaign: ${destCampanha.campanha_id}`)
        }

        // Insert message (always in/cliente at this point)
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

        console.log(`[${requestId}] Message inserted successfully (direction: in/cliente)`)

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

        // Check if message contains human attendance request
        const isHumanRequest = conteudo.toLowerCase().includes('falar com') && conteudo.toLowerCase().includes('atendente humano')
        const isHumanButtonId = (message as any).reply?.buttons_reply?.id === 'ButtonsV3:atendimento_humano'

        // Check human_mode or origem_final - if true/'atendente', skip n8n entirely
        if (conversa.human_mode === true || conversa.origem_final === 'atendente') {
          console.log(`[${requestId}] Conversa has human_mode=true or origem_final=atendente, skipping n8n check`)
        } else if (conversa.status === 'bot' && (isHumanRequest || isHumanButtonId)) {
          console.log(`[${requestId}] Detected human attendance request, checking n8n...`)
          try {
            const n8nUrl = new URL('https://n8n.maringaai.com.br/webhook/maia-beach-tennis-demo')
            n8nUrl.searchParams.set('action', 'check')
            n8nUrl.searchParams.set('conversa_id', conversa.id)
            n8nUrl.searchParams.set('empresa_id', empresaId)

            const n8nResponse = await fetch(n8nUrl.toString(), {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            })

            console.log(`[${requestId}] n8n response status: ${n8nResponse.status}`)
            const contentType = n8nResponse.headers.get('content-type') || ''
            const responseText = await n8nResponse.text()
            console.log(`[${requestId}] n8n response body: ${responseText.substring(0, 500)}`)

            if (n8nResponse.ok && contentType.includes('application/json')) {
              const result = JSON.parse(responseText)
              const attendanceMode = result?.attendanceMode || result?.attendance_mode || 'automated'
              if (attendanceMode === 'human') {
                await supabase
                  .from('conversas')
                  .update({ status: 'esperando_tria', updated_at: new Date().toISOString() })
                  .eq('id', conversa.id)
                  .eq('status', 'bot')
                console.log(`[${requestId}] Conversa moved to esperando_tria`)
              }
            } else {
              await supabase
                .from('conversas')
                .update({ status: 'esperando_tria', updated_at: new Date().toISOString() })
                .eq('id', conversa.id)
                .eq('status', 'bot')
              console.log(`[${requestId}] Conversa moved to esperando_tria (fallback)`)
            }
          } catch (n8nError) {
            console.error(`[${requestId}] Error checking n8n:`, n8nError)
            try {
              await supabase
                .from('conversas')
                .update({ status: 'esperando_tria', updated_at: new Date().toISOString() })
                .eq('id', conversa.id)
                .eq('status', 'bot')
              console.log(`[${requestId}] Conversa moved to esperando_tria (exception fallback)`)
            } catch (fallbackError) {
              console.error(`[${requestId}] Fallback also failed:`, fallbackError)
            }
          }
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

  const { data: existingContato, error: findError } = await supabase
    .from('contatos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('whatsapp_numero', whatsappNumero)
    .maybeSingle()

  if (findError) throw findError

  if (existingContato) {
    console.log(`[${requestId}] Found existing contact: ${existingContato.id}`)
    if (nome && !existingContato.nome) {
      await supabase.from('contatos').update({ nome }).eq('id', existingContato.id)
      console.log(`[${requestId}] Updated contact name to: ${nome}`)
    }
    return existingContato
  }

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

  if (createError) throw createError

  console.log(`[${requestId}] Created new contact: ${newContato.id}`)
  return newContato
}

async function findOrCreateConversa(
  supabase: any,
  empresaId: string,
  contatoId: string,
  conteudo: string,
  requestId: string
) {
  console.log(`[${requestId}] Finding conversation for contact: ${contatoId}`)

  const { data: ultimaConversa, error: findError } = await supabase
    .from('conversas')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('contato_id', contatoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) throw findError

  // Se conversa encerrada, verificar se é resposta de pesquisa de satisfação
  if (ultimaConversa && ultimaConversa.status === 'encerrado') {
    if (ultimaConversa.pesquisa_enviada_em && !ultimaConversa.pesquisa_respondida_em) {
      const pesquisaEnviadaEm = new Date(ultimaConversa.pesquisa_enviada_em)
      const agora = new Date()
      const horasPassadas = (agora.getTime() - pesquisaEnviadaEm.getTime()) / (1000 * 60 * 60)

      console.log(`[${requestId}] Checking satisfaction response - Hours since survey: ${horasPassadas.toFixed(2)}`)

      const nota = parseInt(conteudo.trim())
      const isNotaValida = !isNaN(nota) && nota >= 1 && nota <= 5

      if (horasPassadas <= 24 && isNotaValida) {
        console.log(`[${requestId}] Valid satisfaction rating received: ${nota}`)
        const { error: ratingError } = await supabase
          .from('conversas')
          .update({
            nota_satisfacao: nota,
            pesquisa_respondida_em: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', ultimaConversa.id)

        if (ratingError) {
          console.error(`[${requestId}] ERROR updating satisfaction rating:`, ratingError)
        } else {
          console.log(`[${requestId}] Satisfaction rating saved successfully`)
        }

        return { ...ultimaConversa, _skipMessageInsert: false }
      }

      console.log(`[${requestId}] Not a valid satisfaction response (nota: ${conteudo}, isValid: ${isNotaValida}, withinWindow: ${horasPassadas <= 24})`)
    }

    // Conversa encerrada e não é pesquisa válida → nova sessão
    console.log(`[${requestId}] Found closed conversation ${ultimaConversa.id}, creating new session...`)
    const { data: newConversa, error: createError } = await supabase
      .from('conversas')
      .insert({
        empresa_id: empresaId,
        contato_id: contatoId,
        status: 'bot',
        canal: 'whatsapp',
        iniciado_por: 'cliente',
      })
      .select()
      .single()

    if (createError) throw createError
    console.log(`[${requestId}] Created new conversation session: ${newConversa.id}`)
    return newConversa
  }

  if (ultimaConversa) {
    console.log(`[${requestId}] Found active conversation: ${ultimaConversa.id} (status: ${ultimaConversa.status})`)
    return ultimaConversa
  }

  console.log(`[${requestId}] Creating new conversation`)
  const { data: newConversa, error: createError } = await supabase
    .from('conversas')
    .insert({
      empresa_id: empresaId,
      contato_id: contatoId,
      status: 'bot',
      canal: 'whatsapp',
      iniciado_por: 'cliente',
    })
    .select()
    .single()

  if (createError) throw createError
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
    case 'reply': {
      const reply = (message as any).reply
      if (reply?.buttons_reply?.title) return reply.buttons_reply.title
      if (reply?.list_reply?.title) return reply.list_reply.title
      return reply?.body || '[reply]'
    }
    case 'interactive': {
      const parts: string[] = []
      if (message.interactive?.header) parts.push(message.interactive.header)
      if (message.interactive?.body) parts.push(message.interactive.body.trim())
      if (message.interactive?.buttons?.length) {
        parts.push(message.interactive.buttons.map(b => `• ${b.text}`).join('\n'))
      }
      if (message.interactive?.footer) parts.push(`(${message.interactive.footer})`)
      return parts.join('\n') || '[mensagem interativa]'
    }
    case 'list': {
      const parts: string[] = []
      if (message.list?.header) parts.push(message.list.header)
      if (message.list?.body) parts.push(message.list.body.trim())
      if (message.list?.sections?.length) {
        const items = message.list.sections.flatMap(s => s.rows.map(r => {
          let item = `• ${r.title}`
          if (r.description?.trim()) item += ` — ${r.description.trim()}`
          return item
        }))
        parts.push(items.join('\n'))
      }
      if (message.list?.footer) parts.push(`(${message.list.footer})`)
      return parts.join('\n') || '[lista interativa]'
    }
    default:
      return `[${message.type || 'mensagem'}]`
  }
}
