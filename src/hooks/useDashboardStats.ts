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

export function useDashboardStats(empresaId: string, periodo: PeriodoFiltro) {
  const { inicio, fim, inicioAnterior, fimAnterior } = getDateRange(periodo);

  // Query principal: KPIs do período atual
  const { data: kpisAtual, isLoading: loadingKpisAtual } = useQuery({
    queryKey: ['dashboard-kpis', empresaId, periodo, 'atual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversas')
        .select('id, contato_id, created_at, encerrado_em')
        .eq('empresa_id', empresaId)
        .eq('status', 'encerrado')
        .gte('encerrado_em', inicio.toISOString())
        .lt('encerrado_em', fim.toISOString());

      if (error) throw error;

      const atendimentos = data?.length || 0;
      const clientesUnicos = new Set(data?.map(c => c.contato_id)).size;
      
      // Calcular TMA
      let totalSegundos = 0;
      let conversasComTempo = 0;
      data?.forEach(c => {
        if (c.encerrado_em && c.created_at) {
          const duracao = (new Date(c.encerrado_em).getTime() - new Date(c.created_at).getTime()) / 1000;
          if (duracao > 0) {
            totalSegundos += duracao;
            conversasComTempo++;
          }
        }
      });
      const tmaSegundos = conversasComTempo > 0 ? totalSegundos / conversasComTempo : 0;

      return { atendimentos, clientesUnicos, tmaSegundos };
    },
    enabled: !!empresaId
  });

  // Query: KPIs do período anterior (para comparação)
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
        clientesUnicos: new Set(data?.map(c => c.contato_id)).size
      };
    },
    enabled: !!empresaId
  });

  // Query: Mensagens (enviadas e recebidas)
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

      const enviadas = data?.filter(m => m.direcao === 'out').length || 0;
      const recebidas = data?.filter(m => m.direcao === 'in').length || 0;
      return { enviadas, recebidas };
    },
    enabled: !!empresaId
  });

  // Query: Mensagens do período anterior
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
        enviadas: data?.filter(m => m.direcao === 'out').length || 0,
        recebidas: data?.filter(m => m.direcao === 'in').length || 0
      };
    },
    enabled: !!empresaId
  });

  // Query: Contatos por hora
  const { data: contatosPorHora, isLoading: loadingContatosHora } = useQuery({
    queryKey: ['dashboard-contatos-hora', empresaId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversas')
        .select('created_at')
        .eq('empresa_id', empresaId)
        .gte('created_at', inicio.toISOString())
        .lt('created_at', fim.toISOString());

      if (error) throw error;

      // Agrupar por hora
      const porHora = new Map<number, number>();
      data?.forEach(c => {
        const hora = new Date(c.created_at).getHours();
        porHora.set(hora, (porHora.get(hora) || 0) + 1);
      });

      return Array.from(porHora.entries()).map(([hora, total]) => ({ hora, total }));
    },
    enabled: !!empresaId
  });

  // Query: Atendimentos por canal
  const { data: porCanal, isLoading: loadingCanal } = useQuery({
    queryKey: ['dashboard-por-canal', empresaId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversas')
        .select('canal')
        .eq('empresa_id', empresaId)
        .eq('status', 'encerrado')
        .gte('encerrado_em', inicio.toISOString())
        .lt('encerrado_em', fim.toISOString());

      if (error) throw error;

      // Agrupar por canal
      const porCanal = new Map<string, number>();
      data?.forEach(c => {
        const canal = c.canal || 'whatsapp';
        porCanal.set(canal, (porCanal.get(canal) || 0) + 1);
      });

      return Array.from(porCanal.entries()).map(([name, value]) => ({ 
        name: name === 'whatsapp' ? 'WhatsApp' : name, 
        value 
      }));
    },
    enabled: !!empresaId
  });

  // Query: Atendimentos por motivo de encerramento
  const { data: porMotivo, isLoading: loadingMotivo } = useQuery({
    queryKey: ['dashboard-por-motivo', empresaId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversas')
        .select(`
          motivo_encerramento_id,
          motivos_encerramento!inner(descricao)
        `)
        .eq('empresa_id', empresaId)
        .eq('status', 'encerrado')
        .not('motivo_encerramento_id', 'is', null)
        .gte('encerrado_em', inicio.toISOString())
        .lt('encerrado_em', fim.toISOString());

      if (error) throw error;

      // Agrupar por motivo
      const porMotivo = new Map<string, number>();
      data?.forEach((c: any) => {
        const motivo = c.motivos_encerramento?.descricao || 'Não informado';
        porMotivo.set(motivo, (porMotivo.get(motivo) || 0) + 1);
      });

      return Array.from(porMotivo.entries()).map(([name, value]) => ({ name, value }));
    },
    enabled: !!empresaId
  });

  // Query: Agentes (operadores e supervisores)
  const { data: agentesData, isLoading: loadingAgentes } = useQuery({
    queryKey: ['dashboard-agentes', empresaId, periodo],
    queryFn: async () => {
      // Buscar usuários operadores/supervisores ativos
      const { data: usuarios, error: errorUsuarios } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .in('tipo_usuario', ['opr', 'sup']);

      if (errorUsuarios) throw errorUsuarios;

      // Buscar conversas encerradas por agente
      const { data: conversasAgentes, error: errorConversas } = await supabase
        .from('conversas')
        .select('agente_responsavel_id, created_at, encerrado_em')
        .eq('empresa_id', empresaId)
        .eq('status', 'encerrado')
        .not('agente_responsavel_id', 'is', null)
        .gte('encerrado_em', inicio.toISOString())
        .lt('encerrado_em', fim.toISOString());

      if (errorConversas) throw errorConversas;

      // Buscar mensagens enviadas por remetente
      const { data: mensagensEnviadas, error: errorMsgEnv } = await supabase
        .from('mensagens_historico')
        .select('remetente_id')
        .eq('empresa_id', empresaId)
        .eq('direcao', 'out')
        .not('remetente_id', 'is', null)
        .gte('criado_em', inicio.toISOString())
        .lt('criado_em', fim.toISOString());

      if (errorMsgEnv) throw errorMsgEnv;

      // Buscar mensagens recebidas nas conversas dos agentes
      const { data: mensagensRecebidas, error: errorMsgRec } = await supabase
        .from('mensagens_historico')
        .select('conversa_id')
        .eq('empresa_id', empresaId)
        .eq('direcao', 'in')
        .gte('criado_em', inicio.toISOString())
        .lt('criado_em', fim.toISOString());

      if (errorMsgRec) throw errorMsgRec;

      // Criar mapa de conversa -> agente
      const conversaAgente = new Map<string, string>();
      conversasAgentes?.forEach(c => {
        if (c.agente_responsavel_id) {
          conversaAgente.set(c.agente_responsavel_id, c.agente_responsavel_id);
        }
      });

      // Calcular estatísticas por agente
      return usuarios?.map(u => {
        const conversasDoAgente = conversasAgentes?.filter(c => c.agente_responsavel_id === u.id) || [];
        const atendimentos = conversasDoAgente.length;
        
        // Dias distintos de encerramento
        const diasSet = new Set(conversasDoAgente.map(c => 
          c.encerrado_em ? new Date(c.encerrado_em).toDateString() : null
        ).filter(Boolean));
        const dias = diasSet.size || 1;
        
        // Mensagens enviadas
        const msgEnviadas = mensagensEnviadas?.filter(m => m.remetente_id === u.id).length || 0;
        
        // Mensagens recebidas (nas conversas do agente) - simplificado
        const conversasIds = new Set(conversasDoAgente.map(c => c.agente_responsavel_id));
        const msgRecebidas = mensagensRecebidas?.filter(m => conversasIds.has(m.conversa_id)).length || 0;
        
        // TMA
        let totalSegundos = 0;
        let conversasComTempo = 0;
        conversasDoAgente.forEach(c => {
          if (c.encerrado_em && c.created_at) {
            const duracao = (new Date(c.encerrado_em).getTime() - new Date(c.created_at).getTime()) / 1000;
            if (duracao > 0) {
              totalSegundos += duracao;
              conversasComTempo++;
            }
          }
        });
        const tmaSegundos = conversasComTempo > 0 ? totalSegundos / conversasComTempo : 0;

        return {
          id: u.id,
          nome: u.nome,
          atendimentos,
          dias,
          mediaAtendDia: dias > 0 ? Math.round((atendimentos / dias) * 10) / 10 : 0,
          msgEnviadas,
          msgRecebidas,
          tma: formatarTMA(tmaSegundos)
        };
      }) || [];
    },
    enabled: !!empresaId
  });

  // Query: Média de atendimentos por agente (período anterior para comparação)
  const { data: agentesAnterior } = useQuery({
    queryKey: ['dashboard-agentes', empresaId, periodo, 'anterior'],
    queryFn: async () => {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .in('tipo_usuario', ['opr', 'sup']);

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
    enabled: !!empresaId
  });

  const isLoading = loadingKpisAtual || loadingKpisAnterior || loadingMensagens || 
                   loadingContatosHora || loadingCanal || loadingMotivo || loadingAgentes;

  // Calcular média de atendimentos por agente
  const totalAgentes = agentesData?.filter(a => a.atendimentos > 0).length || 1;
  const mediaAtendAgente = (kpisAtual?.atendimentos || 0) / totalAgentes;
  const mediaAtendAgenteAnterior = agentesAnterior || 0;

  const stats: DashboardStats = {
    kpis: {
      atendimentos: {
        valor: kpisAtual?.atendimentos || 0,
        valorAnterior: kpisAnterior?.atendimentos || 0,
        variacao: calcularVariacao(kpisAtual?.atendimentos || 0, kpisAnterior?.atendimentos || 0)
      },
      clientesUnicos: {
        valor: kpisAtual?.clientesUnicos || 0,
        valorAnterior: kpisAnterior?.clientesUnicos || 0,
        variacao: calcularVariacao(kpisAtual?.clientesUnicos || 0, kpisAnterior?.clientesUnicos || 0)
      },
      msgEnviadas: {
        valor: mensagens?.enviadas || 0,
        valorAnterior: mensagensAnterior?.enviadas || 0,
        variacao: calcularVariacao(mensagens?.enviadas || 0, mensagensAnterior?.enviadas || 0)
      },
      msgRecebidas: {
        valor: mensagens?.recebidas || 0,
        valorAnterior: mensagensAnterior?.recebidas || 0,
        variacao: calcularVariacao(mensagens?.recebidas || 0, mensagensAnterior?.recebidas || 0)
      },
      mediaAtendAgente: {
        valor: Math.round(mediaAtendAgente * 10) / 10,
        valorAnterior: Math.round(mediaAtendAgenteAnterior * 10) / 10,
        variacao: calcularVariacao(mediaAtendAgente, mediaAtendAgenteAnterior)
      },
      tma: formatarTMA(kpisAtual?.tmaSegundos || 0)
    },
    contatosPorHora: gerarHorasCompletas(contatosPorHora || []),
    atendimentosPorCanal: porCanal || [],
    atendimentosPorMotivo: porMotivo || [],
    agentes: agentesData || []
  };

  return { stats, isLoading };
}
