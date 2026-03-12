import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfMonth, startOfDay, endOfDay } from 'date-fns';

export type PeriodoFiltro = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes' | 'prazo';

interface KpiData {
  valor: number;
  valorAnterior: number;
  variacao: number;
}

interface ContatoPorHora {
  hora: string;
  atendimentos: number;
}

interface AtendimentoPorMotivo {
  name: string;
  value: number;
}

interface AtendimentoPorCanal {
  name: string;
  value: number;
}

export interface AgenteStats {
  id: string;
  nome: string;
  atendimentos: number;
  dias: number;
  mediaAtendDia: number;
  msgEnviadas: number;
  msgRecebidas: number;
  tma: string;
}

export interface DashboardStats {
  kpis: {
    atendimentos: KpiData;
    clientesUnicos: KpiData;
    msgEnviadas: KpiData;
    msgRecebidas: KpiData;
    mediaAtendAgente: KpiData;
    tma: string;
  };
  contatosPorHora: ContatoPorHora[];
  atendimentosPorCanal: AtendimentoPorCanal[];
  atendimentosPorMotivo: AtendimentoPorMotivo[];
  agentes: AgenteStats[];
}

// Calcular intervalo de datas baseado no período
function getDateRange(periodo: PeriodoFiltro): { 
  inicio: Date; 
  fim: Date; 
  inicioAnterior: Date; 
  fimAnterior: Date 
} {
  const agora = new Date();
  const hoje = startOfDay(agora);
  
  switch (periodo) {
    case 'hoje':
      return {
        inicio: hoje,
        fim: endOfDay(agora),
        inicioAnterior: subDays(hoje, 1),
        fimAnterior: startOfDay(hoje)
      };
    case 'ontem':
      const ontem = subDays(hoje, 1);
      return {
        inicio: ontem,
        fim: hoje,
        inicioAnterior: subDays(ontem, 1),
        fimAnterior: ontem
      };
    case '7dias':
      return {
        inicio: subDays(hoje, 7),
        fim: endOfDay(agora),
        inicioAnterior: subDays(hoje, 14),
        fimAnterior: subDays(hoje, 7)
      };
    case '30dias':
      return {
        inicio: subDays(hoje, 30),
        fim: endOfDay(agora),
        inicioAnterior: subDays(hoje, 60),
        fimAnterior: subDays(hoje, 30)
      };
    case 'mes':
      const inicioMes = startOfMonth(agora);
      const inicioMesAnterior = startOfMonth(subDays(inicioMes, 1));
      return {
        inicio: inicioMes,
        fim: endOfDay(agora),
        inicioAnterior: inicioMesAnterior,
        fimAnterior: inicioMes
      };
    case 'prazo':
      return {
        inicio: hoje,
        fim: endOfDay(agora),
        inicioAnterior: subDays(hoje, 1),
        fimAnterior: hoje
      };
    default:
      return {
        inicio: hoje,
        fim: endOfDay(agora),
        inicioAnterior: subDays(hoje, 1),
        fimAnterior: hoje
      };
  }
}

// Calcular variação percentual
function calcularVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

// Formatar TMA (segundos para HH:MM:SS)
function formatarTMA(segundos: number | null): string {
  if (!segundos || segundos <= 0) return '00:00:00';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Gerar array completo de 24 horas
function gerarHorasCompletas(dados: { hora: number; total: number }[]): ContatoPorHora[] {
  const mapaHoras = new Map(dados.map(d => [d.hora, d.total]));
  return Array.from({ length: 24 }, (_, i) => ({
    hora: `${i.toString().padStart(2, '0')}h`,
    atendimentos: mapaHoras.get(i) || 0
  }));
}

export function useDashboardStats(empresaId: string, periodo: PeriodoFiltro, enabled = true) {
  const { inicio, fim, inicioAnterior, fimAnterior } = getDateRange(periodo);

  // Query única de conversas encerradas no período atual
  const { data: conversasPeriodo, isLoading: loadingConversasPeriodo } = useQuery({
    queryKey: ['dashboard-conversas', empresaId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversas')
        .select(`
          id,
          contato_id,
          created_at,
          encerrado_em,
          canal,
          agente_responsavel_id,
          motivo_encerramento_id,
          status,
          motivos_encerramento(descricao)
        `)
        .eq('empresa_id', empresaId)
        .eq('status', 'encerrado')
        .gte('encerrado_em', inicio.toISOString())
        .lt('encerrado_em', fim.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId && enabled,
  });

  // KPIs do período anterior (para comparação)
  const { data: kpisAnterior, isLoading: loadingKpisAnterior } = useQuery({
    queryKey: ['dashboard-kpis', empresaId, periodo, 'anterior'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversas')
        .select('id, contato_id')
        .eq('empresa_id', empresaId)
        .eq('status', 'encerrado')
        .gte('encerrado_em', inicioAnterior.toISOString())
        .lt('encerrado_em', fimAnterior.toISOString());

      if (error) throw error;

      return {
        atendimentos: data?.length || 0,
        clientesUnicos: new Set(data?.map((c) => c.contato_id)).size,
      };
    },
    enabled: !!empresaId && enabled,
  });

  // Mensagens (enviadas e recebidas) no período atual
  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ['dashboard-mensagens', empresaId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensagens_historico')
        .select('direcao')
        .eq('empresa_id', empresaId)
        .gte('criado_em', inicio.toISOString())
        .lt('criado_em', fim.toISOString());

      if (error) throw error;

      const enviadas = data?.filter((m) => m.direcao === 'out').length || 0;
      const recebidas = data?.filter((m) => m.direcao === 'in').length || 0;
      return { enviadas, recebidas };
    },
    enabled: !!empresaId && enabled,
  });

  // Mensagens do período anterior (para comparação)
  const { data: mensagensAnterior } = useQuery({
    queryKey: ['dashboard-mensagens', empresaId, periodo, 'anterior'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensagens_historico')
        .select('direcao')
        .eq('empresa_id', empresaId)
        .gte('criado_em', inicioAnterior.toISOString())
        .lt('criado_em', fimAnterior.toISOString());

      if (error) throw error;

      return {
        enviadas: data?.filter((m) => m.direcao === 'out').length || 0,
        recebidas: data?.filter((m) => m.direcao === 'in').length || 0,
      };
    },
    enabled: !!empresaId && enabled,
  });

  // Usuários considerados agentes
  const { data: usuariosAgentes, isLoading: loadingUsuariosAgentes } = useQuery({
    queryKey: ['dashboard-agentes-usuarios', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .in('tipo_usuario', ['opr', 'sup', 'adm']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId && enabled,
  });

  // Mensagens enviadas por agentes no período
  const { data: mensagensEnviadas, isLoading: loadingMsgEnv } = useQuery({
    queryKey: ['dashboard-agentes-msg-env', empresaId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensagens_historico')
        .select('remetente_id')
        .eq('empresa_id', empresaId)
        .eq('direcao', 'out')
        .not('remetente_id', 'is', null)
        .gte('criado_em', inicio.toISOString())
        .lt('criado_em', fim.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId && enabled,
  });

  // Mensagens recebidas no período (para calcular recebidas por agente)
  const { data: mensagensRecebidas, isLoading: loadingMsgRec } = useQuery({
    queryKey: ['dashboard-agentes-msg-rec', empresaId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensagens_historico')
        .select('conversa_id')
        .eq('empresa_id', empresaId)
        .eq('direcao', 'in')
        .gte('criado_em', inicio.toISOString())
        .lt('criado_em', fim.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId && enabled,
  });

  // Média de atendimentos por agente no período anterior (mantém lógica existente)
  const { data: agentesAnterior } = useQuery({
    queryKey: ['dashboard-agentes', empresaId, periodo, 'anterior'],
    queryFn: async () => {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .in('tipo_usuario', ['opr', 'sup', 'adm']);

      const { data: conversas } = await supabase
        .from('conversas')
        .select('agente_responsavel_id')
        .eq('empresa_id', empresaId)
        .eq('status', 'encerrado')
        .gte('encerrado_em', inicioAnterior.toISOString())
        .lt('encerrado_em', fimAnterior.toISOString());

      const totalAgentes = usuarios?.length || 1;
      const totalConversas = conversas?.length || 0;
      return totalConversas / totalAgentes;
    },
    enabled: !!empresaId,
  });

  const isLoading =
    loadingConversasPeriodo ||
    loadingKpisAnterior ||
    loadingMensagens ||
    loadingUsuariosAgentes ||
    loadingMsgEnv ||
    loadingMsgRec;

  // ======== Derivações em memória a partir de conversasPeriodo ========
  const conversas = (conversasPeriodo || []) as any[];

  // KPIs atuais
  const atendimentosAtual = conversas.length;
  const clientesUnicosAtual = new Set(conversas.map((c) => c.contato_id)).size;

  let totalSegundosTma = 0;
  let conversasComTempoTma = 0;
  conversas.forEach((c) => {
    if (c.encerrado_em && c.created_at) {
      const duracao =
        (new Date(c.encerrado_em).getTime() - new Date(c.created_at).getTime()) / 1000;
      if (duracao > 0) {
        totalSegundosTma += duracao;
        conversasComTempoTma++;
      }
    }
  });
  const tmaSegundosAtual =
    conversasComTempoTma > 0 ? totalSegundosTma / conversasComTempoTma : 0;

  // Contatos por hora
  const contatosPorHoraDerivado = (() => {
    const porHora = new Map<number, number>();
    conversas.forEach((c) => {
      if (!c.created_at) return;
      const hora = new Date(c.created_at).getHours();
      porHora.set(hora, (porHora.get(hora) || 0) + 1);
    });
    return Array.from(porHora.entries()).map(([hora, total]) => ({ hora, total }));
  })();

  // Atendimentos por canal
  const atendimentosPorCanalDerivado = (() => {
    const mapa = new Map<string, number>();
    conversas.forEach((c) => {
      const canal = c.canal || 'whatsapp';
      mapa.set(canal, (mapa.get(canal) || 0) + 1);
    });
    return Array.from(mapa.entries()).map(([name, value]) => ({
      name: name === 'whatsapp' ? 'WhatsApp' : name,
      value,
    }));
  })();

  // Atendimentos por motivo
  const atendimentosPorMotivoDerivado = (() => {
    const mapa = new Map<string, number>();
    conversas.forEach((c: any) => {
      if (!c.motivo_encerramento_id) return;
      const motivo = c.motivos_encerramento?.descricao || 'Não informado';
      mapa.set(motivo, (mapa.get(motivo) || 0) + 1);
    });
    return Array.from(mapa.entries()).map(([name, value]) => ({ name, value }));
  })();

  // Estatísticas por agente
  const agentesData: AgenteStats[] =
    usuariosAgentes && mensagensEnviadas && mensagensRecebidas
      ? (usuariosAgentes as any[]).map((u) => {
          const conversasDoAgente = conversas.filter(
            (c) => c.agente_responsavel_id === u.id,
          );
          const atendimentos = conversasDoAgente.length;

          const diasSet = new Set(
            conversasDoAgente
              .map((c) =>
                c.encerrado_em ? new Date(c.encerrado_em).toDateString() : null,
              )
              .filter(Boolean),
          );
          const dias = diasSet.size || 1;

          const msgEnviadas =
            (mensagensEnviadas as any[]).filter((m) => m.remetente_id === u.id)
              .length || 0;

          const conversasIds = new Set(conversasDoAgente.map((c) => c.id as string));
          const msgRecebidas =
            (mensagensRecebidas as any[]).filter((m) =>
              conversasIds.has(m.conversa_id),
            ).length || 0;

          let totalSegundos = 0;
          let conversasComTempo = 0;
          conversasDoAgente.forEach((c) => {
            if (c.encerrado_em && c.created_at) {
              const duracao =
                (new Date(c.encerrado_em).getTime() -
                  new Date(c.created_at).getTime()) /
                1000;
              if (duracao > 0) {
                totalSegundos += duracao;
                conversasComTempo++;
              }
            }
          });
          const tmaSegundos =
            conversasComTempo > 0 ? totalSegundos / conversasComTempo : 0;

          return {
            id: u.id,
            nome: u.nome,
            atendimentos,
            dias,
            mediaAtendDia:
              dias > 0 ? Math.round((atendimentos / dias) * 10) / 10 : 0,
            msgEnviadas,
            msgRecebidas,
            tma: formatarTMA(tmaSegundos),
          };
        })
      : [];

  // Média de atendimentos por agente (atual e anterior)
  const totalAgentesAtivos = agentesData?.filter((a) => a.atendimentos > 0).length || 1;
  const mediaAtendAgente = (atendimentosAtual || 0) / totalAgentesAtivos;
  const mediaAtendAgenteAnterior = agentesAnterior || 0;

  const stats: DashboardStats = {
    kpis: {
      atendimentos: {
        valor: atendimentosAtual || 0,
        valorAnterior: kpisAnterior?.atendimentos || 0,
        variacao: calcularVariacao(
          atendimentosAtual || 0,
          kpisAnterior?.atendimentos || 0,
        ),
      },
      clientesUnicos: {
        valor: clientesUnicosAtual || 0,
        valorAnterior: kpisAnterior?.clientesUnicos || 0,
        variacao: calcularVariacao(
          clientesUnicosAtual || 0,
          kpisAnterior?.clientesUnicos || 0,
        ),
      },
      msgEnviadas: {
        valor: mensagens?.enviadas || 0,
        valorAnterior: mensagensAnterior?.enviadas || 0,
        variacao: calcularVariacao(
          mensagens?.enviadas || 0,
          mensagensAnterior?.enviadas || 0,
        ),
      },
      msgRecebidas: {
        valor: mensagens?.recebidas || 0,
        valorAnterior: mensagensAnterior?.recebidas || 0,
        variacao: calcularVariacao(
          mensagens?.recebidas || 0,
          mensagensAnterior?.recebidas || 0,
        ),
      },
      mediaAtendAgente: {
        valor: Math.round(mediaAtendAgente * 10) / 10,
        valorAnterior: Math.round(mediaAtendAgenteAnterior * 10) / 10,
        variacao: calcularVariacao(mediaAtendAgente, mediaAtendAgenteAnterior),
      },
      tma: formatarTMA(tmaSegundosAtual || 0),
    },
    contatosPorHora: gerarHorasCompletas(contatosPorHoraDerivado || []),
    atendimentosPorCanal: atendimentosPorCanalDerivado || [],
    atendimentosPorMotivo: atendimentosPorMotivoDerivado || [],
    agentes: agentesData || [],
  };

  return { stats, isLoading };
}
