import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ContatoPorHora {
  hora: string;
  atendimentos: number;
}

interface ContatosPorHoraChartProps {
  data: ContatoPorHora[];
  isLoading?: boolean;
}

const chartConfig = {
  atendimentos: {
    label: 'Atendimentos',
    color: 'hsl(var(--primary))',
  },
};

export function ContatosPorHoraChart({ data, isLoading }: ContatosPorHoraChartProps) {
  if (isLoading) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-[280px] w-full" />
      </Card>
    );
  }

  const temDados = data.some(d => d.atendimentos > 0);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Atendimentos por Hora</h3>
      </div>

      {!temDados ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          Sem dados no período selecionado
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis 
              dataKey="hora" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="atendimentos" fill="var(--color-atendimentos)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-xs text-muted-foreground">Atendimentos</span>
        </div>
      </div>
    </Card>
  );
}
