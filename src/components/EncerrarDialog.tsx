import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useMotivosEncerramento, useEncerrarConversa } from '@/hooks/useEncerramento';
import { FilaAtendimento } from '@/types/atendimento';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EncerrarDialogProps {
  conversa: FilaAtendimento;
  onClose: () => void;
}

export function EncerrarDialog({ conversa, onClose }: EncerrarDialogProps) {
  const { currentUser, empresaId, setSelectedConversa } = useApp();
  const { data: motivos } = useMotivosEncerramento(empresaId);
  const encerrarConversa = useEncerrarConversa();
  const { toast } = useToast();
  
  const [selectedMotivo, setSelectedMotivo] = useState<string>('');
  const [resumo, setResumo] = useState('');

  const handleEncerrar = async () => {
    if (!selectedMotivo || !currentUser) return;
    
    try {
      await encerrarConversa.mutateAsync({
        conversaId: conversa.conversa_id,
        motivoId: selectedMotivo,
        usuarioId: currentUser.id,
        resumo: resumo.trim() || undefined,
        empresaId: conversa.empresa_id,
        contatoId: conversa.contato_id,
        whatsapp_numero: conversa.whatsapp_numero,
      });
      
      toast({
        title: 'Atendimento encerrado',
        description: 'A conversa foi encerrada e movida para o histórico.',
      });
      
      setSelectedConversa(null);
      onClose();
    } catch (error) {
      toast({
        title: 'Erro ao encerrar',
        description: 'Não foi possível encerrar o atendimento.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar Atendimento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo do encerramento *</Label>
            <Select value={selectedMotivo} onValueChange={setSelectedMotivo}>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecione um motivo..." />
              </SelectTrigger>
              <SelectContent>
                {motivos?.map(motivo => (
                  <SelectItem key={motivo.id} value={motivo.id}>
                    {motivo.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="resumo">Resumo do atendimento (opcional)</Label>
            <Textarea
              id="resumo"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="Descreva brevemente o que foi resolvido..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleEncerrar}
            disabled={!selectedMotivo || encerrarConversa.isPending}
          >
            {encerrarConversa.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Encerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
