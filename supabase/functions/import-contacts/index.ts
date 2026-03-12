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

function normalizeOriginalPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const original = String(raw).trim()
  if (!original) return null

  const digitsOnly = original.replace(/\D/g, '')
  if (!digitsOnly) return original

  let digits = digitsOnly
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`
  }

  if (digits.startsWith('55') && digits.length === 12) {
    const ddd = digits.slice(2, 4)
    const local = digits.slice(4)
    return `55 (${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`
  }

  if (digits.startsWith('55') && digits.length === 13) {
    const ddd = digits.slice(2, 4)
    const local = digits.slice(4)
    return `55 (${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`
  }

  return original
}

interface ImportContactsRequest {
  rows?: ImportRow[]
  import_tag?: string | null
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

function sanitizeName(name: string | null | undefined): string {
  if (!name) return ''
  return String(name)
    .replace(/["'`«»\u201C\u201D\u2018\u2019]/g, '') // Remove all quote types
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return null

  const localDigits = digits.startsWith('55') ? digits.slice(2) : digits

  // Aceita apenas números com DDD:
  // - 10 dígitos locais (DDD + fixo)
  // - 11 dígitos locais (DDD + celular)
  if (localDigits.length !== 10 && localDigits.length !== 11) return null

  return digits.startsWith('55') ? digits : `55${localDigits}`
}

function validatePhoneReason(raw: string | null | undefined): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return 'numero vazio'

  const localDigits = digits.startsWith('55') ? digits.slice(2) : digits
  if (localDigits.length === 8 || localDigits.length === 9) {
    return 'numero sem DDD'
  }
  if (localDigits.length !== 10 && localDigits.length !== 11) {
    return 'numero invalido'
  }

  return null
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
    const importTag = body.import_tag?.trim() || null

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No rows provided',
          example_row: { nome: 'Joao da Silva', whatsapp_numero: '5544999999999' },
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

    const validRows: {
      empresa_id: string
      nome: string | null
      whatsapp_numero: string
      telefone_numero: string | null
      tp_contato: 'I'
      tag_origem: string | null
    }[] = []
    const invalidRows: { row: ImportRow; reason: string }[] = []

    for (const r of rows) {
      const normalized = normalizePhone(r.whatsapp_numero)
      if (!normalized) {
        invalidRows.push({ row: r, reason: validatePhoneReason(r.whatsapp_numero) ?? 'whatsapp_numero invalido' })
        continue
      }

      validRows.push({
        empresa_id: empresaId,
        nome: sanitizeName(r.nome) || null,
        whatsapp_numero: normalized,
        telefone_numero: normalizeOriginalPhone(r.whatsapp_numero),
        tp_contato: 'I',
        tag_origem: importTag,
      })
    }

    // Deduplicate by whatsapp_numero – keep last occurrence (overwrites earlier rows)
    const deduped = new Map<string, typeof validRows[number]>()
    for (const row of validRows) {
      deduped.set(row.whatsapp_numero, row)
    }
    const uniqueRows = Array.from(deduped.values())
    const duplicatesRemoved = validRows.length - uniqueRows.length

    if (!uniqueRows.length) {
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

    // Processa em lotes pequenos para evitar que um erro impeça o restante do batch
    // e para não travar o banco com um único upsert gigante.
    const BATCH_SIZE = 10
    let totalInserted = 0

    for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
      const batch = uniqueRows.slice(i, i + BATCH_SIZE)

      // 1) Tenta upsert do lote inteiro com ignoreDuplicates=true
      let batchRows = batch
      let batchError: any = null
      let batchCount: number | null = null

      const { error: err1, count: cnt1 } = await supabase
        .from('contatos')
        .upsert(batchRows, {
          onConflict: 'empresa_id,whatsapp_numero',
          // se já existir (empresa_id, whatsapp_numero), ignora o registro novo
          ignoreDuplicates: true,
          count: 'exact',
        })

      if (err1 && (err1.message?.includes('tp_contato') || err1.message?.includes('tag_origem'))) {
        console.warn(`[${requestId}] Fallback em lote: removendo tp_contato/tag_origem`)
        const fallbackRows = batchRows.map(({ tp_contato, tag_origem, ...rest }) => rest)
        const { error: err2, count: cnt2 } = await supabase
          .from('contatos')
          .upsert(fallbackRows, {
            onConflict: 'empresa_id,whatsapp_numero',
            ignoreDuplicates: true,
            count: 'exact',
          })
        batchError = err2
        batchCount = cnt2
      } else {
        batchError = err1
        batchCount = cnt1
      }

      if (!batchError) {
        // Lote inteiro processado com sucesso
        totalInserted += batchCount ?? 0
        continue
      }

      // 2) Se o lote falhar, faz fallback linha a linha para não perder os demais registros
      console.warn(`[${requestId}] Erro no lote, fallback linha a linha:`, batchError)

      for (const row of batch) {
        let singleRow: typeof uniqueRows[number] | Omit<typeof uniqueRows[number], 'tp_contato' | 'tag_origem'> = row
        let singleError: any = null
        let singleCount: number | null = null

        const { error: sErr1, count: sCnt1 } = await supabase
          .from('contatos')
          .upsert(singleRow, {
            onConflict: 'empresa_id,whatsapp_numero',
            ignoreDuplicates: true,
            count: 'exact',
          })

        if (sErr1 && (sErr1.message?.includes('tp_contato') || sErr1.message?.includes('tag_origem'))) {
          const { tp_contato, tag_origem, ...rest } = singleRow as any
          singleRow = rest
          const { error: sErr2, count: sCnt2 } = await supabase
            .from('contatos')
            .upsert(singleRow, {
              onConflict: 'empresa_id,whatsapp_numero',
              ignoreDuplicates: true,
              count: 'exact',
            })
          singleError = sErr2
          singleCount = sCnt2
        } else {
          singleError = sErr1
          singleCount = sCnt1
        }

        if (singleError) {
          console.error(`[${requestId}] Erro ao importar contato individual:`, singleError)
          invalidRows.push({
            row: { nome: row.nome, whatsapp_numero: row.whatsapp_numero },
            reason: singleError.message ?? 'erro ao importar contato',
          })
        } else {
          totalInserted += singleCount ?? 0
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: totalInserted,
        duplicates_removed: duplicatesRemoved,
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

