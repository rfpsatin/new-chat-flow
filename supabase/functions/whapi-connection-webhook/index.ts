import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhapiConnectionEvent {
  event?: {
    type?: string
    state?: string
  }
  type?: string
  state?: string
  status?: string
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== WHAPI CONNECTION WEBHOOK ==========`)

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
    const url = new URL(req.url)
    const empresaId = url.searchParams.get('empresa_id')
    if (!empresaId) {
      return new Response(JSON.stringify({ error: 'Missing empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: WhapiConnectionEvent = await req.json()
    const eventType = payload.event?.type || payload.type || null
    const rawState =
      payload.event?.state ||
      payload.event?.type ||
      payload.state ||
      payload.status ||
      payload.type ||
      null

    const normalized = normalizeState(rawState)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    await supabase
      .from('empresas')
      .update({
        whapi_status: normalized,
        whapi_status_raw: rawState,
        whapi_last_error: null,
        whapi_status_source: 'webhook',
        whapi_status_updated_at: new Date().toISOString(),
      })
      .eq('id', empresaId)

    await supabase
      .from('whapi_connection_events')
      .insert({
        empresa_id: empresaId,
        source: 'webhook',
        event_type: eventType,
        state: rawState,
        payload,
      })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${requestId}] FATAL ERROR:`, errorMsg)
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

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
    case 'CONNECTION_RECONNECT':
      return 'connecting'
    default:
      return 'unknown'
  }
}
