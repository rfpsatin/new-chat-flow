// Worker: processa campanhas agendadas e envia mensagens com rate limit
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = parseInt(Deno.env.get('CAMPANHA_BATCH_SIZE') || '15', 10) // envios por execução
const MAX_PER_MINUTE = parseInt(Deno.env.get('CAMPANHA_MAX_PER_MINUTE') || '30', 10)

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

    // 1. Campanhas agendadas cujo horário já passou
    const { data: campanhas, error: campError } = await supabase
      .from('campanhas')
      .select('id, empresa_id, nome, mensagem_texto, link, status, envios_por_minuto, iniciada_em, modo_resposta')
      .eq('status', 'agendada')
      .lte('agendado_para', now)

    if (campError) {
      console.error(`[${requestId}] Error listing campaigns:`, campError)
      throw campError
    }

    if (!campanhas?.length) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: 'Nenhuma campanha agendada para executar',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let totalSent = 0
    const results: { campanha_id: string; enviados: number; erros: number; pulados_concorrencia?: number }[] = []

    for (const campanha of campanhas) {
      // Marcar como em execução se ainda não estava
      if (campanha.status === 'agendada') {
        await supabase
          .from('campanhas')
          .update({
            status: 'em_execucao',
            iniciada_em: campanha.iniciada_em || now,
            updated_at: now,
          })
          .eq('id', campanha.id)
      }

      const limitPerMin = campanha.envios_por_minuto ?? MAX_PER_MINUTE
      const batchSize = Math.min(BATCH_SIZE, limitPerMin)

      // Destinatários pendentes
      const { data: destinatarios, error: destError } = await supabase
        .from('campanha_destinatarios')
        .select('id, contato_id, whatsapp_numero, tentativas, erro_envio_msg')
        .eq('campanha_id', campanha.id)
        .eq('status_envio', 'pendente')
        .limit(batchSize)

      if (destError || !destinatarios?.length) {
        if (destinatarios?.length === 0) {
          // Nenhum pendente: concluir campanha
          const { data: rest } = await supabase
            .from('campanha_destinatarios')
            .select('id')
            .eq('campanha_id', campanha.id)
            .in('status_envio', ['enviando'])
          if (!rest?.length) {
            await supabase
              .from('campanhas')
              .update({ status: 'concluida', finalizada_em: now, updated_at: now })
              .eq('id', campanha.id)
          }
        }
        results.push({ campanha_id: campanha.id, enviados: 0, erros: 0 })
        continue
      }

      let enviados = 0
      let erros = 0

      const messageText = campanha.link
        ? `${campanha.mensagem_texto || ''}\n\n${campanha.link}`.trim()
        : (campanha.mensagem_texto || '').trim()

      const startConvUrl = `${supabaseUrl}/functions/v1/start-conversation`

      console.log(`[${requestId}] Campanha ${campanha.id} (empresa=${campanha.empresa_id}): ${destinatarios.length} destinatários, URL=${startConvUrl}`)

      for (const dest of destinatarios) {
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
          console.error(`[${requestId}] Error claiming destinatário ${dest.id}:`, claimError)
          erros++
          continue
        }

        if (!claimedDest) {
          continue
        }

        const origemFinal = campanha.modo_resposta === 'atendente' ? 'atendente' : 'agente'

        try {
          const payloadBody = {
            empresa_id: campanha.empresa_id,
            contato_id: dest.contato_id,
            mensagem_inicial: messageText,
            origem_inicial: 'campanha' as const,
            origem_final: origemFinal,
            campanha_id: campanha.id,
          }

          console.log(`[${requestId}] dest ${dest.id}: calling start-conversation empresa_id=${campanha.empresa_id} contato_id=${dest.contato_id}`)

          const res = await fetch(startConvUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': Deno.env.get('SUPABASE_ANON_KEY') || supabaseServiceKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payloadBody),
          })

          let rawBody = ''
          try { rawBody = await res.text() } catch { rawBody = '' }

          let data: Record<string, unknown> = {}
          try { data = JSON.parse(rawBody) } catch { /* response is not JSON */ }

          if (res.ok && data?.success === true) {
            const conversaId = data.conversa_id as string | undefined

            await supabase
              .from('campanha_destinatarios')
              .update({
                status_envio: 'enviado',
                conversa_id: conversaId || null,
              })
              .eq('id', dest.id)

            enviados++
            totalSent++
          } else {
            console.error(
              `[${requestId}] start-conversation FAILED dest=${dest.id} status=${res.status} body=${rawBody.substring(0, 300)}`
            )

            let errorMessage: string
            if (data?.error) {
              errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
              if (data.details) {
                const d = typeof data.details === 'string' ? data.details : JSON.stringify(data.details)
                errorMessage += ` | ${d.substring(0, 150)}`
              }
            } else if (rawBody.length > 0) {
              errorMessage = `HTTP ${res.status}: ${rawBody.substring(0, 200)}`
            } else {
              errorMessage = `HTTP ${res.status} ${res.statusText}`
            }

            await supabase
              .from('campanha_destinatarios')
              .update({
                status_envio: 'erro_envio',
                erro_envio_msg: errorMessage.substring(0, 500),
              })
              .eq('id', dest.id)
            erros++
          }
        } catch (err) {
          console.error(
            `[${requestId}] Error calling start-conversation for dest ${dest.id}:`,
            err
          )
          const msg = err instanceof Error ? err.message : String(err)
          await supabase
            .from('campanha_destinatarios')
            .update({
              status_envio: 'erro_envio',
              erro_envio_msg: msg.substring(0, 500),
            })
            .eq('id', dest.id)
          erros++
        }
      }

      results.push({ campanha_id: campanha.id, enviados, erros })

      // Se não há mais pendentes, marcar campanha como concluída
      const { count } = await supabase
        .from('campanha_destinatarios')
        .select('id', { count: 'exact', head: true })
        .eq('campanha_id', campanha.id)
        .eq('status_envio', 'pendente')

      if (count === 0) {
        const { count: enviando } = await supabase
          .from('campanha_destinatarios')
          .select('id', { count: 'exact', head: true })
          .eq('campanha_id', campanha.id)
          .eq('status_envio', 'enviando')
        if (enviando === 0) {
          await supabase
            .from('campanhas')
            .update({ status: 'concluida', finalizada_em: now, updated_at: now })
            .eq('id', campanha.id)
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: totalSent,
      campanhas: results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[run-campaigns] FATAL:`, errorMsg)
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
