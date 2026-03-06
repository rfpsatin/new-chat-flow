import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/MainLayout';
import {
  useCampanhasStats,
  useCampanha,
  useCampanhaDestinatarios,
  useCriarCampanha,
  useAgendarCampanha,
  useAdicionarDestinatarios,
} from '@/hooks/useCampanhas';
import { useContatos } from '@/hooks/useContatos';
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
import { format } from 'date-fns';
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
import { Campanha, CampanhaStats, StatusCampanha } from '@/types/atendimento';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { data: stats, isLoading } = useCampanhasStats(empresaId);
  const [selectedCampanhaId, setSelectedCampanhaId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sortBy, setSortBy] = useState<'oldest' | 'newest' | 'name-asc' | 'name-desc'>('newest');

  const sortedStats = useMemo(() => {
    if (!stats) return [];

    const getDateValue = (c: CampanhaStats) => {
      const source = c.created_at ?? c.agendado_para ?? c.iniciada_em ?? c.finalizada_em;
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
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !stats?.length ? (
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
  const [agendadoPara, setAgendadoPara] = useState('');

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

  if (!campanha) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{campanha.nome}</DialogTitle>
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
          <ScrollArea className="h-[200px] rounded-md border p-2">
            <div className="space-y-1">
              {destinatarios?.map((d) => (
                <div
                  key={d.id}
                  className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0"
                >
                  <span>{d.whatsapp_numero}</span>
                  <Badge variant={d.status_envio === 'enviado' ? 'default' : d.status_envio === 'erro_envio' ? 'destructive' : 'secondary'}>
                    {d.status_envio}
                  </Badge>
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
  const { data: contatos } = useContatos(empresaId);
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
                  {contatos?.map((c) => (
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
