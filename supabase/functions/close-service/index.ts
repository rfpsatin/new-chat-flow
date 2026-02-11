const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'http://162.240.152.122/workflow/YKu4UqLlWMoZ4dUk'

async function updateAttendanceMode(conversaId: string, empresaId: string) {
  console.log(`[close-service] Updating attendanceMode to automated for conversa ${conversaId}`)

  // Try POST first
  let response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      attendanceMode: 'automated',
      conversa_id: conversaId,
      empresa_id: empresaId,
    }),
  })

  if (!response.ok) {
    console.warn(`[close-service] POST returned ${response.status}, trying GET with query params...`)
    
    // Fallback: try GET with query params
    const url = new URL(N8N_WEBHOOK_URL)
    url.searchParams.set('attendanceMode', 'automated')
    url.searchParams.set('conversa_id', conversaId)
    url.searchParams.set('empresa_id', empresaId)
    
    response = await fetch(url.toString(), { method: 'GET' })
  }

  if (!response.ok) {
    console.error(`[close-service] Both POST and GET failed. Last status: ${response.status}`)
    const body = await response.text()
    console.error(`[close-service] Response body: ${body}`)
    return false
  }

  console.log(`[close-service] Successfully updated attendanceMode to automated`)
  return true
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

    // Use waitUntil to not block the response
    const promise = updateAttendanceMode(conversa_id, empresa_id)
    
    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === 'function') {
      (globalThis as any).EdgeRuntime.waitUntil(promise)
      return new Response(JSON.stringify({ success: true, async: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fallback: await directly
    const result = await promise
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
