import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AcompanhamentoRow =
  Database['public']['Functions']['get_acompanhamento_mensagens']['Returns'][number];

interface Params {
  dataInicio: Date;
  dataFim: Date;
}

export function useSuperAdminAcompanhamentoMensagens() {
  return useMutation<AcompanhamentoRow[], Error, Params>({
    mutationFn: async ({ dataInicio, dataFim }) => {
      const { data, error } = await supabase.rpc('get_acompanhamento_mensagens', {
        p_data_inicio: dataInicio.toISOString(),
        p_data_fim: dataFim.toISOString(),
      });

      if (error) {
        throw new Error(error.message || 'Falha ao carregar acompanhamento de mensagens');
      }

      return data ?? [];
    },
  });
}

