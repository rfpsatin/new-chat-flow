import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StartConversationParams {
  empresa_id: string;
  contato_id: string;
  mensagem_inicial: string;
  link?: string;
  remetente_id?: string;
  origem_final?: 'agente' | 'atendente';
}

interface StartConversationResult {
  success: boolean;
  conversa_id: string;
  contato_id: string;
  nr_protocolo: string | null;
  is_new_conversa: boolean;
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: StartConversationParams
    ): Promise<StartConversationResult> => {
      const { data, error } = await supabase.functions.invoke('start-conversation', {
        body: params,
      });
      if (error) throw new Error(error.message || 'Falha ao iniciar conversa');
      if (!data.success) {
        throw new Error(data.error || 'Falha ao iniciar conversa');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
      queryClient.invalidateQueries({ queryKey: ['conversa'] });
      queryClient.invalidateQueries({ queryKey: ['historico-contato'] });
    },
  });
}
