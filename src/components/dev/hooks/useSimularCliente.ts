import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

interface SimularClienteParams {
  conversaId: string;
  conteudo: string;
}

export function useSimularCliente() {
  const queryClient = useQueryClient();
  const { currentUser } = useApp();

  return useMutation({
    mutationFn: async ({ conversaId, conteudo }: SimularClienteParams) => {
      // Get conversa details
      const { data: conversa, error: conversaError } = await supabase
        .from('conversas')
        .select('contato_id, empresa_id')
        .eq('id', conversaId)
        .single();

      if (conversaError || !conversa) {
        throw new Error('Conversa não encontrada');
      }

      // Insert message as client
      const { error: msgError } = await supabase
        .from('mensagens_ativas')
        .insert({
          conversa_id: conversaId,
          contato_id: conversa.contato_id,
          empresa_id: conversa.empresa_id,
          direcao: 'in',
          tipo_remetente: 'cliente',
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

interface ResponderPesquisaParams {
  conversaId: string;
  nota: number;
}

export function useResponderPesquisa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversaId, nota }: ResponderPesquisaParams) => {
      const { error } = await supabase
        .from('conversas')
        .update({
          nota_satisfacao: nota,
          pesquisa_respondida_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversaId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico'] });
    },
  });
}
