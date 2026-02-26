import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useContatos, useHistoricoContato } from '@/hooks/useContatos';
import { useStartConversation } from '@/hooks/useStartConversation';
import { MainLayout } from '@/components/MainLayout';
import { Contato, HistoricoConversa, ModoResposta } from '@/types/atendimento';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Phone, Calendar, MessageSquare, User, Clock, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMensagensHistorico } from '@/hooks/useHistorico';
import { toast } from 'sonner';

function MensagensDialog({ conversa, onClose }: { conversa: HistoricoConversa; onClose: () => void }) {
  const { data: mensagens, isLoading } = useMensagensHistorico(conversa.conversa_id);

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
            ) : mensagens?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma mensagem</p>
            ) : (
              mensagens?.map((msg) => (
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
                  <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
                  <div className="text-xs opacity-70 mt-1 text-right">
                    {format(new Date(msg.criado_em), 'HH:mm', { locale: ptBR })}
                  </div>
                </div>
              ))
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
  const [modoResposta, setModoResposta] = useState<ModoResposta | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) return;
    if (!modoResposta) {
      toast.error('Selecione se a resposta será pelo agente ou atendente.');
      return;
    }
    try {
      const data = await startConv.mutateAsync({
        empresa_id: empresaId,
        contato_id: contato.id,
        mensagem_inicial: mensagem.trim(),
        link: link.trim() || undefined,
        remetente_id: currentUser?.id,
        modo_resposta: modoResposta,
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
            <p className="text-sm text-muted-foreground">
              Define quem continuará a conversa. Ao receber uma resposta do cliente, o atendimento seguirá com Bot ou Atendente, conforme selecionado.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <span
                  role="radio"
                  aria-checked={modoResposta === 'agente'}
                  className={cn(
                    'block h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                    modoResposta === 'agente'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50 bg-background'
                  )}
                />
                <span className="text-sm">Bot</span>
                <input
                  type="radio"
                  name="modoResposta"
                  value="agente"
                  checked={modoResposta === 'agente'}
                  onChange={() => setModoResposta('agente')}
                  className="sr-only"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span
                  role="radio"
                  aria-checked={modoResposta === 'atendente'}
                  className={cn(
                    'block h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                    modoResposta === 'atendente'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50 bg-background'
                  )}
                />
                <span className="text-sm">Atendente</span>
                <input
                  type="radio"
                  name="modoResposta"
                  value="atendente"
                  checked={modoResposta === 'atendente'}
                  onChange={() => setModoResposta('atendente')}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!mensagem.trim() || !modoResposta || startConv.isPending}>
              {startConv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar e abrir conversa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContatosPage() {
  const navigate = useNavigate();
  const { empresaId } = useApp();
  const { data: contatos, isLoading } = useContatos(empresaId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const { data: historico } = useHistoricoContato(selectedContato?.id || null);
  const [selectedHistorico, setSelectedHistorico] = useState<HistoricoConversa | null>(null);
  const [contatoParaIniciar, setContatoParaIniciar] = useState<Contato | null>(null);

  const filteredContatos = contatos?.filter(contato =>
    contato.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contato.whatsapp_numero.includes(searchTerm)
  );

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

  return (
    <MainLayout>
      <div className="flex h-full">
        {/* Left panel - Contact list */}
        <div className="w-[380px] border-r bg-card flex flex-col">
          <div className="p-4 border-b space-y-3">
            <h2 className="font-semibold text-lg">Contatos</h2>
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
              {filteredContatos?.map(contato => (
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
                      <h2 className="text-xl font-bold text-foreground">
                        {selectedContato.nome || 'Sem nome'}
                      </h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {formatPhone(selectedContato.whatsapp_numero)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Desde {format(new Date(selectedContato.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setContatoParaIniciar(selectedContato)}
                      className="gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Iniciar conversa
                    </Button>
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
    </MainLayout>
  );
}
