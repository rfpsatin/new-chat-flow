import { useState } from 'react';
import { Send, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSimularBot, useTransferirParaHumano, BOT_TEMPLATES } from '../hooks/useSimularBot';
import { useFila } from '@/hooks/useFila';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

export function BotSimulator() {
  const [conversaId, setConversaId] = useState('');
  const [mensagem, setMensagem] = useState('');

  const { currentUser } = useApp();
  const { data: filaData } = useFila(currentUser?.empresa_id || '');
  const simularBot = useSimularBot();
  const transferir = useTransferirParaHumano();

  const conversasAtivas = filaData?.filter(c => c.status !== 'encerrado') || [];

  const handleEnviar = () => {
    if (!conversaId || !mensagem.trim()) {
      toast.error('Selecione uma conversa e digite uma mensagem');
      return;
    }

    simularBot.mutate(
      { conversaId, conteudo: mensagem },
      {
        onSuccess: () => {
          toast.success('Mensagem enviada como bot');
          setMensagem('');
        },
        onError: (error) => {
          toast.error('Erro ao enviar mensagem: ' + error.message);
        },
      }
    );
  };

  const handleTemplate = (template: typeof BOT_TEMPLATES[0]) => {
    if (!conversaId) {
      toast.error('Selecione uma conversa primeiro');
      return;
    }

    simularBot.mutate(
      { conversaId, conteudo: template.message },
      {
        onSuccess: () => {
          toast.success(`Template "${template.label}" enviado`);
        },
        onError: (error) => {
          toast.error('Erro ao enviar template: ' + error.message);
        },
      }
    );
  };

  const handleTransferir = () => {
    if (!conversaId) {
      toast.error('Selecione uma conversa primeiro');
      return;
    }

    transferir.mutate(conversaId, {
      onSuccess: () => {
        toast.success('Conversa transferida para atendimento humano');
      },
      onError: (error) => {
        toast.error('Erro ao transferir: ' + error.message);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Selecionar Conversa */}
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

      {/* Templates */}
      <div className="space-y-2">
        <Label>Templates Rápidos</Label>
        <div className="grid grid-cols-2 gap-2">
          {BOT_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              size="sm"
              onClick={() => handleTemplate(template)}
              disabled={simularBot.isPending}
            >
              {template.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Mensagem Personalizada */}
      <div className="space-y-2">
        <Label>Mensagem Personalizada</Label>
        <div className="flex gap-2">
          <Input
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Digite a mensagem do bot..."
            onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
          />
          <Button 
            onClick={handleEnviar} 
            disabled={simularBot.isPending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="space-y-2 pt-4 border-t">
        <Label>Ações do Bot</Label>
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleTransferir}
          disabled={transferir.isPending}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Transferir para Humano
        </Button>
      </div>
    </div>
  );
}
