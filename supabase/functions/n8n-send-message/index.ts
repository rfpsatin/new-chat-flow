// @version 1 — deploy target: hyizldxjiwjeruxqrqbv
// Edge Function chamada pelo n8n para enviar mensagens via Whapi
// multi-empresa, usando o whapi_token configurado em `empresas`.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface N8nSendMessageRequest {
  empresa_id?: string
  to?: string
  body?: string
  human_mode?: boolean | null
}

function onlyDigits(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/\D/g, '')
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== N8N SEND MESSAGE ==========`)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Secret opcional: se existir no ambiente, exige header x-webhook-secret
  const expectedSecret =
    Deno.env.get('N8N_SEND_SECRET') ?? Deno.env.get('WHAPI_WEBHOOK_SECRET') ?? null
  const providedSecret = req.headers.get('x-webhook-secret')
  if (expectedSecret && providedSecret !== expectedSecret) {
    console.warn(`[${requestId}] Unauthorized: invalid x-webhook-secret`)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: N8nSendMessageRequest = await req.json().catch(() => ({}))
    console.log(`[${requestId}] Body:`, JSON.stringify(body, null, 2))

    const empresa_id = body.empresa_id
    const toRaw = body.to
    const text = body.body

    if (!empresa_id || !toRaw || !text) {
      console.error(`[${requestId}] Missing required fields`)
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['empresa_id', 'to', 'body'],
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

    // Busca empresa + whapi_token
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, whapi_token')
      .eq('id', empresa_id)
      .maybeSingle()

    if (empresaError || !empresa) {
      console.error(`[${requestId}] Invalid empresa_id`, empresaError)
      return new Response(JSON.stringify({ error: 'Invalid empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!empresa.whapi_token) {
      console.error(`[${requestId}] Whapi token not configured for empresa`)
      return new Response(
        JSON.stringify({
          error: 'Whapi token not configured',
          message: 'Configure whapi_token na tabela empresas para usar este endpoint',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log(
      `[${requestId}] Empresa: ${empresa.nome_fantasia || empresa.id} — enviando para: ${toRaw}`,
    )

    // Normaliza número: só dígitos, depois @s.whatsapp.net
    let digits = onlyDigits(toRaw)
    if (!digits.match(/^\d{10,15}$/)) {
      console.error(`[${requestId}] Invalid phone number format: ${digits}`)
      return new Response(
        JSON.stringify({
          error: 'Invalid phone number format',
          message: 'Use número internacional sem +, ex: 5511999999999',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const toWhapi = `${digits}@s.whatsapp.net`

    const whapiUrl = 'https://gate.whapi.cloud/messages/text'
    const payload = {
      to: toWhapi,
      body: text,
    }

    console.log(`[${requestId}] Calling Whapi: ${whapiUrl}`)
    const whapiResponse = await fetch(whapiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${empresa.whapi_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const whapiData = await whapiResponse.json().catch(() => ({}))
    console.log(
      `[${requestId}] Whapi status: ${whapiResponse.status} body: ${JSON.stringify(
        whapiData,
      ).substring(0, 500)}`,
    )

    if (!whapiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to send message via Whapi',
          status: whapiResponse.status,
          details: whapiData,
        }),
        {
          status: whapiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        empresa_id,
        to: digits,
        message_id: whapiData?.messages?.[0]?.id ?? null,
        whapi_raw: whapiData,
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

