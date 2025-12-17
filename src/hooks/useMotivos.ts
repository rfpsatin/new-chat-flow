import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MotivoEncerramento } from '@/types/atendimento';
import { useToast } from '@/hooks/use-toast';

export interface MotivoFormData {
  descricao: string;
}

export function useMotivos(empresaId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const motivosQuery = useQuery({
    queryKey: ['gestao-motivos', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_encerramento')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('descricao');
      
      if (error) throw error;
      return data as MotivoEncerramento[];
    },
    enabled: !!empresaId,
  });

  const criarMotivo = useMutation({
    mutationFn: async (dados: MotivoFormData) => {
      const { data, error } = await supabase
        .from('motivos_encerramento')
        .insert({
          empresa_id: empresaId,
          descricao: dados.descricao,
          ativo: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-motivos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['motivos', empresaId] });
      toast({
        title: 'Motivo criado',
        description: 'O motivo de encerramento foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar motivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const editarMotivo = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<MotivoFormData> }) => {
      const { data, error } = await supabase
        .from('motivos_encerramento')
        .update(dados)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-motivos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['motivos', empresaId] });
      toast({
        title: 'Motivo atualizado',
        description: 'O motivo foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar motivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAtivoMotivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from('motivos_encerramento')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-motivos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['motivos', empresaId] });
      toast({
        title: data.ativo ? 'Motivo ativado' : 'Motivo desativado',
        description: `O motivo foi ${data.ativo ? 'ativado' : 'desativado'} com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    motivos: motivosQuery.data ?? [],
    isLoading: motivosQuery.isLoading,
    criarMotivo,
    editarMotivo,
    toggleAtivoMotivo,
  };
}
