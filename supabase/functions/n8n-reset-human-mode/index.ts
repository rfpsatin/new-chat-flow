// n8n-reset-human-mode v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'https://n8n.maringaai.com.br/webhook/whatsapp_cinemkt'

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

    console.log(`[n8n-reset-human-mode] Received request for conversa=${conversa_id}, empresa=${empresa_id}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get conversation details
    const { data: conversa, error: convError } = await supabase
      .from('conversas')
      .select('n8n_webhook_id, origem, channel, contato_id, human_mode, origem_final')
      .eq('id', conversa_id)
      .single()

    if (convError || !conversa) {
      console.error(`[n8n-reset-human-mode] Failed to find conversa:`, convError)
      return new Response(JSON.stringify({ error: 'Conversa not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine the "to" field: prefer n8n_webhook_id, fallback to whatsapp_numero
    let recipientTo = conversa.n8n_webhook_id

    if (!recipientTo) {
      // Fetch whatsapp_numero from contatos as fallback
      const { data: contato, error: contatoError } = await supabase
        .from('contatos')
        .select('whatsapp_numero')
        .eq('id', conversa.contato_id)
        .single()

      if (contatoError || !contato) {
        console.error(`[n8n-reset-human-mode] Failed to find contato:`, contatoError)
        return new Response(JSON.stringify({ error: 'Contato not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      recipientTo = contato.whatsapp_numero
      console.log(`[n8n-reset-human-mode] Using whatsapp_numero as fallback: ${recipientTo}`)
    }

    console.log(`[n8n-reset-human-mode] Resetting human_mode, to: ${recipientTo}`)

    // Notify n8n to reset human_mode
    const payload = {
      action: 'reset_human_mode',
      to: recipientTo,
      conversa_id: conversa_id,
      human_mode: false,
    }

    console.log(`[n8n-reset-human-mode] Payload: ${JSON.stringify(payload)}`)
    console.log(`[n8n-reset-human-mode] Attempting POST to ${N8N_WEBHOOK_URL}`)

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
      console.log(`[n8n-reset-human-mode] POST status: ${response.status}`)
      console.log(`[n8n-reset-human-mode] POST response body: ${responseText.substring(0, 500)}`)

      if (response.ok) {
        console.log(`[n8n-reset-human-mode] POST succeeded`)
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.error(`[n8n-reset-human-mode] POST failed with status: ${response.status}`)
      return new Response(JSON.stringify({ 
        success: false, 
        error: `n8n returned ${response.status}` 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error(`[n8n-reset-human-mode] POST failed with exception:`, error)
      return new Response(JSON.stringify({ 
        success: false, 
        error: String(error) 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error(`[n8n-reset-human-mode] Error:`, error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

