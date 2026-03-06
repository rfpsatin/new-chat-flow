import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/MainLayout';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ContatosMasterPanel } from '@/components/historico/ContatosMasterPanel';
import { MensagensMultiplasPanel } from '@/components/historico/MensagensMultiplasPanel';
import { 
  useAtendentesComHistorico, 
  useContatosComHistorico, 
  useSessoesAtendente,
  useSessoesContato, 
  useOperadoresHistorico 
} from '@/hooks/useHistorico';
import { FiltrosHistorico, HistoricoConversa, AtendenteComHistorico, ContatoComHistorico } from '@/types/atendimento';

export default function HistoricoPage() {
  const { empresaId } = useApp();
  
  const [filtros, setFiltros] = useState<FiltrosHistorico>({
    busca: '',
    operadorId: null,
    dataInicio: null,
    dataFim: null,
  });

  const [appliedFiltros, setAppliedFiltros] = useState<FiltrosHistorico>({
    busca: '',
    operadorId: null,
    dataInicio: null,
    dataFim: null,
  });

  const [hasApplied, setHasApplied] = useState(false);
  
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null);
  const [sessoesAbertasIds, setSessoesAbertasIds] = useState<string[]>([]);

  // Detectar modo baseado nos filtros - modo atendentes só quando operador selecionado
  const modoAtendentes = !!appliedFiltros.operadorId;

  // Queries
  const { data: atendentes = [], isLoading: loadingAtendentes } = useAtendentesComHistorico(empresaId);
  const { data: contatos = [], isLoading: loadingContatos } = useContatosComHistorico(empresaId, appliedFiltros, hasApplied);
  const { data: sessoesAtendente = [], isLoading: loadingSessoesAtendente } = useSessoesAtendente(
    empresaId, 
    modoAtendentes ? itemSelecionadoId : null, 
    appliedFiltros
  );
  const { data: sessoesContato = [], isLoading: loadingSessoesContato } = useSessoesContato(
    empresaId, 
    !modoAtendentes ? itemSelecionadoId : null, 
    appliedFiltros
  );
  const { data: operadores = [] } = useOperadoresHistorico(empresaId);

  // Dados baseados no modo
  const sessoes = modoAtendentes ? sessoesAtendente : sessoesContato;
  const loadingSessoes = modoAtendentes ? loadingSessoesAtendente : loadingSessoesContato;

  // Item selecionado (atendente ou contato)
  const atendenteSelecionado = useMemo(() => {
    if (!modoAtendentes) return null;
    return atendentes.find((a) => a.agente_id === itemSelecionadoId) || null;
  }, [atendentes, itemSelecionadoId, modoAtendentes]);

  const contatoSelecionado = useMemo(() => {
    if (modoAtendentes) return null;
    return contatos.find((c) => c.contato_id === itemSelecionadoId) || null;
  }, [contatos, itemSelecionadoId, modoAtendentes]);

  // Sessões abertas (objetos completos)
  const sessoesAbertas = useMemo(() => {
    return sessoesAbertasIds
      .map((id) => sessoes.find((s) => s.conversa_id === id))
      .filter((s): s is HistoricoConversa => s !== undefined);
  }, [sessoes, sessoesAbertasIds]);

  const handleSelectItem = (id: string) => {
    setItemSelecionadoId(id);
    setSessoesAbertasIds([]); // Limpar sessões abertas ao trocar de seleção
  };

  const handleFiltrosChange = (novosFiltros: FiltrosHistorico) => {
    const modoAnterior = !!filtros.operadorId;
    const novoModo = !!novosFiltros.operadorId;
    
    // Se mudou de modo, limpar seleção
    if (modoAnterior !== novoModo) {
      setItemSelecionadoId(null);
      setSessoesAbertasIds([]);
    }
    
    setFiltros(novosFiltros);
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
            {modoAtendentes 
              ? 'Visualizando sessões do operador selecionado' 
              : 'Selecione um contato para ver o histórico de conversas'}
          </p>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Painel Master - Atendentes ou Contatos */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <ContatosMasterPanel
              modo={modoAtendentes ? 'atendentes' : 'contatos'}
              atendentes={atendentes}
              contatos={contatos}
              isLoading={modoAtendentes ? loadingAtendentes : loadingContatos}
              itemSelecionadoId={itemSelecionadoId}
              onSelectItem={handleSelectItem}
              filtros={filtros}
              onFiltrosChange={handleFiltrosChange}
              operadores={operadores}
              onAplicar={handleAplicar}
              hasApplied={hasApplied}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Painel de Mensagens Múltiplas */}
          <ResizablePanel defaultSize={70} minSize={60}>
            <MensagensMultiplasPanel
              modo={modoAtendentes ? 'atendentes' : 'contatos'}
              atendente={atendenteSelecionado}
              contato={contatoSelecionado}
              sessoes={sessoes}
              isLoading={loadingSessoes}
              sessoesAbertas={sessoesAbertasIds}
              onToggleSessao={handleToggleSessao}
              onCloseSessao={handleCloseSessao}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </MainLayout>
  );
}
