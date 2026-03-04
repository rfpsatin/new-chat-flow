import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Usuario } from '@/types/atendimento';
import { useToast } from '@/hooks/use-toast';

export interface UsuarioFormData {
  nome: string;
  email: string;
  tipo_usuario: 'sup' | 'opr';
  senha?: string; // Required on create, optional on edit
}

// Lógica automática: operador = atendente, supervisor = triagem
function derivarAtendente(tipoUsuario: 'sup' | 'opr') {
  const ehAtendente = tipoUsuario === 'opr' || tipoUsuario === 'sup';
  const paraTriagem = tipoUsuario === 'sup';
  return { ehAtendente, paraTriagem };
}

interface Atendente {
  id: string;
  usuario_id: string;
  nome: string;
  para_triagem: boolean;
  ativo: boolean;
}

interface UsuarioComAtendente extends Usuario {
  atendente?: Atendente | null;
}

export function useGestaoUsuarios(empresaId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar usuários com info de atendente
  const usuariosQuery = useQuery({
    queryKey: ['gestao-usuarios', empresaId],
    queryFn: async () => {
      // Buscar usuários
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .in('tipo_usuario', ['sup', 'opr'])
        .order('nome');
      
      if (usuariosError) throw usuariosError;
      
      // Buscar atendentes
      const { data: atendentes, error: atendentesError } = await supabase
        .from('atendentes')
        .select('*')
        .eq('empresa_id', empresaId);
      
      if (atendentesError) throw atendentesError;
      
      // Mapear atendentes por usuario_id
      const atendentesMap = new Map<string, Atendente>();
      atendentes?.forEach(a => {
        atendentesMap.set(a.usuario_id, a as Atendente);
      });
      
      // Combinar dados
      const usuariosComAtendente: UsuarioComAtendente[] = (usuarios ?? []).map(u => ({
        ...u as Usuario,
        atendente: atendentesMap.get(u.id) || null,
      }));
      
      return usuariosComAtendente;
    },
    enabled: !!empresaId,
  });

  const criarUsuario = useMutation({
    mutationFn: async (dados: UsuarioFormData) => {
      if (!dados.senha) throw new Error('Senha é obrigatória para criar um usuário');

      const { ehAtendente, paraTriagem } = derivarAtendente(dados.tipo_usuario);
      
      // Create Auth user via edge function
      const { data: authResult, error: authError } = await supabase.functions.invoke('create-user-auth', {
        body: { email: dados.email, password: dados.senha },
      });

      if (authError) throw new Error(authError.message || 'Erro ao criar conta de autenticação');
      if (authResult?.error) throw new Error(authResult.error);

      const authUserId = authResult.auth_user_id;

      // Criar usuário
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .insert({
          empresa_id: empresaId,
          nome: dados.nome,
          email: dados.email,
          tipo_usuario: dados.tipo_usuario,
          auth_user_id: authUserId,
          ativo: true,
        })
        .select()
        .single();
      
      if (usuarioError) throw usuarioError;
      
      // Criar atendente automaticamente para operadores e supervisores
      if (ehAtendente && usuario) {
        const { error: atendenteError } = await supabase
          .from('atendentes')
          .insert({
            empresa_id: empresaId,
            usuario_id: usuario.id,
            nome: dados.nome,
            para_triagem: paraTriagem,
            ativo: true,
          });
        
        if (atendenteError) throw atendenteError;
      }
      
      return usuario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['atendentes', empresaId] });
      toast({
        title: 'Usuário criado',
        description: 'O usuário foi criado com sucesso. Ele pode fazer login com o email e senha definidos.',
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
      // Atualizar usuário
      const updateData: Record<string, unknown> = {};
      if (dados.nome !== undefined) updateData.nome = dados.nome;
      if (dados.email !== undefined) updateData.email = dados.email;
      if (dados.tipo_usuario !== undefined) updateData.tipo_usuario = dados.tipo_usuario;
      
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (usuarioError) throw usuarioError;
      
      // Derivar atendente do tipo de usuário
      const tipoUsuario = dados.tipo_usuario ?? usuario.tipo_usuario;
      const { ehAtendente, paraTriagem } = derivarAtendente(tipoUsuario as 'sup' | 'opr');
      
      // Verificar se já existe atendente
      const { data: atendenteExistente } = await supabase
        .from('atendentes')
        .select('id')
        .eq('usuario_id', id)
        .eq('empresa_id', empresaId)
        .maybeSingle();
      
      if (ehAtendente) {
        if (atendenteExistente) {
          // Atualizar atendente existente
          const { error: atendenteError } = await supabase
            .from('atendentes')
            .update({
              nome: dados.nome ?? usuario.nome,
              para_triagem: paraTriagem,
              ativo: true,
            })
            .eq('id', atendenteExistente.id);
          
          if (atendenteError) throw atendenteError;
        } else {
          // Criar novo atendente
          const { error: atendenteError } = await supabase
            .from('atendentes')
            .insert({
              empresa_id: empresaId,
              usuario_id: id,
              nome: dados.nome ?? usuario.nome,
              para_triagem: paraTriagem,
              ativo: true,
            });
          
          if (atendenteError) throw atendenteError;
        }
      }
      
      return usuario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['atendentes', empresaId] });
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
      // Atualizar status do usuário
      const { data, error } = await supabase
        .from('usuarios')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Sincronizar status com atendente se existir
      await supabase
        .from('atendentes')
        .update({ ativo })
        .eq('usuario_id', id)
        .eq('empresa_id', empresaId);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['atendentes', empresaId] });
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
