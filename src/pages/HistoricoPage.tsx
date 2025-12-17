import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/MainLayout';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ContatosMasterPanel } from '@/components/historico/ContatosMasterPanel';
import { SessoesDetailPanel } from '@/components/historico/SessoesDetailPanel';
import { MensagensMultiplasPanel } from '@/components/historico/MensagensMultiplasPanel';
import { useContatosComHistorico, useSessoesContato, useOperadoresHistorico } from '@/hooks/useHistorico';
import { FiltrosHistorico, HistoricoConversa } from '@/types/atendimento';

export default function HistoricoPage() {
  const { empresaId } = useApp();
  
  const [filtros, setFiltros] = useState<FiltrosHistorico>({
    busca: '',
    operadorId: null,
    dataInicio: null,
    dataFim: null,
  });
  
  const [contatoSelecionadoId, setContatoSelecionadoId] = useState<string | null>(null);
  const [sessoesAbertasIds, setSessoesAbertasIds] = useState<string[]>([]);

  // Queries
  const { data: contatos = [], isLoading: loadingContatos } = useContatosComHistorico(empresaId, filtros);
  const { data: sessoes = [], isLoading: loadingSessoes } = useSessoesContato(empresaId, contatoSelecionadoId, filtros);
  const { data: operadores = [] } = useOperadoresHistorico(empresaId);

  // Contato selecionado
  const contatoSelecionado = useMemo(() => {
    return contatos.find((c) => c.contato_id === contatoSelecionadoId) || null;
  }, [contatos, contatoSelecionadoId]);

  // Sessões abertas (objetos completos)
  const sessoesAbertas = useMemo(() => {
    return sessoesAbertasIds
      .map((id) => sessoes.find((s) => s.conversa_id === id))
      .filter((s): s is HistoricoConversa => s !== undefined);
  }, [sessoes, sessoesAbertasIds]);

  const handleSelectContato = (contatoId: string) => {
    setContatoSelecionadoId(contatoId);
    setSessoesAbertasIds([]); // Limpar sessões abertas ao trocar de contato
  };

  const handleToggleSessao = (conversaId: string) => {
    setSessoesAbertasIds((prev) => {
      if (prev.includes(conversaId)) {
        return prev.filter((id) => id !== conversaId);
      }
      // Limitar a 4 sessões abertas
      if (prev.length >= 4) {
        return [...prev.slice(1), conversaId];
      }
      return [...prev, conversaId];
    });
  };

  const handleCloseSessao = (conversaId: string) => {
    setSessoesAbertasIds((prev) => prev.filter((id) => id !== conversaId));
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold">Histórico de Atendimentos</h1>
          <p className="text-sm text-muted-foreground">
            Visualize e pesquise conversas encerradas
          </p>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Painel Master - Contatos */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <ContatosMasterPanel
              contatos={contatos}
              isLoading={loadingContatos}
              contatoSelecionadoId={contatoSelecionadoId}
              onSelectContato={handleSelectContato}
              filtros={filtros}
              onFiltrosChange={setFiltros}
              operadores={operadores}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Painel Detail - Sessões */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <SessoesDetailPanel
              contato={contatoSelecionado}
              sessoes={sessoes}
              isLoading={loadingSessoes}
              sessoesAbertas={sessoesAbertasIds}
              onToggleSessao={handleToggleSessao}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Painel de Mensagens Múltiplas */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <MensagensMultiplasPanel
              sessoes={sessoesAbertas}
              onCloseSessao={handleCloseSessao}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </MainLayout>
  );
}
