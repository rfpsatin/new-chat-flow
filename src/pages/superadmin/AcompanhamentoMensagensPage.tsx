import { useState } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { useSuperAdminAcompanhamentoMensagens } from '@/hooks/useSuperAdminAcompanhamentoMensagens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AcompanhamentoMensagensPage() {
  const { toast } = useToast();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const acompanhamentoMutation = useSuperAdminAcompanhamentoMensagens();

  const handleConsultar = async () => {
    if (!dataInicio || !dataFim) {
      toast({
        title: 'Período obrigatório',
        description: 'Informe data de início e fim para consultar.',
        variant: 'destructive',
      });
      return;
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      toast({
        title: 'Datas inválidas',
        description: 'Verifique os valores de início e fim.',
        variant: 'destructive',
      });
      return;
    }

    if (inicio > fim) {
      toast({
        title: 'Período inválido',
        description: 'A data de início não pode ser maior que a data de fim.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await acompanhamentoMutation.mutateAsync({ dataInicio: inicio, dataFim: fim });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao consultar acompanhamento';
      toast({
        title: 'Erro ao consultar',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const rows = acompanhamentoMutation.data ?? [];

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Acompanhamento de Mensagens</h1>
            <p className="text-sm text-muted-foreground">
              Visão consolidada por empresa. As informações só são carregadas quando você clicar em &quot;Atualizar&quot;.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm font-medium">Data início</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1 w-[180px]"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Data fim</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1 w-[180px]"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleConsultar}
              disabled={acompanhamentoMutation.isPending}
              className="min-w-[140px]"
            >
              {acompanhamentoMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Atualizar
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Mensagens recebidas</TableHead>
                <TableHead className="text-right">Conversas fechadas</TableHead>
                <TableHead className="text-right">Em aberto (total)</TableHead>
                <TableHead className="text-right">Bot</TableHead>
                <TableHead className="text-right">Triagem</TableHead>
                <TableHead className="text-right">Fila</TableHead>
                <TableHead className="text-right">Em atendimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acompanhamentoMutation.isPending && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum dado. Informe um período e clique em &quot;Atualizar&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.empresa_id}>
                    <TableCell>{row.empresa_nome ?? row.empresa_id}</TableCell>
                    <TableCell className="text-right">{row.mensagens_recebidas}</TableCell>
                    <TableCell className="text-right">{row.conversas_fechadas}</TableCell>
                    <TableCell className="text-right">{row.em_aberto_total}</TableCell>
                    <TableCell className="text-right">{row.em_aberto_bot}</TableCell>
                    <TableCell className="text-right">{row.em_aberto_triagem}</TableCell>
                    <TableCell className="text-right">{row.em_aberto_fila}</TableCell>
                    <TableCell className="text-right">{row.em_aberto_atendimento}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

