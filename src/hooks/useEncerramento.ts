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
    }: {
      conversaId: string;
      motivoId: string;
      usuarioId: string;
      resumo?: string;
      empresaId: string;
      contatoId: string;
    }) => {
      // 1. Buscar número do contato para enviar via WhatsApp
      const { data: contato, error: contatoError } = await supabase
        .from('contatos')
        .select('whatsapp_numero')
        .eq('id', contatoId)
        .single();

      if (contatoError || !contato) {
        throw new Error('Não foi possível obter o número do contato');
      }

      // 2. Enviar mensagem de pesquisa via WhatsApp
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const whapiResponse = await fetch(`${supabaseUrl}/functions/v1/whapi-send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          to: contato.whatsapp_numero,
          message: MENSAGEM_PESQUISA,
        }),
      });

      if (!whapiResponse.ok) {
        console.error('Erro ao enviar pesquisa via WhatsApp:', await whapiResponse.text());
        // Continuar mesmo se falhar o envio - não bloquear encerramento
      }

      // 3. Inserir mensagem de pesquisa no banco
      const { error: msgError } = await supabase
        .from('mensagens_ativas')
        .insert({
          empresa_id: empresaId,
          conversa_id: conversaId,
          contato_id: contatoId,
          direcao: 'out',
          tipo_remetente: 'sistema',
          conteudo: MENSAGEM_PESQUISA,
        });
      
      if (msgError) throw msgError;

      // 4. Atualizar timestamp de pesquisa enviada
      const { error: updateError } = await supabase
        .from('conversas')
        .update({ pesquisa_enviada_em: new Date().toISOString() })
        .eq('id', conversaId);
      
      if (updateError) throw updateError;

      // 5. Chamar close-service para atualizar attendanceMode no n8n/Redis
      try {
        const closeResponse = await fetch(`${supabaseUrl}/functions/v1/close-service`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversa_id: conversaId,
            empresa_id: empresaId,
            chat_id: contato.whatsapp_numero,
          }),
        });

        if (!closeResponse.ok) {
          console.error('Erro ao chamar close-service:', await closeResponse.text());
        }
      } catch (closeError) {
        console.error('Erro ao chamar close-service:', closeError);
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
