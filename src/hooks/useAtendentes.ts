import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

export interface Atendente {
  id: string;
  empresa_id: string;
  usuario_id: string;
  nome: string;
  para_triagem: boolean;
  ativo: boolean;
  created_at: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo_usuario: string;
  };
}

export interface CreateAtendenteData {
  usuario_id: string;
  nome: string;
  para_triagem: boolean;
}

export interface UpdateAtendenteData {
  id: string;
  nome?: string;
  para_triagem?: boolean;
  ativo?: boolean;
}

export function useAtendentes() {
  const { currentUser } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: atendentes, isLoading, error } = useQuery({
    queryKey: ['atendentes', currentUser?.empresa_id],
    queryFn: async () => {
      if (!currentUser?.empresa_id) return [];

      const { data, error } = await supabase
        .from('atendentes')
        .select(`
          *,
          usuario:usuarios!atendentes_usuario_id_fkey (
            id,
            nome,
            email,
            tipo_usuario
          )
        `)
        .eq('empresa_id', currentUser.empresa_id)
        .order('nome');

      if (error) throw error;
      return data as Atendente[];
    },
    enabled: !!currentUser?.empresa_id,
  });

  const createAtendente = useMutation({
    mutationFn: async (data: CreateAtendenteData) => {
      if (!currentUser?.empresa_id) throw new Error('Empresa não encontrada');

      // Verificar se usuário já é atendente
      const { data: existing } = await supabase
        .from('atendentes')
        .select('id')
        .eq('empresa_id', currentUser.empresa_id)
        .eq('usuario_id', data.usuario_id)
        .single();

      if (existing) {
        throw new Error('Este usuário já está cadastrado como atendente');
      }

      const { data: result, error } = await supabase
        .from('atendentes')
        .insert({
          empresa_id: currentUser.empresa_id,
          usuario_id: data.usuario_id,
          nome: data.nome,
          para_triagem: data.para_triagem,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendentes'] });
      toast({
        title: 'Sucesso',
        description: 'Atendente cadastrado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAtendente = useMutation({
    mutationFn: async ({ id, ...data }: UpdateAtendenteData) => {
      const { data: result, error } = await supabase
        .from('atendentes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendentes'] });
      toast({
        title: 'Sucesso',
        description: 'Atendente atualizado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAtendenteStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data: result, error } = await supabase
        .from('atendentes')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['atendentes'] });
      toast({
        title: 'Sucesso',
        description: variables.ativo ? 'Atendente ativado' : 'Atendente desativado',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    atendentes,
    isLoading,
    error,
    createAtendente,
    updateAtendente,
    toggleAtendenteStatus,
  };
}
