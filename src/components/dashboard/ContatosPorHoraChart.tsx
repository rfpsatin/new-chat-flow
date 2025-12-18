import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

const data = [
  { hora: '00h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '01h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '02h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '03h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '04h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '05h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '06h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '07h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '08h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '09h', chats: 1, chamadas: 0, abandonadas: 0 },
  { hora: '10h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '11h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '12h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '13h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '14h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '15h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '16h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '17h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '18h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '19h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '20h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '21h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '22h', chats: 0, chamadas: 0, abandonadas: 0 },
  { hora: '23h', chats: 0, chamadas: 0, abandonadas: 0 },
];

const chartConfig = {
  chats: {
    label: 'Chats',
    color: 'hsl(var(--primary))',
  },
  chamadas: {
    label: 'Chamadas',
    color: 'hsl(var(--chart-2))',
  },
  abandonadas: {
    label: 'Abandonadas',
    color: 'hsl(var(--destructive))',
  },
};

export function ContatosPorHoraChart() {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Contatos</h3>
        <Tabs defaultValue="hora" className="w-auto">
          <TabsList className="h-8 bg-muted">
            <TabsTrigger value="hora" className="text-xs h-7 px-3 data-[state=active]:bg-background">
              por hora
            </TabsTrigger>
            <TabsTrigger value="dia" className="text-xs h-7 px-3 data-[state=active]:bg-background">
              por dia do mês
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis 
            dataKey="hora" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="chats" fill="var(--color-chats)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="chamadas" fill="var(--color-chamadas)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="abandonadas" fill="var(--color-abandonadas)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-xs text-muted-foreground">Chats</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
          <span className="text-xs text-muted-foreground">Chamadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-destructive" />
          <span className="text-xs text-muted-foreground">Abandonadas</span>
        </div>
      </div>
    </Card>
  );
}
