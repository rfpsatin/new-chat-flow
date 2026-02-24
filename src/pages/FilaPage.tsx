import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { FilaPanel } from '@/components/FilaPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { FilaAtendimento } from '@/types/atendimento';

export default function FilaPage() {
  const [searchParams] = useSearchParams();
  const openConversaId = searchParams.get('conversa_id');
  const [selectedConversa, setSelectedConversa] = useState<FilaAtendimento | null>(null);

  return (
    <MainLayout>
      <div className="flex h-full min-h-0">
        <div className="w-[380px] border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Fila de Atendimento</h2>
            <p className="text-sm text-muted-foreground">
              Conversas aguardando ou em andamento
            </p>
          </div>
          <div className="flex-1 relative">
            <FilaPanel
              onSelectConversa={setSelectedConversa}
              selectedConversaId={selectedConversa?.conversa_id || null}
              openConversaId={openConversaId}
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
