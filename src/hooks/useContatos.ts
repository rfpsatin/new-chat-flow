import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contato, HistoricoConversa } from '@/types/atendimento';

export function useContatos(empresaId: string) {
  return useQuery({
    queryKey: ['contatos', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (error) throw error;
      return data as Contato[];
    },
    enabled: !!empresaId,
  });
}

export function useContato(contatoId: string | null) {
  return useQuery({
    queryKey: ['contato', contatoId],
    queryFn: async () => {
      if (!contatoId) return null;
      
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .eq('id', contatoId)
        .single();
      
      if (error) throw error;
      return data as Contato;
    },
    enabled: !!contatoId,
  });
}

export function useHistoricoContato(contatoId: string | null) {
  return useQuery({
    queryKey: ['historico-contato', contatoId],
    queryFn: async () => {
      if (!contatoId) return [];
      
      const { data, error } = await supabase
        .from('vw_historico_conversas')
        .select('*')
        .eq('contato_id', contatoId)
        .order('iniciado_em', { ascending: false });
      
      if (error) throw error;
      return data as HistoricoConversa[];
    },
    enabled: !!contatoId,
  });
}
