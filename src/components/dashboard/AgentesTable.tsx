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
import { AgenteStats } from '@/hooks/useDashboardStats';

interface AgentesTableProps {
  agentes: AgenteStats[];
  isLoading?: boolean;
}

export function AgentesTable({ agentes, isLoading }: AgentesTableProps) {
  if (isLoading) {
    return (
      <Card className="p-4 bg-card border-border">
        <Skeleton className="h-5 w-20 mb-4" />
        <Skeleton className="h-40 w-full" />
      </Card>
    );
  }

  const agentesAtivos = agentes.filter(a => a.atendimentos > 0);

  return (
    <Card className="p-4 bg-card border-border">
      <h3 className="font-semibold text-foreground mb-4">Agentes</h3>
      
      {agentesAtivos.length === 0 ? (
        <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">
          Nenhum agente com atividade no período
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Agente</TableHead>
                <TableHead className="text-muted-foreground font-medium text-center">Atendimentos</TableHead>
                <TableHead className="text-muted-foreground font-medium text-center">Dias</TableHead>
                <TableHead className="text-muted-foreground font-medium text-center">Méd. Atend./Dia</TableHead>
                <TableHead className="text-muted-foreground font-medium text-center">Msg. Enviadas</TableHead>
                <TableHead className="text-muted-foreground font-medium text-center">Msg. Recebidas</TableHead>
                <TableHead className="text-muted-foreground font-medium text-center">TMA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentesAtivos.map((agente) => (
                <TableRow key={agente.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{agente.nome}</TableCell>
                  <TableCell className="text-center text-foreground">{agente.atendimentos}</TableCell>
                  <TableCell className="text-center text-foreground">{agente.dias}</TableCell>
                  <TableCell className="text-center text-foreground">{agente.mediaAtendDia.toFixed(1)}</TableCell>
                  <TableCell className="text-center text-foreground">{agente.msgEnviadas}</TableCell>
                  <TableCell className="text-center text-foreground">{agente.msgRecebidas}</TableCell>
                  <TableCell className="text-center text-foreground">{agente.tma}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
