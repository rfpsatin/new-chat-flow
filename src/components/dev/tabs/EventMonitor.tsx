import { useFila } from '@/hooks/useFila';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_OPTIONS } from '../hooks/useDevControls';
import { useApp } from '@/contexts/AppContext';

export function EventMonitor() {
  const { currentUser } = useApp();
  const { data: filaData, isLoading } = useFila(currentUser?.empresa_id || '');

  const statusCounts = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status.value] = filaData?.filter(c => c.status === status.value).length || 0;
    return acc;
  }, {} as Record<string, number>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bot': return 'bg-blue-500/20 text-blue-400';
      case 'esperando_tria': return 'bg-yellow-500/20 text-yellow-400';
      case 'fila_humano': return 'bg-orange-500/20 text-orange-400';
      case 'em_atendimento_humano': return 'bg-green-500/20 text-green-400';
      case 'encerrado': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map((status) => (
          <Card key={status.value} className="p-3">
            <div className="text-xs text-muted-foreground">{status.label}</div>
            <div className="text-2xl font-bold">{statusCounts[status.value]}</div>
          </Card>
        ))}
      </div>

      {/* Lista de Conversas */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Conversas Ativas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 p-4 pt-0">
              {filaData?.map((conversa) => (
                <div
                  key={conversa.conversa_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {conversa.contato_nome || conversa.whatsapp_numero}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {conversa.last_message_at && formatDistanceToNow(new Date(conversa.last_message_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                  <Badge className={getStatusColor(conversa.status || '')}>
                    {conversa.status}
                  </Badge>
                </div>
              ))}
              {(!filaData || filaData.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma conversa encontrada
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
