import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHAPI_BASE_URL = 'https://gate.whapi.cloud'

interface QrRequest {
  empresa_id: string
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== WHAPI QR ==========`)

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
    const body: QrRequest = await req.json()
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
      await updateEmpresaQr(supabase, empresaId, {
        whapi_last_error: 'Token do Whapi não configurado',
      })
      return new Response(JSON.stringify({ error: 'Whapi token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (looksLikeUuid(empresa.whapi_token)) {
      const errorMessage = 'Token do Whapi inválido (parece ser um UUID)'
      await updateEmpresaQr(supabase, empresaId, {
        whapi_last_error: errorMessage,
      })
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use official /users/login endpoint for QR code
    console.log(`[${requestId}] Calling /users/login for QR`)
    const whapiResponse = await fetch(`${WHAPI_BASE_URL}/users/login`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${empresa.whapi_token}`,
        'Content-Type': 'application/json',
      },
    })

    const contentType = whapiResponse.headers.get('content-type')
    console.log(`[${requestId}] Response status: ${whapiResponse.status}, content-type: ${contentType}`)

    // Check if response is JSON
    if (!contentType?.includes('application/json')) {
      const textResponse = await whapiResponse.text()
      console.error(`[${requestId}] Non-JSON response:`, textResponse.substring(0, 200))
      
      await updateEmpresaQr(supabase, empresaId, {
        whapi_last_error: 'Resposta inesperada do Whapi (não é JSON)',
      })
      return new Response(JSON.stringify({ 
        error: 'Resposta inesperada do Whapi',
        status: whapiResponse.status 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const qrData = await whapiResponse.json()
    console.log(`[${requestId}] QR response keys:`, Object.keys(qrData || {}))

    // Check if already authenticated (no QR needed)
    if (qrData?.status === 'AUTH' || qrData?.status === 'AUTHORIZED' || qrData?.authorized === true) {
      await updateEmpresaQr(supabase, empresaId, {
        whapi_last_error: null,
      })
      return new Response(JSON.stringify({
        empresa_id: empresaId,
        qr_image: null,
        already_authenticated: true,
        message: 'Já autenticado, QR não necessário',
        response: qrData,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!whapiResponse.ok) {
      const errorMessage = qrData?.error || qrData?.message || 'Erro ao obter QR do Whapi'
      await updateEmpresaQr(supabase, empresaId, {
        whapi_last_error: errorMessage,
      })
      return new Response(JSON.stringify({ error: errorMessage, details: qrData }), {
        status: whapiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const qrImage = extractQrImage(qrData)
    await updateEmpresaQr(supabase, empresaId, {
      whapi_last_error: null,
    })

    return new Response(JSON.stringify({
      empresa_id: empresaId,
      qr_image: qrImage,
      response: qrData,
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

async function updateEmpresaQr(
  supabase: any,
  empresaId: string,
  data: {
    whapi_last_error: string | null
  }
) {
  await supabase
    .from('empresas')
    .update({
      ...data,
      whapi_last_qr_at: new Date().toISOString(),
      whapi_status: 'pairing',
      whapi_status_raw: 'QR_REQUESTED',
      whapi_status_source: 'polling',
      whapi_status_updated_at: new Date().toISOString(),
    })
    .eq('id', empresaId)
}

function extractQrImage(data: any): string | null {
  const qr =
    data?.qr ||
    data?.qrcode ||
    data?.qr_code ||
    data?.base64 ||
    data?.image ||
    data?.data?.qr ||
    data?.data?.base64 ||
    data?.data?.image

  if (!qr) return null
  const value = String(qr)
  if (value.startsWith('data:image') || value.startsWith('http')) {
    return value
  }
  return `data:image/png;base64,${value}`
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
