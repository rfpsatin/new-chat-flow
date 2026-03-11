import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useMensagens, useEnviarMensagem, useEnviarArquivo } from '@/hooks/useMensagens';
import { useConversa } from '@/hooks/useFila';
import { MensagemAtiva, FilaAtendimento } from '@/types/atendimento';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Send, 
  Phone, 
  XCircle,
  MessageSquare,
  Loader2,
  Download,
  Play,
  Pause,
  Plus,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EncerrarDialog } from '@/components/EncerrarDialog';
import { AtribuirAtendentePopover } from '@/components/AtribuirAtendentePopover';
import { HistoricoClienteCollapsible } from '@/components/HistoricoClienteCollapsible';
import { ConversaTags } from '@/components/ConversaTags';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface ChatPanelProps {
  conversa: FilaAtendimento | null;
}

export function ChatPanel({ conversa }: ChatPanelProps) {
  const { currentUser, empresaId } = useApp();
  const { data: mensagens, isLoading: mensagensLoading } = useMensagens(conversa?.conversa_id || null);
  const { data: conversaDetalhes } = useConversa(conversa?.conversa_id || null);
  const enviarMensagem = useEnviarMensagem();
  const enviarArquivo = useEnviarArquivo();
  const { toast } = useToast();
  
  const [mensagemInput, setMensagemInput] = useState('');
  const [showEncerrar, setShowEncerrar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MensagemAtiva | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const documentosInputRef = useRef<HTMLInputElement | null>(null);
  const midiaInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  const emojiCategories = [
    {
      id: 'smileys',
      icon: '😊',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '😘', '😗', '😙', '😚', '😋', '😜', '🤪', '😝', '🤗', '🤔'],
    },
    {
      id: 'animals',
      icon: '🐻',
      emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'],
    },
    {
      id: 'objects',
      icon: '⚽',
      emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🎯', '🎮', '🎲', '🎵', '🎧'],
    },
    {
      id: 'symbols',
      icon: '❤️',
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '✨', '⭐', '🔥', '💯'],
    },
  ] as const;
  const [activeEmojiCategoryId, setActiveEmojiCategoryId] = useState<string>(emojiCategories[0]?.id ?? 'smileys');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || !conversa || !currentUser || !conversaDetalhes || !empresaId || !canRespond) return;

    for (const file of Array.from(files)) {
      try {
        await enviarArquivo.mutateAsync({
          empresaId,
          conversaId: conversa.conversa_id,
          contato_id: conversaDetalhes.contato_id,
          remetenteId: currentUser.id,
          file,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao enviar arquivo';
        toast({
          title: 'Erro ao enviar arquivo',
          description: `${file.name}: ${message}`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleDocumentosChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const files = event.target.files;
    await handleFilesUpload(files);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleMidiaChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const files = event.target.files;
    await handleFilesUpload(files);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleEmojiInsert = (emoji: string) => {
    let start = mensagemInput.length;
    let end = mensagemInput.length;
    if (selection) {
      start = selection.start;
      end = selection.end;
    }
    const before = mensagemInput.slice(0, start);
    const after = mensagemInput.slice(end);
    const next = `${before}${emoji}${after}`;
    setMensagemInput(next);
    if (messageInputRef.current) {
      const cursorPos = start + emoji.length;
      requestAnimationFrame(() => {
        messageInputRef.current?.focus();
        messageInputRef.current?.setSelectionRange(cursorPos, cursorPos);
      });
    }
  };

  const handleEnviar = async () => {
    if (!mensagemInput.trim() || !conversa || !currentUser || !conversaDetalhes) return;
    
    const humanMode = conversaDetalhes.human_mode === true;
    
    await enviarMensagem.mutateAsync({
      empresaId,
      conversaId: conversa.conversa_id,
      contato_id: conversaDetalhes.contato_id,
      conteudo: mensagemInput.trim(),
      remetenteId: currentUser.id,
      humanMode,
      replyToMessageId: replyingTo?.id ?? null,
      replyToWhatsappId: (replyingTo as any)?.whatsapp_message_id ?? null,
    });
    
    setMensagemInput('');
    setReplyingTo(null);
  };

  /**
   * Verifica se a conversa vem do n8n-webhook-cinemkt
   * Retorna true se tem origem OU (channel existe E channel !== "WhatsApp")
   */
  const isN8nCinemktConversa = () => {
    if (!conversa) return false;
    const hasOrigem = !!conversa.origem;
    const hasChannel = !!conversa.channel;
    const isWhatsAppChannel = conversa.channel === 'WhatsApp';
    
    return hasOrigem || (hasChannel && !isWhatsAppChannel);
  };

  /**
   * Verifica se o channel é Marketing ou Comercial
   */
  const isMktOrComercialChannel = () => {
    if (!conversa) return false;
    return conversa.channel === 'Marketing' || conversa.channel === 'Comercial';
  };

  /**
   * Retorna o nome a ser exibido: protocolo se channel mkt/comercial e sem nome, senão o nome
   */
  const getDisplayName = () => {
    if (!conversa) return 'Sem nome';
    const hasName = conversa.contato_nome && conversa.contato_nome !== 'Sem nome';
    
    if (isMktOrComercialChannel() && !hasName) {
      return conversa.nr_protocolo || 'Sem nome';
    }
    
    return conversa.contato_nome || 'Sem nome';
  };

  /**
   * Remove o prefixo "webchat-" do número e retorna apenas o ID
   */
  const formatWebchatId = (numero: string) => {
    if (numero.startsWith('webchat-')) {
      return numero.replace('webchat-', '');
    }
    return numero;
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!conversa) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/30">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground text-lg mb-1">
          Selecione uma conversa
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Escolha uma conversa na fila para visualizar e interagir
        </p>
      </div>
    );
  }

  // Usa sempre o status/dados mais recentes da conversa (detalhes vindos do banco)
  // para decidir se o atendente ainda pode responder/encerrar.
  const effectiveStatus = conversaDetalhes?.status ?? conversa.status;
  const effectiveAgenteId = conversaDetalhes?.agente_responsavel_id ?? conversa.agente_responsavel_id;

  const canRespond = effectiveStatus === 'em_atendimento_humano' && 
    effectiveAgenteId === currentUser?.id;
  
  // Supervisora pode encaminhar conversas que estão aguardando triagem
  const canEncaminhar = conversa.status === 'esperando_tria' &&
    ['adm', 'sup'].includes(currentUser?.tipo_usuario || '');

  const canTransfer = conversa.status === 'em_atendimento_humano' &&
    ['adm', 'sup'].includes(currentUser?.tipo_usuario || '');

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(getDisplayName())}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-foreground">
                {getDisplayName()}
              </h2>
              {/* Mostrar ID para conversas do n8n-webhook-cinemkt, telefone para outras */}
              {isN8nCinemktConversa() ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>id: {formatWebchatId(conversa.whatsapp_numero)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{formatPhone(conversa.whatsapp_numero)}</span>
                </div>
              )}
              {/* Etiquetas origem e channel */}
              <div className="mt-1.5">
                <ConversaTags origem={conversa.origem} channel={conversa.channel} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <StatusBadge status={conversa.status} />
              {canRespond && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowEncerrar(true)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Encerrar
                </Button>
              )}
            </div>
            {/* Exibir protocolo abaixo do status em todas as conversas que tiverem nr_protocolo */}
            {conversa.nr_protocolo && (
              <span className="text-xs text-muted-foreground">
                Protocolo: {conversa.nr_protocolo}
              </span>
            )}
          </div>
        </div>
        
        {/* Encaminhar/Transferir agent button */}
        {(canEncaminhar || canTransfer) && (
          <div className="mt-4">
            <AtribuirAtendentePopover
              empresaId={empresaId}
              conversaId={conversa.conversa_id}
              conversaStatus={conversa.status}
            />
          </div>
        )}
      </div>

      {/* Histórico do cliente (sessões anteriores) */}
      {conversa.contato_id && (
        <div className="flex-shrink-0">
          <HistoricoClienteCollapsible
            empresaId={empresaId}
            contatoId={conversa.contato_id}
            conversaAtualId={conversa.conversa_id}
          />
        </div>
      )}
      
      {/* Messages - área de scroll */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {mensagensLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-0">
            {mensagens?.map((msg, idx) => {
              const prevMsg = idx > 0 ? mensagens[idx - 1] : null;
              const differentContact = prevMsg && prevMsg.contato_id !== msg.contato_id;
              return (
                <div key={msg.id}>
                  {differentContact && (
                    <div className="my-3 border-t border-muted-foreground/20" />
                  )}
                  <div className="py-1.5">
                    <MessageBubble
                      mensagem={msg}
                      mensagens={mensagens}
                      onReply={canRespond ? setReplyingTo : undefined}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Input - SEMPRE VISÍVEL */}
      <div className="flex-shrink-0 p-4 border-t bg-card">
        {replyingTo && (
          <div className="mb-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {replyingTo.tipo_remetente === 'agente'
                  ? 'Você'
                  : replyingTo.tipo_remetente === 'bot'
                  ? 'Bot'
                  : replyingTo.tipo_remetente === 'sistema'
                  ? 'Sistema'
                  : 'Cliente'}
              </p>
              <p className="truncate">
                {replyingTo.media_kind === 'image'
                  ? '[imagem]'
                  : replyingTo.media_kind === 'audio'
                  ? '[áudio]'
                  : replyingTo.media_kind === 'document'
                  ? replyingTo.media_filename || '[documento]'
                  : replyingTo.conteudo || ''}
              </p>
            </div>
            <button
              type="button"
              className="ml-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setReplyingTo(null)}
            >
              ✕
            </button>
          </div>
        )}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleEnviar(); }}
          className="flex items-center gap-3"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-11 w-11"
                disabled={!canRespond}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  if (!canRespond) return;
                  documentosInputRef.current?.click();
                }}
              >
                Documentos
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  if (!canRespond) return;
                  midiaInputRef.current?.click();
                }}
              >
                Fotos e vídeos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-11 w-11"
                disabled={!canRespond}
              >
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-64 p-2"
            >
              <div className="flex gap-1 border-b pb-1 mb-2">
                {emojiCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md text-base',
                      activeEmojiCategoryId === category.id
                        ? 'bg-primary/20'
                        : 'bg-transparent hover:bg-muted'
                    )}
                    onClick={() => setActiveEmojiCategoryId(category.id)}
                  >
                    {category.icon}
                  </button>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1 text-lg">
                  {emojiCategories
                    .find((c) => c.id === activeEmojiCategoryId)
                    ?.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                        onClick={() => handleEmojiInsert(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Input
            ref={messageInputRef}
            value={mensagemInput}
            onChange={(e) => setMensagemInput(e.target.value)}
            onClick={(e) => {
              const target = e.target as HTMLInputElement;
              setSelection({
                start: target.selectionStart ?? target.value.length,
                end: target.selectionEnd ?? target.value.length,
              });
            }}
            onKeyUp={(e) => {
              const target = e.target as HTMLInputElement;
              setSelection({
                start: target.selectionStart ?? target.value.length,
                end: target.selectionEnd ?? target.value.length,
              });
            }}
            placeholder={canRespond 
              ? "Digite sua mensagem..." 
              : "Você não é o responsável por esta conversa"}
            className="flex-1 h-11"
            disabled={!canRespond}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-11 w-11"
            disabled={!canRespond || !mensagemInput.trim() || enviarMensagem.isPending}
          >
            {enviarMensagem.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
      <input
        ref={documentosInputRef}
        type="file"
        multiple
        hidden
        onChange={handleDocumentosChange}
      />
      <input
        ref={midiaInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        hidden
        onChange={handleMidiaChange}
      />
      
      {showEncerrar && (
        <EncerrarDialog
          conversa={conversa}
          onClose={() => setShowEncerrar(false)}
        />
      )}
    </div>
  );
}

function buildInteractiveText(interactive: any): string {
  if (!interactive) return '[mensagem interativa]';
  const parts: string[] = [];
  if (interactive.header) parts.push(interactive.header);
  if (interactive.body) parts.push(interactive.body.trim());
  if (interactive.buttons?.length) {
    parts.push(interactive.buttons.map((b: any) => `• ${b.text}`).join('\n'));
  }
  if (interactive.footer) parts.push(`{{FOOTER}}${interactive.footer}`);
  return parts.join('\n') || '[mensagem interativa]';
}

function buildListText(list: any): string {
  if (!list) return '[lista interativa]';
  const parts: string[] = [];
  if (list.header) parts.push(list.header);
  if (list.body) parts.push(list.body.trim());
  if (list.sections?.length) {
    const items = list.sections.flatMap((s: any) =>
      s.rows.map((r: any) => {
        let item = `• ${r.title}`;
        if (r.description?.trim()) item += ` — ${r.description.trim()}`;
        return item;
      })
    );
    parts.push(items.join('\n'));
  }
  if (list.footer) parts.push(`{{FOOTER}}${list.footer}`);
  return parts.join('\n') || '[lista interativa]';
}

// Renderiza texto com formatação: *negrito* e opções com bullet points estilizados
function FormattedMessageContent({ content, isOutgoing }: { content: string; isOutgoing: boolean }) {
  const lines = content.split('\n');
  
  return (
    <div className="text-sm space-y-1">
      {lines.map((line, i) => {
        // Footer between parentheses - smaller muted text
        if (line.startsWith('{{FOOTER}}')) {
          const footerText = line.replace('{{FOOTER}}', '');
          return (
            <p key={i} className="text-[10px] text-white/90 mt-1 text-center">
              {footerText}
            </p>
          );
        }

        const isBullet = line.startsWith('• ');
        
        if (isBullet) {
          const bulletContent = line.slice(2);
          const dashIndex = bulletContent.indexOf(' — ');
          
          if (dashIndex !== -1) {
            const title = bulletContent.slice(0, dashIndex);
            const description = bulletContent.slice(dashIndex + 3);
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 px-2 py-1 rounded-md',
                  isOutgoing ? 'bg-primary-foreground/10' : 'bg-muted'
                )}
              >
                <span className="shrink-0 mt-0.5 text-sm">▸</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{renderBoldText(title)}</span>
                  <span className="text-[10px] text-muted-foreground pl-3">({description})</span>
                </div>
              </div>
            );
          }
          
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2 px-2 py-1 rounded-md text-sm',
                isOutgoing ? 'bg-primary-foreground/10' : 'bg-muted'
              )}
            >
              <span className="shrink-0 mt-0.5">▸</span>
              <span className="font-medium">{renderBoldText(bulletContent)}</span>
            </div>
          );
        }
        
        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {renderBoldText(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderBoldText(text: string): React.ReactNode {
  // Regex para *texto* → negrito
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function stripHumanModePrefix(text: string): string {
  if (!text) return '';
  const match = text.match(/^#\"human_mode=(true|false)\"#\s*(.*)$/s);
  if (match) {
    return match[2] || '';
  }
  return text;
}

function MessageBubble({
  mensagem,
  mensagens,
  onReply,
}: {
  mensagem: MensagemAtiva;
  mensagens: MensagemAtiva[];
  onReply?: (mensagem: MensagemAtiva) => void;
}) {
  const isOutgoing = mensagem.direcao === 'out';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const getSenderLabel = () => {
    switch (mensagem.tipo_remetente) {
      case 'cliente': return null;
      case 'bot': return 'Bot';
      case 'agente': return 'Você';
      case 'sistema': return 'Sistema';
      default: return null;
    }
  };

  // Extrai o conteúdo real de mensagens de reply
  const getDisplayContent = (): string => {
    if (mensagem.conteudo === '[reply]' && mensagem.payload) {
      const payload = mensagem.payload as any;
      if (payload.reply?.list_reply?.title) {
        const desc = payload.reply.list_reply.description?.trim();
        return desc ? `📝 ${payload.reply.list_reply.title}   (${desc})` : `📝 ${payload.reply.list_reply.title}`;
      }
      if (payload.reply?.buttons_reply?.title) return `📝 ${payload.reply.buttons_reply.title}`;
      if (payload.reply?.title) return `📝 ${payload.reply.title}`;
    }
    
    // Mensagem interativa (payload do bot) - sempre usa payload para garantir dados completos
    if (mensagem.payload) {
      const payload = mensagem.payload as any;
      if (payload.type === 'interactive' || mensagem.conteudo === '[interactive]') {
        return buildInteractiveText(payload.interactive);
      }
      if (payload.type === 'list' || mensagem.conteudo === '[list]') {
        return buildListText(payload.list);
      }
    }
    
    return stripHumanModePrefix(mensagem.conteudo || '');
  };

  const senderLabel = getSenderLabel();
  const displayContent = getDisplayContent();

  const hasMedia = !!mensagem.media_url && !!mensagem.media_kind;

  const repliedMessage =
    mensagem.reply_to_message_id != null
      ? mensagens.find((m) => m.id === mensagem.reply_to_message_id)
      : null;

  const getMediaTitle = () => {
    switch (mensagem.media_kind) {
      case 'image':
        return 'Imagem';
      case 'audio':
        return 'Mensagem de voz';
      case 'document':
      default:
        return mensagem.media_filename || 'Documento';
    }
  };

  const getMediaIcon = () => {
    switch (mensagem.media_kind) {
      case 'image':
        return '🖼';
      case 'audio':
        return '🔊';
      case 'document':
      default:
        return '📄';
    }
  };

  const getMediaLabel = () => {
    switch (mensagem.media_kind) {
      case 'image':
        return 'Baixar imagem';
      case 'audio':
        return 'Baixar áudio';
      case 'document':
      default:
        return 'Baixar documento';
    }
  };

  return (
    <div
      className={cn(
        'flex animate-fade-in',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isOutgoing
            ? 'bg-chat-outgoing text-chat-outgoing-text rounded-br-md'
            : 'bg-chat-incoming text-foreground rounded-bl-md'
        )}
      >
        {repliedMessage && (
          <div className="mb-1 rounded-md bg-black/5 px-2 py-1 text-[11px] border-l-2 border-border/60">
            <p className="font-semibold truncate">
              {repliedMessage.tipo_remetente === 'agente'
                ? 'Você'
                : repliedMessage.tipo_remetente === 'bot'
                ? 'Bot'
                : repliedMessage.tipo_remetente === 'sistema'
                ? 'Sistema'
                : 'Cliente'}
            </p>
            <p className="truncate">
              {repliedMessage.media_kind === 'image'
                ? '[imagem]'
                : repliedMessage.media_kind === 'audio'
                ? '[áudio]'
                : repliedMessage.media_kind === 'document'
                ? repliedMessage.media_filename || '[documento]'
                : repliedMessage.conteudo || ''}
            </p>
          </div>
        )}
        {senderLabel && (
          <p className={cn(
            'text-xs font-medium mb-1',
            isOutgoing ? 'text-chat-outgoing-text/70' : 'text-primary'
          )}>
            {senderLabel}
          </p>
        )}
        {hasMedia && (
          <>
            {/* Documento: card com ícone, nome do arquivo e texto "Baixar documento" */}
            {mensagem.media_kind === 'document' && mensagem.media_url && (
              <a
                href={mensagem.media_url}
                target="_blank"
                rel="noreferrer"
                download={mensagem.media_filename ?? undefined}
                className="mb-2 block rounded-lg border border-border/50 bg-muted/30 p-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {getMediaIcon()}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {getMediaTitle()}
                  </span>
                </div>
                <span
                  className={cn(
                    'mt-2 inline-block text-xs font-medium underline underline-offset-2',
                    isOutgoing ? 'text-chat-outgoing-text' : 'text-primary'
                  )}
                >
                  Baixar documento
                </span>
              </a>
            )}

            {/* Imagem: título "Imagem" + preview + texto "Baixar imagem" */}
            {mensagem.media_kind === 'image' && mensagem.media_url && (
              <a
                href={mensagem.media_url}
                target="_blank"
                rel="noreferrer"
                download={mensagem.media_filename ?? undefined}
                className="mb-2 block rounded-lg border border-border/50 bg-muted/30 p-3 hover:bg-muted transition-colors"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {getMediaIcon()}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {getMediaTitle()}
                  </span>
                </div>
                <img
                  src={mensagem.media_url}
                  alt={mensagem.media_filename || 'Imagem'}
                  className="max-h-64 w-full rounded-md object-contain bg-black/10"
                />
                <span
                  className={cn(
                    'mt-2 inline-block text-xs font-medium underline underline-offset-2',
                    isOutgoing ? 'text-chat-outgoing-text' : 'text-primary'
                  )}
                >
                  Baixar imagem
                </span>
              </a>
            )}

            {/* Áudio: card compacto, altura semelhante ao documento */}
            {mensagem.media_kind === 'audio' && mensagem.media_url && (
              <div className="mb-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {getMediaIcon()}
                  </span>
                  <span className="truncate text-sm font-medium">
                    Mensagem de voz
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!audioRef.current) return;
                      if (isAudioPlaying) {
                        audioRef.current.pause();
                        setIsAudioPlaying(false);
                      } else {
                        audioRef.current.play();
                        setIsAudioPlaying(true);
                      }
                    }}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border border-border/60 hover:bg-muted transition-colors',
                      isOutgoing ? 'text-chat-outgoing-text' : 'text-primary'
                    )}
                    aria-label={isAudioPlaying ? 'Pausar mensagem de voz' : 'Reproduzir mensagem de voz'}
                  >
                    {isAudioPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <div className="flex-1 h-1 rounded-full bg-border/70" />
                  <a
                    href={mensagem.media_url}
                    target="_blank"
                    rel="noreferrer"
                    download={mensagem.media_filename ?? undefined}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border border-border/60 hover:bg-muted transition-colors',
                      isOutgoing ? 'text-chat-outgoing-text' : 'text-primary'
                    )}
                    aria-label="Baixar mensagem de voz"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
                <audio
                  ref={audioRef}
                  className="hidden"
                  onEnded={() => setIsAudioPlaying(false)}
                  onPause={() => setIsAudioPlaying(false)}
                >
                  <source
                    src={mensagem.media_url}
                    type={mensagem.media_mime || 'audio/ogg'}
                  />
                </audio>
              </div>
            )}
          </>
        )}
        {!hasMedia && (
          <FormattedMessageContent content={displayContent} isOutgoing={isOutgoing} />
        )}
        {onReply && (
          <button
            type="button"
            className={cn(
              'mt-1 text-[11px] underline underline-offset-2',
              isOutgoing ? 'text-chat-outgoing-text/70' : 'text-muted-foreground'
            )}
            onClick={() => onReply(mensagem)}
          >
            Responder
          </button>
        )}
        <p className={cn(
          'text-xs mt-1',
          isOutgoing ? 'text-chat-outgoing-text/60' : 'text-muted-foreground'
        )}>
          {format(new Date(mensagem.criado_em), 'HH:mm', { locale: ptBR })}
        </p>
      </div>
    </div>
  );
}
