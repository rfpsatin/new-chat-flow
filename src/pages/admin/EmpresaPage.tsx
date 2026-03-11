import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { AdminGuard } from '@/components/AdminGuard';
import { useApp } from '@/contexts/AppContext';
import { useEmpresa, EmpresaFormData } from '@/hooks/useEmpresa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function EmpresaPage() {
  const { currentUser } = useApp();
  const empresaId = currentUser?.empresa_id ?? '';

  const { empresa, isLoading, salvarEmpresa } = useEmpresa(empresaId);

  const [form, setForm] = useState<EmpresaFormData>({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    ativo: true,
    agente_ia_ativo: false,
  });

  useEffect(() => {
    if (empresa) {
      setForm({
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia ?? '',
        cnpj: empresa.cnpj,
        ativo: empresa.ativo,
        agente_ia_ativo: empresa.agente_ia_ativo ?? false,
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
            <Card className="max-w-2xl">
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

                    <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="agente_ia_ativo">Agente de IA ativo</Label>
                        <p className="text-xs text-muted-foreground">
                          Quando ativo, novas conversas do cliente vão para o Bot (agente IA).
                          Quando desativado, vão direto para Triagem (atendimento humano).
                        </p>
                      </div>
                      <Switch
                        id="agente_ia_ativo"
                        checked={form.agente_ia_ativo}
                        onCheckedChange={(checked) => handleChange('agente_ia_ativo', checked)}
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
          </div>
        </div>
      </AdminGuard>
    </MainLayout>
  );
}

