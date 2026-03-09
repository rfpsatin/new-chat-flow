import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const empresaId = url.searchParams.get('empresa_id')
    const messageId = url.searchParams.get('message_id')

    if (!empresaId || !messageId) {
      return new Response(JSON.stringify({ error: 'Missing empresa_id or message_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('whapi_token')
      .eq('id', empresaId)
      .maybeSingle()

    if (empresaError || !empresa?.whapi_token) {
      return new Response(JSON.stringify({ error: 'Empresa not found or no Whapi token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch media from Whapi API
    const whapiUrl = `https://gate.whapi.cloud/messages/media/${encodeURIComponent(messageId)}`
    const whapiResponse = await fetch(whapiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${empresa.whapi_token}`,
        'Accept': '*/*',
      },
    })

    if (!whapiResponse.ok) {
      console.error(`Whapi media fetch failed: ${whapiResponse.status} ${whapiResponse.statusText}`)
      const errorText = await whapiResponse.text()
      console.error('Whapi error body:', errorText)
      return new Response(JSON.stringify({ error: 'Failed to fetch media from Whapi' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contentType = whapiResponse.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = whapiResponse.headers.get('content-disposition') || ''

    // Try to extract filename from query params or content-disposition
    const filename = url.searchParams.get('filename') || 'arquivo'

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition || `attachment; filename="${filename}"`,
    }

    const contentLength = whapiResponse.headers.get('content-length')
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }

    return new Response(whapiResponse.body, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('whapi-media error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
