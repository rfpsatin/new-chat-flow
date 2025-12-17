import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HistoricoConversa } from '@/types/atendimento';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Calendar, MessageSquare, Clock } from 'lucide-react';
import { HistoricoMensagensDialog } from '@/components/HistoricoMensagensDialog';

export default function HistoricoPage() {
  const { empresaId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversa, setSelectedConversa] = useState<HistoricoConversa | null>(null);

  const { data: historico, isLoading } = useQuery({
    queryKey: ['historico-geral', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_historico_conversas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('iniciado_em', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as HistoricoConversa[];
    },
  });

  return (
    <MainLayout>
      <div className="p-6 h-full overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Histórico de Atendimentos</h1>
            <p className="text-muted-foreground">
              Visualize todas as conversas encerradas
            </p>
          </div>
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no histórico..."
              className="pl-9"
            />
          </div>
          
          {historico && historico.length > 0 ? (
            <div className="grid gap-4">
              {historico.map(item => (
                <Card 
                  key={item.conversa_id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedConversa(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(item.iniciado_em), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {item.resumo && (
                          <p className="text-sm text-foreground line-clamp-2 mt-2">
                            {item.resumo}
                          </p>
                        )}
                      </div>
                      {item.motivo_encerramento && (
                        <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground shrink-0">
                          {item.motivo_encerramento}
                        </span>
                      )}
                    </div>
                    {item.encerrado_em && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                        <Clock className="w-3 h-3" />
                        <span>
                          Encerrado em {format(new Date(item.encerrado_em), 'HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-1">
                Nenhum histórico
              </h3>
              <p className="text-sm text-muted-foreground">
                Os atendimentos encerrados aparecerão aqui
              </p>
            </div>
          )}
        </div>
      </div>
      
      {selectedConversa && (
        <HistoricoMensagensDialog
          conversa={selectedConversa}
          onClose={() => setSelectedConversa(null)}
        />
      )}
    </MainLayout>
  );
}
