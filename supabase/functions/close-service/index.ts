const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'http://162.240.152.122/workflow/YKu4UqLlWMoZ4dUk'

async function updateAttendanceMode(conversaId: string, empresaId: string) {
  console.log(`[close-service] Updating attendanceMode to automated for conversa ${conversaId}, empresa ${empresaId}`)

  const payload = {
    attendanceMode: 'automated',
    action: 'update',
    conversa_id: conversaId,
    empresa_id: empresaId,
  }

  // Try POST first
  console.log(`[close-service] Attempting POST to ${N8N_WEBHOOK_URL}`)
  let response: Response
  try {
    response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('content-type') || ''
    const responseText = await response.text()
    console.log(`[close-service] POST status: ${response.status}, content-type: ${contentType}`)
    console.log(`[close-service] POST response body: ${responseText.substring(0, 500)}`)

    if (response.ok && contentType.includes('application/json')) {
      console.log(`[close-service] POST succeeded with JSON response`)
      return true
    }

    if (response.ok) {
      // 200 but not JSON - might still have worked
      console.log(`[close-service] POST returned 200 but non-JSON response, considering success`)
      return true
    }

    console.warn(`[close-service] POST returned ${response.status}, trying GET with query params...`)
  } catch (postError) {
    console.error(`[close-service] POST failed with exception:`, postError)
    console.log(`[close-service] Falling back to GET...`)
  }

  // Fallback: try GET with query params
  try {
    const url = new URL(N8N_WEBHOOK_URL)
    url.searchParams.set('action', 'update')
    url.searchParams.set('attendanceMode', 'automated')
    url.searchParams.set('conversa_id', conversaId)
    url.searchParams.set('empresa_id', empresaId)

    console.log(`[close-service] Attempting GET: ${url.toString()}`)
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    const contentType = response.headers.get('content-type') || ''
    const responseText = await response.text()
    console.log(`[close-service] GET status: ${response.status}, content-type: ${contentType}`)
    console.log(`[close-service] GET response body: ${responseText.substring(0, 500)}`)

    if (response.ok) {
      console.log(`[close-service] GET succeeded - attendanceMode updated to automated`)
      return true
    }

    console.error(`[close-service] GET also failed with status: ${response.status}`)
    return false
  } catch (getError) {
    console.error(`[close-service] GET failed with exception:`, getError)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { conversa_id, empresa_id } = await req.json()

    if (!conversa_id || !empresa_id) {
      return new Response(JSON.stringify({ error: 'Missing conversa_id or empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[close-service] Received request for conversa=${conversa_id}, empresa=${empresa_id}`)

    // Await directly to ensure we get the result and can log it
    const result = await updateAttendanceMode(conversa_id, empresa_id)
    console.log(`[close-service] Final result: ${result}`)

    return new Response(JSON.stringify({ success: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(`[close-service] Error:`, error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
