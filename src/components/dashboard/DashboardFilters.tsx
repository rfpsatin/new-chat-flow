import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { PeriodoFiltro } from '@/hooks/useDashboardStats';

interface DashboardFiltersProps {
  periodo: PeriodoFiltro;
  onPeriodoChange: (periodo: PeriodoFiltro) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function DashboardFilters({ periodo, onPeriodoChange, onRefresh, isLoading }: DashboardFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <Tabs defaultValue="atendimentos" className="w-auto">
        <TabsList className="bg-muted">
          <TabsTrigger value="atendimentos" className="data-[state=active]:bg-background">
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="data-[state=active]:bg-background" disabled>
            Integrações
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-3">
        <Select value={periodo} onValueChange={(v) => onPeriodoChange(v as PeriodoFiltro)}>
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

        <Button 
          variant="outline" 
          size="icon" 
          className="bg-card"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
