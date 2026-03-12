import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { FilaPanel } from '@/components/FilaPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { useApp } from '@/contexts/AppContext';
import { useEmpresa } from '@/hooks/useEmpresa';
import { FilaAtendimento } from '@/types/atendimento';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function FilaPage() {
  const [searchParams] = useSearchParams();
  const openConversaId = searchParams.get('conversa_id');
  const [selectedConversa, setSelectedConversa] = useState<FilaAtendimento | null>(null);
  const { empresaId } = useApp();
  const { empresa } = useEmpresa(empresaId);
  const queryClient = useQueryClient();

  const handleRefreshFila = () => {
    if (!empresaId) return;
    queryClient.invalidateQueries({ queryKey: ['fila', empresaId] });
  };

  return (
    <MainLayout>
      <div className="flex h-full min-h-0">
        <div className="w-[380px] border-r bg-card flex flex-col">
          <div className="p-4 border-b flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-lg">Fila de Atendimento</h2>
              <p className="text-sm text-muted-foreground">
                Conversas aguardando ou em andamento
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefreshFila}
              title="Recarregar fila"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 relative">
            <FilaPanel
              onSelectConversa={setSelectedConversa}
              selectedConversaId={selectedConversa?.conversa_id || null}
              openConversaId={openConversaId}
              tipoAtendimentoEmpresa={empresa?.tipo_atendimento ?? null}
            />
          </div>
        </div>
        <div className="flex-1 relative">
          <ChatPanel conversa={selectedConversa} />
        </div>
      </div>
    </MainLayout>
  );
}
