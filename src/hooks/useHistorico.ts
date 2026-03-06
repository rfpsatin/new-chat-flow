import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HistoricoConversa, ContatoComHistorico, AtendenteComHistorico, FiltrosHistorico } from '@/types/atendimento';
import { startOfDay, endOfDay } from 'date-fns';

// Lista atendentes que têm sessões finalizadas
export function useAtendentesComHistorico(empresaId: string) {
  return useQuery({
    queryKey: ['atendentes-historico', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_historico_conversas')
        .select('agente_responsavel_id, agente_nome')
        .eq('empresa_id', empresaId)
        .not('agente_responsavel_id', 'is', null);

      if (error) throw error;

      // Agrupar por agente e contar sessões
      const atendentesMap = new Map<string, AtendenteComHistorico>();
      
      data?.forEach((item) => {
        if (!item.agente_responsavel_id) return;
        
        const existing = atendentesMap.get(item.agente_responsavel_id);
        if (existing) {
          existing.total_sessoes += 1;
        } else {
          atendentesMap.set(item.agente_responsavel_id, {
            agente_id: item.agente_responsavel_id,
            agente_nome: item.agente_nome,
            total_sessoes: 1,
          });
        }
      });

      return Array.from(atendentesMap.values()).sort((a, b) => b.total_sessoes - a.total_sessoes);
    },
    enabled: !!empresaId,
  });
}

// Lista sessões atendidas por um atendente específico
export function useSessoesAtendente(empresaId: string, agenteId: string | null, filtros: FiltrosHistorico) {
  return useQuery({
    queryKey: ['sessoes-atendente', empresaId, agenteId, filtros],
    queryFn: async () => {
      if (!agenteId) return [];

      let query = supabase
        .from('vw_historico_conversas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('agente_responsavel_id', agenteId)
        .order('iniciado_em', { ascending: false });

      // Filtro por período
      if (filtros.dataInicio) {
        query = query.gte('iniciado_em', startOfDay(filtros.dataInicio).toISOString());
      }
      if (filtros.dataFim) {
        query = query.lte('iniciado_em', endOfDay(filtros.dataFim).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HistoricoConversa[];
    },
    enabled: !!empresaId && !!agenteId,
  });
}

// Lista contatos com histórico (usado quando há filtro de busca)
export function useContatosComHistorico(empresaId: string, filtros: FiltrosHistorico, enabled = true) {
  return useQuery({
    queryKey: ['contatos-historico', empresaId, filtros],
    queryFn: async () => {
      let query = supabase
        .from('vw_historico_conversas')
        .select('contato_id, contato_nome, whatsapp_numero, agente_responsavel_id')
        .eq('empresa_id', empresaId);

      if (filtros.busca) {
        query = query.or(`contato_nome.ilike.%${filtros.busca}%,whatsapp_numero.ilike.%${filtros.busca}%`);
      }
      if (filtros.operadorId) {
        query = query.eq('agente_responsavel_id', filtros.operadorId);
      }
      if (filtros.dataInicio) {
        query = query.gte('iniciado_em', startOfDay(filtros.dataInicio).toISOString());
      }
      if (filtros.dataFim) {
        query = query.lte('iniciado_em', endOfDay(filtros.dataFim).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const contatosMap = new Map<string, ContatoComHistorico>();
      data?.forEach((item) => {
        if (!item.contato_id) return;
        const existing = contatosMap.get(item.contato_id);
        if (existing) {
          existing.total_sessoes += 1;
        } else {
          contatosMap.set(item.contato_id, {
            contato_id: item.contato_id,
            contato_nome: item.contato_nome,
            whatsapp_numero: item.whatsapp_numero,
            total_sessoes: 1,
          });
        }
      });

      return Array.from(contatosMap.values()).sort((a, b) => b.total_sessoes - a.total_sessoes);
    },
    enabled: !!empresaId && enabled,
  });
}

// Lista sessões de um contato específico
export function useSessoesContato(empresaId: string, contatoId: string | null, filtros: FiltrosHistorico) {
  return useQuery({
    queryKey: ['sessoes-contato', empresaId, contatoId, filtros],
    queryFn: async () => {
      if (!contatoId) return [];

      let query = supabase
        .from('vw_historico_conversas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('contato_id', contatoId)
        .order('iniciado_em', { ascending: false });

      // Filtro por operador
      if (filtros.operadorId) {
        query = query.eq('agente_responsavel_id', filtros.operadorId);
      }

      // Filtro por período
      if (filtros.dataInicio) {
        query = query.gte('iniciado_em', startOfDay(filtros.dataInicio).toISOString());
      }
      if (filtros.dataFim) {
        query = query.lte('iniciado_em', endOfDay(filtros.dataFim).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HistoricoConversa[];
    },
    enabled: !!empresaId && !!contatoId,
  });
}

export function useMensagensHistorico(conversaId: string | null) {
  return useQuery({
    queryKey: ['mensagens-historico', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];

      const { data, error } = await supabase
        .from('mensagens_historico')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('criado_em', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversaId,
  });
}

export function useOperadoresHistorico(empresaId: string) {
  return useQuery({
    queryKey: ['operadores-historico', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });
}

// Histórico de sessões anteriores de um contato (para contexto no chat)
export function useHistoricoCliente(empresaId: string, contatoId: string | null) {
  return useQuery({
    queryKey: ['historico-cliente', empresaId, contatoId],
    queryFn: async () => {
      if (!contatoId) return [];

      const { data, error } = await supabase
        .from('vw_historico_conversas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('contato_id', contatoId)
        .order('encerrado_em', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as HistoricoConversa[];
    },
    enabled: !!empresaId && !!contatoId,
  });
}
