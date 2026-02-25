import { useMutation, useQueryClient } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface StartConversationParams {
  empresa_id: string;
  contato_id: string;
  mensagem_inicial: string;
  link?: string;
  remetente_id?: string;
  modo_resposta: 'agente' | 'atendente';
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
      const url = `${SUPABASE_URL}/functions/v1/start-conversation`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao iniciar conversa');
      }
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
