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
      // 1. Inserir mensagem de pesquisa antes de encerrar
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

      // 2. Atualizar timestamp de pesquisa enviada
      const { error: updateError } = await supabase
        .from('conversas')
        .update({ pesquisa_enviada_em: new Date().toISOString() })
        .eq('id', conversaId);
      
      if (updateError) throw updateError;

      // 3. Encerrar conversa (isso arquiva as mensagens)
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
