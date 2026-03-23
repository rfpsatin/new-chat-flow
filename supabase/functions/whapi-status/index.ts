import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHAPI_BASE_URL = 'https://gate.whapi.cloud'
const STATUS_ENDPOINT = '/health'

interface StatusResponse {
  empresa_id: string
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== WHAPI STATUS ==========`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const queryEmpresaId = url.searchParams.get('empresa_id')
    const body: StatusResponse | null = req.method === 'POST' ? await req.json() : null
    const empresaId = queryEmpresaId || body?.empresa_id

    if (!empresaId) {
      return new Response(JSON.stringify({ error: 'Missing empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, whapi_token, whapi_status, whapi_status_raw')
      .eq('id', empresaId)
      .maybeSingle()

    if (empresaError || !empresa) {
      return new Response(JSON.stringify({ error: 'Invalid empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!empresa.whapi_token) {
      await updateEmpresaStatus(supabase, empresaId, {
        whapi_status: 'not_configured',
        whapi_status_raw: null,
      whapi_last_error: 'Token do Whapi não configurado',
      whapi_status_source: 'polling',
      })
      return new Response(JSON.stringify({ error: 'Whapi token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (looksLikeUuid(empresa.whapi_token)) {
      const errorMessage = 'Token do Whapi inválido (parece ser um UUID)'
      await updateEmpresaStatus(supabase, empresaId, {
        whapi_status: 'error',
        whapi_status_raw: null,
        whapi_last_error: errorMessage,
        whapi_status_source: 'polling',
      })
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const whapiResponse = await fetch(`${WHAPI_BASE_URL}${STATUS_ENDPOINT}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${empresa.whapi_token}`,
        'Content-Type': 'application/json',
      },
    })

    const whapiData = await safeJson(whapiResponse)

    if (!whapiResponse.ok) {
      const errorMessage =
        whapiData?.error || whapiData?.message || 'Erro ao consultar estado do Whapi'
      await updateEmpresaStatus(supabase, empresaId, {
        whapi_status: 'error',
        whapi_status_raw: null,
        whapi_last_error: errorMessage,
        whapi_status_source: 'polling',
      })
      return new Response(JSON.stringify({ error: errorMessage, details: whapiData }), {
        status: whapiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawState = extractRawState(whapiData)
    const normalized = normalizeState(rawState)
    const channelInfo = extractChannelInfo(whapiData)

    await updateEmpresaStatus(supabase, empresaId, {
      whapi_status: normalized,
      whapi_status_raw: rawState,
      whapi_last_error: null,
      whapi_status_source: 'polling',
      whapi_channel_name: channelInfo.name,
      whapi_phone: channelInfo.phone,
      whapi_work_period: channelInfo.workPeriod,
    })

    const hasChanged =
      empresa?.whapi_status !== normalized ||
      empresa?.whapi_status_raw !== rawState

    if (hasChanged) {
      await supabase
        .from('whapi_connection_events')
        .insert({
          empresa_id: empresaId,
          source: 'polling',
          event_type: 'getState',
          state: rawState,
          payload: whapiData,
        })
    }

    return new Response(JSON.stringify({
      empresa_id: empresaId,
      status: normalized,
      raw_status: rawState,
      endpoint: STATUS_ENDPOINT,
      response: whapiData,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${requestId}] FATAL ERROR:`, errorMsg)
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function updateEmpresaStatus(
  supabase: any,
  empresaId: string,
  data: {
    whapi_status: string | null
    whapi_status_raw: string | null
    whapi_last_error: string | null
    whapi_status_source: string | null
    whapi_channel_name?: string | null
    whapi_phone?: string | null
    whapi_work_period?: string | null
  }
) {
  const updateData: Record<string, any> = {
    whapi_status: data.whapi_status,
    whapi_status_raw: data.whapi_status_raw,
    whapi_last_error: data.whapi_last_error,
    whapi_status_source: data.whapi_status_source,
    whapi_status_updated_at: new Date().toISOString(),
  }
  
  // Only update channel info if provided
  if (data.whapi_channel_name !== undefined) {
    updateData.whapi_channel_name = data.whapi_channel_name
  }
  if (data.whapi_phone !== undefined) {
    updateData.whapi_phone = data.whapi_phone
  }
  if (data.whapi_work_period !== undefined) {
    updateData.whapi_work_period = data.whapi_work_period
  }

  await supabase
    .from('empresas')
    .update(updateData)
    .eq('id', empresaId)
}

function extractRawState(data: any): string | null {
  // /health returns different structures depending on the Whapi version
  // Common patterns: { status: { text: "AUTH" } }, { status: "AUTH" }, { state: "connected" }
  const raw = data?.status?.text || data?.status || data?.state || data?.data?.state || data?.data?.status
  if (!raw) return null
  if (typeof raw === 'object' && raw.text) return String(raw.text)
  return String(raw)
}

function extractChannelInfo(data: any): { name: string | null; phone: string | null; workPeriod: string | null } {
  // Extract channel name
  const name = data?.channel?.name || data?.name || data?.profile?.name || null
  
  // Extract phone number
  const phone = data?.channel?.phone || data?.phone || data?.me?.phone || data?.profile?.phone || null
  
  // Extract work period / expiration
  let workPeriod: string | null = null
  const expiry = data?.channel?.expiry || data?.expiry || data?.work_till || data?.work_period
  if (expiry) {
    // If it's a timestamp, format it
    if (typeof expiry === 'number' || !isNaN(Date.parse(expiry))) {
      const date = new Date(typeof expiry === 'number' ? expiry * 1000 : expiry)
      workPeriod = `Até ${date.toLocaleDateString('pt-BR')}`
    } else {
      workPeriod = String(expiry)
    }
  }
  
  return { name, phone, workPeriod }
}

function normalizeState(rawState: string | null): string {
  if (!rawState) return 'unknown'
  const state = rawState.toUpperCase()
  switch (state) {
    case 'CONNECTED':
    case 'READY':
    case 'AUTH':
    case 'AUTHORIZED':
    case 'OK':
      return 'connected'
    case 'PAIRING':
    case 'SERVICE_SCAN':
    case 'QR':
    case 'WAITING_QR':
      return 'pairing'
    case 'DISCONNECTED':
    case 'CONNECTION_LOST':
    case 'CONNECTION_CLOSED':
    case 'LOGOUT':
      return 'disconnected'
    case 'SERVICE_OFF':
    case 'STOPPED':
      return 'service_off'
    case 'BANNED':
    case 'BANNED_TEMP':
      return 'banned'
    default:
      return 'unknown'
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  )
}
