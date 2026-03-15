import { useState, useMemo, useEffect } from 'react';
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
  type CampanhasFiltros,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  gerarAgendamentosPorDestinatario,
  type ContatoLote,
  type ConfigAgendamento,
  type AgendamentoGerado,
} from '@/lib/campanhaAgendamento';

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
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTags, setFiltroTags] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroModoResposta, setFiltroModoResposta] = useState<string>('');

  const filtros: CampanhasFiltros = useMemo(() => {
    const f: CampanhasFiltros = {};
    if (filtroNome.trim()) f.nome = filtroNome.trim();
    if (filtroTags.trim()) f.tags = filtroTags.trim();
    if (filtroStatus) f.status = filtroStatus;
    if (filtroModoResposta) f.modo_resposta = filtroModoResposta;
    return f;
  }, [filtroNome, filtroTags, filtroStatus, filtroModoResposta]);

  const {
    data: stats,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCampanhasStatsInfinite(empresaId, filtros);

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

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                placeholder="Filtrar por nome..."
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags
              </Label>
              <Input
                placeholder="Ex: promo, whatsapp"
                value={filtroTags}
                onChange={(e) => setFiltroTags(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filtroStatus || 'all'} onValueChange={(v) => setFiltroStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(Object.entries(STATUS_LABEL) as [StatusCampanha, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quem trata a resposta</Label>
              <Select value={filtroModoResposta || 'all'} onValueChange={(v) => setFiltroModoResposta(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

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

  // Campanhas não enviadas: draft ou agendada e nunca iniciada
  const podeRemover =
    campanha && (campanha.status === 'draft' || campanha.status === 'agendada') && !campanha.iniciada_em;

  useEffect(() => {
    if (!campanha) return;
    if (campanha.status === 'draft' || campanha.status === 'agendada') {
      const para = campanha.agendado_para
        ? format(new Date(campanha.agendado_para), "yyyy-MM-dd'T'HH:mm")
        : '';
      setAgendadoPara(para);
    }
  }, [campanha?.id, campanha?.status, campanha?.agendado_para]);

  const handleAgendar = async () => {
    if (!agendadoPara.trim()) return;
    try {
      await agendar.mutateAsync({ campanhaId, agendado_para: new Date(agendadoPara).toISOString() });
      toast.success(
        campanha?.status === 'agendada'
          ? 'Data/hora programada atualizada.'
          : 'Campanha agendada. O disparo será feito no horário definido.',
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao agendar');
    }
  };

  const handleExcluir = async () => {
    if (!podeRemover) {
      toast.error('Só é possível remover campanhas que ainda não foram enviadas (rascunho ou agendada, sem disparo iniciado).');
      return;
    }
    if (!window.confirm('Tem certeza que deseja remover esta campanha? Ela será excluída permanentemente.')) {
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
            {podeRemover && (
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
          {(campanha.status === 'draft' || campanha.status === 'agendada') && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">
                  {campanha.status === 'agendada' ? 'Data/hora programada' : 'Agendar para'}
                </label>
                <Input
                  type="datetime-local"
                  value={agendadoPara}
                  onChange={(e) => setAgendadoPara(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAgendar} disabled={!agendadoPara.trim() || agendar.isPending}>
                {agendar.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {campanha.status === 'agendada' ? 'Atualizar data/hora' : 'Agendar disparo'}
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
                  <div className="flex justify-between items-center gap-2">
                    <span className="truncate">{d.whatsapp_numero}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.agendado_para && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(d.agendado_para), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                      )}
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
                  </div>
                  {d.mensagem_texto && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate" title={d.mensagem_texto}>
                      {d.mensagem_texto.substring(0, 80)}{d.mensagem_texto.length > 80 ? '...' : ''}
                    </p>
                  )}
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
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-y-auto">
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

type DiaPreview = {
  diaIndex: number;
  data: string;
  quantidade: number;
  janelaInicio: string;
  janelaFim: string;
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

  const [step, setStep] = useState<1 | 2>(1);

  const [nomeBase, setNomeBase] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [linkCampanha, setLinkCampanha] = useState('');
  const [modoResposta, setModoResposta] = useState<'agente' | 'atendente' | ''>('');

  const [mensagensOpcoes, setMensagensOpcoes] = useState<string[]>(['']);

  const [dataInicio, setDataInicio] = useState('');
  const [horaInicioDia, setHoraInicioDia] = useState('08:00');
  const [horaInicioPrimeiroDia, setHoraInicioPrimeiroDia] = useState('08:00');
  const [horaFimDia, setHoraFimDia] = useState('21:00');
  const [limiteDiario, setLimiteDiario] = useState(300);
  const [variacaoMinutos, setVariacaoMinutos] = useState(10);
  const [qtdLote1, setQtdLote1] = useState(100);
  const [qtdLote2, setQtdLote2] = useState(180);
  const [maxLotes, setMaxLotes] = useState(7);
  const [intervaloMinSegundos, setIntervaloMinSegundos] = useState(30);
  const [intervaloMaxSegundos, setIntervaloMaxSegundos] = useState(300);

  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTelefone, setFiltroTelefone] = useState('');
  const [filtroTag, setFiltroTag] = useState('');

  const [loadingContatos, setLoadingContatos] = useState(false);
  const [contatosFonte, setContatosFonte] = useState<ContatoLote[]>([]);

  const [agendamentos, setAgendamentos] = useState<AgendamentoGerado[]>([]);
  const [diasPreview, setDiasPreview] = useState<DiaPreview[]>([]);
  const [gerandoCampanhas, setGerandoCampanhas] = useState(false);

  const totalContatosDeduplicados = useMemo(() => {
    const setNums = new Set<string>();
    contatosFonte.forEach((c) => {
      if (c.whatsapp_numero) setNums.add(String(c.whatsapp_numero));
    });
    return setNums.size;
  }, [contatosFonte]);

  const handleAdicionarMensagem = () => setMensagensOpcoes((prev) => [...prev, '']);
  const handleRemoverMensagem = (idx: number) => {
    if (mensagensOpcoes.length <= 1) return;
    setMensagensOpcoes((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAlterarMensagem = (idx: number, valor: string) => {
    setMensagensOpcoes((prev) => prev.map((v, i) => (i === idx ? valor : v)));
  };

  const handleBuscarContatos = async () => {
    if (!empresaId) {
      toast.error('Empresa não encontrada na sessão.');
      return;
    }
    setLoadingContatos(true);
    try {
      const pageSize = 1000;
      let from = 0;
      const acumulados: any[] = [];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        let query = supabase
          .from('contatos')
          .select('id, nome, whatsapp_numero, tag_origem')
          .eq('empresa_id', empresaId);
        if (filtroNome.trim()) query = query.ilike('nome', `%${filtroNome.trim()}%`);
        if (filtroTelefone.trim()) {
          const digits = filtroTelefone.replace(/\D/g, '');
          if (digits) query = query.ilike('whatsapp_numero', `%${digits}%`);
        }
        if (filtroTag.trim()) query = query.ilike('tag_origem', `%${filtroTag.trim()}%`);

        const { data, error } = await query.order('nome', { ascending: true }).range(from, from + pageSize - 1);
        if (error) { toast.error(error.message || 'Erro ao buscar contatos.'); return; }
        const page = (data ?? []).filter((c) => c.whatsapp_numero && String(c.whatsapp_numero).trim());
        if (!page.length) break;
        acumulados.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      if (!acumulados.length) {
        toast.error('Nenhum contato encontrado com os filtros informados.');
        setContatosFonte([]);
        return;
      }
      setContatosFonte(
        acumulados.map((c: any) => ({ id: c.id as string, nome: c.nome as string | null, whatsapp_numero: String(c.whatsapp_numero) })),
      );
      toast.success(`Encontrados ${acumulados.length} contato(s).`);
    } finally {
      setLoadingContatos(false);
    }
  };

  const handleGerarPreview = () => {
    const msgsValidas = mensagensOpcoes.map((m) => m.trim()).filter(Boolean);
    if (!nomeBase.trim() || !msgsValidas.length || !modoResposta) {
      toast.error('Preencha nome base, pelo menos uma mensagem e modo de resposta.');
      return;
    }
    if (!dataInicio) { toast.error('Informe a data de início.'); return; }
    if (!contatosFonte.length) { toast.error('Busque contatos antes de gerar.'); return; }
    if (limiteDiario <= 0) { toast.error('Informe um limite diário válido.'); return; }

    const mapa = new Map<string, ContatoLote>();
    contatosFonte.forEach((c) => { if (c.whatsapp_numero) mapa.set(String(c.whatsapp_numero), c); });
    const contatosUnicos = Array.from(mapa.values());

    const baseDateObj = new Date(`${dataInicio}T${horaInicioPrimeiroDia}`);
    if (Number.isNaN(baseDateObj.getTime())) { toast.error('Data de início inválida.'); return; }

    const cfg: ConfigAgendamento = {
      dataInicioIso: `${dataInicio}T${horaInicioPrimeiroDia}`,
      horaInicioPrimeiroDia,
      horaInicioDia,
      horaFimDia,
      limiteDiario,
      variacaoMinutos,
      qtdLote1,
      qtdLote2,
      maxLotes,
      intervaloMinSegundos,
      intervaloMaxSegundos,
      mensagensOpcoes: msgsValidas,
    };

    try {
      const resultado = gerarAgendamentosPorDestinatario(contatosUnicos, cfg);
      setAgendamentos(resultado);

      const porDia = new Map<number, AgendamentoGerado[]>();
      resultado.forEach((a) => {
        const arr = porDia.get(a.diaIndex) ?? [];
        arr.push(a);
        porDia.set(a.diaIndex, arr);
      });

      const preview: DiaPreview[] = [];
      porDia.forEach((items, diaIndex) => {
        const datas = items.map((i) => new Date(i.agendadoPara));
        const minDate = new Date(Math.min(...datas.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...datas.map((d) => d.getTime())));
        preview.push({
          diaIndex,
          data: format(minDate, 'dd/MM/yyyy', { locale: ptBR }),
          quantidade: items.length,
          janelaInicio: format(minDate, 'HH:mm'),
          janelaFim: format(maxDate, 'HH:mm'),
        });
      });
      preview.sort((a, b) => a.diaIndex - b.diaIndex);
      setDiasPreview(preview);
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar agendamentos.');
    }
  };

  const handleCriarCampanha = async () => {
    if (!empresaId || !agendamentos.length) return;

    setGerandoCampanhas(true);
    try {
      const tags = tagsStr.split(/[\s,]+/).filter(Boolean);
      const msgsValidas = mensagensOpcoes.map((m) => m.trim()).filter(Boolean);
      const baseDateObj = new Date(`${dataInicio}T${horaInicioPrimeiroDia}`);

      const campanha = await criar.mutateAsync({
        empresa_id: empresaId,
        nome: nomeBase.trim(),
        descricao: descricao.trim() || null,
        tags,
        mensagem_texto: msgsValidas[0],
        link: linkCampanha.trim() || null,
        modo_resposta: modoResposta,
        status: 'agendada',
        agendado_para: baseDateObj.toISOString(),
      } as any);

      const sb = supabase as any;
      await sb.from('campanhas').update({
        hora_inicio_dia: horaInicioDia,
        hora_fim_dia: horaFimDia,
        limite_diario: limiteDiario,
        variacao_minutos: variacaoMinutos,
        qtd_lote_1: qtdLote1,
        qtd_lote_2: qtdLote2,
        max_lotes: maxLotes,
        intervalo_min_segundos: intervaloMinSegundos,
        intervalo_max_segundos: intervaloMaxSegundos,
        mensagem_opcoes: msgsValidas,
      }).eq('id', campanha.id);

      const chunkSize = 500;
      const rows = agendamentos.map((item) => ({
        campanha_id: campanha.id,
        contato_id: item.contato.id,
        whatsapp_numero: item.contato.whatsapp_numero,
        agendado_para: item.agendadoPara,
        mensagem_texto: item.mensagemTexto,
        status_envio: 'pendente',
      }));

      for (let i = 0; i < rows.length; i += chunkSize) {
        const slice = rows.slice(i, i + chunkSize);
        const { error } = await sb.from('campanha_destinatarios').insert(slice);
        if (error) throw error;
      }

      toast.success(`Campanha criada com ${rows.length} destinatário(s) distribuídos em ${diasPreview.length} dia(s).`);
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao criar campanha');
    } finally {
      setGerandoCampanhas(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Campanha em lote (disparo seguro)</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-6">
          <div className="space-y-4">
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome da campanha *</label>
                  <Input value={nomeBase} onChange={(e) => setNomeBase(e.target.value)} placeholder="Ex: Campanha Nissan" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</label>
                  <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="promo, whatsapp" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Link (opcional)</label>
                  <Input value={linkCampanha} onChange={(e) => setLinkCampanha(e.target.value)} placeholder="https://..." className="mt-1" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Opções de mensagem *</label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAdicionarMensagem}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar variação
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uma mensagem será escolhida aleatoriamente para cada destinatário. Quanto mais variações, menor o risco de bloqueio.
                </p>
                {mensagensOpcoes.map((msg, idx) => (
                  <div key={idx} className="flex gap-2">
                    <textarea
                      value={msg}
                      onChange={(e) => handleAlterarMensagem(idx, e.target.value)}
                      className="flex-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder={`Variação ${idx + 1} da mensagem...`}
                    />
                    {mensagensOpcoes.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverMensagem(idx)} className="self-start mt-1 text-destructive">
                        X
                      </Button>
                    )}
                  </div>
                ))}
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
                        <p>Define quem continuará a conversa ao receber uma resposta do cliente.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <RadioGroup value={modoResposta} onValueChange={(v) => setModoResposta(v as 'agente' | 'atendente')} className="flex gap-4">
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

              <div className="rounded-md bg-muted/60 border px-3 py-3 space-y-3">
                <p className="text-sm font-medium">Configuração de disparo</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Data de início *</label>
                    <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Hora início do dia</label>
                    <Input type="time" value={horaInicioDia} onChange={(e) => setHoraInicioDia(e.target.value)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Hora início do 1º dia</label>
                    <Input
                      type="time"
                      value={horaInicioPrimeiroDia}
                      onChange={(e) => setHoraInicioPrimeiroDia(e.target.value)}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Hora fim do dia</label>
                    <Input type="time" value={horaFimDia} onChange={(e) => setHoraFimDia(e.target.value)} className="mt-1 h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Limite diário (lote)</label>
                    <Input type="number" min={1} value={limiteDiario} onChange={(e) => setLimiteDiario(Number(e.target.value) || 1)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Qtd 1o dia</label>
                    <Input type="number" min={0} value={qtdLote1} onChange={(e) => setQtdLote1(Number(e.target.value) || 0)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Qtd 2o dia</label>
                    <Input type="number" min={0} value={qtdLote2} onChange={(e) => setQtdLote2(Number(e.target.value) || 0)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Max dias (lotes)</label>
                    <Input type="number" min={1} value={maxLotes} onChange={(e) => setMaxLotes(Number(e.target.value) || 1)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Variação (± min)</label>
                    <Input type="number" min={0} value={variacaoMinutos} onChange={(e) => setVariacaoMinutos(Number(e.target.value) || 0)} className="mt-1 h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Intervalo mín. entre envios (seg)</label>
                    <Input type="number" min={1} value={intervaloMinSegundos} onChange={(e) => setIntervaloMinSegundos(Number(e.target.value) || 1)} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Intervalo máx. entre envios (seg)</label>
                    <Input type="number" min={1} value={intervaloMaxSegundos} onChange={(e) => setIntervaloMaxSegundos(Number(e.target.value) || 1)} className="mt-1 h-8 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border rounded-md p-3 space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-sm font-medium">Filtrar por nome</label>
                    <Input value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} placeholder="Opcional" className="mt-1" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-sm font-medium">Filtrar por telefone</label>
                    <Input value={filtroTelefone} onChange={(e) => setFiltroTelefone(e.target.value)} placeholder="Opcional" className="mt-1" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-sm font-medium">Filtrar por tag</label>
                    <Input value={filtroTag} onChange={(e) => setFiltroTag(e.target.value)} placeholder="Opcional" className="mt-1" />
                  </div>
                  <Button type="button" onClick={handleBuscarContatos} disabled={loadingContatos}>
                    {loadingContatos ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Buscar contatos
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Contatos encontrados: {contatosFonte.length} (deduplicados: {totalContatosDeduplicados})
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGerarPreview}
                    disabled={!contatosFonte.length || !nomeBase.trim() || !mensagensOpcoes.some((m) => m.trim()) || !modoResposta}
                  >
                    Gerar prévia dos lotes
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Prévia da distribuição</p>
                  <p className="text-xs text-muted-foreground">
                    {agendamentos.length} destinatário(s) em {diasPreview.length} dia(s). Horários e mensagens foram distribuídos aleatoriamente.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                  <Button type="button" onClick={handleCriarCampanha} disabled={gerandoCampanhas}>
                    {gerandoCampanhas ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Criar campanha
                  </Button>
                </div>
              </div>

              <div className="flex-1 border rounded-md overflow-hidden">
                <ScrollArea className="h-[320px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2">Dia</th>
                        <th className="text-left px-3 py-2">Data</th>
                        <th className="text-right px-3 py-2">Mensagens</th>
                        <th className="text-left px-3 py-2">Janela</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diasPreview.map((dia) => (
                        <tr key={dia.diaIndex} className="border-b last:border-b-0 hover:bg-muted/40">
                          <td className="px-3 py-2">Lote {dia.diaIndex + 1}</td>
                          <td className="px-3 py-2">{dia.data}</td>
                          <td className="px-3 py-2 text-right font-medium">{dia.quantidade}</td>
                          <td className="px-3 py-2 text-muted-foreground">{dia.janelaInicio} – {dia.janelaFim}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              <div className="rounded-md bg-muted/60 border px-3 py-2 text-xs text-muted-foreground">
                <p>
                  Será criada <strong>uma única campanha</strong> com todos os destinatários.
                  Cada um tem um horário de disparo aleatório dentro da janela do seu dia e uma mensagem sorteada entre as opções cadastradas.
                </p>
              </div>
            </>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
