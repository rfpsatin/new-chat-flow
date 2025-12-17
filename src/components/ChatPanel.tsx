import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useMensagens, useEnviarMensagem } from '@/hooks/useMensagens';
import { useConversa, useAtribuirAgente } from '@/hooks/useFila';
import { useOperadores } from '@/hooks/useUsuarios';
import { MensagemAtiva, FilaAtendimento } from '@/types/atendimento';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Send, 
  Phone, 
  UserPlus, 
  XCircle,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EncerrarDialog } from '@/components/EncerrarDialog';

interface ChatPanelProps {
  conversa: FilaAtendimento | null;
}

export function ChatPanel({ conversa }: ChatPanelProps) {
  const { currentUser, empresaId } = useApp();
  const { data: mensagens, isLoading: mensagensLoading } = useMensagens(conversa?.conversa_id || null);
  const { data: conversaDetalhes } = useConversa(conversa?.conversa_id || null);
  const { data: operadores } = useOperadores(empresaId);
  const enviarMensagem = useEnviarMensagem();
  const atribuirAgente = useAtribuirAgente();
  
  const [mensagemInput, setMensagemInput] = useState('');
  const [showEncerrar, setShowEncerrar] = useState(false);
  const [selectedAgente, setSelectedAgente] = useState<string>('');
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

  const handleAtribuir = async () => {
    if (!selectedAgente || !conversa) return;
    
    await atribuirAgente.mutateAsync({
      conversaId: conversa.conversa_id,
      agenteId: selectedAgente,
    });
    
    setSelectedAgente('');
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
  
  const canAssign = ['esperando_tria', 'fila_humano'].includes(conversa.status) &&
    ['adm', 'sup'].includes(currentUser?.tipo_usuario || '');

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(conversa.contato_nome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-foreground">
                {conversa.contato_nome || 'Sem nome'}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{formatPhone(conversa.whatsapp_numero)}</span>
              </div>
            </div>
          </div>
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
        </div>
        
        {/* Assign agent section */}
        {canAssign && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedAgente} onValueChange={setSelectedAgente}>
              <SelectTrigger className="flex-1 h-9 bg-background">
                <SelectValue placeholder="Selecione um atendente..." />
              </SelectTrigger>
              <SelectContent>
                {operadores?.map(op => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              onClick={handleAtribuir}
              disabled={!selectedAgente || atribuirAgente.isPending}
            >
              Atribuir
            </Button>
          </div>
        )}
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {mensagensLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {mensagens?.map((msg) => (
              <MessageBubble key={msg.id} mensagem={msg} />
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Input */}
      {canRespond && (
        <div className="p-4 border-t bg-card">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleEnviar(); }}
            className="flex items-center gap-3"
          >
            <Input
              value={mensagemInput}
              onChange={(e) => setMensagemInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 h-11"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-11 w-11"
              disabled={!mensagemInput.trim() || enviarMensagem.isPending}
            >
              {enviarMensagem.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      )}
      
      {showEncerrar && (
        <EncerrarDialog
          conversa={conversa}
          onClose={() => setShowEncerrar(false)}
        />
      )}
    </div>
  );
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

  const senderLabel = getSenderLabel();

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
        <p className="text-sm whitespace-pre-wrap break-words">
          {mensagem.conteudo}
        </p>
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
