import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';

interface AtendimentoPorMotivo {
  name: string;
  value: number;
}

interface AtendimentosPorFechamentoChartProps {
  data: AtendimentoPorMotivo[];
  isLoading?: boolean;
}

const COLORS = [
  'hsl(142, 70%, 45%)', // Verde - Resolvido
  'hsl(38, 92%, 50%)',  // Laranja - Cliente desistiu
  'hsl(220, 70%, 50%)', // Azul - Transferido
  'hsl(350, 65%, 50%)', // Vermelho - Spam
  'hsl(280, 60%, 50%)', // Roxo
  'hsl(180, 60%, 45%)', // Ciano
];

export function AtendimentosPorFechamentoChart({ data, isLoading }: AtendimentosPorFechamentoChartProps) {
  if (isLoading) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-[160px] w-full" />
      </Card>
    );
  }

  const temDados = data.length > 0 && data.some(d => d.value > 0);
  const total = data.reduce((acc, d) => acc + d.value, 0);

  const chartConfig = data.reduce((acc, item, index) => {
    acc[item.name.toLowerCase().replace(/\s/g, '_')] = {
      label: item.name,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Por Motivo de Encerramento</h3>
      </div>

      {!temDados ? (
        <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
          Sem dados no período selecionado
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <ChartContainer config={chartConfig} className="h-[160px] w-[160px]">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>

          <div className="flex flex-col gap-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                />
                <span className="text-sm text-muted-foreground truncate max-w-[140px]">{item.name}</span>
                <span className="text-sm font-medium text-foreground ml-auto">
                  {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
