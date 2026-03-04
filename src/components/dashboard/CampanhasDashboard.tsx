import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampanhasStats } from '@/hooks/useCampanhas';
import { Send, MessageCircle } from 'lucide-react';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  scheduled: { label: 'Agendada', variant: 'outline' },
  running: { label: 'Enviando', variant: 'default' },
  completed: { label: 'Finalizada', variant: 'secondary' },
  paused: { label: 'Pausada', variant: 'destructive' },
};

interface CampanhasDashboardProps {
  empresaId: string;
}

export function CampanhasDashboard({ empresaId }: CampanhasDashboardProps) {
  const { data: campanhas, isLoading } = useCampanhasStats(empresaId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-card border-border p-4 flex flex-col gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-6 mt-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!campanhas || campanhas.length === 0) {
    return (
      <Card className="bg-card border-border p-8 text-center">
        <p className="text-muted-foreground">Nenhuma campanha encontrada.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {campanhas.map((c) => {
        const status = statusMap[c.status || ''] || { label: c.status, variant: 'outline' as const };
        return (
          <Card key={c.campanha_id} className="bg-card border-border p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground truncate">{c.nome}</p>
              <Badge variant={status.variant} className="shrink-0 text-[10px]">
                {status.label}
              </Badge>
            </div>

            <div className="flex gap-6 mt-auto">
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
          </Card>
        );
      })}
    </div>
  );
}
