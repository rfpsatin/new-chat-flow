// Iniciar conversa 1:1 a partir de um contato (envia primeira mensagem e cria/usa conversa)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface StartConversationRequest {
  empresa_id: string
  contato_id: string
  mensagem_inicial: string
  midia_url?: string
  link?: string
  origem_inicial?: 'agente' | 'sistema' | 'campanha'
  origem_final?: 'agente' | 'atendente'
  campanha_id?: string
  remetente_id?: string // usuario que iniciou (agente)
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== START CONVERSATION ==========`)

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
    const body: StartConversationRequest = await req.json()
    const { empresa_id, contato_id, mensagem_inicial, link, origem_inicial, origem_final, campanha_id, remetente_id } = body

    if (!empresa_id || !contato_id || !mensagem_inicial?.trim()) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['empresa_id', 'contato_id', 'mensagem_inicial'],
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar contato
    const { data: contato, error: contatoError } = await supabase
      .from('contatos')
      .select('id, empresa_id, whatsapp_numero, nome')
      .eq('id', contato_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()

    if (contatoError || !contato) {
      console.error(`[${requestId}] Contato not found:`, contatoError)
      return new Response(JSON.stringify({ error: 'Contato não encontrado ou não pertence à empresa' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const whatsappNumero = contato.whatsapp_numero.replace(/@(s\.whatsapp\.net|c\.us)$/, '').trim()

    // Conversa ativa (não encerrada)
    const { data: conversaAtiva, error: convError } = await supabase
      .from('conversas')
      .select('id, nr_protocolo')
      .eq('empresa_id', empresa_id)
      .eq('contato_id', contato_id)
      .neq('status', 'encerrado')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (convError) {
      console.error(`[${requestId}] Error finding conversation:`, convError)
      throw convError
    }

    let conversaId: string
    let nrProtocolo: string | null = null
    let isNewConversa = false

    if (conversaAtiva) {
      conversaId = conversaAtiva.id
      nrProtocolo = conversaAtiva.nr_protocolo
    } else {
      const origem = origem_inicial || 'atendente'
      // Determine initial status based on origem_final
      const initialStatus = origem_final === 'agente' ? 'bot' : 'esperando_tria'
      const { data: newConv, error: createConvError } = await supabase
        .from('conversas')
        .insert({
          empresa_id,
          contato_id,
          canal: 'whatsapp',
          status: initialStatus,
          iniciado_por: 'agente',
          origem_inicial: origem,
          origem_final: origem_final || null,
          human_mode: origem_final === 'atendente' ? true : false,
          campanha_id: campanha_id || null,
        })
        .select('id, nr_protocolo')
        .single()

      if (createConvError) {
        console.error(`[${requestId}] Error creating conversation:`, createConvError)
        throw createConvError
      }
      conversaId = newConv.id
      nrProtocolo = newConv.nr_protocolo
      isNewConversa = true
    }

    // Montar texto (mensagem + link se houver)
    let messageText = mensagem_inicial.trim()
    if (link?.trim()) {
      messageText = messageText ? `${messageText}\n\n${link.trim()}` : link.trim()
    }

    // Enviar via Whapi (chamar Edge Function whapi-send-message)
    const sendUrl = `${supabaseUrl}/functions/v1/whapi-send-message`
    const sendRes = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        empresa_id,
        to: whatsappNumero,
        message: messageText,
      }),
    })

    const sendData = await sendRes.json().catch(() => ({}))
    if (!sendRes.ok) {
      console.error(`[${requestId}] Whapi send failed:`, sendData)
      return new Response(JSON.stringify({
        error: sendData.error || 'Falha ao enviar mensagem',
        details: sendData,
      }), {
        status: sendRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Inserir mensagem diretamente no banco (webhook ignora from_me=true)
    await supabase.from('mensagens_ativas').insert({
      empresa_id,
      conversa_id: conversaId,
      contato_id,
      direcao: 'out',
      tipo_remetente: remetente_id ? 'agente' : 'sistema',
      remetente_id: remetente_id || null,
      conteudo: messageText,
    })

    // Se origem_final === 'atendente' e há remetente: atribui agente e coloca em atendimento humano
    // Se origem_final === 'agente': status já é 'bot', não atribui agente
    if (remetente_id && origem_final !== 'agente') {
      const { error: atribuirError } = await supabase
        .from('conversas')
        .update({
          status: 'em_atendimento_humano',
          agente_responsavel_id: remetente_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversaId)

      if (atribuirError) {
        console.error(`[${requestId}] Error atribuindo agente:`, atribuirError)
      } else {
        console.log(`[${requestId}] Conversa atribuída ao agente ${remetente_id} em atendimento humano`)
      }
    }
    
    console.log(`[${requestId}] Conversation started: ${conversaId}`)

    return new Response(JSON.stringify({
      success: true,
      conversa_id: conversaId,
      contato_id: contato_id,
      nr_protocolo: nrProtocolo,
      is_new_conversa: isNewConversa,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[start-conversation] FATAL:`, errorMsg)
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
