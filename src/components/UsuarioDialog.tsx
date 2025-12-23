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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Usuario } from '@/types/atendimento';
import { UsuarioFormData } from '@/hooks/useGestaoUsuarios';

interface AtendenteInfo {
  ehAtendente: boolean;
  paraTriagem: boolean;
}

interface UsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: Usuario | null;
  atendenteInfo?: AtendenteInfo | null;
  onSave: (dados: UsuarioFormData) => void;
  isLoading?: boolean;
}

export function UsuarioDialog({
  open,
  onOpenChange,
  usuario,
  atendenteInfo,
  onSave,
  isLoading,
}: UsuarioDialogProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'sup' | 'opr'>('opr');
  const [ehAtendente, setEhAtendente] = useState(false);
  const [paraTriagem, setParaTriagem] = useState(false);

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome);
      setEmail(usuario.email);
      setTipoUsuario(usuario.tipo_usuario as 'sup' | 'opr');
      setEhAtendente(atendenteInfo?.ehAtendente ?? false);
      setParaTriagem(atendenteInfo?.paraTriagem ?? false);
    } else {
      setNome('');
      setEmail('');
      setTipoUsuario('opr');
      setEhAtendente(false);
      setParaTriagem(false);
    }
  }, [usuario, atendenteInfo, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    
    onSave({
      nome: nome.trim(),
      email: email.trim(),
      tipo_usuario: tipoUsuario,
      ehAtendente,
      paraTriagem: ehAtendente ? paraTriagem : false,
    });
  };

  const isEditing = !!usuario;

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
          </div>
          
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ehAtendente">É Atendente</Label>
                <p className="text-xs text-muted-foreground">
                  Permite atender clientes na fila
                </p>
              </div>
              <Switch
                id="ehAtendente"
                checked={ehAtendente}
                onCheckedChange={setEhAtendente}
              />
            </div>
            
            {ehAtendente && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="paraTriagem">Para Triagem</Label>
                  <p className="text-xs text-muted-foreground">
                    Recebe conversas para triagem inicial
                  </p>
                </div>
                <Switch
                  id="paraTriagem"
                  checked={paraTriagem}
                  onCheckedChange={setParaTriagem}
                />
              </div>
            )}
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
