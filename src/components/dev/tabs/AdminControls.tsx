import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCriarContato, useCriarConversa, useAlterarStatus, STATUS_OPTIONS } from '../hooks/useDevControls';
import { useFila } from '@/hooks/useFila';
import { useContatos } from '@/hooks/useContatos';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

export function AdminControls() {
  const [novoContatoNome, setNovoContatoNome] = useState('');
  const [novoContatoWhatsapp, setNovoContatoWhatsapp] = useState('');
  const [contatoParaConversa, setContatoParaConversa] = useState('');
  const [statusInicial, setStatusInicial] = useState('bot');
  const [conversaParaAlterar, setConversaParaAlterar] = useState('');
  const [novoStatus, setNovoStatus] = useState('');

  const { currentUser } = useApp();
  const { data: filaData } = useFila(currentUser?.empresa_id || '');
  const { data: contatos } = useContatos(currentUser?.empresa_id || '');
  const criarContato = useCriarContato();
  const criarConversa = useCriarConversa();
  const alterarStatus = useAlterarStatus();

  const handleCriarContato = () => {
    if (!novoContatoNome.trim() || !novoContatoWhatsapp.trim()) {
      toast.error('Preencha nome e WhatsApp');
      return;
    }

    criarContato.mutate(
      { nome: novoContatoNome, whatsappNumero: novoContatoWhatsapp },
      {
        onSuccess: (data) => {
          toast.success(`Contato "${data.nome}" criado!`);
          setNovoContatoNome('');
          setNovoContatoWhatsapp('');
        },
        onError: (error) => {
          toast.error('Erro ao criar contato: ' + error.message);
        },
      }
    );
  };

  const handleCriarConversa = () => {
    if (!contatoParaConversa) {
      toast.error('Selecione um contato');
      return;
    }

    criarConversa.mutate(
      { contatoId: contatoParaConversa, status: statusInicial },
      {
        onSuccess: () => {
          toast.success('Conversa criada!');
          setContatoParaConversa('');
        },
        onError: (error) => {
          toast.error('Erro ao criar conversa: ' + error.message);
        },
      }
    );
  };

  const handleAlterarStatus = () => {
    if (!conversaParaAlterar || !novoStatus) {
      toast.error('Selecione conversa e status');
      return;
    }

    alterarStatus.mutate(
      { conversaId: conversaParaAlterar, novoStatus },
      {
        onSuccess: () => {
          toast.success('Status alterado!');
          setConversaParaAlterar('');
          setNovoStatus('');
        },
        onError: (error) => {
          toast.error('Erro ao alterar status: ' + error.message);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Criar Contato */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Criar Contato</h3>
        
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={novoContatoNome}
            onChange={(e) => setNovoContatoNome(e.target.value)}
            placeholder="Nome do contato"
          />
        </div>

        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input
            value={novoContatoWhatsapp}
            onChange={(e) => setNovoContatoWhatsapp(e.target.value)}
            placeholder="5511999999999"
          />
        </div>

        <Button 
          onClick={handleCriarContato}
          disabled={criarContato.isPending}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Criar Contato
        </Button>
      </div>

      {/* Criar Conversa */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-foreground">Criar Conversa</h3>
        
        <div className="space-y-2">
          <Label>Contato</Label>
          <Select value={contatoParaConversa} onValueChange={setContatoParaConversa}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um contato" />
            </SelectTrigger>
            <SelectContent>
              {contatos?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome || c.whatsapp_numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status Inicial</Label>
          <Select value={statusInicial} onValueChange={setStatusInicial}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleCriarConversa}
          disabled={criarConversa.isPending}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Criar Conversa
        </Button>
      </div>

      {/* Alterar Status */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-foreground">Alterar Status</h3>
        
        <div className="space-y-2">
          <Label>Conversa</Label>
          <Select value={conversaParaAlterar} onValueChange={setConversaParaAlterar}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conversa" />
            </SelectTrigger>
            <SelectContent>
              {filaData?.map((c) => (
                <SelectItem key={c.conversa_id} value={c.conversa_id || ''}>
                  {c.contato_nome || c.whatsapp_numero} - {c.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Novo Status</Label>
          <Select value={novoStatus} onValueChange={setNovoStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o novo status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleAlterarStatus}
          disabled={alterarStatus.isPending}
          className="w-full"
          variant="secondary"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Alterar Status
        </Button>
      </div>
    </div>
  );
}
