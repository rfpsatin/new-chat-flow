import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WHAPI_URL = 'https://gate.whapi.cloud/messages/text'
const N8N_WEBHOOK_URL = 'https://n8n.maringaai.com.br/webhook/whatsapp_cinemkt'
const DEFAULT_BATCH = parseInt(Deno.env.get('CAMPANHA_BATCH_SIZE') || '10', 10)
const DEFAULT_MIN_DELAY_S = 30
const DEFAULT_MAX_DELAY_S = 120

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function extractWhapiMessageId(whapiData: unknown): string | null {
  if (!whapiData || typeof whapiData !== 'object') return null
  const d = whapiData as Record<string, unknown>
  const msg = d?.message as Record<string, unknown> | undefined
  const list = d?.messages as unknown[] | undefined
  const first = list?.[0] as Record<string, unknown> | undefined
  return (
    (msg?.id as string) ??
    (msg?.message_id as string) ??
    (first?.id as string) ??
    (first?.message_id as string) ??
    (d?.id as string) ??
    null
  ) || null
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] ========== RUN CAMPAIGNS ==========`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date().toISOString()

    const tokenCache = new Map<string, { token: string; nome: string }>()

    async function getWhapiToken(
      empresaId: string,
    ): Promise<{ token: string; nome: string } | null> {
      const cached = tokenCache.get(empresaId)
      if (cached) return cached

      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, whapi_token')
        .eq('id', empresaId)
        .maybeSingle()

      if (error || !empresa?.whapi_token) {
        console.error(`[${requestId}] whapi_token not found for empresa ${empresaId}:`, error)
        return null
      }

      const result = { token: empresa.whapi_token, nome: empresa.nome_fantasia || empresa.id }
      tokenCache.set(empresaId, result)
      return result
    }

    // Buscar campanhas agendadas ou em execução cujo agendado_para já passou
    const { data: campanhas, error: campError } = await supabase
      .from('campanhas')
      .select(
        'id, empresa_id, nome, mensagem_texto, link, status, modo_resposta, iniciada_em, ' +
        'intervalo_min_segundos, intervalo_max_segundos',
      )
      .in('status', ['agendada', 'em_execucao'])
      .lte('agendado_para', now)

    if (campError) {
      console.error(`[${requestId}] Error listing campaigns:`, campError)
      throw campError
    }

    if (!campanhas?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Nenhuma campanha para executar' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let totalSent = 0
    const results: { campanha_id: string; enviados: number; erros: number }[] = []

    for (const campanha of campanhas) {
      if (campanha.status === 'agendada') {
        await supabase
          .from('campanhas')
          .update({ status: 'em_execucao', iniciada_em: campanha.iniciada_em || now, updated_at: now })
          .eq('id', campanha.id)
      }

      const minDelayS = campanha.intervalo_min_segundos ?? DEFAULT_MIN_DELAY_S
      const maxDelayS = campanha.intervalo_max_segundos ?? DEFAULT_MAX_DELAY_S

      const empresaInfo = await getWhapiToken(campanha.empresa_id)
      if (!empresaInfo) {
        console.error(`[${requestId}] Skipping campanha ${campanha.id}: no whapi_token`)
        await supabase
          .from('campanha_destinatarios')
          .update({ status_envio: 'erro_envio', erro_envio_msg: 'Token Whapi não configurado para a empresa' })
          .eq('campanha_id', campanha.id)
          .eq('status_envio', 'pendente')
        await supabase.from('campanhas').update({ status: 'concluida', finalizada_em: now, updated_at: now }).eq('id', campanha.id)
        results.push({ campanha_id: campanha.id, enviados: 0, erros: 0 })
        continue
      }

      const tokenPrefix = empresaInfo.token.substring(0, 10)

      // Busca destinatários cujo agendado_para já passou (ou é null para campanhas legadas)
      const { data: destinatarios, error: destError } = await supabase
        .from('campanha_destinatarios')
        .select('id, contato_id, whatsapp_numero, tentativas, mensagem_texto, agendado_para')
        .eq('campanha_id', campanha.id)
        .eq('status_envio', 'pendente')
        .or(`agendado_para.is.null,agendado_para.lte.${now}`)
        .order('agendado_para', { ascending: true, nullsFirst: true })
        .limit(DEFAULT_BATCH)

      if (destError || !destinatarios?.length) {
        if (destinatarios?.length === 0) {
          // Verifica se ainda há pendentes futuros ou enviando
          const { count: pendentes } = await supabase
            .from('campanha_destinatarios')
            .select('id', { count: 'exact', head: true })
            .eq('campanha_id', campanha.id)
            .eq('status_envio', 'pendente')

          const { count: enviando } = await supabase
            .from('campanha_destinatarios')
            .select('id', { count: 'exact', head: true })
            .eq('campanha_id', campanha.id)
            .eq('status_envio', 'enviando')

          if ((pendentes ?? 0) === 0 && (enviando ?? 0) === 0) {
            await supabase.from('campanhas').update({ status: 'concluida', finalizada_em: now, updated_at: now }).eq('id', campanha.id)
          }
        }
        results.push({ campanha_id: campanha.id, enviados: 0, erros: 0 })
        continue
      }

      console.log(
        `[${requestId}] Campanha ${campanha.id} empresa=${campanha.empresa_id} (${empresaInfo.nome}) token=${tokenPrefix}... ` +
        `batch=${destinatarios.length} delayRange=${minDelayS}-${maxDelayS}s`,
      )

      let enviados = 0
      let erros = 0

      const fallbackText = campanha.link
        ? `${campanha.mensagem_texto || ''}\n\n${campanha.link}`.trim()
        : (campanha.mensagem_texto || '').trim()

      const origemFinal = campanha.modo_resposta === 'atendente' ? 'atendente' : 'agente'
      const isHuman = origemFinal === 'atendente'

      for (let i = 0; i < destinatarios.length; i++) {
        const dest = destinatarios[i]

        const { data: claimedDest, error: claimError } = await supabase
          .from('campanha_destinatarios')
          .update({
            status_envio: 'enviando',
            tentativas: (dest.tentativas ?? 0) + 1,
            ultima_tentativa_em: now,
          })
          .eq('id', dest.id)
          .eq('status_envio', 'pendente')
          .select('id')
          .maybeSingle()

        if (claimError) {
          console.error(`[${requestId}] Claim error dest ${dest.id}:`, claimError)
          erros++
          continue
        }
        if (!claimedDest) continue

        try {
          const { data: contato, error: contatoErr } = await supabase
            .from('contatos')
            .select('id, empresa_id, whatsapp_numero, nome')
            .eq('id', dest.contato_id)
            .eq('empresa_id', campanha.empresa_id)
            .maybeSingle()

          if (contatoErr || !contato) {
            throw new Error(`Contato ${dest.contato_id} não encontrado para empresa ${campanha.empresa_id}`)
          }

          const rawNumber = contato.whatsapp_numero.replace(/@(s\.whatsapp\.net|c\.us)$/, '').trim()
          if (!/^\d{10,15}$/.test(rawNumber)) {
            throw new Error(`Número inválido: ${rawNumber}`)
          }
          const phoneNumber = `${rawNumber}@s.whatsapp.net`

          const { data: conversaAtiva } = await supabase
            .from('conversas')
            .select('id, nr_protocolo')
            .eq('empresa_id', campanha.empresa_id)
            .eq('contato_id', dest.contato_id)
            .neq('status', 'encerrado')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          let conversaId: string

          if (conversaAtiva) {
            conversaId = conversaAtiva.id
            await supabase.from('conversas').update({
              updated_at: new Date().toISOString(),
              origem_final: origemFinal,
              human_mode: isHuman,
              origem_inicial: 'campanha',
              campanha_id: campanha.id,
            }).eq('id', conversaId)
          } else {
            const initialStatus = origemFinal === 'agente' ? 'bot' : 'esperando_tria'
            const { data: newConv, error: createErr } = await supabase
              .from('conversas')
              .insert({
                empresa_id: campanha.empresa_id,
                contato_id: dest.contato_id,
                canal: 'whatsapp',
                status: initialStatus,
                iniciado_por: 'agente',
                origem_inicial: 'campanha',
                origem_final: origemFinal,
                human_mode: isHuman,
                campanha_id: campanha.id,
              })
              .select('id, nr_protocolo')
              .single()
            if (createErr) throw createErr
            conversaId = newConv.id
          }

          // Texto: usa mensagem_texto do destinatário (se presente) ou fallback da campanha
          const messageText = dest.mensagem_texto
            ? (campanha.link ? `${dest.mensagem_texto}\n\n${campanha.link}`.trim() : dest.mensagem_texto.trim())
            : fallbackText

          console.log(
            `[${requestId}] dest=${dest.id} [${i + 1}/${destinatarios.length}] sending to=${rawNumber}`,
          )

          const whapiRes = await fetch(WHAPI_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${empresaInfo.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to: phoneNumber, body: messageText }),
          })

          let whapiRaw = ''
          try { whapiRaw = await whapiRes.text() } catch { whapiRaw = '' }

          if (!whapiRes.ok) {
            throw new Error(`Whapi ${whapiRes.status}: ${whapiRaw.substring(0, 300)}`)
          }

          let whapiMessageId: string | null = null
          try {
            const whapiData = JSON.parse(whapiRaw) as unknown
            whapiMessageId = extractWhapiMessageId(whapiData)
            if (whapiMessageId) {
              console.log(`[${requestId}] dest=${dest.id} whapi message_id=${whapiMessageId}`)
            }
          } catch {
            // non-JSON response
          }

          await supabase.from('mensagens_ativas').insert({
            empresa_id: campanha.empresa_id,
            conversa_id: conversaId,
            contato_id: dest.contato_id,
            direcao: 'out',
            tipo_remetente: 'sistema',
            remetente_id: null,
            conteudo: messageText,
            whatsapp_message_id: whapiMessageId,
          })

          if (isHuman) {
            fetch(N8N_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [{
                  id: `hub-camp-${Date.now()}`,
                  from_me: true,
                  type: 'text',
                  chat_id: phoneNumber,
                  timestamp: Math.floor(Date.now() / 1000),
                  source: 'api',
                  text: { body: `#"human_mode=true"# ${messageText}` },
                  from: rawNumber,
                }],
                event: { type: 'messages', event: 'post' },
              }),
            }).catch((err) => console.error(`[${requestId}] n8n notify failed:`, err))
          }

          await supabase
            .from('campanha_destinatarios')
            .update({ status_envio: 'enviado', conversa_id: conversaId, mensagem_id_whatsapp: whapiMessageId })
            .eq('id', dest.id)

          enviados++
          totalSent++
          console.log(`[${requestId}] dest=${dest.id} SENT OK conversa=${conversaId}`)

          // Delay aleatório entre envios
          if (i < destinatarios.length - 1) {
            const delaySeconds = randomInt(minDelayS, maxDelayS)
            console.log(`[${requestId}] waiting ${delaySeconds}s before next send`)
            await delay(delaySeconds * 1000)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[${requestId}] dest=${dest.id} FAILED: ${msg}`)
          await supabase
            .from('campanha_destinatarios')
            .update({ status_envio: 'erro_envio', erro_envio_msg: msg.substring(0, 500) })
            .eq('id', dest.id)
          erros++
        }
      }

      results.push({ campanha_id: campanha.id, enviados, erros })

      // Verifica se campanha pode ser concluída
      const { count: pendentes } = await supabase
        .from('campanha_destinatarios')
        .select('id', { count: 'exact', head: true })
        .eq('campanha_id', campanha.id)
        .eq('status_envio', 'pendente')

      const { count: enviando } = await supabase
        .from('campanha_destinatarios')
        .select('id', { count: 'exact', head: true })
        .eq('campanha_id', campanha.id)
        .eq('status_envio', 'enviando')

      if ((pendentes ?? 0) === 0 && (enviando ?? 0) === 0) {
        await supabase.from('campanhas').update({ status: 'concluida', finalizada_em: now, updated_at: now }).eq('id', campanha.id)
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalSent, campanhas: results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[run-campaigns] FATAL:`, errorMsg)
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
