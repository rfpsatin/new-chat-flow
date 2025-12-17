import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { AdminGuard } from '@/components/AdminGuard';
import { useApp } from '@/contexts/AppContext';
import { useMotivos, MotivoFormData } from '@/hooks/useMotivos';
import { MotivoDialog } from '@/components/MotivoDialog';
import { MotivoEncerramento } from '@/types/atendimento';
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
import { Plus, Search, Pencil, Check, X } from 'lucide-react';

export default function MotivosPage() {
  const { currentUser } = useApp();
  const empresaId = currentUser?.empresa_id ?? '';
  
  const { motivos, isLoading, criarMotivo, editarMotivo, toggleAtivoMotivo } = useMotivos(empresaId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [motivoEditando, setMotivoEditando] = useState<MotivoEncerramento | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const motivosFiltrados = motivos.filter((m) => {
    const matchSearch = m.descricao.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || 
                       (filtroStatus === 'ativo' && m.ativo) ||
                       (filtroStatus === 'inativo' && !m.ativo);
    return matchSearch && matchStatus;
  });

  const handleNovoMotivo = () => {
    setMotivoEditando(null);
    setDialogOpen(true);
  };

  const handleEditarMotivo = (motivo: MotivoEncerramento) => {
    setMotivoEditando(motivo);
    setDialogOpen(true);
  };

  const handleSalvar = (dados: MotivoFormData) => {
    if (motivoEditando) {
      editarMotivo.mutate(
        { id: motivoEditando.id, dados },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      criarMotivo.mutate(dados, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleToggleAtivo = (motivo: MotivoEncerramento) => {
    toggleAtivoMotivo.mutate({ id: motivo.id, ativo: !motivo.ativo });
  };

  return (
    <MainLayout>
      <AdminGuard>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Motivos de Encerramento</h1>
                <p className="text-muted-foreground">Gerencie os motivos para encerrar conversas</p>
              </div>
              <Button onClick={handleNovoMotivo}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Motivo
              </Button>
            </div>
            
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
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
            ) : motivosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <p className="text-muted-foreground">Nenhum motivo encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {motivosFiltrados.map((motivo) => (
                    <TableRow key={motivo.id}>
                      <TableCell className="font-medium">{motivo.descricao}</TableCell>
                      <TableCell>
                        <Badge variant={motivo.ativo ? 'default' : 'outline'}>
                          {motivo.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarMotivo(motivo)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleAtivo(motivo)}
                          >
                            {motivo.ativo ? (
                              <X className="w-4 h-4 text-destructive" />
                            ) : (
                              <Check className="w-4 h-4 text-green-600" />
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

        <MotivoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          motivo={motivoEditando}
          onSave={handleSalvar}
          isLoading={criarMotivo.isPending || editarMotivo.isPending}
        />
      </AdminGuard>
    </MainLayout>
  );
}
