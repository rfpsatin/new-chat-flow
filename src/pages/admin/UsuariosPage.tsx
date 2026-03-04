import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { AdminGuard } from '@/components/AdminGuard';
import { useApp } from '@/contexts/AppContext';
import { useGestaoUsuarios, UsuarioFormData } from '@/hooks/useGestaoUsuarios';
import { UsuarioDialog } from '@/components/UsuarioDialog';
import { Usuario } from '@/types/atendimento';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Search, Pencil, UserCheck, UserX, Headphones, KeyRound } from 'lucide-react';

interface UsuarioComAtendente extends Usuario {
  atendente?: {
    id: string;
    usuario_id: string;
    nome: string;
    para_triagem: boolean;
    ativo: boolean;
  } | null;
}

export default function UsuariosPage() {
  const { currentUser } = useApp();
  const empresaId = currentUser?.empresa_id ?? '';
  
  const { usuarios, isLoading, criarUsuario, editarUsuario, toggleAtivoUsuario, criarAcesso } = useGestaoUsuarios(empresaId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioComAtendente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // State for "Criar acesso" dialog
  const [acessoDialogOpen, setAcessoDialogOpen] = useState(false);
  const [acessoUsuario, setAcessoUsuario] = useState<UsuarioComAtendente | null>(null);
  const [acessoSenha, setAcessoSenha] = useState('');

  const usuariosFiltrados = (usuarios as UsuarioComAtendente[]).filter((u) => {
    const matchSearch = u.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || u.tipo_usuario === filtroTipo;
    const matchStatus = filtroStatus === 'todos' || 
                       (filtroStatus === 'ativo' && u.ativo) ||
                       (filtroStatus === 'inativo' && !u.ativo);
    return matchSearch && matchTipo && matchStatus;
  });

  const handleNovoUsuario = () => {
    setUsuarioEditando(null);
    setDialogOpen(true);
  };

  const handleEditarUsuario = (usuario: UsuarioComAtendente) => {
    setUsuarioEditando(usuario);
    setDialogOpen(true);
  };

  const handleSalvar = (dados: UsuarioFormData) => {
    if (usuarioEditando) {
      editarUsuario.mutate(
        { id: usuarioEditando.id, dados },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      criarUsuario.mutate(dados, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleToggleAtivo = (usuario: UsuarioComAtendente) => {
    toggleAtivoUsuario.mutate({ id: usuario.id, ativo: !usuario.ativo });
  };

  const handleCriarAcesso = (usuario: UsuarioComAtendente) => {
    setAcessoUsuario(usuario);
    setAcessoSenha('');
    setAcessoDialogOpen(true);
  };

  const handleSubmitAcesso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acessoUsuario || !acessoSenha.trim()) return;
    criarAcesso.mutate(
      { usuarioId: acessoUsuario.id, email: acessoUsuario.email, senha: acessoSenha.trim() },
      { onSuccess: () => { setAcessoDialogOpen(false); setAcessoUsuario(null); } }
    );
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'adm': return 'Administrador';
      case 'sup': return 'Supervisor';
      case 'opr': return 'Operador';
      default: return tipo;
    }
  };

  const getAtendenteLabel = (tipoUsuario: string) => {
    if (tipoUsuario === 'opr') return 'Atendente';
    if (tipoUsuario === 'sup') return 'Triagem';
    return '-';
  };

  return (
    <MainLayout>
      <AdminGuard>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
                <p className="text-muted-foreground">Gerencie operadores, supervisores e atendentes</p>
              </div>
              <Button onClick={handleNovoUsuario}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
            
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="adm">Administrador</SelectItem>
                  <SelectItem value="sup">Supervisor</SelectItem>
                  <SelectItem value="opr">Operador</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {usuariosFiltrados.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">{usuario.nome}</TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <Badge variant={usuario.tipo_usuario === 'adm' ? 'destructive' : usuario.tipo_usuario === 'sup' ? 'default' : 'secondary'}>
                            {getTipoLabel(usuario.tipo_usuario)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {usuario.tipo_usuario !== 'adm' ? (
                            <div className="flex items-center gap-2">
                              <Headphones className="w-4 h-4 text-primary" />
                              <span className="text-sm">{getAtendenteLabel(usuario.tipo_usuario)}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {usuario.auth_user_id ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <KeyRound className="w-3 h-3 mr-1" />
                              Vinculado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              Sem acesso
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={usuario.ativo ? 'default' : 'outline'}>
                            {usuario.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!usuario.auth_user_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Criar acesso (login)"
                                onClick={() => handleCriarAcesso(usuario)}
                              >
                                <KeyRound className="w-4 h-4 text-amber-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditarUsuario(usuario)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleAtivo(usuario)}
                            >
                              {usuario.ativo ? (
                                <UserCheck className="w-4 h-4 text-green-600" />
                              ) : (
                                <UserX className="w-4 h-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <UsuarioDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          usuario={usuarioEditando}
          onSave={handleSalvar}
          isLoading={criarUsuario.isPending || editarUsuario.isPending}
        />

        {/* Dialog para criar acesso Auth para usuario existente */}
        <Dialog open={acessoDialogOpen} onOpenChange={setAcessoDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Acesso de Login</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitAcesso} className="space-y-4">
              <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Nome:</span> {acessoUsuario?.nome}</p>
                <p className="text-sm"><span className="text-muted-foreground">Email:</span> {acessoUsuario?.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="acesso-senha">Senha</Label>
                <Input
                  id="acesso-senha"
                  type="password"
                  value={acessoSenha}
                  onChange={(e) => setAcessoSenha(e.target.value)}
                  placeholder="Senha de acesso"
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. O usuário usará o email acima e esta senha para fazer login.</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAcessoDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={criarAcesso.isPending || acessoSenha.trim().length < 6}>
                  {criarAcesso.isPending ? 'Criando...' : 'Criar Acesso'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AdminGuard>
    </MainLayout>
  );
}
