import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHAPI_BASE_URL = 'https://gate.whapi.cloud'
const RECONNECT_ENDPOINTS = ['/api/reconnect', '/api/restart', '/api/start']

interface ReconnectRequest {
  empresa_id: string
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== WHAPI RECONNECT ==========`)

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
    const body: ReconnectRequest = await req.json()
    const empresaId = body?.empresa_id

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
      .select('id, whapi_token')
      .eq('id', empresaId)
      .maybeSingle()

    if (empresaError || !empresa) {
      return new Response(JSON.stringify({ error: 'Invalid empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!empresa.whapi_token) {
      await updateEmpresaReconnect(supabase, empresaId, {
        whapi_last_error: 'Token do Whapi não configurado',
        whapi_status: 'not_configured',
        whapi_status_raw: null,
        whapi_status_source: 'polling',
      })
      return new Response(JSON.stringify({ error: 'Whapi token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (looksLikeUuid(empresa.whapi_token)) {
      const errorMessage = 'Token do Whapi inválido (parece ser um UUID)'
      await updateEmpresaReconnect(supabase, empresaId, {
        whapi_last_error: errorMessage,
        whapi_status: 'error',
        whapi_status_raw: 'TOKEN_INVALID',
        whapi_status_source: 'polling',
      })
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let lastError: any = null
    let responseData: any = null
    let usedEndpoint: string | null = null

    for (const endpoint of RECONNECT_ENDPOINTS) {
      const whapiResponse = await fetch(`${WHAPI_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${empresa.whapi_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await safeJson(whapiResponse)
      if (whapiResponse.ok) {
        responseData = data
        usedEndpoint = endpoint
        break
      }

      lastError = data || { error: `Falha ao chamar ${endpoint}` }
    }

    if (!responseData) {
      const errorMessage = lastError?.error || lastError?.message || 'Erro ao solicitar reconexão no Whapi'
      await updateEmpresaReconnect(supabase, empresaId, {
        whapi_last_error: errorMessage,
        whapi_status: 'error',
        whapi_status_raw: 'RECONNECT_FAILED',
        whapi_status_source: 'polling',
      })
      return new Response(JSON.stringify({ error: errorMessage, details: lastError }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await updateEmpresaReconnect(supabase, empresaId, {
      whapi_last_error: null,
      whapi_status: 'connecting',
      whapi_status_raw: 'RECONNECT_REQUESTED',
      whapi_status_source: 'polling',
    })

    return new Response(JSON.stringify({
      empresa_id: empresaId,
      endpoint: usedEndpoint,
      response: responseData,
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

async function updateEmpresaReconnect(
  supabase: any,
  empresaId: string,
  data: {
    whapi_last_error: string | null
    whapi_status: string | null
    whapi_status_raw: string | null
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
