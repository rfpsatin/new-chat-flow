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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

type ParsedCsv = {
  delimiter: ',' | ';';
  rows: string[][];
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
    // remove acentuação
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // remove aspas e pontuações esquisitas
    .replace(/["'`«»\u201C\u201D\u2018\u2019]/g, '')
    // remove caracteres de controle
    .replace(/[\x00-\x1F\x7F]/g, '')
    // mantém só letras A–Z (sem acento) e espaços
    .replace(/[^a-zA-Z\s]/g, '')
    // colapsa espaços múltiplos
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhoneField(raw: string): string {
  const original = stripQuotes(raw).trim();

  // mantém apenas dígitos (remove +, parênteses, espaços, hífens etc.)
  let digits = original.replace(/\D/g, '');
  if (!digits) return '';

  // Números antigos com prefixo de operadora/DDD começando com 0
  // Exemplos:
  // - 01544999775611  -> 0 + 15 (operadora) + 44 (DDD) + 999775611
  // - 044988232882    -> 0 + 44 (DDD) + 988232882
  if (digits.startsWith('0')) {
    const withoutZero = digits.slice(1);

    // Caso comum: 0 + XX + DDD + 9 dígitos (total 14 dígitos com o zero; 13 sem o zero).
    // Se após remover o zero temos 13 dígitos mas NÃO começa com 55,
    // assumimos que os 2 primeiros dígitos são código de operadora (ex.: 15, 21 etc.) e removemos.
    if (withoutZero.length === 13 && !withoutZero.startsWith('55')) {
      digits = withoutZero.slice(2);
    } else {
      digits = withoutZero;
    }
  }

  if (!digits.startsWith('55')) {
    // Se vier apenas número local (8 ou 9 dígitos), assumir DDD 44 e país 55 => 5544 + local
    if (digits.length === 8 || digits.length === 9) {
      digits = `5544${digits}`;
    }
    // Se vier DDD + número (10 ou 11) sem 55, prefixa 55
    else if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    }
  }

  // retorna só dígitos, ex: 5544999999999
  return digits;
}

type PhoneValidationResult = {
  ok: boolean;
  normalizedDigits: string | null;
  reason?: string;
};

function validatePhoneWithDdd(raw: string): PhoneValidationResult {
  const digitsOnly = String(raw || '').replace(/\D/g, '');
  if (!digitsOnly) {
    return { ok: false, normalizedDigits: null, reason: 'Numero vazio' };
  }

  const withoutCountry = digitsOnly.startsWith('55') ? digitsOnly.slice(2) : digitsOnly;

  if (withoutCountry.length === 8 || withoutCountry.length === 9) {
    return {
      ok: false,
      normalizedDigits: null,
      reason: 'Numero sem DDD. Inclua o DDD (ex.: 44).',
    };
  }

  if (withoutCountry.length === 10 || withoutCountry.length === 11) {
    return {
      ok: true,
      normalizedDigits: digitsOnly.startsWith('55') ? digitsOnly : `55${withoutCountry}`,
    };
  }

  return {
    ok: false,
    normalizedDigits: null,
    reason: 'Numero invalido. Use DDD + numero (10 ou 11 digitos locais).',
  };
}

function normalizeHeaderField(value: string): string {
  return stripQuotes(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseCsvRow(line: string, delimiter: ',' | ';'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function countDelimiterOutsideQuotes(line: string, delimiter: ',' | ';'): number {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      count++;
    }
  }

  return count;
}

function parseCsvText(text: string): ParsedCsv {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!rawLines.length) {
    return { delimiter: ';', rows: [] };
  }

  const firstLine = rawLines[0];
  const commas = countDelimiterOutsideQuotes(firstLine, ',');
  const semicolons = countDelimiterOutsideQuotes(firstLine, ';');
  const delimiter: ',' | ';' = semicolons > commas ? ';' : ',';

  return {
    delimiter,
    rows: rawLines.map((line) => parseCsvRow(line, delimiter)),
  };
}

function parseCsvLines(text: string): ImportRow[] {
  const parsedCsv = parseCsvText(text);
  if (!parsedCsv.rows.length) return [];

  const rows: ImportRow[] = [];
  const [headerRow, ...dataRows] = parsedCsv.rows;
  const headers = headerRow.map(normalizeHeaderField);

  const idxByName = (name: string) => headers.indexOf(name);
  const idxByCandidates = (candidates: string[]) =>
    headers.findIndex((header) => candidates.includes(header));

  // Caso 0: formato simples com cabeçalho nome/numero
  const idxNomeSimple = idxByCandidates(['nome', 'name']);
  const idxNumeroSimple = idxByCandidates(['numero', 'whatsapp_numero', 'whatsapp', 'telefone', 'phone']);
  if (idxNomeSimple >= 0 && idxNumeroSimple >= 0) {
    for (const cols of dataRows) {
      const nome = normalizeNameField(cols[idxNomeSimple] ?? '');
      const whatsapp = normalizePhoneField(cols[idxNumeroSimple] ?? '');
      if (!whatsapp) continue;
      rows.push({
        nome: nome || null,
        whatsapp_numero: whatsapp,
      });
    }
    return rows;
  }

  // Caso 1: CSV exportado do Google Contacts
  const idxPhone = idxByCandidates(['phone 1 - value', 'phone', 'telefone', 'whatsapp_numero', 'whatsapp']);
  if (idxPhone >= 0) {
    const idxFirst = idxByName('first name');
    const idxMiddle = idxByName('middle name');
    const idxLast = idxByName('last name');
    const idxOrg = idxByName('organization name');

    for (const cols of dataRows) {
      if (!cols[idxPhone]) continue;

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
  for (const parts of dataRows) {
    if (parts.length === 0) continue;
    const [nome, whatsapp] = parts.map((p) => stripQuotes(p));
    if (!whatsapp || whatsapp === 'whatsapp_numero') continue; // ignora cabeçalho simples
    rows.push({
      nome: normalizeNameField(nome || ''),
      whatsapp_numero: normalizePhoneField(whatsapp),
    });
  }

  return rows;
}

function csvEscapeField(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildNormalizedContactsCsv(rows: ImportRow[]): string {
  const lines = ['nome;whatsapp_numero'];
  rows.forEach((row) => {
    const nome = csvEscapeField((row.nome ?? '').trim());
    const whatsapp = csvEscapeField(row.whatsapp_numero.trim());
    lines.push(`${nome};${whatsapp}`);
  });
  return `${lines.join('\n')}\n`;
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

  const invalidRowsFromGrid = rows
    .filter((r) => r.status === 'invalid')
    .map((r) => ({
      nome: r.nome || null,
      whatsapp_numero: r.whatsapp_numero,
      reason: r.reason || 'Numero invalido',
    }));

  const invalidRowsForReport = [
    ...invalidRowsFromGrid,
    ...(importLog?.invalid ?? []),
  ];

  const handleDownloadInvalidReport = () => {
    if (!invalidRowsForReport.length) {
      toast.error('Nao ha contatos rejeitados para gerar relatorio.');
      return;
    }

    const lines = ['nome;whatsapp_numero;motivo'];
    invalidRowsForReport.forEach((item) => {
      const nome = csvEscapeField((item.nome ?? '').trim());
      const numero = csvEscapeField((item.whatsapp_numero ?? '').trim());
      const motivo = csvEscapeField((item.reason ?? 'Nao informado').trim());
      lines.push(`${nome};${numero};${motivo}`);
    });

    const content = `${lines.join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = (fileName || 'contatos').replace(/\.csv$/i, '');
    a.href = url;
    a.download = `${baseName}_rejeitados.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validateRow = (row: { nome: string; whatsapp_numero: string }): string | null => {
    const nomeLimpo = (row.nome || '').trim();
    if (!nomeLimpo) return 'Nome obrigatorio';

    const result = validatePhoneWithDdd(row.whatsapp_numero);
    return result.ok ? null : result.reason || 'Numero invalido';
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
      const err = validateRow({ nome: row.nome, whatsapp_numero: row.whatsapp_numero });
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
      const invalidSkippedBeforeImport = rows
        .filter((r) => r.status !== 'valid')
        .map((r) => ({
          nome: r.nome || null,
          whatsapp_numero: r.whatsapp_numero,
          reason: r.reason || (r.status === 'pending' ? 'Nao validado antes da importacao' : 'Numero invalido'),
        }));

      const { data, error } = await supabase.functions.invoke('import-contacts', {
        body: { rows: payloadRows, import_tag: fileName || null },
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
          invalid: [
            ...invalidSkippedBeforeImport,
            ...invalidFromServer.map((item) => ({
              nome: item.row.nome ?? null,
              whatsapp_numero: item.row.whatsapp_numero,
              reason: item.reason,
            })),
          ],
        });
        toast.success(
          `Importação concluída. ${data.imported ?? ready.length} importado(s), ${
            invalidFromServer.length + invalidSkippedBeforeImport.length
          } nao adicionado(s).`,
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
              {invalidRowsForReport.length > 0 && (
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={handleDownloadInvalidReport}>
                    Gerar relatório de erros
                  </Button>
                </div>
              )}
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
                {importLog.invalid.length} não adicionado(s).
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

function TratarDadosBrutosDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [sourceName, setSourceName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCsvLines(text);
      if (!parsed.length) {
        toast.error('Nenhuma linha reconhecida. Verifique se o arquivo CSV está válido.');
        setRows([]);
        return;
      }

      // Remove linhas com nome em branco ou telefone em branco
      const filtered = parsed.filter((row) => {
        const nomeOk = !!(row.nome && row.nome.toString().trim());
        const telOk = !!(row.whatsapp_numero && row.whatsapp_numero.toString().trim());
        return nomeOk && telOk;
      });

      setRows(filtered);
      const descartados = parsed.length - filtered.length;
      toast.success(
        `${filtered.length} contato(s) tratado(s).` +
          (descartados > 0 ? ` ${descartados} linha(s) com nome/telefone em branco foram descartadas.` : '') +
          ' Baixe o CSV para importar.',
      );
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDownload = () => {
    if (!rows.length) {
      toast.error('Carregue um arquivo antes de baixar.');
      return;
    }

    const content = buildNormalizedContactsCsv(rows);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = sourceName ? sourceName.replace(/\.csv$/i, '') : 'contatos';
    a.download = `${baseName}_tratado.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tratar dados brutos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Envie um CSV exportado do Google Contatos (separado por vírgula ou ponto e vírgula). O sistema
            irá padronizar para o formato de importação: <strong>nome;whatsapp_numero</strong>.
          </p>
          <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          {sourceName && (
            <p className="text-xs text-muted-foreground">
              Arquivo: <span className="font-medium text-foreground">{sourceName}</span>
            </p>
          )}
          {rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {rows.length} linha(s) reconhecida(s) e pronta(s) para exportar.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button type="button" onClick={handleDownload} disabled={!rows.length}>
              Baixar CSV tratado
            </Button>
          </div>
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
  const [showTratamento, setShowTratamento] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [savingContato, setSavingContato] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredContatos = contatos ?? [];

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatPhone = (phone: string) => {
    return normalizePhoneField(phone);
  };

  const getDisplayPhone = (contato: Contato) => {
    const original = (contato.telefone_numero ?? '').trim();
    if (original) return normalizePhoneField(original);
    return formatPhone(contato.whatsapp_numero);
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
    const validation = validatePhoneWithDdd(editWhatsapp);
    if (!validation.ok || !validation.normalizedDigits) {
      toast.error(validation.reason || 'Informe um numero de WhatsApp valido com DDD.');
      return;
    }
      const formattedPhone = normalizePhoneField(editWhatsapp);
    setSavingContato(true);
    try {
      const { error } = await supabase
        .from('contatos')
        .update({
          nome,
          whatsapp_numero: validation.normalizedDigits,
            telefone_numero: formattedPhone || null,
        })
        .eq('id', selectedContato.id);

      if (error) throw error;

      // Atualiza seleção local e refaz cache de contatos
      const updated: Contato = {
        ...selectedContato,
        nome,
        whatsapp_numero: validation.normalizedDigits,
        telefone_numero: formattedPhone || null,
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

  const handleExportContatos = async () => {
    if (!empresaId) {
      toast.error('Empresa não encontrada na sessão.');
      return;
    }

    setExporting(true);
    try {
      const pageSize = 1000;
      let from = 0;
      const contatos: any[] = [];

      // Pagina a tabela inteira em blocos de 1000 registros
      // até não receber mais resultados.
      // Isso garante que exportamos toda a base, respeitando o limite padrão do Supabase.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('contatos')
          .select('nome, whatsapp_numero')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          throw error;
        }

        const page = (data ?? []).filter(
          (c) => c.whatsapp_numero && String(c.whatsapp_numero).trim(),
        );

        if (!page.length) {
          break;
        }

        contatos.push(...page);

        if (page.length < pageSize) {
          break;
        }

        from += pageSize;
      }

      if (!contatos.length) {
        toast.error('Nenhum contato encontrado para exportar.');
        return;
      }

      const rows: ImportRow[] = contatos.map((c: any) => ({
        nome: c.nome ?? null,
        whatsapp_numero: String(c.whatsapp_numero),
      }));

      const csv = buildNormalizedContactsCsv(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contatos_exportados.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exportados ${rows.length} contato(s).`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao exportar contatos. Tente novamente.',
      );
    } finally {
      setExporting(false);
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Ações
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      if (!exporting) {
                        void handleExportContatos();
                      }
                    }}
                  >
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setShowTratamento(true);
                    }}
                  >
                    Tratar dados brutos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setShowImport(true);
                    }}
                  >
                    Importar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                            <span>{getDisplayPhone(contato)}</span>
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
                          {editWhatsapp}
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
      {showTratamento && (
        <TratarDadosBrutosDialog
          open={showTratamento}
          onClose={() => setShowTratamento(false)}
        />
      )}
    </MainLayout>
  );
}
