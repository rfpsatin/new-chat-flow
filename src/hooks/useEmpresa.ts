import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Empresa } from '@/types/atendimento';

export interface EmpresaFormData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  ativo: boolean;
}

export function useEmpresa(empresaId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const empresaQuery = useQuery({
    queryKey: ['empresa-admin', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, cnpj, ativo, created_at')
        .eq('id', empresaId)
        .single();

      if (error) throw error;
      return data as Empresa;
    },
    enabled: !!empresaId,
  });

  const salvarEmpresa = useMutation({
    mutationFn: async (dados: EmpresaFormData) => {
      const { data, error } = await supabase
        .from('empresas')
        .update({
          razao_social: dados.razao_social,
          nome_fantasia: dados.nome_fantasia,
          cnpj: dados.cnpj,
          ativo: dados.ativo,
        })
        .eq('id', empresaId)
        .select('id, razao_social, nome_fantasia, cnpj, ativo, created_at')
        .single();

      if (error) throw error;
      return data as Empresa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-admin', empresaId] });
      toast({
        title: 'Dados da empresa salvos',
        description: 'As informações da empresa foram atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar empresa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    empresa: empresaQuery.data ?? null,
    isLoading: empresaQuery.isLoading,
    salvarEmpresa,
  };
}

