import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AcompanhamentoRow {
  empresa_id: string;
  empresa_nome: string;
  mensagens_recebidas: number;
  conversas_fechadas: number;
  em_aberto_total: number;
  em_aberto_bot: number;
  em_aberto_triagem: number;
  em_aberto_fila: number;
  em_aberto_atendimento: number;
}

interface Params {
  dataInicio: Date;
  dataFim: Date;
}

export function useSuperAdminAcompanhamentoMensagens() {
  return useMutation<AcompanhamentoRow[], Error, Params>({
    mutationFn: async ({ dataInicio, dataFim }) => {
      const { data, error } = await supabase.rpc('get_acompanhamento_mensagens' as any, {
        p_data_inicio: dataInicio.toISOString(),
        p_data_fim: dataFim.toISOString(),
      });

      if (error) {
        throw new Error(error.message || 'Falha ao carregar acompanhamento de mensagens');
      }

      return (data as any) ?? [];
    },
  });
}
