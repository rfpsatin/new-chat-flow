import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/MainLayout';
import {
  useCampanhasStatsInfinite,
  useCampanha,
  useCampanhaDestinatarios,
  useCriarCampanha,
  useAgendarCampanha,
  useAdicionarDestinatarios,
  useExcluirCampanha,
  useReagendarErrosCampanha,
} from '@/hooks/useCampanhas';
import { useContatosInfinite } from '@/hooks/useContatos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { addMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Megaphone,
  Plus,
  Send,
  Users,
  Calendar,
  Loader2,
  ChevronRight,
  Tag,
  Info,
  ArrowUpDown,
} from 'lucide-react';
import { Campanha, CampanhaStats, StatusCampanha, Contato } from '@/types/atendimento';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const STATUS_LABEL: Record<StatusCampanha, string> = {
  draft: 'Rascunho',
  agendada: 'Agendada',
  em_execucao: 'Em execução',
  concluida: 'Concluída',
  pausada: 'Pausada',
  erro: 'Erro',
};

export default function CampanhasPage() {
  const { empresaId } = useApp();
  const {
    data: stats,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCampanhasStatsInfinite(empresaId);
  const [selectedCampanhaId, setSelectedCampanhaId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [sortBy, setSortBy] = useState<'oldest' | 'newest' | 'name-asc' | 'name-desc'>('newest');

  const sortedStats = useMemo(() => {
    if (!stats?.length) return [];

    const getDateValue = (c: CampanhaStats) => {
      const source = (c as { created_at?: string }).created_at ?? c.agendado_para ?? c.iniciada_em ?? c.finalizada_em;
      return source ? new Date(source).getTime() : 0;
    };

    return [...stats].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return getDateValue(a) - getDateValue(b);
        case 'newest':
          return getDateValue(b) - getDateValue(a);
        case 'name-asc':
          return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        case 'name-desc':
          return b.nome.localeCompare(a.nome, 'pt-BR', { sensitivity: 'base' });
        default:
          return 0;
      }
    });
  }, [stats, sortBy]);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-7 h-7" />
            Campanhas
          </h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5">
                  <ArrowUpDown className="w-4 h-4" />
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                  Mais antigo → mais recente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('newest')}>
                  Mais recente → mais antigo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('name-asc')}>
                  Nome (A → Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('name-desc')}>
                  Nome (Z → A)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova campanha
            </Button>
            <Button variant="outline" onClick={() => setShowCreateBatch(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Campanhas em lote
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !sortedStats.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma campanha ainda.</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                Criar primeira campanha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedStats.map((s) => (
              <Card
                key={s.campanha_id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedCampanhaId(s.campanha_id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{s.nome}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <Badge variant="secondary">{STATUS_LABEL[s.status]}</Badge>
                        {s.agendado_para && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(s.agendado_para), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span title="Total">{s.total_destinatarios} dest.</span>
                    <span className="text-green-600">{s.enviados} enviados</span>
                    {s.erros > 0 && <span className="text-destructive">{s.erros} erros</span>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {hasNextPage && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Carregar mais campanhas
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCampanhaId && (
        <CampanhaDetailDialog
          campanhaId={selectedCampanhaId}
          onClose={() => setSelectedCampanhaId(null)}
        />
      )}

      {showCreate && (
        <NovaCampanhaWizard
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            toast.success('Campanha criada. Adicione destinatários e agende.');
          }}
        />
      )}
      {showCreateBatch && (
        <NovaCampanhaLoteWizard
          onClose={() => setShowCreateBatch(false)}
          onSuccess={() => {
            setShowCreateBatch(false);
            toast.success('Campanhas em lote criadas.');
          }}
        />
      )}
    </MainLayout>
  );
}

function CampanhaDetailDialog({
  campanhaId,
  onClose,
}: {
  campanhaId: string;
  onClose: () => void;
}) {
  const { data: campanha } = useCampanha(campanhaId);
  const { data: destinatarios } = useCampanhaDestinatarios(campanhaId);
  const agendar = useAgendarCampanha();
  const excluir = useExcluirCampanha();
  const reagendarErros = useReagendarErrosCampanha();
  const [agendadoPara, setAgendadoPara] = useState('');
  const [novoAgendamentoErros, setNovoAgendamentoErros] = useState('');

  const pendentes = destinatarios?.filter((d) => d.status_envio === 'pendente').length ?? 0;
  const enviados = destinatarios?.filter((d) => d.status_envio === 'enviado').length ?? 0;
  const erros = destinatarios?.filter((d) => d.status_envio === 'erro_envio').length ?? 0;

  const handleAgendar = async () => {
    if (!agendadoPara.trim()) return;
    try {
      await agendar.mutateAsync({ campanhaId, agendado_para: new Date(agendadoPara).toISOString() });
      toast.success('Campanha agendada. O disparo será feito no horário definido.');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao agendar');
    }
  };

  const handleExcluir = async () => {
    const total = destinatarios?.length ?? 0;
    if (total > 0) {
      toast.error('Só é possível remover campanhas sem destinatários.');
      return;
    }
    if (!window.confirm('Tem certeza que deseja remover esta campanha?')) {
      return;
    }
    try {
      await excluir.mutateAsync({ id: campanhaId });
      toast.success('Campanha removida.');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover campanha');
    }
  };

  const handleReagendarErros = async () => {
    if (!novoAgendamentoErros.trim()) {
      toast.error('Informe a data e hora para o novo agendamento.');
      return;
    }
    if (erros === 0) {
      toast.error('Não há destinatários com erro para reagendar.');
      return;
    }
    try {
      await reagendarErros.mutateAsync({
        campanhaId,
        agendado_para: new Date(novoAgendamentoErros).toISOString(),
      });
      toast.success('Novo agendamento criado para os destinatários com erro.');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reagendar erros');
    }
  };

  if (!campanha) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>{campanha.nome}</span>
            {(destinatarios?.length ?? 0) === 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExcluir}
                disabled={excluir.isPending}
              >
                {excluir.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Remover campanha'
                )}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Card className="flex-1 min-w-[120px]">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{destinatarios?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total destinatários</p>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[120px]">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[120px]">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-green-600">{enviados}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[120px]">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-destructive">{erros}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">{campanha.mensagem_texto}</p>
          {campanha.status === 'draft' && pendentes > 0 && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Agendar para</label>
                <Input
                  type="datetime-local"
                  value={agendadoPara}
                  onChange={(e) => setAgendadoPara(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAgendar} disabled={!agendadoPara || agendar.isPending}>
                {agendar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Agendar disparo
              </Button>
            </div>
          )}
          {erros > 0 && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">
                  Novo agendamento apenas para os contatos com erro
                </label>
                <Input
                  type="datetime-local"
                  value={novoAgendamentoErros}
                  onChange={(e) => setNovoAgendamentoErros(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                type="button"
                onClick={handleReagendarErros}
                disabled={!novoAgendamentoErros || reagendarErros.isPending}
              >
                {reagendarErros.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Reagendar erros
              </Button>
            </div>
          )}
          <ScrollArea className="h-[220px] rounded-md border p-2">
            <div className="space-y-1">
              {destinatarios?.map((d) => (
                <div
                  key={d.id}
                  className="py-1 border-b border-border/50 last:border-0 text-sm"
                >
                  <div className="flex justify-between items-center">
                    <span>{d.whatsapp_numero}</span>
                    <Badge
                      variant={
                        d.status_envio === 'enviado'
                          ? 'default'
                          : d.status_envio === 'erro_envio'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {d.status_envio}
                    </Badge>
                  </div>
                  {d.status_envio === 'erro_envio' && d.erro_envio_msg && (
                    <p className="mt-0.5 text-xs text-destructive">
                      Motivo: {d.erro_envio_msg}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovaCampanhaWizard({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { empresaId } = useApp();
  const {
    data: contatos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContatosInfinite(empresaId);
  const criar = useCriarCampanha();
  const adicionarDest = useAdicionarDestinatarios();
  const agendar = useAgendarCampanha();

  const [step, setStep] = useState(1);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [mensagemTexto, setMensagemTexto] = useState('');
  const [link, setLink] = useState('');
  const [modoResposta, setModoResposta] = useState<'agente' | 'atendente' | ''>('');
  const [contatoIds, setContatoIds] = useState<Set<string>>(new Set());
  const [agendadoPara, setAgendadoPara] = useState('');

  const toggleContato = (id: string) => {
    setContatoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!nome.trim() || !mensagemTexto.trim() || !modoResposta) {
      toast.error('Preencha nome, mensagem e modo de resposta.');
      return;
    }
    if (contatoIds.size === 0) {
      toast.error('Selecione pelo menos um destinatário para criar a campanha.');
      return;
    }
    try {
      const tags = tagsStr.split(/[\s,]+/).filter(Boolean);
      const campanha = await criar.mutateAsync({
        empresa_id: empresaId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        tags,
        mensagem_texto: mensagemTexto.trim(),
        link: link.trim() || null,
        modo_resposta: modoResposta,
        status: 'draft',
      });
      if (contatoIds.size > 0) {
        await adicionarDest.mutateAsync({
          campanha_id: campanha.id,
          contato_ids: Array.from(contatoIds),
          empresa_id: empresaId,
        });
      }
      if (agendadoPara.trim()) {
        await agendar.mutateAsync({
          campanhaId: campanha.id,
          agendado_para: new Date(agendadoPara).toISOString(),
        });
      }
      toast.success('Campanha criada.');
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar campanha');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Black Friday" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1"><Tag className="w-3 h-3" /> Tags (separadas por vírgula)</label>
                <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="promo, whatsapp" className="mt-1" />
              </div>
              <Button onClick={() => setStep(2)} disabled={!nome.trim()}>Próximo</Button>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label className="text-sm font-medium">Mensagem *</label>
                <textarea
                  value={mensagemTexto}
                  onChange={(e) => setMensagemTexto(e.target.value)}
                  className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Texto que será enviado..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Link (opcional)</label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <label className="text-sm font-medium">Quem irá tratar a resposta *</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[260px]">
                        <p>Define quem continuará a conversa. Ao receber uma resposta do cliente, o atendimento seguirá com Agente ou Atendente, conforme selecionado.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <RadioGroup value={modoResposta} onValueChange={(v) => setModoResposta(v as 'agente' | 'atendente')} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="agente" id="camp-agente" />
                    <Label htmlFor="camp-agente">Agente</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="atendente" id="camp-atendente" />
                    <Label htmlFor="camp-atendente">Atendente</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={!mensagemTexto.trim() || !modoResposta}>Próximo</Button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Selecione os contatos que receberão a mensagem.</p>
              <ScrollArea className="h-[240px] rounded-md border p-2">
                <div className="space-y-1">
                  {(contatos ?? []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContato(c.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between',
                        contatoIds.has(c.id) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      )}
                    >
                      <span>{c.nome || c.whatsapp_numero}</span>
                      {contatoIds.has(c.id) && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                  {hasNextPage && (
                    <div className="pt-2 flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Carregar mais contatos
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div>
                <label className="text-sm font-medium">Agendar disparo (opcional)</label>
                <Input
                  type="datetime-local"
                  value={agendadoPara}
                  onChange={(e) => setAgendadoPara(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                <Button onClick={handleCreate} disabled={criar.isPending || adicionarDest.isPending || agendar.isPending}>
                  {criar.isPending || adicionarDest.isPending || agendar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Criar campanha
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type LotePreview = {
  numero: number;
  nome: string;
  dataHora: string; // datetime-local string
  contatos: Pick<Contato, 'id' | 'nome' | 'whatsapp_numero'>[];
};

function NovaCampanhaLoteWizard({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { empresaId } = useApp();
  const criar = useCriarCampanha();
  const adicionarDest = useAdicionarDestinatarios();
  const agendar = useAgendarCampanha();

  const [step, setStep] = useState<1 | 2>(1);

  // Configuração base
  const [nomeBase, setNomeBase] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [mensagemTexto, setMensagemTexto] = useState('');
  const [link, setLink] = useState('');
  const [modoResposta, setModoResposta] = useState<'agente' | 'atendente' | ''>('');
  const [dataBase, setDataBase] = useState('');
  const [tamanhoLote, setTamanhoLote] = useState(300);
  const [intervaloMinutos, setIntervaloMinutos] = useState(5);

  // Filtros de contatos
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTelefone, setFiltroTelefone] = useState('');
  const [filtroTag, setFiltroTag] = useState('');

  const [loadingContatos, setLoadingContatos] = useState(false);
  const [contatosFonte, setContatosFonte] = useState<Pick<Contato, 'id' | 'nome' | 'whatsapp_numero'>[]>([]);

  // Lotes gerados
  const [lotes, setLotes] = useState<LotePreview[]>([]);
  const [loteSelecionado, setLoteSelecionado] = useState<LotePreview | null>(null);
  const [gerandoCampanhas, setGerandoCampanhas] = useState(false);

  const totalContatosDeduplicados = useMemo(() => {
    const setNums = new Set<string>();
    contatosFonte.forEach((c) => {
      if (c.whatsapp_numero) {
        setNums.add(String(c.whatsapp_numero));
      }
    });
    return setNums.size;
  }, [contatosFonte]);

  const handleBuscarContatos = async () => {
    if (!empresaId) {
      toast.error('Empresa não encontrada na sessão.');
      return;
    }

    setLoadingContatos(true);
    try {
      const pageSize = 1000;
      let from = 0;
      const contatosAcumulados: any[] = [];

      // Paginação manual em blocos de 1000 até varrer todos os contatos que atendem aos filtros.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let query = supabase
          .from('contatos')
          .select('id, nome, whatsapp_numero, tag_origem')
          .eq('empresa_id', empresaId);

        if (filtroNome.trim()) {
          query = query.ilike('nome', `%${filtroNome.trim()}%`);
        }

        if (filtroTelefone.trim()) {
          const digits = filtroTelefone.replace(/\D/g, '');
          if (digits) {
            query = query.ilike('whatsapp_numero', `%${digits}%`);
          }
        }

        if (filtroTag.trim()) {
          query = query.ilike('tag_origem', `%${filtroTag.trim()}%`);
        }

        const { data, error } = await query
          .order('nome', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          toast.error(error.message || 'Erro ao buscar contatos.');
          return;
        }

        const page = (data ?? []).filter(
          (c) => c.whatsapp_numero && String(c.whatsapp_numero).trim(),
        );

        if (!page.length) {
          break;
        }

        contatosAcumulados.push(...page);

        if (page.length < pageSize) {
          break;
        }

        from += pageSize;
      }

      if (!contatosAcumulados.length) {
        toast.error('Nenhum contato encontrado com os filtros informados.');
        setContatosFonte([]);
        return;
      }

      setContatosFonte(
        contatosAcumulados.map((c: any) => ({
          id: c.id as string,
          nome: c.nome as string | null,
          whatsapp_numero: String(c.whatsapp_numero),
        })),
      );
      toast.success(`Encontrados ${contatosAcumulados.length} contato(s) para geração de lotes.`);
    } finally {
      setLoadingContatos(false);
    }
  };

  const handleGerarLotes = () => {
    if (!nomeBase.trim() || !mensagemTexto.trim() || !modoResposta) {
      toast.error('Preencha nome base, mensagem e modo de resposta.');
      return;
    }
    if (!dataBase) {
      toast.error('Informe a data base para agendamento.');
      return;
    }
    if (!contatosFonte.length) {
      toast.error('Busque e selecione contatos antes de gerar os lotes.');
      return;
    }
    if (!tamanhoLote || tamanhoLote <= 0) {
      toast.error('Informe um tamanho de lote válido.');
      return;
    }

    // Deduplicar por telefone
    const mapa = new Map<string, Pick<Contato, 'id' | 'nome' | 'whatsapp_numero'>>();
    contatosFonte.forEach((c) => {
      if (!c.whatsapp_numero) return;
      mapa.set(String(c.whatsapp_numero), c);
    });
    const contatosUnicos = Array.from(mapa.values());

    const maxPorDia = 2000;
    const lotesGerados: LotePreview[] = [];
    const baseDate = new Date(dataBase);
    if (Number.isNaN(baseDate.getTime())) {
      toast.error('Data base inválida.');
      return;
    }

    let diaOffset = 0;
    let contatosNoDia = 0;
    let indiceGlobal = 1;

    for (let i = 0; i < contatosUnicos.length; i += tamanhoLote) {
      const contatosLote = contatosUnicos.slice(i, i + tamanhoLote);

      // Se ultrapassar o limite diário, avança um dia
      if (contatosNoDia + contatosLote.length > maxPorDia) {
        diaOffset += 1;
        contatosNoDia = 0;
      }

      const dia = new Date(baseDate);
      dia.setDate(baseDate.getDate() + diaOffset);

      const indiceNoDia = Math.floor(contatosNoDia / tamanhoLote);
      const dataHoraLote = addMinutes(dia, indiceNoDia * intervaloMinutos);

      lotesGerados.push({
        numero: indiceGlobal,
        nome: `${nomeBase.trim()} - Lote ${indiceGlobal}`,
        dataHora: format(dataHoraLote, "yyyy-MM-dd'T'HH:mm"),
        contatos: contatosLote,
      });

      contatosNoDia += contatosLote.length;
      indiceGlobal += 1;
    }

    setLotes(lotesGerados);
    setStep(2);
  };

  const handleAtualizarLote = (index: number, campo: 'nome' | 'dataHora', valor: string) => {
    setLotes((prev) =>
      prev.map((lote) =>
        lote.numero === index
          ? {
              ...lote,
              [campo]: valor,
            }
          : lote,
      ),
    );
  };

  const handleGerarCampanhas = async () => {
    if (!empresaId) {
      toast.error('Empresa não encontrada na sessão.');
      return;
    }
    if (!lotes.length) {
      toast.error('Nenhum lote gerado.');
      return;
    }

    setGerandoCampanhas(true);
    try {
      const tags = tagsStr.split(/[\s,]+/).filter(Boolean);
      for (const lote of lotes) {
        if (!lote.contatos.length) continue;

        const campanha = await criar.mutateAsync({
          empresa_id: empresaId,
          nome: lote.nome.trim(),
          descricao: descricao.trim() || null,
          tags,
          mensagem_texto: mensagemTexto.trim(),
          link: link.trim() || null,
          modo_resposta: modoResposta,
          status: 'draft',
        });

        const contatoIds = lote.contatos.map((c) => c.id);
        if (contatoIds.length) {
          await adicionarDest.mutateAsync({
            campanha_id: campanha.id,
            contato_ids: contatoIds,
            empresa_id: empresaId,
          });
        }

        if (lote.dataHora) {
          await agendar.mutateAsync({
            campanhaId: campanha.id,
            agendado_para: new Date(lote.dataHora).toISOString(),
          });
        }
      }

      toast.success(`Criadas ${lotes.length} campanhas em lote.`);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar campanhas em lote');
    } finally {
      setGerandoCampanhas(false);
    }
  };

  const handleSimularGeracao = () => {
    if (!lotes.length) {
      toast.error('Nenhum lote gerado para simulação.');
      return;
    }

    const totalCampanhas = lotes.length;
    const totalContatos = lotes.reduce((acc, lote) => acc + lote.contatos.length, 0);

    toast.success(
      `Simulação: seriam criadas ${totalCampanhas} campanhas com ${totalContatos} destinatário(s) no total.`,
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Campanhas em lote</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome base da campanha *</label>
                  <Input
                    value={nomeBase}
                    onChange={(e) => setNomeBase(e.target.value)}
                    placeholder="Ex: Campanha Nissan"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Opcional"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags (separadas por vírgula)
                  </label>
                  <Input
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="promo, whatsapp"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Link (opcional)</label>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Mensagem da campanha *</label>
                <textarea
                  value={mensagemTexto}
                  onChange={(e) => setMensagemTexto(e.target.value)}
                  className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Texto que será enviado..."
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <label className="text-sm font-medium">Quem irá tratar a resposta *</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[260px]">
                        <p>
                          Define quem continuará a conversa. Ao receber uma resposta do cliente, o atendimento
                          seguirá com Agente ou Atendente, conforme selecionado.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <RadioGroup
                  value={modoResposta}
                  onValueChange={(v) => setModoResposta(v as 'agente' | 'atendente')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="agente" id="lote-agente" />
                    <Label htmlFor="lote-agente">Agente</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="atendente" id="lote-atendente" />
                    <Label htmlFor="lote-atendente">Atendente</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Data base para agendamento *</label>
                  <Input
                    type="datetime-local"
                    value={dataBase}
                    onChange={(e) => setDataBase(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contatos por lote *</label>
                  <Input
                    type="number"
                    min={1}
                    value={tamanhoLote}
                    onChange={(e) => setTamanhoLote(Number(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Intervalo entre lotes (minutos) *</label>
                  <Input
                    type="number"
                    min={1}
                    value={intervaloMinutos}
                    onChange={(e) => setIntervaloMinutos(Number(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="rounded-md bg-muted/60 border px-3 py-2 text-xs text-muted-foreground">
                <p>
                  Orientação: recomendamos no máximo <strong>2000 disparos por dia</strong>. Os lotes serão
                  distribuídos automaticamente em dias diferentes para respeitar esse limite, usando o intervalo
                  de tempo configurado entre os lotes.
                </p>
              </div>

              <div className="border rounded-md p-3 space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-sm font-medium">Filtrar por nome</label>
                    <Input
                      value={filtroNome}
                      onChange={(e) => setFiltroNome(e.target.value)}
                      placeholder="Opcional"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-sm font-medium">Filtrar por telefone</label>
                    <Input
                      value={filtroTelefone}
                      onChange={(e) => setFiltroTelefone(e.target.value)}
                      placeholder="Opcional"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-sm font-medium">Filtrar por tag do cadastro</label>
                    <Input
                      value={filtroTag}
                      onChange={(e) => setFiltroTag(e.target.value)}
                      placeholder="Opcional"
                      className="mt-1"
                    />
                  </div>
                  <Button type="button" onClick={handleBuscarContatos} disabled={loadingContatos}>
                    {loadingContatos ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Buscar contatos
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contatos encontrados: {contatosFonte.length} (deduplicados por telefone: {totalContatosDeduplicados})
                </p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleGerarLotes}
                  disabled={!contatosFonte.length || !nomeBase.trim() || !mensagemTexto.trim() || !modoResposta}
                >
                  Gerar lotes
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Lotes gerados</p>
                  <p className="text-xs text-muted-foreground">
                    Total de lotes: {lotes.length} · Total de contatos (deduplicados): {totalContatosDeduplicados}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button type="button" variant="outline" onClick={handleSimularGeracao}>
                    Simular geração
                  </Button>
                  <Button type="button" onClick={handleGerarCampanhas} disabled={gerandoCampanhas}>
                    {gerandoCampanhas ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Gerar campanhas
                  </Button>
                </div>
              </div>

              <div className="flex-1 border rounded-md overflow-hidden">
                <ScrollArea className="h-[320px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 w-[40%]">Nome do lote</th>
                        <th className="text-left px-3 py-2 w-[30%]">Data / hora do disparo</th>
                        <th className="text-right px-3 py-2 w-[15%]">Contatos</th>
                        <th className="text-right px-3 py-2 w-[15%]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.map((lote) => (
                        <tr key={lote.numero} className="border-b last:border-b-0 hover:bg-muted/40">
                          <td className="px-3 py-2 align-middle">
                            <Input
                              value={lote.nome}
                              onChange={(e) => handleAtualizarLote(lote.numero, 'nome', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <Input
                              type="datetime-local"
                              value={lote.dataHora}
                              onChange={(e) => handleAtualizarLote(lote.numero, 'dataHora', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            {lote.contatos.length}
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setLoteSelecionado(lote)}
                            >
                              Ver contatos
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              <div className="rounded-md bg-muted/60 border px-3 py-2 text-xs text-muted-foreground">
                <p>
                  Você pode ajustar manualmente a data/hora e o nome de cada lote. Procure respeitar o limite de
                  aproximadamente <strong>2000 disparos por dia</strong> e evitar colisões de horário entre lotes.
                </p>
              </div>
            </>
          )}

          {loteSelecionado && (
            <Dialog open onOpenChange={() => setLoteSelecionado(null)}>
              <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Contatos do {loteSelecionado.nome}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1">
                  <div className="space-y-1 p-2 text-sm">
                    {loteSelecionado.contatos.map((c) => (
                      <div
                        key={c.id}
                        className="flex justify-between items-center border-b last:border-b-0 py-1"
                      >
                        <span>{c.nome || c.whatsapp_numero}</span>
                        <span className="text-xs text-muted-foreground">{c.whatsapp_numero}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
