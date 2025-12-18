import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const agentes = [
  { 
    nome: 'Luciano', 
    atendimentos: 1, 
    dias: 1, 
    mediaAtendDia: 1.0, 
    msgEnviadas: 3, 
    msgRecebidas: 1, 
    tma: '00:06:33' 
  },
];

export function AgentesTable() {
  return (
    <Card className="p-4 bg-card border-border">
      <h3 className="font-semibold text-foreground mb-4">Agentes</h3>
      
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
            {agentes.map((agente) => (
              <TableRow key={agente.nome} className="border-border">
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
    </Card>
  );
}
