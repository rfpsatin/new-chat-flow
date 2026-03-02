import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  empresa_id: string
  to: string // Número do WhatsApp (formato: 5511999999999)
  message: string
  // Quando definido, indica se a conversa está em modo humano (true) ou não (false)
  human_mode?: boolean
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== WHAPI SEND MESSAGE ==========`)
  console.log(`[${requestId}] Method: ${req.method}`)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight request`)
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    console.log(`[${requestId}] Method not allowed: ${req.method}`)
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse request body
    const body: SendMessageRequest = await req.json()
    console.log(`[${requestId}] Request body:`, JSON.stringify(body, null, 2))

    const { empresa_id, to, message, human_mode } = body

    if (!empresa_id || !to || !message) {
      console.error(`[${requestId}] ERROR: Missing required fields`)
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        required: ['empresa_id', 'to', 'message']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get empresa and whapi_token
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, whapi_token')
      .eq('id', empresa_id)
      .maybeSingle()

    if (empresaError || !empresa) {
      console.error(`[${requestId}] ERROR: Invalid empresa_id:`, empresaError)
      return new Response(JSON.stringify({ error: 'Invalid empresa_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!empresa.whapi_token) {
      console.error(`[${requestId}] ERROR: Whapi token not configured for empresa`)
      return new Response(JSON.stringify({ 
        error: 'Whapi token not configured',
        message: 'Configure o token do Whapi.Cloud na empresa antes de enviar mensagens'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[${requestId}] Empresa found: ${empresa.nome_fantasia || empresa.id}`)
    console.log(`[${requestId}] Sending message to: ${to}, human_mode: ${human_mode}`)

    // Format phone number for Whapi API
    // Remove any existing @s.whatsapp.net or @c.us suffix
    let phoneNumber = to.trim().replace(/@(s\.whatsapp\.net|c\.us)$/, '')
    
    // Ensure number is in international format (starts with country code, no +)
    // If number doesn't start with country code, assume it's Brazilian (55)
    if (!phoneNumber.match(/^\d{10,15}$/)) {
      console.error(`[${requestId}] Invalid phone number format: ${phoneNumber}`)
      return new Response(JSON.stringify({ 
        error: 'Invalid phone number format',
        message: 'O número deve estar no formato internacional (ex: 5511999999999)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Add @s.whatsapp.net suffix for Whapi API
    phoneNumber = `${phoneNumber}@s.whatsapp.net`

    // Call Whapi.Cloud API to send message
    const whapiUrl = 'https://gate.whapi.cloud/messages/text'
    const payload: Record<string, unknown> = {
      to: phoneNumber,
      body: message,
    }
    // Opcional: incluir human_mode para que o n8n/Whapi consigam enxergar o modo atual da conversa
    if (typeof human_mode === 'boolean') {
      payload.human_mode = human_mode
    }

    const whapiResponse = await fetch(whapiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${empresa.whapi_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const whapiData = await whapiResponse.json()
    console.log(`[${requestId}] Whapi API response status: ${whapiResponse.status}`)
    console.log(`[${requestId}] Whapi API response:`, JSON.stringify(whapiData, null, 2))

    if (!whapiResponse.ok) {
      console.error(`[${requestId}] ERROR: Whapi API error:`, whapiData)
      return new Response(JSON.stringify({ 
        error: 'Failed to send message via Whapi',
        details: whapiData
      }), {
        status: whapiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[${requestId}] Message sent successfully`)
    console.log(`[${requestId}] Message ID: ${whapiData.messages?.[0]?.id || 'unknown'}`)

    return new Response(JSON.stringify({ 
      success: true,
      message_id: whapiData.messages?.[0]?.id,
      response: whapiData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${requestId}] FATAL ERROR:`, errorMsg)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMsg 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

