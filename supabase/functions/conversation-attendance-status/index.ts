// Consulta se a conversa ativa do contato está em modo humano (fonte da verdade: banco).
// Usado pelo n8n quando Redis não tem valor válido; resposta alimenta Redis e evita nova consulta até TTL.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

function onlyDigits(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/\D/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const expectedSecret = Deno.env.get('WHAPI_WEBHOOK_SECRET')
  const providedSecret = req.headers.get('x-webhook-secret')
  if (expectedSecret && providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    let empresaId: string | null = null
    let numero: string | null = null

    if (req.method === 'GET') {
      const url = new URL(req.url)
      empresaId = url.searchParams.get('empresa_id')
      numero = url.searchParams.get('numero') ?? url.searchParams.get('telefone')
    } else {
      const body = await req.json().catch(() => ({}))
      empresaId = body.empresa_id ?? body.empresaId ?? null
      numero = body.numero ?? body.telefone ?? body.whatsapp_numero ?? null
    }

    const numeroDigits = onlyDigits(numero ?? '')

    if (!empresaId || !numeroDigits) {
      return new Response(
        JSON.stringify({
          error: 'Missing parameters',
          required: ['empresa_id', 'numero'],
          usage_get: 'GET ?empresa_id=UUID&numero=5544999999999',
          usage_post: 'POST body: { "empresa_id": "UUID", "numero": "5544999999999" }',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Contato: empresa_id + número (com ou sem sufixo)
    const { data: contato, error: contatoErr } = await supabase
      .from('contatos')
      .select('id')
      .eq('empresa_id', empresaId)
      .or(`whatsapp_numero.eq.${numeroDigits},whatsapp_numero.eq.${numeroDigits}@s.whatsapp.net`)
      .limit(1)
      .maybeSingle()

    if (contatoErr) {
      console.error('[conversation-attendance-status] contato error:', contatoErr)
      return new Response(JSON.stringify({ error: 'Database error', details: contatoErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!contato) {
      return new Response(
        JSON.stringify({
          human_mode: false,
          status: null,
          conversa_id: null,
          reason: 'no_contact',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Última conversa não encerrada
    const { data: conversa, error: convErr } = await supabase
      .from('conversas')
      .select('id, status, human_mode, origem_final')
      .eq('empresa_id', empresaId)
      .eq('contato_id', contato.id)
      .neq('status', 'encerrado')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (convErr) {
      console.error('[conversation-attendance-status] conversa error:', convErr)
      return new Response(JSON.stringify({ error: 'Database error', details: convErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!conversa) {
      return new Response(
        JSON.stringify({
          human_mode: false,
          status: null,
          conversa_id: null,
          reason: 'no_active_conversation',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const human_mode =
      conversa.human_mode === true || conversa.origem_final === 'atendente'

    return new Response(
      JSON.stringify({
        human_mode,
        status: conversa.status,
        conversa_id: conversa.id,
        reason: 'active_conversation',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[conversation-attendance-status]', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
