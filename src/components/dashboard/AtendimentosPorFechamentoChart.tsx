import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';

const data = [
  { name: 'atendimento', value: 100 },
];

const COLORS = ['hsl(220, 70%, 40%)'];

const chartConfig = {
  atendimento: {
    label: 'Atendimento',
    color: 'hsl(220, 70%, 40%)',
  },
};

export function AtendimentosPorFechamentoChart() {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Atendimentos</h3>
        <Tabs defaultValue="ura" className="w-auto">
          <TabsList className="h-8 bg-muted">
            <TabsTrigger value="ura" className="text-xs h-7 px-3 data-[state=active]:bg-background">
              por filtro da URA
            </TabsTrigger>
            <TabsTrigger value="fechamento" className="text-xs h-7 px-3 data-[state=active]:bg-background">
              por fechamento
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-6">
        <ChartContainer config={chartConfig} className="h-[160px] w-[160px]">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={0}
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
              <span className="text-sm text-muted-foreground">{item.name}</span>
              <span className="text-sm font-medium text-foreground ml-auto">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
