import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FilaAtendimento, Conversa } from '@/types/atendimento';
import { useEffect, useMemo } from 'react';

// Retorna contagem de atendimentos ativos por agente
export function useAtendimentosAtivos(empresaId: string) {
  const { data: filaData } = useQuery({
    queryKey: ['fila-ativos', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_fila_atendimento')
        .select('agente_responsavel_id')
        .eq('empresa_id', empresaId)
        .eq('status', 'em_atendimento_humano');
      
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
    refetchInterval: 5000,
  });

  const contagemPorAgente = useMemo(() => {
    const map = new Map<string, number>();
    filaData?.forEach((item) => {
      if (item.agente_responsavel_id) {
        map.set(
          item.agente_responsavel_id,
          (map.get(item.agente_responsavel_id) || 0) + 1
        );
      }
    });
    return map;
  }, [filaData]);

  return contagemPorAgente;
}

export function useFila(empresaId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fila', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_fila_atendimento')
        .select('*')
        .eq('empresa_id', empresaId);
      
      if (error) throw error;
      return data as FilaAtendimento[];
    },
    enabled: !!empresaId,
    refetchInterval: 5000,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('conversas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversas',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['fila', empresaId] });
          queryClient.invalidateQueries({ queryKey: ['conversa'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, queryClient]);

  return query;
}

// Supervisora encaminha conversa para atendente (esperando_tria → fila_humano)
export function useEncaminharAtendente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversaId, agenteId }: { conversaId: string; agenteId: string }) => {
      const { error } = await supabase.rpc('encaminhar_para_atendente', {
        p_conversa_id: conversaId,
        p_agente_id: agenteId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
      queryClient.invalidateQueries({ queryKey: ['conversa'] });
    },
  });
}

// Atendente assume conversa designada para ele (fila_humano → em_atendimento_humano)
export function useAssumirConversa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversaId, agenteId }: { conversaId: string; agenteId: string }) => {
      const { error } = await supabase.rpc('assumir_conversa', {
        p_conversa_id: conversaId,
        p_agente_id: agenteId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
      queryClient.invalidateQueries({ queryKey: ['conversa'] });
    },
  });
}

// Mantido para transferências (quando já está em atendimento)
export function useAtribuirAgente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversaId, agenteId }: { conversaId: string; agenteId: string }) => {
      const { error } = await supabase.rpc('atribuir_agente', {
        p_conversa_id: conversaId,
        p_agente_id: agenteId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
      queryClient.invalidateQueries({ queryKey: ['conversa'] });
    },
  });
}

// Forçar conversa do bot para triagem com human_mode = true
export function useForcarAtendimentoHumano() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversaId: string) => {
      const { error } = await supabase.rpc('forcar_atendimento_humano', {
        p_conversa_id: conversaId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
      queryClient.invalidateQueries({ queryKey: ['conversa'] });
    },
  });
}

export function useConversa(conversaId: string | null) {
  return useQuery({
    queryKey: ['conversa', conversaId],
    queryFn: async () => {
      if (!conversaId) return null;
      
      const { data, error } = await supabase
        .from('conversas')
        .select(`
          *,
          contatos (*)
        `)
        .eq('id', conversaId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversaId,
  });
}
