import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ContatosPorHoraChart } from '@/components/dashboard/ContatosPorHoraChart';
import { AtendimentosPorCanalChart } from '@/components/dashboard/AtendimentosPorCanalChart';
import { AtendimentosPorFechamentoChart } from '@/components/dashboard/AtendimentosPorFechamentoChart';
import { AgentesTable } from '@/components/dashboard/AgentesTable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/contexts/AppContext';
import { useDashboardStats, PeriodoFiltro } from '@/hooks/useDashboardStats';
import { useQueryClient } from '@tanstack/react-query';

export default function DashboardAtendimentosPage() {
  const { empresaId } = useApp();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoje');
  const { stats, isLoading } = useDashboardStats(empresaId, periodo);
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-mensagens'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-contatos-hora'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-por-canal'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-por-motivo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-agentes'] });
  };

  return (
    <MainLayout>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header com filtros */}
          <DashboardFilters 
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard 
              value={stats.kpis.atendimentos.valor} 
              label="Atendimentos" 
              change={stats.kpis.atendimentos.variacao}
              isLoading={isLoading}
            />
            <KpiCard 
              value={stats.kpis.clientesUnicos.valor} 
              label="Clientes únicos" 
              change={stats.kpis.clientesUnicos.variacao}
              showCircle
              circlePercent={stats.kpis.atendimentos.valor > 0 
                ? Math.round((stats.kpis.clientesUnicos.valor / stats.kpis.atendimentos.valor) * 100) 
                : 100}
              isLoading={isLoading}
            />
            <KpiCard 
              value={stats.kpis.msgEnviadas.valor} 
              label="Msg. Enviadas" 
              change={stats.kpis.msgEnviadas.variacao}
              isLoading={isLoading}
            />
            <KpiCard 
              value={stats.kpis.msgRecebidas.valor} 
              label="Msg. Recebidas" 
              change={stats.kpis.msgRecebidas.variacao}
              isLoading={isLoading}
            />
            <KpiCard 
              value={stats.kpis.mediaAtendAgente.valor} 
              label="Méd. Atend. Agente" 
              change={stats.kpis.mediaAtendAgente.variacao}
              isLoading={isLoading}
            />
            <KpiCard 
              value={stats.kpis.tma} 
              label="TMA"
              isLoading={isLoading}
            />
          </div>

          {/* Gráficos - Linha 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ContatosPorHoraChart 
                data={stats.contatosPorHora}
                isLoading={isLoading}
              />
            </div>
            <div className="lg:col-span-1">
              <AtendimentosPorCanalChart 
                data={stats.atendimentosPorCanal}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Tabela de Agentes */}
          <AgentesTable 
            agentes={stats.agentes}
            isLoading={isLoading}
          />

          {/* Gráfico - Linha 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AtendimentosPorFechamentoChart 
              data={stats.atendimentosPorMotivo}
              isLoading={isLoading}
            />
          </div>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
