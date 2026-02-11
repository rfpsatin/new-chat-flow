const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'http://162.240.152.122/workflow/YKu4UqLlWMoZ4dUk'

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

    console.log(`[close-service] Updating attendanceMode to automated for conversa ${conversa_id}`)

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendanceMode: 'automated' }),
    })

    if (!n8nResponse.ok) {
      console.error(`[close-service] n8n returned ${n8nResponse.status}`)
      return new Response(JSON.stringify({ error: 'Failed to update n8n', status: n8nResponse.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[close-service] Successfully updated attendanceMode to automated`)

    return new Response(JSON.stringify({ success: true }), {
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
