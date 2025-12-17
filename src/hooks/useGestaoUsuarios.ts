import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Usuario } from '@/types/atendimento';
import { useToast } from '@/hooks/use-toast';

export interface UsuarioFormData {
  nome: string;
  email: string;
  tipo_usuario: 'sup' | 'opr';
}

export function useGestaoUsuarios(empresaId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const usuariosQuery = useQuery({
    queryKey: ['gestao-usuarios', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .in('tipo_usuario', ['sup', 'opr'])
        .order('nome');
      
      if (error) throw error;
      return data as Usuario[];
    },
    enabled: !!empresaId,
  });

  const criarUsuario = useMutation({
    mutationFn: async (dados: UsuarioFormData) => {
      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          empresa_id: empresaId,
          nome: dados.nome,
          email: dados.email,
          tipo_usuario: dados.tipo_usuario,
          ativo: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      toast({
        title: 'Usuário criado',
        description: 'O usuário foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const editarUsuario = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<UsuarioFormData> }) => {
      const { data, error } = await supabase
        .from('usuarios')
        .update(dados)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      toast({
        title: 'Usuário atualizado',
        description: 'O usuário foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAtivoUsuario = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from('usuarios')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      toast({
        title: data.ativo ? 'Usuário ativado' : 'Usuário desativado',
        description: `O usuário foi ${data.ativo ? 'ativado' : 'desativado'} com sucesso.`,
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
    usuarios: usuariosQuery.data ?? [],
    isLoading: usuariosQuery.isLoading,
    criarUsuario,
    editarUsuario,
    toggleAtivoUsuario,
  };
}
