import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ContatosPorHoraChart } from '@/components/dashboard/ContatosPorHoraChart';
import { AtendimentosPorCanalChart } from '@/components/dashboard/AtendimentosPorCanalChart';
import { AtendimentosPorFechamentoChart } from '@/components/dashboard/AtendimentosPorFechamentoChart';
import { AgentesTable } from '@/components/dashboard/AgentesTable';
import { LeadTimeTimelineChart } from '@/components/dashboard/LeadTimeTimelineChart';
import { OpenAtendimentoAgentesTable } from '@/components/dashboard/OpenAtendimentoAgentesTable';
import { CampanhasDashboard } from '@/components/dashboard/CampanhasDashboard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { useDashboardStats, PeriodoFiltro } from '@/hooks/useDashboardStats';
import { useDashboardOpenStats } from '@/hooks/useDashboardOpenStats';
import { useOperadores } from '@/hooks/useUsuarios';
import { useQueryClient } from '@tanstack/react-query';

interface DashboardFilterState {
  periodo: PeriodoFiltro;
  activeTab: 'atendimentos' | 'aberto' | 'campanhas';
  somenteEmAndamento: boolean;
  filaAgenteId: string;
  atendimentoAgenteId: string;
}

type CampanhaPeriodoFiltro = 'todos' | '6meses' | 'mes';

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function DashboardAtendimentosPage() {
  const { empresaId } = useApp();
  const [draftFilters, setDraftFilters] = useState<DashboardFilterState>({
    periodo: 'hoje',
    activeTab: 'atendimentos',
    somenteEmAndamento: true,
    filaAgenteId: 'todos',
    atendimentoAgenteId: 'todos',
  });
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilterState | null>(null);
  const [campanhasDraftFilters, setCampanhasDraftFilters] = useState<{
    periodo: CampanhaPeriodoFiltro;
    tag: string;
  }>({
    periodo: 'todos',
    tag: '',
  });
  const [campanhasAppliedFilters, setCampanhasAppliedFilters] = useState<{
    periodo: CampanhaPeriodoFiltro;
    tag: string;
  } | null>(null);

  const hasAppliedFilters = !!appliedFilters;
  const hasCampanhasAppliedFilters = !!campanhasAppliedFilters;

  const isDirty = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const campanhasIsDirty =
    JSON.stringify(campanhasDraftFilters) !== JSON.stringify(campanhasAppliedFilters);

  const activeFilters = appliedFilters ?? draftFilters;
  const activeCampanhasFilters = campanhasAppliedFilters ?? campanhasDraftFilters;

  const handleTabChange = (tab: 'atendimentos' | 'aberto' | 'campanhas') => {
    setDraftFilters((prev) => ({
      ...prev,
      activeTab: tab,
      periodo: tab === 'atendimentos' && prev.periodo === 'prazo' ? 'hoje' : prev.periodo,
    }));
  };

  const handleApplyFilters = () => {
    if (draftFilters.activeTab === 'campanhas') {
      setCampanhasAppliedFilters(campanhasDraftFilters);
    } else {
      setAppliedFilters(draftFilters);
    }
  };

  const { stats, isLoading } = useDashboardStats(empresaId, activeFilters.periodo, hasAppliedFilters);
  const { data: openStats, isLoading: isLoadingOpen } = useDashboardOpenStats(
    empresaId,
    activeFilters.periodo,
    activeFilters.somenteEmAndamento,
    activeFilters.filaAgenteId === 'todos' ? undefined : activeFilters.filaAgenteId,
    activeFilters.atendimentoAgenteId === 'todos' ? undefined : activeFilters.atendimentoAgenteId,
    hasAppliedFilters
  );
  const { data: agentes } = useOperadores(empresaId, hasAppliedFilters && draftFilters.activeTab === 'aberto');
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    if (!hasAppliedFilters) return;
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-mensagens'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-contatos-hora'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-por-canal'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-por-motivo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-agentes'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-open'] });
    queryClient.invalidateQueries({ queryKey: ['campanhas-stats'] });
  };

  const openCards = useMemo(() => {
    return [
      {
        label: 'Bot',
        count: openStats?.bot.count || 0,
        avg: openStats?.bot.avgWaitSeconds || 0,
      },
      {
        label: 'Triagem',
        count: openStats?.triagem.count || 0,
        avg: openStats?.triagem.avgWaitSeconds || 0,
      },
      {
        label: 'Na fila',
        count: openStats?.fila.count || 0,
        avg: openStats?.fila.avgWaitSeconds || 0,
      },
      {
        label: 'Atendimento',
        count: openStats?.atendimento.count || 0,
        avg: openStats?.atendimento.avgWaitSeconds || 0,
      },
    ];
  }, [openStats]);

  return (
    <MainLayout>
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header com filtros */}
          <DashboardFilters 
            periodo={draftFilters.periodo}
            onPeriodoChange={(periodo) => setDraftFilters((prev) => ({ ...prev, periodo }))}
            onRefresh={handleRefresh}
            onApply={handleApplyFilters}
            isLoading={isLoading}
            hasAppliedFilters={
              draftFilters.activeTab === 'campanhas'
                ? hasCampanhasAppliedFilters
                : hasAppliedFilters
            }
            isDirty={
              draftFilters.activeTab === 'campanhas'
                ? campanhasIsDirty
                : isDirty
            }
            activeTab={draftFilters.activeTab}
            onTabChange={handleTabChange}
            agentes={agentes}
            filaAgenteId={draftFilters.filaAgenteId}
            onFilaAgenteChange={(value) => setDraftFilters((prev) => ({ ...prev, filaAgenteId: value }))}
            atendimentoAgenteId={draftFilters.atendimentoAgenteId}
            onAtendimentoAgenteChange={(value) => setDraftFilters((prev) => ({ ...prev, atendimentoAgenteId: value }))}
            somenteEmAndamento={draftFilters.somenteEmAndamento}
            onSomenteEmAndamentoChange={(value) => setDraftFilters((prev) => ({ ...prev, somenteEmAndamento: value }))}
            campanhaPeriodo={campanhasDraftFilters.periodo}
            onCampanhaPeriodoChange={(periodo) =>
              setCampanhasDraftFilters((prev) => ({ ...prev, periodo }))
            }
            campanhaTag={campanhasDraftFilters.tag}
            onCampanhaTagChange={(tag) =>
              setCampanhasDraftFilters((prev) => ({ ...prev, tag }))
            }
          />

          {((draftFilters.activeTab === 'campanhas' && !hasCampanhasAppliedFilters) ||
            (draftFilters.activeTab !== 'campanhas' && !hasAppliedFilters)) ? (
            <Card className="p-8 text-center text-muted-foreground">
              Defina os filtros e clique em <strong>Aplicar filtros</strong> para carregar os dados do dashboard.
            </Card>
          ) : draftFilters.activeTab === 'atendimentos' ? (
            <>
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
            </>
          ) : draftFilters.activeTab === 'aberto' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {openCards.map((card) => (
                  <Card key={card.label} className="bg-card border-border p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <span className="text-xs text-muted-foreground">Tempo médio</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold text-foreground">{card.count}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(card.avg)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              <LeadTimeTimelineChart
                data={openStats?.leadTimeTimeline || []}
                isLoading={isLoadingOpen}
              />

              <OpenAtendimentoAgentesTable
                agentes={openStats?.agentes || []}
                isLoading={isLoadingOpen}
              />
            </>
          ) : (
            <CampanhasDashboard
              empresaId={empresaId}
              periodo={activeCampanhasFilters.periodo}
              tag={activeCampanhasFilters.tag}
            />
          )}
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
