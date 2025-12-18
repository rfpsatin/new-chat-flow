import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';

export function DashboardFilters() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <Tabs defaultValue="atendimentos" className="w-auto">
        <TabsList className="bg-muted">
          <TabsTrigger value="atendimentos" className="data-[state=active]:bg-background">
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="data-[state=active]:bg-background">
            Integrações
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-3">
        <Select defaultValue="todas">
          <SelectTrigger className="w-[140px] bg-card">
            <SelectValue placeholder="Fila" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as filas</SelectItem>
            <SelectItem value="principal">Principal</SelectItem>
            <SelectItem value="suporte">Suporte</SelectItem>
            <SelectItem value="vendas">Vendas</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="hoje">
          <SelectTrigger className="w-[140px] bg-card">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="ontem">Ontem</SelectItem>
            <SelectItem value="7dias">Últimos 7 dias</SelectItem>
            <SelectItem value="30dias">Últimos 30 dias</SelectItem>
            <SelectItem value="mes">Este mês</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" className="bg-card">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
