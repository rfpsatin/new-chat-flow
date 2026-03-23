import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FilaAtendimento } from '@/types/atendimento';
import { useEffect, useMemo } from 'react';
import { usePageVisibility } from '@/hooks/usePageVisibility';

export function useFila(empresaId: string) {
  const queryClient = useQueryClient();
  const isTabVisible = usePageVisibility();

  // Quando a aba estiver visível, fazemos um polling leve (30s) como "heart-beat".
  // Quando a aba estiver em background, confiamos apenas no Realtime + recarregamento manual.
  const refetchInterval = isTabVisible ? 30000 : false;

  const query = useQuery({
    queryKey: ['fila', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_fila_atendimento')
        .select('conversa_id, empresa_id, contato_id, contato_nome, whatsapp_numero, status, last_message_at, created_at, agente_responsavel_id, agente_nome, resumo, origem, channel, nr_protocolo, campanha_id')
        .eq('empresa_id', empresaId);
      
      if (error) throw error;
      return data as FilaAtendimento[];
    },
    enabled: !!empresaId,
    refetchInterval,
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

// Deriva contagem de atendimentos ativos por agente a partir do cache de useFila
// (sem query adicional — reutiliza ['fila', empresaId] que já faz polling a cada 5s)
export function useAtendimentosAtivos(empresaId: string) {
  const { data: filaData } = useFila(empresaId);

  return useMemo(() => {
    const map = new Map<string, number>();
    filaData?.forEach((item) => {
      if (item.status === 'em_atendimento_humano' && item.agente_responsavel_id) {
        map.set(
          item.agente_responsavel_id,
          (map.get(item.agente_responsavel_id) || 0) + 1
        );
      }
    });
    return map;
  }, [filaData]);
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

/** Remove conversas "fantasmas" criadas por campanha cujo envio falhou e não geraram mensagens. */
export function useRemoverConversaCampanhaErro() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { conversaId: string; contatoId: string; campanhaId: string }
  >({
    mutationFn: async ({ conversaId, contatoId, campanhaId }) => {
      // 1) Garante que a conversa existe, é de campanha e está em status de fila/bot
      const { data: conversa, error: convErr } = await supabase
        .from('conversas')
        .select('id, origem_inicial, status, empresa_id')
        .eq('id', conversaId)
        .maybeSingle();
      if (convErr) throw convErr;
      if (!conversa) {
        throw new Error('Conversa não encontrada.');
      }
      if (conversa.origem_inicial !== 'campanha') {
        throw new Error('Conversa não foi originada por campanha.');
      }
      if (!['bot', 'esperando_tria', 'fila_humano'].includes(conversa.status)) {
        throw new Error('Só é possível remover conversas ainda na triagem/fila.');
      }

      // 2) Garante que não há mensagens ativas ou de histórico vinculadas
      const { count: msgsAtivas } = await supabase
        .from('mensagens_ativas')
        .select('id', { count: 'exact', head: true })
        .eq('conversa_id', conversaId);

      const { count: msgsHist } = await supabase
        .from('mensagens_historico')
        .select('id', { count: 'exact', head: true })
        .eq('conversa_id', conversaId);

      if ((msgsAtivas ?? 0) > 0 || (msgsHist ?? 0) > 0) {
        throw new Error('Conversa já possui mensagens e não pode ser removida por este atalho.');
      }

      // 3) Garante que o destinatário da campanha está marcado com erro de envio
      const { count: errosEnvio, error: erroCountErr } = await supabase
        .from('campanha_destinatarios')
        .select('id', { count: 'exact', head: true })
        .eq('campanha_id', campanhaId)
        .eq('contato_id', contatoId)
        .eq('status_envio', 'erro_envio');
      if (erroCountErr) throw erroCountErr;

      const { count: enviosOk, error: okCountErr } = await supabase
        .from('campanha_destinatarios')
        .select('id', { count: 'exact', head: true })
        .eq('campanha_id', campanhaId)
        .eq('contato_id', contatoId)
        .in('status_envio', ['enviado', 'entregue', 'lido']);
      if (okCountErr) throw okCountErr;

      if ((errosEnvio ?? 0) === 0 || (enviosOk ?? 0) > 0) {
        throw new Error('Destinatário não está marcado apenas como erro de envio.');
      }

      // 4) Finalmente remove a conversa
      const { error: delErr } = await supabase
        .from('conversas')
        .delete()
        .eq('id', conversaId);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
      queryClient.invalidateQueries({ queryKey: ['conversa'] });
    },
  });
}
