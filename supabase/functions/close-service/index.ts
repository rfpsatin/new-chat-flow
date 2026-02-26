import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'https://n8n.maringaai.com.br/webhook/maia-beach-tennis-demo'

type AttendanceMode = 'manual' | 'automated'

async function updateAttendanceMode(
  numeroParticipante: string,
  channelId: string,
  conversaId: string,
  mode: AttendanceMode
) {
  const attendanceMode = mode === 'manual' ? 'manual' : 'automated'
  console.log(`[close-service] Updating attendanceMode to ${attendanceMode} for numero_participante ${numeroParticipante}, channel_ID ${channelId}`)

  const payload = {
    attendanceMode,
    action: 'update',
    numero_participante: numeroParticipante,
    channel_ID: channelId,
    conversa_id: conversaId,
  }

  console.log(`[close-service] Payload: ${JSON.stringify(payload)}`)
  console.log(`[close-service] Attempting POST to ${N8N_WEBHOOK_URL}`)

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log(`[close-service] POST status: ${response.status}`)
    console.log(`[close-service] POST response body: ${responseText.substring(0, 500)}`)

    if (response.ok) {
      console.log(`[close-service] POST succeeded`)
      return true
    }

    console.error(`[close-service] POST failed with status: ${response.status}`)
    return false
  } catch (error) {
    console.error(`[close-service] POST failed with exception:`, error)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { conversa_id, empresa_id, chat_id, attendance_mode } = body
    const mode: AttendanceMode = attendance_mode === 'manual' ? 'manual' : 'automated'

    if (!conversa_id || !empresa_id) {
      return new Response(JSON.stringify({ error: 'Missing conversa_id or empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[close-service] Received request for conversa=${conversa_id}, empresa=${empresa_id}, chat_id=${chat_id}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let resolvedChatId = chat_id

    // If chat_id not provided, look it up from the database
    if (!resolvedChatId) {
      console.log(`[close-service] chat_id not provided, looking up from database...`)

      const { data: conversa, error: convError } = await supabase
        .from('conversas')
        .select('contato_id')
        .eq('id', conversa_id)
        .single()

      if (convError || !conversa) {
        console.error(`[close-service] Failed to find conversa:`, convError)
        return new Response(JSON.stringify({ error: 'Conversa not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: contato, error: contatoError } = await supabase
        .from('contatos')
        .select('whatsapp_numero')
        .eq('id', conversa.contato_id)
        .single()

      if (contatoError || !contato) {
        console.error(`[close-service] Failed to find contato:`, contatoError)
        return new Response(JSON.stringify({ error: 'Contato not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      resolvedChatId = contato.whatsapp_numero
      console.log(`[close-service] Resolved chat_id from database: ${resolvedChatId}`)
    }

    // Fetch whapi_token from empresas table
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('whapi_token')
      .eq('id', empresa_id)
      .single()

    if (empresaError || !empresa || !empresa.whapi_token) {
      console.error(`[close-service] Failed to find empresa or whapi_token:`, empresaError)
      return new Response(JSON.stringify({ error: 'Empresa or whapi_token not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[close-service] Resolved channel_ID (whapi_token) for empresa ${empresa_id}`)

    const result = await updateAttendanceMode(resolvedChatId, empresa.whapi_token, conversa_id, mode)
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
