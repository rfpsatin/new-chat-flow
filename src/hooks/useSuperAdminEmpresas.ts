import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSuperAdminEmpresas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['superadmin-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, cnpj, ativo, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: { razao_social: string; nome_fantasia: string; cnpj: string }) => {
      const { error } = await supabase.from('empresas').insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-empresas'] });
      toast({ title: 'Empresa criada com sucesso' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar empresa', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; razao_social: string; nome_fantasia: string; cnpj: string }) => {
      const { error } = await supabase.from('empresas').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-empresas'] });
      toast({ title: 'Empresa atualizada com sucesso' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar empresa', description: err.message, variant: 'destructive' });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('empresas').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-empresas'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao alterar status', description: err.message, variant: 'destructive' });
    },
  });

  return { ...query, createMutation, updateMutation, toggleAtivoMutation };
}
