import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface LeadTimePoint {
  dia: string;
  leadTimeSeconds: number;
}

interface LeadTimeTimelineChartProps {
  data: LeadTimePoint[];
  isLoading?: boolean;
}

const chartConfig = {
  leadTimeSeconds: {
    label: 'Lead time médio (s)',
    color: 'hsl(var(--primary))',
  },
};

function formatSeconds(value: number) {
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
}

export function LeadTimeTimelineChart({ data, isLoading }: LeadTimeTimelineChartProps) {
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

  const temDados = data.length > 0;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Lead time por dia</h3>
      </div>

      {!temDados ? (
        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
          Sem dados no período selecionado
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis
              dataKey="dia"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatSeconds(Number(value))}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => formatSeconds(Number(value))} />}
            />
            <Area
              type="monotone"
              dataKey="leadTimeSeconds"
              stroke="var(--color-leadTimeSeconds)"
              fill="var(--color-leadTimeSeconds)"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </Card>
  );
}
