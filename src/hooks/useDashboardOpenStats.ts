import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfMonth, startOfDay, endOfDay, format } from 'date-fns';

export type PeriodoFiltro = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes' | 'prazo';

export interface OpenStatusMetrics {
  count: number;
  avgWaitSeconds: number;
}

export interface LeadTimePoint {
  dia: string;
  leadTimeSeconds: number;
}

export interface DashboardOpenStats {
  bot: OpenStatusMetrics;
  triagem: OpenStatusMetrics;
  fila: OpenStatusMetrics;
  atendimento: OpenStatusMetrics;
  leadTimeTimeline: LeadTimePoint[];
  agentes: {
    id: string;
    nome: string;
    filaCount: number;
    filaAvgSeconds: number;
    atendimentoCount: number;
    atendimentoAvgSeconds: number;
  }[];
}

function getDateRange(periodo: PeriodoFiltro): { inicio: Date; fim: Date } {
  const agora = new Date();
  const hoje = startOfDay(agora);

  switch (periodo) {
    case 'hoje':
      return { inicio: hoje, fim: endOfDay(agora) };
    case 'ontem': {
      const ontem = subDays(hoje, 1);
      return { inicio: ontem, fim: hoje };
    }
    case '7dias':
      return { inicio: subDays(hoje, 7), fim: endOfDay(agora) };
    case '30dias':
      return { inicio: subDays(hoje, 30), fim: endOfDay(agora) };
    case 'mes':
      return { inicio: startOfMonth(agora), fim: endOfDay(agora) };
    default:
      return { inicio: hoje, fim: endOfDay(agora) };
  }
}

function computeAverageSeconds(items: { created_at: string }[]) {
  if (items.length === 0) return 0;
  const agora = Date.now();
  const total = items.reduce((acc, item) => {
    const inicio = new Date(item.created_at).getTime();
    return acc + Math.max(0, (agora - inicio) / 1000);
  }, 0);
  return Math.round(total / items.length);
}

export function useDashboardOpenStats(
  empresaId: string,
  periodo: PeriodoFiltro,
  somenteEmAndamento: boolean,
  filaAgenteId?: string,
  atendimentoAgenteId?: string
) {
  const { inicio, fim } = getDateRange(periodo);

  return useQuery({
    queryKey: [
      'dashboard-open',
      empresaId,
      periodo,
      somenteEmAndamento,
      filaAgenteId,
      atendimentoAgenteId,
    ],
    queryFn: async () => {
      const query = supabase
        .from('conversas')
        .select('id, status, created_at, encerrado_em, agente_responsavel_id')
        .eq('empresa_id', empresaId);

      const { data, error } =
        periodo === 'prazo'
          ? await query
          : await query
              .gte('created_at', inicio.toISOString())
              .lt('created_at', fim.toISOString());

      if (error) throw error;

      const conversas = data || [];
      const filtradas = somenteEmAndamento
        ? conversas.filter((c) => c.status !== 'encerrado')
        : conversas;

      const bot = filtradas.filter((c) => c.status === 'bot');
      const triagem = filtradas.filter((c) => c.status === 'esperando_tria');
      const fila = filtradas.filter((c) => {
        if (c.status !== 'fila_humano') return false;
        return filaAgenteId ? c.agente_responsavel_id === filaAgenteId : true;
      });
      const atendimento = filtradas.filter((c) => {
        if (c.status !== 'em_atendimento_humano') return false;
        return atendimentoAgenteId ? c.agente_responsavel_id === atendimentoAgenteId : true;
      });

      const leadTimeMap = new Map<string, { label: string; values: number[] }>();
      const agora = Date.now();
      filtradas.forEach((c) => {
        const inicioMs = new Date(c.created_at).getTime();
        const fimMs = c.encerrado_em ? new Date(c.encerrado_em).getTime() : agora;
        const duracao = Math.max(0, (fimMs - inicioMs) / 1000);
        const dayKey = format(new Date(c.created_at), 'yyyy-MM-dd');
        const label = format(new Date(c.created_at), 'dd/MM');
        const current = leadTimeMap.get(dayKey) || { label, values: [] };
        current.values.push(duracao);
        leadTimeMap.set(dayKey, current);
      });

      const leadTimeTimeline = Array.from(leadTimeMap.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([, values]) => {
          const media = values.values.length > 0
            ? Math.round(values.values.reduce((acc, v) => acc + v, 0) / values.values.length)
            : 0;
          return { dia: values.label, leadTimeSeconds: media };
        });

      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .in('tipo_usuario', ['opr', 'sup']);

      if (usuariosError) throw usuariosError;

      const agentesMap = new Map(
        (usuarios || []).map((u) => [
          u.id,
          {
            id: u.id,
            nome: u.nome,
            filaCount: 0,
            filaAvgSeconds: 0,
            atendimentoCount: 0,
            atendimentoAvgSeconds: 0,
            filaSamples: [] as number[],
            atendimentoSamples: [] as number[],
          },
        ])
      );

      const nowMs = Date.now();
      filtradas.forEach((c) => {
        if (!c.agente_responsavel_id) return;
        const agente = agentesMap.get(c.agente_responsavel_id);
        if (!agente) return;
        const inicioMs = new Date(c.created_at).getTime();
        const duration = Math.max(0, (nowMs - inicioMs) / 1000);
        if (c.status === 'fila_humano') {
          agente.filaCount += 1;
          agente.filaSamples.push(duration);
        }
        if (c.status === 'em_atendimento_humano') {
          agente.atendimentoCount += 1;
          agente.atendimentoSamples.push(duration);
        }
      });

      const agentes = Array.from(agentesMap.values()).map((agente) => ({
        id: agente.id,
        nome: agente.nome,
        filaCount: agente.filaCount,
        filaAvgSeconds:
          agente.filaSamples.length > 0
            ? Math.round(
                agente.filaSamples.reduce((acc, v) => acc + v, 0) / agente.filaSamples.length
              )
            : 0,
        atendimentoCount: agente.atendimentoCount,
        atendimentoAvgSeconds:
          agente.atendimentoSamples.length > 0
            ? Math.round(
                agente.atendimentoSamples.reduce((acc, v) => acc + v, 0) /
                  agente.atendimentoSamples.length
              )
            : 0,
      }));

      return {
        bot: {
          count: bot.length,
          avgWaitSeconds: computeAverageSeconds(bot),
        },
        triagem: {
          count: triagem.length,
          avgWaitSeconds: computeAverageSeconds(triagem),
        },
        fila: {
          count: fila.length,
          avgWaitSeconds: computeAverageSeconds(fila),
        },
        atendimento: {
          count: atendimento.length,
          avgWaitSeconds: computeAverageSeconds(atendimento),
        },
        leadTimeTimeline,
        agentes,
      } as DashboardOpenStats;
    },
    enabled: !!empresaId,
  });
}
