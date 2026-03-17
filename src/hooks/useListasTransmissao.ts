import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ListaTransmissao } from '@/types/atendimento';

const sb = supabase as any;

export function useListasTransmissao(empresaId: string | null) {
  return useQuery({
    queryKey: ['listas-transmissao', empresaId],
    queryFn: async () => {
      if (!empresaId) return [] as ListaTransmissao[];
      const { data, error } = await sb
        .from('listas_transmissao')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ListaTransmissao[];
    },
    enabled: !!empresaId,
  });
}

export function useCriarListaTransmissao() {
  const qc = useQueryClient();
  return useMutation<ListaTransmissao, Error, { empresa_id: string; nome: string; descricao?: string | null }>({
    mutationFn: async ({ empresa_id, nome, descricao }) => {
      const { data, error } = await sb
        .from('listas_transmissao')
        .insert({
          empresa_id,
          nome,
          descricao: descricao ?? null,
          status: 'rascunho',
          provider: 'whapi',
        })
        .select()
        .single();
      if (error) throw error;
      return data as ListaTransmissao;
    },
    onSuccess: (lista) => {
      qc.invalidateQueries({ queryKey: ['listas-transmissao', lista.empresa_id] });
    },
  });
}

