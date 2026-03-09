import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useCampanhas, useCampanhasStats } from '@/hooks/useCampanhas';
import { Send, MessageCircle } from 'lucide-react';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  scheduled: { label: 'Agendada', variant: 'outline' },
  agendada: { label: 'Agendada', variant: 'outline' },
  running: { label: 'Enviando', variant: 'default' },
  em_execucao: { label: 'Enviando', variant: 'default' },
  completed: { label: 'Finalizada', variant: 'secondary' },
  concluida: { label: 'Finalizada', variant: 'secondary' },
  paused: { label: 'Pausada', variant: 'destructive' },
  pausada: { label: 'Pausada', variant: 'destructive' },
  erro: { label: 'Erro', variant: 'destructive' },
};

const STATUS_COLORS = [
  'hsl(142, 76%, 36%)',
  'hsl(220, 70%, 50%)',
  'hsl(45, 90%, 50%)',
  'hsl(350, 60%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(200, 60%, 50%)',
];

const BAR_COLORS = {
  enviados: 'hsl(220, 70%, 50%)',
  respostas: 'hsl(142, 76%, 36%)',
};

interface CampanhasDashboardProps {
  empresaId: string;
  periodo?: 'todos' | '6meses' | 'mes';
  tag?: string;
}

export function CampanhasDashboard({ empresaId, periodo = 'todos', tag }: CampanhasDashboardProps) {
  const { data: stats, isLoading } = useCampanhasStats(empresaId);
  const { data: campanhasRaw } = useCampanhas(empresaId);

  const filteredStats = useMemo(() => {
    if (!stats) return [];

    const trimmedTag = (tag || '').trim().toLowerCase();
    const hasTagFilter = trimmedTag.length > 0;
    const hasPeriodoFilter = periodo !== 'todos';

    if (!hasTagFilter && !hasPeriodoFilter) {
      return stats;
    }

    if (!campanhasRaw || campanhasRaw.length === 0) {
      // Sem dados brutos das campanhas, não conseguimos filtrar com segurança
      return stats;
    }

    const now = new Date();
    const allowedIds = new Set<string>();

    campanhasRaw.forEach((campanha) => {
      let ok = true;

      if (hasTagFilter) {
        const tagsArray = campanha.tags || [];
        const matchesTag = tagsArray.some(
          (t) => t.toLowerCase() === trimmedTag
        );
        if (!matchesTag) {
          ok = false;
        }
      }

      if (ok && hasPeriodoFilter) {
        const createdAt = campanha.created_at ? new Date(campanha.created_at) : null;
        if (createdAt) {
          const diffMs = now.getTime() - createdAt.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (periodo === 'mes' && diffDays > 31) {
            ok = false;
          }

          if (periodo === '6meses' && diffDays > 31 * 6) {
            ok = false;
          }
        }
      }

      if (ok) {
        allowedIds.add(campanha.id);
      }
    });

    if (allowedIds.size === 0) {
      return [];
    }

    return stats.filter((s) => allowedIds.has(s.campanha_id));
  }, [stats, campanhasRaw, periodo, tag]);

  const kpis = useMemo(() => {
    if (!filteredStats || filteredStats.length === 0) {
      return { total: 0, enviados: 0, respostas: 0, taxaResposta: '0%', erros: 0, entregues: 0 };
    }
    const total = filteredStats.length;
    const enviados = filteredStats.reduce((s, c) => s + (c.enviados || 0), 0);
    const respostas = filteredStats.reduce((s, c) => s + (c.conversas_abertas || 0), 0);
    const erros = filteredStats.reduce((s, c) => s + (c.erros || 0), 0);
    const entregues = filteredStats.reduce((s, c) => s + (c.entregues || 0), 0);
    const taxa = enviados > 0 ? ((respostas / enviados) * 100).toFixed(1) + '%' : '0%';
    return { total, enviados, respostas, taxaResposta: taxa, erros, entregues };
  }, [filteredStats]);

  const statusData = useMemo(() => {
    if (!filteredStats) return [];
    const map: Record<string, number> = {};
    filteredStats.forEach((c) => {
      const s = statusMap[c.status || '']?.label || c.status || 'Outro';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [campanhas]);

  const barData = useMemo(() => {
    if (!filteredStats) return [];
    return filteredStats
      .filter((c) => (c.enviados || 0) > 0)
      .sort((a, b) => (b.enviados || 0) - (a.enviados || 0))
      .slice(0, 10)
      .map((c) => ({
        nome: (c.nome || '').length > 18 ? (c.nome || '').slice(0, 16) + '…' : c.nome,
        Enviados: c.enviados || 0,
        Respostas: c.conversas_abertas || 0,
      }));
  }, [campanhas]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card border-border p-4 flex flex-col gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><Skeleton className="h-[280px] w-full rounded-lg" /></div>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!filteredStats || filteredStats.length === 0) {
    return (
      <Card className="bg-card border-border p-8 text-center">
        <p className="text-muted-foreground">Nenhuma campanha encontrada.</p>
      </Card>
    );
  }

  const statusChartConfig = statusData.reduce((acc, item, index) => {
    acc[item.name.toLowerCase()] = {
      label: item.name,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const totalStatusItems = statusData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard value={kpis.total} label="Campanhas" />
        <KpiCard value={kpis.enviados} label="Total Enviados" />
        <KpiCard value={kpis.entregues} label="Entregues" />
        <KpiCard value={kpis.respostas} label="Respostas" />
        <KpiCard value={kpis.taxaResposta} label="Taxa de Resposta" />
        <KpiCard value={kpis.erros} label="Erros" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart: Enviados vs Respostas */}
        <Card className="p-4 bg-card border-border lg:col-span-2">
          <h3 className="font-semibold text-foreground mb-4">Enviados vs Respostas por Campanha</h3>
          {barData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de envio
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="Enviados" fill={BAR_COLORS.enviados} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Respostas" fill={BAR_COLORS.respostas} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Pie Chart: Status */}
        <Card className="p-4 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-4">Por Status</h3>
          {statusData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <ChartContainer config={statusChartConfig} className="h-[160px] w-[160px]">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap gap-3 justify-center">
                {statusData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-xs font-medium text-foreground">
                      {totalStatusItems > 0 ? Math.round((item.value / totalStatusItems) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Campaign Cards */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Detalhamento por Campanha</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStats.map((c) => {
            const status = statusMap[c.status || ''] || { label: c.status, variant: 'outline' as const };
            const taxa = (c.enviados || 0) > 0
              ? ((c.conversas_abertas || 0) / (c.enviados || 1) * 100).toFixed(1)
              : '0.0';
            return (
              <Card key={c.campanha_id} className="bg-card border-border p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{c.nome}</p>
                  <Badge variant={status.variant} className="shrink-0 text-[10px]">
                    {status.label}
                  </Badge>
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{c.enviados ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Enviados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{c.conversas_abertas ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Respostas</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 mt-auto">
                  <span>Taxa: {taxa}%</span>
                  <span>Erros: {c.erros ?? 0}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
