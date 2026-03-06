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
    const { telefone } = await req.json()

    if (!telefone) {
      return new Response(JSON.stringify({ error: 'Missing telefone' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Buscar contato pelo número de WhatsApp
    const { data: contato, error: contatoErr } = await supabase
      .from('contatos')
      .select('empresa_id')
      .eq('whatsapp_numero', telefone)
      .limit(1)
      .maybeSingle()

    if (contatoErr || !contato) {
      return new Response(JSON.stringify({ error: 'Contato não encontrado para este telefone' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Buscar empresa pelo id encontrado
    const { data: empresa, error: empresaErr } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .eq('id', contato.empresa_id)
      .single()

    if (empresaErr || !empresa) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(empresa), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
