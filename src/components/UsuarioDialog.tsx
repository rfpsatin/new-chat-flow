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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Usuario } from '@/types/atendimento';
import { UsuarioFormData } from '@/hooks/useGestaoUsuarios';

interface UsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: Usuario | null;
  onSave: (dados: UsuarioFormData) => void;
  isLoading?: boolean;
}

export function UsuarioDialog({
  open,
  onOpenChange,
  usuario,
  onSave,
  isLoading,
}: UsuarioDialogProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'sup' | 'opr'>('opr');

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome);
      setEmail(usuario.email);
      setTipoUsuario(usuario.tipo_usuario as 'sup' | 'opr');
    } else {
      setNome('');
      setEmail('');
      setTipoUsuario('opr');
    }
  }, [usuario, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    
    onSave({
      nome: nome.trim(),
      email: email.trim(),
      tipo_usuario: tipoUsuario,
    });
  };

  const isEditing = !!usuario;

  // Texto de ajuda baseado no tipo selecionado
  const getTipoHelp = () => {
    if (tipoUsuario === 'opr') {
      return 'Operadores são atendentes que atendem clientes na fila.';
    }
    return 'Supervisores fazem triagem inicial das conversas.';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Usuário</Label>
            <Select value={tipoUsuario} onValueChange={(v) => setTipoUsuario(v as 'sup' | 'opr')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opr">Operador</SelectItem>
                <SelectItem value="sup">Supervisor</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{getTipoHelp()}</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !nome.trim() || !email.trim()}>
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
