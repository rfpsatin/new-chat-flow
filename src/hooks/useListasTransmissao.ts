import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ListaTransmissao, ListaTransmissaoContato } from '@/types/atendimento';

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

export function useListaTransmissaoContatos(listaId: string | null) {
  return useQuery({
    queryKey: ['lista-transmissao-contatos', listaId],
    queryFn: async () => {
      if (!listaId) return [] as ListaTransmissaoContato[];
      const { data, error } = await sb
        .from('lista_transmissao_contatos')
        .select('id, lista_id, contato_id, whatsapp_numero, created_at, contato:contatos(id, nome)')
        .eq('lista_id', listaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ListaTransmissaoContato[];
    },
    enabled: !!listaId,
  });
}

export function useAdicionarContatoListaTransmissao() {
  const qc = useQueryClient();
  return useMutation<
    ListaTransmissaoContato,
    Error,
    { listaId: string; empresaId: string; telefoneRaw: string }
  >({
    mutationFn: async ({ listaId, empresaId, telefoneRaw }) => {
      const digits = telefoneRaw.replace(/\D/g, '');
      if (!digits) {
        throw new Error('Informe um número de telefone válido.');
      }

      // Busca contato pelo whatsapp_numero exatamente igual; se não achar, tenta por "contém"
      let { data: contato, error } = await supabase
        .from('contatos')
        .select('id, whatsapp_numero, nome')
        .eq('empresa_id', empresaId)
        .eq('whatsapp_numero', digits)
        .maybeSingle();
      if (error) throw error;

      if (!contato) {
        const { data: contatoLike, error: likeErr } = await supabase
          .from('contatos')
          .select('id, whatsapp_numero, nome')
          .eq('empresa_id', empresaId)
          .ilike('whatsapp_numero', `%${digits}%`)
          .limit(1)
          .maybeSingle();
        if (likeErr) throw likeErr;
        contato = contatoLike;
      }

      if (!contato) {
        throw new Error('Nenhum contato encontrado com este número.');
      }

      const { data, error: insertErr } = await sb
        .from('lista_transmissao_contatos')
        .upsert(
          {
            lista_id: listaId,
            contato_id: contato.id,
            whatsapp_numero: String(contato.whatsapp_numero),
          },
          { onConflict: 'lista_id,contato_id' },
        )
        .select('id, lista_id, contato_id, whatsapp_numero, created_at, contato:contatos(id, nome)')
        .single();
      if (insertErr) throw insertErr;
      return data as ListaTransmissaoContato;
    },
    onSuccess: (_, { listaId }) => {
      qc.invalidateQueries({ queryKey: ['lista-transmissao-contatos', listaId] });
    },
  });
}


