import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SimularBotParams {
  conversaId: string;
  conteudo: string;
}

export function useSimularBot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversaId, conteudo }: SimularBotParams) => {
      // Get conversa details
      const { data: conversa, error: conversaError } = await supabase
        .from('conversas')
        .select('contato_id, empresa_id')
        .eq('id', conversaId)
        .single();

      if (conversaError || !conversa) {
        throw new Error('Conversa não encontrada');
      }

      // Insert message as bot
      const { error: msgError } = await supabase
        .from('mensagens_ativas')
        .insert({
          conversa_id: conversaId,
          contato_id: conversa.contato_id,
          empresa_id: conversa.empresa_id,
          direcao: 'out',
          tipo_remetente: 'bot',
          conteudo,
        });

      if (msgError) throw msgError;

      // Update last_message_at
      await supabase
        .from('conversas')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversaId);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensagens'] });
      queryClient.invalidateQueries({ queryKey: ['fila'] });
    },
  });
}

export function useTransferirParaHumano() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversaId: string) => {
      const { error } = await supabase.rpc('solicitar_atendimento_humano', {
        p_conversa_id: conversaId,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
    },
  });
}

export const BOT_TEMPLATES = [
  { id: 'saudacao', label: 'Saudação', message: 'Olá! Bem-vindo ao nosso atendimento. Como posso ajudá-lo hoje?' },
  { id: 'menu', label: 'Menu Principal', message: '📋 Menu:\n1. Informações\n2. Suporte\n3. Financeiro\n4. Falar com atendente' },
  { id: 'aguarde', label: 'Aguarde', message: 'Por favor, aguarde um momento enquanto transfiro você para um atendente humano.' },
  { id: 'despedida', label: 'Despedida', message: 'Obrigado pelo contato! Estamos à disposição. Até mais!' },
];
