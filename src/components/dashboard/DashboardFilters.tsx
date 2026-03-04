import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { PeriodoFiltro } from '@/hooks/useDashboardStats';

interface DashboardFiltersProps {
  periodo: PeriodoFiltro;
  onPeriodoChange: (periodo: PeriodoFiltro) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  activeTab: 'atendimentos' | 'aberto' | 'campanhas';
  onTabChange: (tab: 'atendimentos' | 'aberto' | 'campanhas') => void;
  agentes?: { id: string; nome: string }[];
  filaAgenteId?: string;
  onFilaAgenteChange?: (value: string) => void;
  atendimentoAgenteId?: string;
  onAtendimentoAgenteChange?: (value: string) => void;
  somenteEmAndamento?: boolean;
  onSomenteEmAndamentoChange?: (value: boolean) => void;
}

export function DashboardFilters({
  periodo,
  onPeriodoChange,
  onRefresh,
  isLoading,
  activeTab,
  onTabChange,
  agentes,
  filaAgenteId,
  onFilaAgenteChange,
  atendimentoAgenteId,
  onAtendimentoAgenteChange,
  somenteEmAndamento,
  onSomenteEmAndamentoChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'atendimentos' | 'aberto' | 'campanhas')} className="w-auto">
        <TabsList className="bg-muted">
          <TabsTrigger value="atendimentos" className="data-[state=active]:bg-background">
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="aberto" className="data-[state=active]:bg-background">
            Atendimentos em Aberto
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="data-[state=active]:bg-background">
            Campanhas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab !== 'campanhas' && <div className="flex flex-wrap items-center gap-3">
        {activeTab === 'aberto' && (
          <>
            <div className="flex items-center gap-2">
              <Switch
                checked={!!somenteEmAndamento}
                onCheckedChange={(value) => onSomenteEmAndamentoChange?.(value)}
                id="somente-em-andamento"
              />
              <Label htmlFor="somente-em-andamento" className="text-sm">
                Somente em andamento
              </Label>
            </div>
            <Select value={filaAgenteId || 'todos'} onValueChange={(v) => onFilaAgenteChange?.(v)}>
              <SelectTrigger className="w-[180px] bg-card">
                <SelectValue placeholder="Na fila (todos)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Na fila: todos</SelectItem>
                {agentes?.map((agente) => (
                  <SelectItem key={agente.id} value={agente.id}>
                    {agente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={atendimentoAgenteId || 'todos'} onValueChange={(v) => onAtendimentoAgenteChange?.(v)}>
              <SelectTrigger className="w-[200px] bg-card">
                <SelectValue placeholder="Atendimento (todos)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Atendimento: todos</SelectItem>
                {agentes?.map((agente) => (
                  <SelectItem key={agente.id} value={agente.id}>
                    {agente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
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
          {activeTab === 'aberto' && (
            <SelectItem value="prazo">Em aberto (sem prazo)</SelectItem>
          )}
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
      </div>}
    </div>
  );
}
