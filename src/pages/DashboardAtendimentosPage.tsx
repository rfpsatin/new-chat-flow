import { MainLayout } from '@/components/MainLayout';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ContatosPorHoraChart } from '@/components/dashboard/ContatosPorHoraChart';
import { AtendimentosPorFilaChart } from '@/components/dashboard/AtendimentosPorFilaChart';
import { AtendimentosPorFechamentoChart } from '@/components/dashboard/AtendimentosPorFechamentoChart';
import { AgentesTable } from '@/components/dashboard/AgentesTable';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DashboardAtendimentosPage() {
  return (
    <MainLayout>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header com filtros */}
          <DashboardFilters />

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard 
              value={1} 
              label="Atendimentos" 
              change={-93} 
            />
            <KpiCard 
              value={1} 
              label="Clientes únicos" 
              change={-93}
              showCircle
              circlePercent={100}
            />
            <KpiCard 
              value={12} 
              label="Msg. Enviadas" 
              change={-93} 
            />
            <KpiCard 
              value={7} 
              label="Msg. Recebidas" 
              change={-93} 
            />
            <KpiCard 
              value="1.0" 
              label="Méd. Atend. Agente" 
              change={-79} 
            />
            <KpiCard 
              value="00:06:33" 
              label="TMA" 
            />
          </div>

          {/* Gráficos - Linha 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ContatosPorHoraChart />
            </div>
            <div className="lg:col-span-1">
              <AtendimentosPorFilaChart />
            </div>
          </div>

          {/* Tabela de Agentes */}
          <AgentesTable />

          {/* Gráfico - Linha 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AtendimentosPorFechamentoChart />
          </div>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
