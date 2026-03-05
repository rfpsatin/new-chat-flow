import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Usuario } from '@/types/atendimento';

export function useUsuarios(empresaId: string) {
  return useQuery({
    queryKey: ['usuarios', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as Usuario[];
    },
  });
}

export function useOperadores(empresaId: string, enabled = true) {
  return useQuery({
    queryKey: ['operadores', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .in('tipo_usuario', ['opr', 'sup', 'adm'])
        .order('nome');
      
      if (error) throw error;
      return data as Usuario[];
    },
    enabled: !!empresaId && enabled,
  });
}
