import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { useApp } from '@/contexts/AppContext';
import { useListasTransmissao, useCriarListaTransmissao } from '@/hooks/useListasTransmissao';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ListChecks, Loader2 } from 'lucide-react';

export default function ListasTransmissaoPage() {
  const { empresaId, currentUser } = useApp();
  const { data: listas, isLoading } = useListasTransmissao(empresaId);
  const criarLista = useCriarListaTransmissao();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const isAdmin = currentUser?.tipo_usuario === 'adm';

  const handleCriar = async () => {
    if (!empresaId || !nome.trim()) return;
    try {
      await criarLista.mutateAsync({
        empresa_id: empresaId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      });
      setNome('');
      setDescricao('');
    } catch (error) {
      // Erros serão mostrados globalmente via toasts se necessário em hooks futuros
      console.error(error);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Apenas administradores podem gerenciar listas de transmissão.
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Listas de transmissão</h1>
            <p className="text-sm text-muted-foreground">
              Crie segmentos lógicos de contatos para uso futuro em disparos seguros ou integrações com WhatsApp.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar nova lista</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da lista *</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Clientes ativos Março/2026"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Contatos com opt-in válido para WhatsApp."
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleCriar}
                disabled={!nome.trim() || criarLista.isPending || !empresaId}
              >
                {criarLista.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Criar lista
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listas cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando listas...
              </div>
            ) : !listas?.length ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma lista de transmissão criada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {listas.map((lista) => (
                  <div
                    key={lista.id}
                    className="border rounded-md px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lista.nome}</span>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {lista.status}
                        </Badge>
                      </div>
                      {lista.descricao && (
                        <p className="text-xs text-muted-foreground">{lista.descricao}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Criada em{' '}
                        {format(new Date(lista.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {lista.provider_list_id
                          ? ` • ID provedor: ${lista.provider_list_id}`
                          : ' • Ainda não sincronizada com provedor'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

