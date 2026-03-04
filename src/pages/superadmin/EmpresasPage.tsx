import { useState } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { useSuperAdminEmpresas } from '@/hooks/useSuperAdminEmpresas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Power } from 'lucide-react';
import { format } from 'date-fns';

interface EmpresaForm {
  id?: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
}

const emptyForm: EmpresaForm = { razao_social: '', nome_fantasia: '', cnpj: '' };

export default function SuperAdminEmpresasPage() {
  const { data: empresas, isLoading, createMutation, updateMutation, toggleAtivoMutation } = useSuperAdminEmpresas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EmpresaForm>(emptyForm);
  const isEditing = !!form.id;

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e: any) => {
    setForm({ id: e.id, razao_social: e.razao_social, nome_fantasia: e.nome_fantasia || '', cnpj: e.cnpj });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (isEditing) {
      updateMutation.mutate(form as any, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <SuperAdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Empresas</h1>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Empresa
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.razao_social}</TableCell>
                    <TableCell>{emp.nome_fantasia || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{emp.cnpj}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate" title={emp.id}>{emp.id}</TableCell>
                    <TableCell>
                      <Badge variant={emp.ativo ? 'default' : 'secondary'}>
                        {emp.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(emp.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(emp)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleAtivoMutation.mutate({ id: emp.id, ativo: !emp.ativo })}
                        title={emp.ativo ? 'Desativar' : 'Ativar'}
                      >
                        <Power className={`h-4 w-4 ${emp.ativo ? 'text-destructive' : 'text-green-600'}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {empresas?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma empresa cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia} onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
