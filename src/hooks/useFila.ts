import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FilaAtendimento, Conversa } from '@/types/atendimento';
import { useEffect } from 'react';

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, queryClient]);

  return query;
}

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
