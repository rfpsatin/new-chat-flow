import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AtendenteDialog } from '@/components/AtendenteDialog';
import { useAtendentes, Atendente } from '@/hooks/useAtendentes';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  UserCheck, 
  UserX,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

export default function AtendentesPage() {
  const { atendentes, isLoading, toggleAtendenteStatus } = useAtendentes();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triagemFilter, setTriagemFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAtendente, setSelectedAtendente] = useState<Atendente | null>(null);

  const filteredAtendentes = atendentes?.filter(atendente => {
    const matchesSearch = 
      atendente.nome.toLowerCase().includes(search.toLowerCase()) ||
      atendente.usuario?.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'ativo' && atendente.ativo) ||
      (statusFilter === 'inativo' && !atendente.ativo);
    
    const matchesTriagem = 
      triagemFilter === 'all' ||
      (triagemFilter === 'sim' && atendente.para_triagem) ||
      (triagemFilter === 'nao' && !atendente.para_triagem);
    
    return matchesSearch && matchesStatus && matchesTriagem;
  });

  const handleEdit = (atendente: Atendente) => {
    setSelectedAtendente(atendente);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedAtendente(null);
    setDialogOpen(true);
  };

  const handleToggleStatus = (atendente: Atendente) => {
    toggleAtendenteStatus.mutate({ id: atendente.id, ativo: !atendente.ativo });
  };

  const getRoleLabel = (tipo?: string) => {
    switch (tipo) {
      case 'adm': return 'Administrador';
      case 'sup': return 'Supervisor';
      case 'opr': return 'Operador';
      default: return tipo || '-';
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Atendentes</h1>
            <p className="text-muted-foreground">
              Gerencie os atendentes da sua equipe
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Atendente
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={triagemFilter} onValueChange={setTriagemFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Triagem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sim">Para Triagem</SelectItem>
              <SelectItem value="nao">Sem Triagem</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Para Triagem</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredAtendentes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum atendente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredAtendentes?.map((atendente) => (
                  <TableRow key={atendente.id}>
                    <TableCell className="font-medium">{atendente.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {atendente.usuario?.email || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getRoleLabel(atendente.usuario?.tipo_usuario)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {atendente.para_triagem ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={atendente.ativo ? 'default' : 'secondary'}>
                        {atendente.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(atendente)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(atendente)}>
                            {atendente.ativo ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AtendenteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        atendente={selectedAtendente}
      />
    </MainLayout>
  );
}
