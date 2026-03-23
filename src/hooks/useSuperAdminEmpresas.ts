import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const normalizeCnpj = (value: string) => value.replace(/\D/g, '');

const buildFriendlyErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;

  const maybeSupabaseError = error as { code?: string; message?: string; details?: string };
  if (maybeSupabaseError?.code === '23505') {
    const details = `${maybeSupabaseError.details ?? ''} ${maybeSupabaseError.message ?? ''}`.toLowerCase();
    if (details.includes('cnpj')) return 'Este CNPJ ja esta cadastrado.';
    if (details.includes('email')) return 'Este e-mail ja esta em uso.';
    return 'Registro duplicado. Verifique os dados informados.';
  }

  return 'Nao foi possivel concluir a operacao.';
};

export function useSuperAdminEmpresas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['superadmin-empresas'],
    queryFn: async () => {
      const { data: empresas, error } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, cnpj, ativo, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!empresas?.length) return empresas;

      const empresaIds = empresas.map((empresa) => empresa.id);
      const { data: admins, error: adminsError } = await supabase
        .from('usuarios')
        .select('empresa_id, nome, email, ativo, created_at')
        .in('empresa_id', empresaIds)
        .eq('tipo_usuario', 'adm')
        .order('created_at', { ascending: true });
      if (adminsError) throw adminsError;

      const adminByEmpresa = new Map<string, (typeof admins)[number]>();
      for (const admin of admins ?? []) {
        if (!adminByEmpresa.has(admin.empresa_id)) {
          adminByEmpresa.set(admin.empresa_id, admin);
        }
      }

      return empresas.map((empresa) => {
        const admin = adminByEmpresa.get(empresa.id);
        return {
          ...empresa,
          admin_nome: admin?.nome ?? null,
          admin_email: admin?.email ?? null,
          admin_ativo: admin?.ativo ?? null,
        };
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: { razao_social: string; nome_fantasia: string; cnpj: string; admin_email?: string; admin_senha?: string }) => {
      const { admin_email, admin_senha, ...empresaData } = values;
      const cnpj = normalizeCnpj(empresaData.cnpj);
      const adminEmail = admin_email?.trim().toLowerCase();
      const adminSenha = admin_senha?.trim();

      if (cnpj.length !== 14) {
        throw new Error('Informe um CNPJ valido com 14 digitos.');
      }

      const normalizedData = {
        razao_social: empresaData.razao_social.trim(),
        nome_fantasia: empresaData.nome_fantasia?.trim() || null,
        cnpj,
      };

      if (adminEmail) {
        const { data: existingUser, error: existingUserError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('email', adminEmail)
          .maybeSingle();

        if (existingUserError) throw existingUserError;
        if (existingUser) throw new Error('Este e-mail de admin ja esta cadastrado.');
      }

      const { data: empresa, error } = await supabase.from('empresas').insert(normalizedData).select('id').single();
      if (error) throw error;

      if (adminEmail && adminSenha) {
        try {
          const { data: authData, error: authError } = await supabase.functions.invoke('create-user-auth', {
            body: { email: adminEmail, password: adminSenha },
          });
          if (authError) throw new Error(authError.message || 'Erro ao criar conta auth do admin');
          if (authData?.error) throw new Error(authData.error);

          const nome = adminEmail.split('@')[0];
          const { error: userError } = await supabase.from('usuarios').insert({
            auth_user_id: authData.auth_user_id,
            empresa_id: empresa.id,
            nome,
            email: adminEmail,
            tipo_usuario: 'adm',
          });
          if (userError) throw userError;
        } catch (adminCreationError) {
          // Evita empresa sem admin quando a segunda etapa falhar.
          await supabase.from('empresas').delete().eq('id', empresa.id);
          throw adminCreationError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-empresas'] });
      toast({ title: 'Empresa criada com sucesso' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro ao criar empresa', description: buildFriendlyErrorMessage(error), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; razao_social: string; nome_fantasia: string; cnpj: string }) => {
      const cnpj = normalizeCnpj(values.cnpj);
      if (cnpj.length !== 14) {
        throw new Error('Informe um CNPJ valido com 14 digitos.');
      }

      const { error } = await supabase
        .from('empresas')
        .update({
          razao_social: values.razao_social.trim(),
          nome_fantasia: values.nome_fantasia?.trim() || null,
          cnpj,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-empresas'] });
      toast({ title: 'Empresa atualizada com sucesso' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro ao atualizar empresa', description: buildFriendlyErrorMessage(error), variant: 'destructive' });
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
