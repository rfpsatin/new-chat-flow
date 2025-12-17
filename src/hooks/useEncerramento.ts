import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MotivoEncerramento } from '@/types/atendimento';

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
    }: {
      conversaId: string;
      motivoId: string;
      usuarioId: string;
      resumo?: string;
    }) => {
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
