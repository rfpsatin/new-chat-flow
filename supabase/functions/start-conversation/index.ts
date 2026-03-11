// @version 2 — deploy target: hyizldxjiwjeruxqrqbv
// Iniciar conversa 1:1 a partir de um contato (envia primeira mensagem e cria/usa conversa)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface StartConversationRequest {
  empresa_id?: string
  contato_id: string
  mensagem_inicial: string
  midia_url?: string
  link?: string
  origem_inicial?: 'agente' | 'sistema' | 'campanha'
  origem_final?: 'agente' | 'atendente'
  campanha_id?: string
  remetente_id?: string // usuario que iniciou (agente)
}

type CallerTenant = {
  usuarioId: string
  empresaId: string
  tipoUsuario: 'adm' | 'sup' | 'opr'
}

async function getCallerTenant(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<CallerTenant> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Nao autorizado')
  }

  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: userError } = await callerClient.auth.getUser()
  if (userError || !user) {
    throw new Error('Nao autorizado')
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: usuario, error: usuarioError } = await adminClient
    .from('usuarios')
    .select('id, empresa_id, tipo_usuario, ativo')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (usuarioError) throw new Error(usuarioError.message)
  if (!usuario || !usuario.ativo || !usuario.empresa_id) {
    throw new Error('Usuario sem empresa ativa')
  }
  if (!['adm', 'sup', 'opr'].includes(usuario.tipo_usuario)) {
    throw new Error('Perfil sem permissao para iniciar conversa')
  }

  return {
    usuarioId: usuario.id,
    empresaId: usuario.empresa_id,
    tipoUsuario: usuario.tipo_usuario as 'adm' | 'sup' | 'opr',
  }
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
    const { contato_id, mensagem_inicial, link, origem_inicial, origem_final, campanha_id, remetente_id, empresa_id: bodyEmpresaId } = body

    if (!contato_id || !mensagem_inicial?.trim()) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['contato_id', 'mensagem_inicial'],
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization') || ''
    const bearer = authHeader.replace(/^Bearer\s+/i, '')
    const isServiceCaller = bearer === supabaseServiceKey

    let empresa_id: string
    let remetenteEfetivoId: string | null = null
    let contato: { id: string; empresa_id: string; whatsapp_numero: string; nome: string | null } | null = null

    if (isServiceCaller) {
      // Chamada interna (ex: worker de campanhas) usando service role:
      // Usa SEMPRE a empresa da campanha (bodyEmpresaId) como fonte da verdade
      // e garante que o contato pertence a essa empresa.
      if (!bodyEmpresaId) {
        return new Response(
          JSON.stringify({
            error: 'empresa_id obrigatorio para chamadas internas',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      empresa_id = bodyEmpresaId
      remetenteEfetivoId = null

      const { data: contatoRow, error: contatoError } = await supabase
        .from('contatos')
        .select('id, empresa_id, whatsapp_numero, nome')
        .eq('id', contato_id)
        .eq('empresa_id', empresa_id)
        .maybeSingle()

      if (contatoError || !contatoRow) {
        console.error(
          `[${requestId}] Contato not found for campanha (empresa_id=${empresa_id}):`,
          contatoError,
        )
        return new Response(
          JSON.stringify({ error: 'Contato não encontrado para a empresa da campanha' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      contato = contatoRow
    } else {
      // Chamada normal via Hub: autentica usuário e descobre empresa / remetente
      const callerTenant = await getCallerTenant(req, supabaseUrl, supabaseServiceKey)
      empresa_id = callerTenant.empresaId
      remetenteEfetivoId = callerTenant.usuarioId

      if (remetente_id && remetente_id !== remetenteEfetivoId) {
        return new Response(
          JSON.stringify({ error: 'remetente_id invalido para o usuario autenticado' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // Buscar contato limitado à empresa do usuário
      const { data: contatoRow, error: contatoError } = await supabase
        .from('contatos')
        .select('id, empresa_id, whatsapp_numero, nome')
        .eq('id', contato_id)
        .eq('empresa_id', empresa_id)
        .maybeSingle()

      if (contatoError || !contatoRow) {
        console.error(`[${requestId}] Contato not found:`, contatoError)
        return new Response(JSON.stringify({ error: 'Contato não encontrado ou não pertence à empresa' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      contato = contatoRow
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

      // Atualizar human_mode e origem_final na conversa existente para refletir
      // a escolha feita agora (agente vs atendente humano)
      const updateFields: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (origem_final) {
        updateFields.origem_final = origem_final
        updateFields.human_mode = origem_final === 'atendente'
      }
      if (origem_inicial) {
        updateFields.origem_inicial = origem_inicial
      }
      if (campanha_id) {
        updateFields.campanha_id = campanha_id
      }

      const { error: updateConvError } = await supabase
        .from('conversas')
        .update(updateFields)
        .eq('id', conversaId)

      if (updateConvError) {
        console.error(`[${requestId}] Error updating existing conversation:`, updateConvError)
      } else {
        console.log(`[${requestId}] Updated existing conversation: human_mode=${updateFields.human_mode}, origem_final=${updateFields.origem_final}`)
      }
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

    // Montar texto (mensagem + link se houver) - este é o texto \"limpo\" salvo no banco
    let messageText = mensagem_inicial.trim()
    if (link?.trim()) {
      messageText = messageText ? `${messageText}\n\n${link.trim()}` : link.trim()
    }

    // Texto enviado para a Whapi com marcador de human_mode
    const isHuman = origem_final === 'atendente'
    const whapiBody = `#\"human_mode=${isHuman ? 'true' : 'false'}\"# ${messageText}`

    // Enviar via Whapi (chamar Edge Function whapi-send-message)
    const sendUrl = `${supabaseUrl}/functions/v1/whapi-send-message`
    const sendRes = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        empresa_id,
        to: whatsappNumero,
        message: whapiBody,
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
      tipo_remetente: remetenteEfetivoId ? 'agente' : 'sistema',
      remetente_id: remetenteEfetivoId || null,
      conteudo: messageText,
    })

    // Se origem_final === 'atendente' e há remetente: atribui agente e coloca em atendimento humano
    // Se origem_final === 'agente': status já é 'bot', não atribui agente
    if (remetenteEfetivoId && origem_final !== 'agente') {
      const { error: atribuirError } = await supabase
        .from('conversas')
        .update({
          status: 'em_atendimento_humano',
          agente_responsavel_id: remetenteEfetivoId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversaId)

      if (atribuirError) {
        console.error(`[${requestId}] Error atribuindo agente:`, atribuirError)
      } else {
        console.log(`[${requestId}] Conversa atribuída ao agente ${remetenteEfetivoId} em atendimento humano`)
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
