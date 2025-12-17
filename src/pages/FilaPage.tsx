import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { FilaPanel } from '@/components/FilaPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { FilaAtendimento } from '@/types/atendimento';

export default function FilaPage() {
  const [selectedConversa, setSelectedConversa] = useState<FilaAtendimento | null>(null);

  return (
    <MainLayout>
      <div className="flex h-full min-h-0">
        {/* Left panel - Queue list */}
        <div className="w-[380px] border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Fila de Atendimento</h2>
            <p className="text-sm text-muted-foreground">
              Conversas aguardando ou em andamento
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <FilaPanel
              onSelectConversa={setSelectedConversa}
              selectedConversaId={selectedConversa?.conversa_id || null}
            />
          </div>
        </div>
        
        {/* Right panel - Chat */}
        <div className="flex-1 relative">
          <ChatPanel conversa={selectedConversa} />
        </div>
      </div>
    </MainLayout>
  );
}
