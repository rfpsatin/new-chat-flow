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
  empresaInfo?: {
    id: string;
    nome: string;
  } | null;
}

export function UsuarioDialog({
  open,
  onOpenChange,
  usuario,
  onSave,
  isLoading,
  empresaInfo,
}: UsuarioDialogProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'sup' | 'opr'>('opr');

  const isEditing = !!usuario;

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome);
      setEmail(usuario.email);
      setTipoUsuario(usuario.tipo_usuario as 'sup' | 'opr');
      setSenha('');
    } else {
      setNome('');
      setEmail('');
      setSenha('');
      setTipoUsuario('opr');
    }
  }, [usuario, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    if (!isEditing && !senha.trim()) return;
    
    onSave({
      nome: nome.trim(),
      email: email.trim(),
      tipo_usuario: tipoUsuario,
      ...((!isEditing && senha.trim()) ? { senha: senha.trim() } : {}),
    });
  };

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
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empresa atual</p>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="empresa-nome">Empresa</Label>
                <Input
                  id="empresa-nome"
                  value={empresaInfo?.nome ?? 'Empresa nao identificada'}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="empresa-id">ID da Empresa (tenant)</Label>
                <Input
                  id="empresa-id"
                  value={empresaInfo?.id ?? '-'}
                  disabled
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Este campo nao pode ser alterado aqui. Somente super admin pode mudar o tenant.
            </p>
          </div>

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
              disabled={isEditing}
            />
          </div>
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha de acesso"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. O usuário usará esta senha para fazer login.</p>
            </div>
          )}
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
            <Button type="submit" disabled={isLoading || !nome.trim() || !email.trim() || (!isEditing && !senha.trim())}>
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
