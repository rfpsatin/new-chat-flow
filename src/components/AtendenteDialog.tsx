import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAtendentes, Atendente, CreateAtendenteData, UpdateAtendenteData } from '@/hooks/useAtendentes';
import { useApp } from '@/contexts/AppContext';
import { Loader2 } from 'lucide-react';

interface AtendenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendente?: Atendente | null;
}

export function AtendenteDialog({ open, onOpenChange, atendente }: AtendenteDialogProps) {
  const { currentUser } = useApp();
  const { data: usuarios } = useUsuarios(currentUser?.empresa_id || '');
  const { createAtendente, updateAtendente, atendentes } = useAtendentes();
  
  const [usuarioId, setUsuarioId] = useState('');
  const [nome, setNome] = useState('');
  const [paraTriagem, setParaTriagem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!atendente;

  // Filtrar usuários que já são atendentes (exceto o atual se editando)
  const usuariosDisponiveis = usuarios?.filter(user => {
    if (isEditing && atendente.usuario_id === user.id) return true;
    return !atendentes?.some(a => a.usuario_id === user.id);
  });

  useEffect(() => {
    if (atendente) {
      setUsuarioId(atendente.usuario_id);
      setNome(atendente.nome);
      setParaTriagem(atendente.para_triagem);
    } else {
      setUsuarioId('');
      setNome('');
      setParaTriagem(false);
    }
  }, [atendente, open]);

  // Auto-preencher nome quando selecionar usuário
  useEffect(() => {
    if (!isEditing && usuarioId) {
      const usuario = usuarios?.find(u => u.id === usuarioId);
      if (usuario) {
        setNome(usuario.nome);
      }
    }
  }, [usuarioId, usuarios, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      if (isEditing) {
        const updateData: UpdateAtendenteData = {
          id: atendente.id,
          nome: nome.trim(),
          para_triagem: paraTriagem,
        };
        await updateAtendente.mutateAsync(updateData);
      } else {
        if (!usuarioId) return;
        const createData: CreateAtendenteData = {
          usuario_id: usuarioId,
          nome: nome.trim(),
          para_triagem: paraTriagem,
        };
        await createAtendente.mutateAsync(createData);
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (tipo: string) => {
    switch (tipo) {
      case 'adm': return 'Administrador';
      case 'sup': return 'Supervisor';
      case 'opr': return 'Operador';
      default: return tipo;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Atendente' : 'Novo Atendente'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usuario">Usuário</Label>
            <Select
              value={usuarioId}
              onValueChange={setUsuarioId}
              disabled={isEditing}
            >
              <SelectTrigger id="usuario">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {usuariosDisponiveis?.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <span>{user.nome}</span>
                    <span className="text-muted-foreground ml-2">
                      — {getRoleLabel(user.tipo_usuario)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                O usuário não pode ser alterado após o cadastro
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Atendente</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome para exibição"
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="triagem" className="cursor-pointer">
                Para Triagem
              </Label>
              <p className="text-sm text-muted-foreground">
                Pode receber conversas para triagem
              </p>
            </div>
            <Switch
              id="triagem"
              checked={paraTriagem}
              onCheckedChange={setParaTriagem}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!isEditing && !usuarioId) || !nome.trim()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
