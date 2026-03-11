import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface ImportRow {
  nome?: string | null
  whatsapp_numero: string
}

interface ImportContactsRequest {
  rows?: ImportRow[]
}

type CallerTenant = {
  usuarioId: string
  empresaId: string
}

async function getCallerTenant(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<CallerTenant> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Nao autorizado')
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser()

  if (userError || !user) {
    throw new Error('Nao autorizado')
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: usuario, error: usuarioError } = await adminClient
    .from('usuarios')
    .select('id, empresa_id, ativo')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (usuarioError) throw new Error(usuarioError.message)
  if (!usuario || !usuario.ativo || !usuario.empresa_id) {
    throw new Error('Usuario sem empresa ativa')
  }

  return {
    usuarioId: usuario.id,
    empresaId: usuario.empresa_id,
  }
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return null
  // Aceita entre 10 e 15 dígitos (com DDI)
  if (digits.length < 10 || digits.length > 15) return null
  return digits
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== IMPORT CONTACTS ==========`)

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
    const body: ImportContactsRequest = await req.json().catch(() => ({}))
    const rows = body.rows ?? []

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No rows provided',
          example_row: { nome: 'Joao da Silva', whatsapp_numero: '5544999999999', email: 'joao@exemplo.com' },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerTenant = await getCallerTenant(req, supabaseUrl, supabaseServiceKey)
    const empresaId = callerTenant.empresaId

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const validRows: { empresa_id: string; nome: string | null; whatsapp_numero: string }[] = []
    const invalidRows: { row: ImportRow; reason: string }[] = []

    for (const r of rows) {
      const normalized = normalizePhone(r.whatsapp_numero)
      if (!normalized) {
        invalidRows.push({ row: r, reason: 'whatsapp_numero invalido' })
        continue
      }

      validRows.push({
        empresa_id: empresaId,
        nome: r.nome?.trim() || null,
        whatsapp_numero: normalized,
      })
    }

    if (!validRows.length) {
      return new Response(
        JSON.stringify({
          error: 'Nenhuma linha valida para importar',
          invalid_rows: invalidRows,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Upsert por (empresa_id, whatsapp_numero) – assume que existe unique index ou que nao ha conflito grave
    const { error: upsertError, count } = await supabase
      .from('contatos')
      .upsert(validRows, {
        onConflict: 'empresa_id,whatsapp_numero',
        ignoreDuplicates: false,
        count: 'exact',
      })

    if (upsertError) {
      console.error(`[${requestId}] Upsert error:`, upsertError)
      return new Response(
        JSON.stringify({
          error: 'Erro ao importar contatos',
          details: upsertError.message,
          imported: 0,
          invalid_rows: invalidRows,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: count ?? validRows.length,
        invalid: invalidRows.length,
        invalid_rows: invalidRows,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${requestId}] FATAL:`, msg)
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

