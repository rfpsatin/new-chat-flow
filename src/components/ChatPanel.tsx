import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useMensagens, useEnviarMensagem } from '@/hooks/useMensagens';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EncerrarDialog } from '@/components/EncerrarDialog';
import { AtribuirAtendentePopover } from '@/components/AtribuirAtendentePopover';
import { HistoricoClienteCollapsible } from '@/components/HistoricoClienteCollapsible';
import { ConversaTags } from '@/components/ConversaTags';

interface ChatPanelProps {
  conversa: FilaAtendimento | null;
}

export function ChatPanel({ conversa }: ChatPanelProps) {
  const { currentUser, empresaId } = useApp();
  const { data: mensagens, isLoading: mensagensLoading } = useMensagens(conversa?.conversa_id || null);
  const { data: conversaDetalhes } = useConversa(conversa?.conversa_id || null);
  const enviarMensagem = useEnviarMensagem();
  
  const [mensagemInput, setMensagemInput] = useState('');
  const [showEncerrar, setShowEncerrar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const handleEnviar = async () => {
    if (!mensagemInput.trim() || !conversa || !currentUser || !conversaDetalhes) return;
    
    await enviarMensagem.mutateAsync({
      empresaId,
      conversaId: conversa.conversa_id,
      contato_id: conversaDetalhes.contato_id,
      conteudo: mensagemInput.trim(),
      remetenteId: currentUser.id,
    });
    
    setMensagemInput('');
  };

  /**
   * Verifica se a conversa vem do n8n-webhook-cinemkt
   * Retorna true se tem source OU (channel existe E channel !== "WhatsApp")
   */
  const isN8nCinemktConversa = () => {
    if (!conversa) return false;
    const hasSource = !!conversa.source;
    const hasChannel = !!conversa.channel;
    const isWhatsAppChannel = conversa.channel === 'WhatsApp';
    
    return hasSource || (hasChannel && !isWhatsAppChannel);
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

  const canRespond = conversa.status === 'em_atendimento_humano' && 
    conversa.agente_responsavel_id === currentUser?.id;
  
  // Supervisora pode encaminhar conversas que estão aguardando triagem
  const canEncaminhar = conversa.status === 'esperando_tria' &&
    ['adm', 'sup'].includes(currentUser?.tipo_usuario || '');

  // Supervisora pode transferir conversas já em atendimento
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
              {/* Etiquetas source e channel */}
              <div className="mt-1.5">
                <ConversaTags source={conversa.source} channel={conversa.channel} />
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
                    <MessageBubble mensagem={msg} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Input - SEMPRE VISÍVEL */}
      <div className="flex-shrink-0 p-4 border-t bg-card">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleEnviar(); }}
          className="flex items-center gap-3"
        >
          <Input
            value={mensagemInput}
            onChange={(e) => setMensagemInput(e.target.value)}
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

function MessageBubble({ mensagem }: { mensagem: MensagemAtiva }) {
  const isOutgoing = mensagem.direcao === 'out';
  
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
    
    return mensagem.conteudo || '';
  };

  const senderLabel = getSenderLabel();
  const displayContent = getDisplayContent();

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
        {senderLabel && (
          <p className={cn(
            'text-xs font-medium mb-1',
            isOutgoing ? 'text-chat-outgoing-text/70' : 'text-primary'
          )}>
            {senderLabel}
          </p>
        )}
        <FormattedMessageContent content={displayContent} isOutgoing={isOutgoing} />
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
