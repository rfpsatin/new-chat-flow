import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHAPI_BASE_URL = 'https://gate.whapi.cloud'

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

    const whapiResponse = await fetch(`${WHAPI_BASE_URL}/api/getState`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${empresa.whapi_token}`,
        'Content-Type': 'application/json',
      },
    })

    const whapiData = await safeJson(whapiResponse)
    const rawState = extractRawState(whapiData)
    const normalized = normalizeState(rawState)

    if (!whapiResponse.ok) {
      const errorMessage = whapiData?.error || whapiData?.message || 'Erro ao consultar estado do Whapi'
      await updateEmpresaStatus(supabase, empresaId, {
        whapi_status: 'error',
        whapi_status_raw: rawState,
      whapi_last_error: errorMessage,
      whapi_status_source: 'polling',
      })
      return new Response(JSON.stringify({ error: errorMessage, details: whapiData }), {
        status: whapiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await updateEmpresaStatus(supabase, empresaId, {
      whapi_status: normalized,
      whapi_status_raw: rawState,
      whapi_last_error: null,
      whapi_status_source: 'polling',
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
  }
) {
  await supabase
    .from('empresas')
    .update({
      ...data,
      whapi_status_source: data.whapi_status_source,
      whapi_status_updated_at: new Date().toISOString(),
    })
    .eq('id', empresaId)
}

function extractRawState(data: any): string | null {
  const raw = data?.state || data?.status || data?.data?.state || data?.data?.status
  if (!raw) return null
  return String(raw)
}

function normalizeState(rawState: string | null): string {
  if (!rawState) return 'unknown'
  const state = rawState.toUpperCase()
  switch (state) {
    case 'CONNECTED':
    case 'READY':
      return 'connected'
    case 'PAIRING':
    case 'SERVICE_SCAN':
      return 'pairing'
    case 'DISCONNECTED':
    case 'CONNECTION_LOST':
    case 'CONNECTION_CLOSED':
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
