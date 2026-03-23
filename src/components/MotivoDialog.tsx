import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MotivoEncerramento } from '@/types/atendimento';
import { MotivoFormData } from '@/hooks/useMotivos';

interface MotivoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motivo?: MotivoEncerramento | null;
  onSave: (dados: MotivoFormData) => void;
  isLoading?: boolean;
}

export function MotivoDialog({
  open,
  onOpenChange,
  motivo,
  onSave,
  isLoading,
}: MotivoDialogProps) {
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (motivo) {
      setDescricao(motivo.descricao);
    } else {
      setDescricao('');
    }
  }, [motivo, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;
    
    onSave({
      descricao: descricao.trim(),
    });
  };

  const isEditing = !!motivo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Motivo' : 'Novo Motivo de Encerramento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Problema resolvido"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !descricao.trim()}>
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
