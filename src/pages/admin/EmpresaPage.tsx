import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { AdminGuard } from '@/components/AdminGuard';
import { useApp } from '@/contexts/AppContext';
import { useEmpresa, EmpresaFormData } from '@/hooks/useEmpresa';
import { useGoogleDriveIntegracao } from '@/hooks/useGoogleDriveIntegracao';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function EmpresaPage() {
  const { currentUser } = useApp();
  const empresaId = currentUser?.empresa_id ?? '';

  const { empresa, isLoading, salvarEmpresa } = useEmpresa(empresaId);
  const { status: driveStatus, isLoadingStatus, iniciarConexao, atualizarStatus } = useGoogleDriveIntegracao(empresaId);

  const [form, setForm] = useState<EmpresaFormData>({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    ativo: true,
  });

  useEffect(() => {
    if (empresa) {
      setForm({
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia ?? '',
        cnpj: empresa.cnpj,
        ativo: empresa.ativo,
      });
    }
  }, [empresa]);

  const handleChange = (field: keyof EmpresaFormData, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.razao_social.trim() || !form.cnpj.trim()) return;

    salvarEmpresa.mutate({
      ...form,
      razao_social: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim(),
      cnpj: form.cnpj.trim(),
    });
  };

  const isSaving = salvarEmpresa.isPending;

  return (
    <MainLayout>
      <AdminGuard>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dados da Empresa</h1>
                <p className="text-muted-foreground">
                  Gerencie as informações cadastrais da empresa.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cadastro da empresa</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading && !empresa ? (
                  <p className="text-muted-foreground">Carregando dados da empresa...</p>
                ) : !empresa ? (
                  <p className="text-muted-foreground">
                    Nenhuma empresa encontrada para o usuário atual.
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="razao_social">Razão social</Label>
                      <Input
                        id="razao_social"
                        value={form.razao_social}
                        onChange={(event) => handleChange('razao_social', event.target.value)}
                        placeholder="Razão social da empresa"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nome_fantasia">Nome fantasia</Label>
                      <Input
                        id="nome_fantasia"
                        value={form.nome_fantasia}
                        onChange={(event) => handleChange('nome_fantasia', event.target.value)}
                        placeholder="Nome fantasia (opcional)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={form.cnpj}
                        onChange={(event) => handleChange('cnpj', event.target.value)}
                        placeholder="00.000.000/0000-00"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="ativo">Empresa ativa</Label>
                        <p className="text-xs text-muted-foreground">
                          Controla se a empresa está ativa no sistema.
                        </p>
                      </div>
                      <Switch
                        id="ativo"
                        checked={form.ativo}
                        onCheckedChange={(checked) => handleChange('ativo', checked)}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="submit"
                        disabled={
                          isSaving ||
                          !form.razao_social.trim() ||
                          !form.cnpj.trim()
                        }
                      >
                        {isSaving ? 'Salvando...' : 'Salvar alterações'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Google Drive da empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingStatus ? (
                  <p className="text-muted-foreground">Verificando conexao com Google Drive...</p>
                ) : (
                  <>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Status:</span>{' '}
                        {driveStatus?.connected ? 'Conectado' : 'Nao conectado'}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Conta Google:</span>{' '}
                        {driveStatus?.config?.google_user_email || '-'}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Pasta raiz (ID):</span>{' '}
                        {driveStatus?.config?.google_drive_root_folder_id || '-'}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Ultima atualizacao:</span>{' '}
                        {driveStatus?.config?.updated_at
                          ? new Date(driveStatus.config.updated_at).toLocaleString('pt-BR')
                          : '-'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => iniciarConexao.mutate()}
                        disabled={iniciarConexao.isPending || !empresaId}
                      >
                        {driveStatus?.connected ? 'Reconectar Google Drive' : 'Conectar Google Drive'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={atualizarStatus}
                        disabled={!empresaId}
                      >
                        Atualizar status
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </AdminGuard>
    </MainLayout>
  );
}

