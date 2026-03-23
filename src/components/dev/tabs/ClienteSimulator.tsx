import { useState } from 'react';
import { Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSimularCliente, useResponderPesquisa } from '../hooks/useSimularCliente';
import { useFila } from '@/hooks/useFila';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

export function ClienteSimulator() {
  const [conversaId, setConversaId] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [pesquisaConversaId, setPesquisaConversaId] = useState('');
  const [nota, setNota] = useState(0);

  const { currentUser } = useApp();
  const { data: filaData } = useFila(currentUser?.empresa_id || '');
  const simularCliente = useSimularCliente();
  const responderPesquisa = useResponderPesquisa();

  const conversasAtivas = filaData?.filter(c => c.status !== 'encerrado') || [];

  const handleEnviar = () => {
    if (!conversaId || !mensagem.trim()) {
      toast.error('Selecione uma conversa e digite uma mensagem');
      return;
    }

    simularCliente.mutate(
      { conversaId, conteudo: mensagem },
      {
        onSuccess: () => {
          toast.success('Mensagem enviada como cliente');
          setMensagem('');
        },
        onError: (error) => {
          toast.error('Erro ao enviar mensagem: ' + error.message);
        },
      }
    );
  };

  const handleResponderPesquisa = () => {
    if (!pesquisaConversaId || nota === 0) {
      toast.error('Selecione uma conversa e uma nota');
      return;
    }

    responderPesquisa.mutate(
      { conversaId: pesquisaConversaId, nota },
      {
        onSuccess: () => {
          toast.success('Pesquisa respondida!');
          setNota(0);
          setPesquisaConversaId('');
        },
        onError: (error) => {
          toast.error('Erro ao responder pesquisa: ' + error.message);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Enviar Mensagem */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Enviar Mensagem como Cliente</h3>
        
        <div className="space-y-2">
          <Label>Conversa</Label>
          <Select value={conversaId} onValueChange={setConversaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conversa" />
            </SelectTrigger>
            <SelectContent>
              {conversasAtivas.map((c) => (
                <SelectItem key={c.conversa_id} value={c.conversa_id || ''}>
                  {c.contato_nome || c.whatsapp_numero} - {c.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Mensagem</Label>
          <div className="flex gap-2">
            <Input
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite a mensagem do cliente..."
              onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
            />
            <Button 
              onClick={handleEnviar} 
              disabled={simularCliente.isPending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Responder Pesquisa */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-foreground">Responder Pesquisa de Satisfação</h3>
        
        <div className="space-y-2">
          <Label>Conversa Encerrada</Label>
          <Select value={pesquisaConversaId} onValueChange={setPesquisaConversaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conversa encerrada" />
            </SelectTrigger>
            <SelectContent>
              {filaData?.filter(c => c.status === 'encerrado').map((c) => (
                <SelectItem key={c.conversa_id} value={c.conversa_id || ''}>
                  {c.contato_nome || c.whatsapp_numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Nota</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                variant={nota >= n ? 'default' : 'outline'}
                size="icon"
                onClick={() => setNota(n)}
              >
                <Star className={`h-4 w-4 ${nota >= n ? 'fill-current' : ''}`} />
              </Button>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleResponderPesquisa}
          disabled={responderPesquisa.isPending}
          className="w-full"
        >
          Enviar Resposta
        </Button>
      </div>
    </div>
  );
}
