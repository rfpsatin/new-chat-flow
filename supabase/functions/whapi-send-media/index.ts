// @version 1 — deploy target: hyizldxjiwjeruxqrqbv
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type MediaKind = 'document' | 'image' | 'audio'

interface SendMediaRequest {
  empresa_id?: string
  to: string
  media_url: string
  media_kind: MediaKind
  filename?: string
  mime_type?: string
  caption?: string
  conversa_id: string
  contato_id: string
  remetente_id: string
  reply_to_whatsapp_id?: string
}

type CallerTenant = {
  empresaId: string
  tipoUsuario: 'adm' | 'sup' | 'opr'
}

async function getCallerTenant(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<CallerTenant> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Nao autorizado')

  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser()
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
    throw new Error('Perfil sem permissao para enviar mensagem')
  }

  return {
    empresaId: usuario.empresa_id,
    tipoUsuario: usuario.tipo_usuario as 'adm' | 'sup' | 'opr',
  }
}

function buildConteudoForMedia(kind: MediaKind, filename?: string, caption?: string): string {
  if (kind === 'image') {
    if (caption && caption.trim()) return caption.trim()
    return '[imagem]'
  }
  if (kind === 'audio') {
    return '[áudio]'
  }
  const safeName = filename && filename.trim() ? filename.trim() : 'arquivo'
  return `[documento: ${safeName}]`
}

function getWhapiEndpointForKind(kind: MediaKind): string {
  switch (kind) {
    case 'image':
      return 'https://gate.whapi.cloud/messages/image'
    case 'audio':
      return 'https://gate.whapi.cloud/messages/audio'
    case 'document':
    default:
      return 'https://gate.whapi.cloud/messages/document'
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== WHAPI SEND MEDIA ==========`)
  console.log(`[${requestId}] Method: ${req.method}`)

  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight request`)
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    const body: SendMediaRequest = await req.json()
    console.log(`[${requestId}] Request body:`, JSON.stringify({ ...body, media_url: '[redacted]' }, null, 2))

    const {
      to,
      media_url,
      media_kind,
      filename,
      mime_type,
      caption,
      conversa_id,
      contato_id,
      remetente_id,
      empresa_id: bodyEmpresaId,
    } = body

    if (!to || !media_url || !media_kind || !conversa_id || !contato_id || !remetente_id) {
      console.error(`[${requestId}] ERROR: Missing required fields`)
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['to', 'media_url', 'media_kind', 'conversa_id', 'contato_id', 'remetente_id'],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!['document', 'image', 'audio'].includes(media_kind)) {
      return new Response(
        JSON.stringify({ error: 'Invalid media_kind. Use document, image or audio.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') || ''
    const bearer = authHeader.replace(/^Bearer\s+/i, '')
    const isServiceCaller = bearer === supabaseServiceKey

    let empresa_id: string

    if (isServiceCaller) {
      if (!bodyEmpresaId) {
        console.error(`[${requestId}] ERROR: empresa_id obrigatorio para chamada interna`)
        return new Response(
          JSON.stringify({
            error: 'empresa_id obrigatorio para chamada interna',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
      empresa_id = bodyEmpresaId
    } else {
      const callerTenant = await getCallerTenant(req, supabaseUrl, supabaseServiceKey)
      empresa_id = callerTenant.empresaId
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, whapi_token')
      .eq('id', empresa_id)
      .maybeSingle()

    if (empresaError || !empresa) {
      console.error(`[${requestId}] ERROR: Invalid empresa_id:`, empresaError)
      return new Response(
        JSON.stringify({ error: 'Invalid empresa_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!empresa.whapi_token) {
      console.error(`[${requestId}] ERROR: Whapi token not configured for empresa`)
      return new Response(
        JSON.stringify({
          error: 'Whapi token not configured',
          message: 'Configure o token do Whapi.Cloud na empresa antes de enviar mensagens',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const tokenPrefix = empresa.whapi_token.substring(0, 10)
    console.log(
      `[${requestId}] Empresa: ${empresa.nome_fantasia || empresa.id} (id=${empresa.id}), isServiceCaller=${isServiceCaller}, token=${tokenPrefix}...`,
    )
    console.log(`[${requestId}] Sending media to: ${to}, kind: ${media_kind}`)

    let phoneNumber = to.trim().replace(/@(s\.whatsapp\.net|c\.us)$/, '')
    if (!phoneNumber.match(/^\d{10,15}$/)) {
      console.error(`[${requestId}] Invalid phone number format: ${phoneNumber}`)
      return new Response(
        JSON.stringify({
          error: 'Invalid phone number format',
          message: 'O número deve estar no formato internacional (ex: 5511999999999)',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    phoneNumber = `${phoneNumber}@s.whatsapp.net`

    const whapiUrl = getWhapiEndpointForKind(media_kind)
    const payload: Record<string, unknown> = {
      to: phoneNumber,
      media: media_url,
    }

    if (caption && caption.trim()) {
      payload.caption = caption.trim()
    }
    if (filename && filename.trim()) {
      payload.filename = filename.trim()
    }
    if (mime_type && mime_type.trim()) {
      payload.mime_type = mime_type.trim()
    }
    if (body.reply_to_whatsapp_id && body.reply_to_whatsapp_id.trim()) {
      payload.quoted = body.reply_to_whatsapp_id.trim()
    }

    const whapiResponse = await fetch(whapiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${empresa.whapi_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const whapiData = await whapiResponse.json().catch(() => ({}))
    console.log(`[${requestId}] Whapi API response status: ${whapiResponse.status}`)
    console.log(`[${requestId}] Whapi API response:`, JSON.stringify(whapiData, null, 2))

    if (!whapiResponse.ok) {
      console.error(
        `[${requestId}] Whapi API FAILED: status=${whapiResponse.status} empresa=${empresa.id} token=${tokenPrefix}... response=`,
        JSON.stringify(whapiData),
      )
      return new Response(
        JSON.stringify({
          error: `Whapi ${whapiResponse.status}: ${JSON.stringify(whapiData).substring(0, 200)}`,
          details: whapiData,
        }),
        {
          status: whapiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const conteudo = buildConteudoForMedia(media_kind, filename, caption)

    const { error: insertError } = await supabase.from('mensagens_ativas').insert({
      empresa_id,
      conversa_id,
      contato_id,
      direcao: 'out',
      tipo_remetente: 'agente',
      remetente_id,
      conteudo,
      media_url,
      media_kind,
      media_filename: filename ?? null,
      media_mime: mime_type ?? null,
    })

    if (insertError) {
      console.error(`[${requestId}] ERROR inserting media message:`, insertError)
      // Não falhar o envio para o cliente se apenas o insert local quebrou
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: whapiData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${requestId}] FATAL ERROR:`, errorMsg)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

