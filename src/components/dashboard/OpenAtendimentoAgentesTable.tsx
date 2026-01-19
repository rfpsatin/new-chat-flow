import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface OpenAtendimentoAgenteRow {
  id: string;
  nome: string;
  filaCount: number;
  filaAvgSeconds: number;
  atendimentoCount: number;
  atendimentoAvgSeconds: number;
}

interface OpenAtendimentoAgentesTableProps {
  agentes: OpenAtendimentoAgenteRow[];
  isLoading?: boolean;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function OpenAtendimentoAgentesTable({ agentes, isLoading }: OpenAtendimentoAgentesTableProps) {
  if (isLoading) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-[220px] w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Atendimento por atendente</h3>
      </div>
      {agentes.length === 0 ? (
        <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
          Sem dados no período selecionado
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atendente</TableHead>
              <TableHead>Na fila</TableHead>
              <TableHead>Tempo médio na fila</TableHead>
              <TableHead>Em atendimento</TableHead>
              <TableHead>Tempo médio em atendimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentes.map((agente) => (
              <TableRow key={agente.id}>
                <TableCell className="font-medium">{agente.nome}</TableCell>
                <TableCell>{agente.filaCount}</TableCell>
                <TableCell>{formatDuration(agente.filaAvgSeconds)}</TableCell>
                <TableCell>{agente.atendimentoCount}</TableCell>
                <TableCell>{formatDuration(agente.atendimentoAvgSeconds)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
