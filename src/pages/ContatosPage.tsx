import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useContatosInfinite, useHistoricoContato } from '@/hooks/useContatos';
import { useStartConversation } from '@/hooks/useStartConversation';
import { MainLayout } from '@/components/MainLayout';
import { Contato, HistoricoConversa } from '@/types/atendimento';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Phone, Calendar, MessageSquare, User, Clock, Send, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMensagensHistoricoInfinite } from '@/hooks/useMensagens';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type ImportRow = {
  nome?: string | null;
  whatsapp_numero: string;
};

function stripQuotes(value: string): string {
  let v = value.trim();
  // Converte "" em "
  v = v.replace(/""/g, '"');
  // Remove aspas no início/fim
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    v = v.slice(1, -1);
  }
  return v.trim();
}

function normalizeNameField(raw: string): string {
  const v = stripQuotes(raw);
  return v
    .replace(/["'`«»\u201C\u201D\u2018\u2019]/g, '') // aspas restantes
    .replace(/[\x00-\x1F\x7F]/g, '')                  // controle
    .replace(/[^a-zA-ZÀ-ÿ\s\-\.]/g, '')               // mantém letras (com acento), espaço, hífen, ponto
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhoneField(raw: string): string {
  let v = stripQuotes(raw);
  // Remove sinal de +
  v = v.replace(/\+/g, '');
  return v.trim();
}

function parseCsvLines(text: string): ImportRow[] {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) return [];

  const rows: ImportRow[] = [];

  const header = rawLines[0];
  const headerClean = stripQuotes(header).toLowerCase();

  // Caso 0: formato simples com cabeçalho "Nome,Numero" (como no exemplo enviado)
  if (headerClean.startsWith('nome,') && headerClean.includes('numero')) {
    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      const cols = line.split(','); // esperamos duas colunas: nome,numero
      if (cols.length < 2) continue;
      const nome = normalizeNameField(cols[0]);
      const whatsapp = normalizePhoneField(cols[1]);
      if (!whatsapp) continue;
      rows.push({
        nome: nome || null,
        whatsapp_numero: whatsapp,
      });
    }
    return rows;
  }

  // Caso 1: CSV exportado do Google Contacts (como o exemplo enviado)
  if (header.includes('Phone 1 - Value')) {
    const headers = header.split(',').map((h) => stripQuotes(h));
    const idxPhone = headers.indexOf('Phone 1 - Value');
    const idxFirst = headers.indexOf('First Name');
    const idxMiddle = headers.indexOf('Middle Name');
    const idxLast = headers.indexOf('Last Name');
    const idxOrg = headers.indexOf('Organization Name');
    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      const cols = line.split(',');
      if (idxPhone === -1 || !cols[idxPhone]) continue;

      const phoneRaw = normalizePhoneField(cols[idxPhone] ?? '');
      if (!phoneRaw) continue;

      const first = idxFirst >= 0 ? normalizeNameField(cols[idxFirst] ?? '') : '';
      const middle = idxMiddle >= 0 ? normalizeNameField(cols[idxMiddle] ?? '') : '';
      const last = idxLast >= 0 ? normalizeNameField(cols[idxLast] ?? '') : '';
      let nome = [first, middle, last].filter(Boolean).join(' ');
      if (!nome && idxOrg >= 0) {
        nome = normalizeNameField(cols[idxOrg] ?? '');
      }

      rows.push({
        nome: nome || null,
        whatsapp_numero: phoneRaw,
      });
    }

    return rows;
  }

  // Caso 2: formato simples "nome;whatsapp" ou "nome,whatsapp"
  for (const line of rawLines) {
    const parts = line.split(/[;,]/).map((p) => stripQuotes(p));
    if (parts.length === 0) continue;
    const [nome, whatsapp] = parts;
    if (!whatsapp || whatsapp === 'whatsapp_numero') continue;
    rows.push({
      nome: normalizeNameField(nome || ''),
      whatsapp_numero: normalizePhoneField(whatsapp),
    });
  }

  return rows;
}

function MensagensDialog({ conversa, onClose }: { conversa: HistoricoConversa; onClose: () => void }) {
  const {
    mensagens,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMensagensHistoricoInfinite(conversa.conversa_id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {format(new Date(conversa.iniciado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Carregando...</p>
            ) : (mensagens?.length ?? 0) === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma mensagem</p>
            ) : (
              <>
                {hasNextPage && (
                  <div className="flex justify-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? 'Carregando...' : 'Carregar mais antigas'}
                    </Button>
                  </div>
                )}
                {mensagens?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'max-w-[85%] p-2.5 rounded-lg text-sm',
                    msg.direcao === 'in'
                      ? 'bg-muted mr-auto'
                      : 'bg-primary text-primary-foreground ml-auto'
                  )}
                >
                  {msg.tipo_remetente !== 'cliente' && msg.direcao === 'out' && (
                    <div className="text-xs opacity-70 mb-1">
                      {msg.tipo_remetente === 'bot' ? '🤖 Bot' : '👤 Agente'}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{String(msg.conteudo ?? '')}</p>
                  <div className="text-xs opacity-70 mt-1 text-right">
                    {format(new Date(msg.criado_em), 'HH:mm', { locale: ptBR })}
                  </div>
                </div>
              ))}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function IniciarConversaDialog({
  contato,
  onClose,
  onSuccess,
}: {
  contato: Contato;
  onClose: () => void;
  onSuccess: (conversaId: string) => void;
}) {
  const { empresaId, currentUser } = useApp();
  const startConv = useStartConversation();
  const [mensagem, setMensagem] = useState('');
  const [link, setLink] = useState('');
  const [origemFinal, setOrigemFinal] = useState<'agente' | 'atendente' | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim() || !origemFinal) return;
    try {
      const data = await startConv.mutateAsync({
        empresa_id: empresaId,
        contato_id: contato.id,
        mensagem_inicial: mensagem.trim(),
        link: link.trim() || undefined,
        remetente_id: currentUser?.id,
        origem_final: origemFinal,
      });
      toast.success('Conversa iniciada. Redirecionando para a fila.');
      onSuccess(data.conversa_id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar conversa');
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar conversa</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Enviar primeira mensagem para {contato.nome || contato.whatsapp_numero}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">Mensagem *</label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Digite a mensagem inicial..."
              required
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
            <RadioGroup value={origemFinal} onValueChange={(v) => setOrigemFinal(v as 'agente' | 'atendente')} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="agente" id="origem-agente" />
                <Label htmlFor="origem-agente">Agente</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="atendente" id="origem-atendente" />
                <Label htmlFor="origem-atendente">Atendente</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!mensagem.trim() || !origemFinal || startConv.isPending}>
              {startConv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar e abrir conversa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportContatosDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { empresaId } = useApp();
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState<
    {
      id: number;
      nome: string;
      whatsapp_numero: string;
      status: 'pending' | 'valid' | 'invalid';
      reason?: string;
    }[]
  >([]);
  const [importLog, setImportLog] = useState<{
    imported: number;
    invalid: { nome: string | null; whatsapp_numero: string; reason?: string }[];
  } | null>(null);

  const normalizePhone = (raw: string) => raw.replace(/\D/g, '');

  const validateRow = (whatsapp_numero: string): string | null => {
    const digits = normalizePhone(whatsapp_numero);
    if (!digits) return 'Número vazio';
    if (digits.length < 10 || digits.length > 15) return 'Número inválido (esperado 10 a 15 dígitos)';
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportLog(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCsvLines(text);
      if (!parsed.length) {
        toast.error('Nenhuma linha reconhecida no arquivo. Verifique o formato.');
        setRows([]);
        return;
      }
      const nextRows = parsed.map((r, idx) => ({
        id: idx,
        nome: r.nome ?? '',
        whatsapp_numero: r.whatsapp_numero,
        status: 'pending' as const,
      }));
      setRows(nextRows);
      toast.info(`${nextRows.length} linha(s) carregadas. Clique em "Validar" para checar os números.`);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleValidate = () => {
    if (!rows.length) {
      toast.error('Nenhuma linha carregada. Importe um arquivo primeiro.');
      return;
    }
    const validated = rows.map((row) => {
      const err = validateRow(row.whatsapp_numero);
      return {
        ...row,
        status: (err ? 'invalid' : 'valid') as 'invalid' | 'pending' | 'valid',
        reason: err || undefined,
      };
    });
    setRows(validated);
    const validCount = validated.filter((r) => r.status === 'valid').length;
    const invalidCount = validated.filter((r) => r.status === 'invalid').length;
    toast.success(`Validação concluída. ${validCount} válido(s), ${invalidCount} com problema.`);
  };

  const handleCellChange = (id: number, field: 'nome' | 'whatsapp_numero', value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              status: 'pending',
              reason: undefined,
            }
          : row,
      ),
    );
    setImportLog(null);
  };

  const handleImport = async () => {
    if (!empresaId) {
      toast.error('Empresa não encontrada na sessão.');
      return;
    }
    if (!rows.length) {
      toast.error('Nenhuma linha carregada para importar.');
      return;
    }

    const ready = rows.filter((r) => r.status === 'valid');
    if (!ready.length) {
      toast.error('Nenhuma linha válida. Valide e corrija os números antes de importar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadRows = ready.map((r) => ({
        nome: r.nome || null,
        whatsapp_numero: r.whatsapp_numero,
      }));

      const { data, error } = await supabase.functions.invoke('import-contacts', {
        body: { rows: payloadRows },
      });
      if (error) {
        throw new Error(error.message || 'Falha ao importar contatos');
      }
      if (!data?.success) {
        toast.error(data?.error || 'Erro ao importar contatos');
      } else {
        queryClient.invalidateQueries({ queryKey: ['contatos', empresaId] });
        queryClient.invalidateQueries({ queryKey: ['contatos-infinite', empresaId] });
        const invalidFromServer =
          (data.invalid_rows as { row: ImportRow; reason?: string }[] | undefined) ?? [];
        setImportLog({
          imported: data.imported ?? ready.length,
          invalid: invalidFromServer.map((item) => ({
            nome: item.row.nome ?? null,
            whatsapp_numero: item.row.whatsapp_numero,
            reason: item.reason,
          })),
        });
        toast.success(
          `Importação concluída. ${data.imported ?? ready.length} importado(s), ${
            invalidFromServer.length
          } rejeitado(s) no servidor.`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar contatos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const content = 'nome;whatsapp_numero\nJoão da Silva;5544999999999\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_contatos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar contatos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Importe um arquivo CSV exportado do Google Contatos ou uma planilha com as colunas
            equivalentes. Os campos serão pré-validados e você poderá ajustar diretamente na lista
            antes de importar.
          </p>
          <div className="flex items-center justify-between gap-2">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="text-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
              Baixar modelo CSV
            </Button>
          </div>
          {fileName && (
            <p className="text-xs text-muted-foreground">
              Arquivo: <span className="font-medium text-foreground">{fileName}</span>
            </p>
          )}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{rows.length} linha(s) carregadas</span>
                <span>
                  Válidos:{' '}
                  {rows.filter((r) => r.status === 'valid').length} · Com problema:{' '}
                  {rows.filter((r) => r.status === 'invalid').length}
                </span>
              </div>
              <ScrollArea className="h-[260px] rounded-md border">
                <div className="min-w-full text-xs">
                  <div className="grid grid-cols-[2fr,2fr,1fr,2fr] gap-1 px-2 py-1 border-b bg-muted/50 font-medium">
                    <span>Nome</span>
                    <span>WhatsApp</span>
                    <span>Status</span>
                    <span>Motivo</span>
                  </div>
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[2fr,2fr,1fr,2fr] gap-1 px-2 py-1 border-b last:border-b-0 items-center"
                    >
                      <Input
                        value={row.nome}
                        onChange={(e) => handleCellChange(row.id, 'nome', e.target.value)}
                        className="h-7 text-xs"
                      />
                      <Input
                        value={row.whatsapp_numero}
                        onChange={(e) => handleCellChange(row.id, 'whatsapp_numero', e.target.value)}
                        className="h-7 text-xs"
                      />
                      <span
                        className={
                          row.status === 'valid'
                            ? 'text-emerald-600'
                            : row.status === 'invalid'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {row.status === 'valid'
                          ? 'OK'
                          : row.status === 'invalid'
                          ? 'Erro'
                          : 'Pendente'}
                      </span>
                      <span className="truncate">{row.reason}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleValidate} disabled={!rows.length}>
              Validar
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button type="button" onClick={handleImport} disabled={isSubmitting || !rows.length}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Importar
              </Button>
            </div>
          </div>
          {importLog && (
            <div className="mt-3 border-t pt-2 text-xs space-y-1">
              <p className="font-medium">
                Resultado da importação: {importLog.imported} importado(s),{' '}
                {importLog.invalid.length} rejeitado(s) no servidor.
              </p>
              {importLog.invalid.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">
                    Linhas rejeitadas (corrija na planilha de origem se necessário):
                  </p>
                  <ScrollArea className="h-[120px] rounded-md border">
                    <div className="px-2 py-1 space-y-1">
                      {importLog.invalid.map((item, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="font-medium">
                            {item.nome || '(sem nome)'} — {item.whatsapp_numero}
                          </span>
                          {item.reason && (
                            <span className="text-destructive">
                              Motivo: {item.reason}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ContatosPage() {
  const navigate = useNavigate();
  const { empresaId } = useApp();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const {
    data: contatos,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContatosInfinite(empresaId, searchTerm);
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const { data: historico } = useHistoricoContato(selectedContato?.id || null);
  const [selectedHistorico, setSelectedHistorico] = useState<HistoricoConversa | null>(null);
  const [contatoParaIniciar, setContatoParaIniciar] = useState<Contato | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [savingContato, setSavingContato] = useState(false);

  const filteredContatos = contatos ?? [];

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  useEffect(() => {
    if (selectedContato) {
      setEditNome(selectedContato.nome ?? '');
      setEditWhatsapp(selectedContato.whatsapp_numero ?? '');
    } else {
      setEditNome('');
      setEditWhatsapp('');
    }
  }, [selectedContato]);

  const handleSalvarContato = async () => {
    if (!selectedContato) return;
    const nome = editNome.trim() || null;
    const digits = editWhatsapp.replace(/\D/g, '');
    if (!digits) {
      toast.error('Informe um número de WhatsApp válido.');
      return;
    }
    setSavingContato(true);
    try {
      const { error } = await supabase
        .from('contatos')
        .update({
          nome,
          whatsapp_numero: digits,
        })
        .eq('id', selectedContato.id);

      if (error) throw error;

      // Atualiza seleção local e refaz cache de contatos
      const updated: Contato = {
        ...selectedContato,
        nome,
        whatsapp_numero: digits,
      };
      setSelectedContato(updated);
      queryClient.invalidateQueries({ queryKey: ['contatos', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['contatos-infinite', empresaId] });
      toast.success('Contato atualizado com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar contato');
    } finally {
      setSavingContato(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex h-full">
        {/* Left panel - Contact list */}
        <div className="w-[380px] border-r bg-card flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-lg">Contatos</h2>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                Importar
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="pl-9"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContatos.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum contato encontrado.
                </div>
              ) : (
                <>
                  {filteredContatos.map(contato => (
                    <button
                      key={contato.id}
                      onClick={() => setSelectedContato(contato)}
                      className={cn(
                        'w-full p-3 text-left rounded-lg transition-colors',
                        'hover:bg-accent/50',
                        selectedContato?.id === contato.id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                            {getInitials(contato.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {contato.nome || 'Sem nome'}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{formatPhone(contato.whatsapp_numero)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {hasNextPage && (
                    <div className="py-2 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Carregar mais
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Right panel - Contact details */}
        <div className="flex-1 p-6 overflow-auto bg-muted/30">
          {selectedContato ? (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Contact card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                        {getInitials(selectedContato.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="space-y-1">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Nome</label>
                          <Input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            className="mt-0.5 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
                          <Input
                            value={editWhatsapp}
                            onChange={(e) => setEditWhatsapp(e.target.value)}
                            className="mt-0.5 h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {formatPhone(editWhatsapp)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Desde {format(new Date(selectedContato.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSalvarContato}
                        disabled={savingContato}
                      >
                        {savingContato ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Salvar contato
                      </Button>
                      <Button
                        onClick={() => setContatoParaIniciar(selectedContato)}
                        className="gap-2"
                        size="sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Iniciar conversa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Histórico de Atendimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historico && historico.length > 0 ? (
                    <div className="space-y-3">
                      {historico.map(item => (
                        <button
                          key={item.conversa_id}
                          onClick={() => setSelectedHistorico(item)}
                          className="w-full p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {format(new Date(item.iniciado_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                            {item.motivo_encerramento && (
                              <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                                {item.motivo_encerramento}
                              </span>
                            )}
                          </div>
                          {item.resumo && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.resumo}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Encerrado em {item.encerrado_em && format(new Date(item.encerrado_em), 'HH:mm', { locale: ptBR })}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum atendimento encerrado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-1">
                Selecione um contato
              </h3>
              <p className="text-sm text-muted-foreground">
                Escolha um contato para ver seus detalhes e histórico
              </p>
            </div>
          )}
        </div>
      </div>
      
      {selectedHistorico && (
        <MensagensDialog
          conversa={selectedHistorico}
          onClose={() => setSelectedHistorico(null)}
        />
      )}

      {contatoParaIniciar && (
        <IniciarConversaDialog
          contato={contatoParaIniciar}
          onClose={() => setContatoParaIniciar(null)}
          onSuccess={(conversaId) => {
            setContatoParaIniciar(null);
            navigate(`/?conversa_id=${conversaId}`);
          }}
        />
      )}

      {showImport && (
        <ImportContatosDialog
          open={showImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </MainLayout>
  );
}
