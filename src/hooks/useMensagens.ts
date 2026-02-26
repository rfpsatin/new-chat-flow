import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MensagemAtiva } from '@/types/atendimento';
import { useEffect } from 'react';

export function useMensagens(conversaId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mensagens', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      
      const { data, error } = await supabase
        .from('mensagens_ativas')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('criado_em', { ascending: true });
      
      if (error) throw error;
      return data as MensagemAtiva[];
    },
    enabled: !!conversaId,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_ativas',
          filter: `conversa_id=eq.${conversaId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mensagens', conversaId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, queryClient]);

  return query;
}

export function useEnviarMensagem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      empresaId,
      conversaId,
      contato_id,
      conteudo,
      remetenteId,
    }: {
      empresaId: string;
      conversaId: string;
      contato_id: string;
      conteudo: string;
      remetenteId: string;
    }) => {
      // 1. Get contact to retrieve WhatsApp number
      const { data: contato, error: contatoError } = await supabase
        .from('contatos')
        .select('whatsapp_numero')
        .eq('id', contato_id)
        .single();

      if (contatoError || !contato) {
        throw new Error('Contato não encontrado');
      }

      // 2. Send message via Whapi API
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const functionUrl = `${supabaseUrl}/functions/v1/whapi-send-message`;
      
      const whapiResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          to: contato.whatsapp_numero,
          message: conteudo,
        }),
      });

      if (!whapiResponse.ok) {
        const errorData = await whapiResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar mensagem via Whapi');
      }

      // A mensagem será registrada em mensagens_ativas quando o webhook
      // do Whapi (whapi-webhook) receber o evento from_me=true.
    },
    onSuccess: (_, { conversaId }) => {
      queryClient.invalidateQueries({ queryKey: ['mensagens', conversaId] });
      queryClient.invalidateQueries({ queryKey: ['fila'] });
    },
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
