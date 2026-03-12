import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MotivoEncerramento } from '@/types/atendimento';

const MENSAGEM_PESQUISA = `📊 *Avalie nosso atendimento!*

Por favor, responda com um número de 1 a 5:

1️⃣ Muito ruim
2️⃣ Ruim  
3️⃣ Regular
4️⃣ Bom
5️⃣ Excelente

Sua opinião é muito importante para nós! 🙏`;

export function useMotivosEncerramento(empresaId: string) {
  return useQuery({
    queryKey: ['motivos-encerramento', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_encerramento')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('descricao');
      
      if (error) throw error;
      return data as MotivoEncerramento[];
    },
  });
}

export function useEncerrarConversa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversaId,
      motivoId,
      usuarioId,
      resumo,
      empresaId,
      contatoId,
      whatsapp_numero,
    }: {
      conversaId: string;
      motivoId: string;
      usuarioId: string;
      resumo?: string;
      empresaId: string;
      contatoId: string;
      whatsapp_numero: string;
    }) => {
      // 1. Enviar mensagem de pesquisa via WhatsApp
      const { error: whapiError } = await supabase.functions.invoke('whapi-send-message', {
        body: {
          empresa_id: empresaId,
          to: whatsapp_numero,
          message: MENSAGEM_PESQUISA,
        },
      });

      if (whapiError) {
        console.error('Erro ao enviar pesquisa via WhatsApp:', whapiError.message);
        // Continuar mesmo se falhar o envio - não bloquear encerramento
      }

      // A mensagem de pesquisa será registrada em mensagens_ativas quando o webhook
      // do Whapi (whapi-webhook) receber o evento from_me=true.

      // 4. Atualizar timestamp de pesquisa enviada
      const { error: updateError } = await supabase
        .from('conversas')
        .update({ pesquisa_enviada_em: new Date().toISOString() })
        .eq('id', conversaId);
      
      if (updateError) throw updateError;

      // 5. Verificar se é conversa do novo webhook n8n (whatsapp_cinemkt) ou do webhook antigo
      // Buscar dados da conversa para verificar origem/channel
      const { data: conversaData, error: conversaDataError } = await supabase
        .from('conversas')
        .select('origem, channel, n8n_webhook_id, human_mode, origem_final')
        .eq('id', conversaId)
        .single();

      const isN8nCinemktConversa = conversaData && (
        conversaData.origem || 
        conversaData.channel || 
        conversaData.n8n_webhook_id || 
        conversaData.human_mode === true || 
        conversaData.origem_final === 'atendente'
      );

      // 5a. Se for conversa do novo webhook n8n, resetar human_mode
      if (isN8nCinemktConversa) {
        try {
          const { error: resetError } = await supabase.functions.invoke('n8n-reset-human-mode', {
            body: {
              conversa_id: conversaId,
              empresa_id: empresaId,
            },
          });

          if (resetError) {
            console.error('Erro ao resetar human_mode no n8n:', resetError.message);
          }
        } catch (resetError) {
          console.error('Erro ao resetar human_mode no n8n:', resetError);
        }
      }

      // 5b. Se for conversa do webhook antigo, chamar close-service (comportamento original)
      if (!isN8nCinemktConversa) {
        try {
          const { error: closeError } = await supabase.functions.invoke('close-service', {
            body: {
              conversa_id: conversaId,
              empresa_id: empresaId,
              chat_id: whatsapp_numero,
            },
          });

          if (closeError) {
            console.error('Erro ao chamar close-service:', closeError.message);
          }
        } catch (closeError) {
          console.error('Erro ao chamar close-service:', closeError);
        }
      }

      // 6. Encerrar conversa (isso arquiva as mensagens)
      const { error } = await supabase.rpc('encerrar_conversa', {
        p_conversa_id: conversaId,
        p_motivo_id: motivoId,
        p_usuario_id: usuarioId,
        p_resumo: resumo || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
      queryClient.invalidateQueries({ queryKey: ['conversa'] });
      queryClient.invalidateQueries({ queryKey: ['mensagens'] });
      queryClient.invalidateQueries({ queryKey: ['historico-contato'] });
    },
  });
}
