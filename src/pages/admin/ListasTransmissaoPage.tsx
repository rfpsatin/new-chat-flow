import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { useApp } from '@/contexts/AppContext';
import {
  useListasTransmissao,
  useCriarListaTransmissao,
  useListaTransmissaoContatos,
  useAdicionarContatoListaTransmissao,
  useAtualizarListaTransmissao,
} from '@/hooks/useListasTransmissao';
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
  const [selectedListaId, setSelectedListaId] = useState<string | null>(null);
  const [telefoneNovoContato, setTelefoneNovoContato] = useState('');

  const { data: contatosLista, isLoading: contatosLoading } = useListaTransmissaoContatos(
    selectedListaId,
  );
  const adicionarContatoLista = useAdicionarContatoListaTransmissao();
  const atualizarLista = useAtualizarListaTransmissao();

  const selectedLista = useMemo(
    () => listas?.find((l) => l.id === selectedListaId) ?? null,
    [listas, selectedListaId],
  );

  const [inviteUrlDraft, setInviteUrlDraft] = useState('');

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

  // Sincroniza inviteUrlDraft quando troca a lista selecionada
  useMemo(() => {
    if (selectedLista) {
      setInviteUrlDraft(selectedLista.invite_url ?? '');
    } else {
      setInviteUrlDraft('');
    }
  }, [selectedLista]);

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
            <CardTitle>Criar novo canal / newsletter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do canal *</label>
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
            <CardTitle>Canais / newsletters cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando listas...
              </div>
            ) : !listas?.length ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum canal/newsletter criado ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-3 lg:col-span-1">
                  {listas.map((lista) => {
                    const isSelected = selectedListaId === lista.id;
                    return (
                      <button
                        key={lista.id}
                        type="button"
                        onClick={() => setSelectedListaId(lista.id)}
                        className={`w-full text-left border rounded-md px-3 py-2 flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-accent/60 border-primary' : 'hover:bg-muted/60'
                        }`}
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
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-2">
                  {selectedListaId ? (
                    <div className="space-y-4">
                      <h2 className="text-sm font-semibold">
                        Configuração do canal selecionado
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Link de convite do canal</label>
                          <Input
                            value={inviteUrlDraft}
                            onChange={(e) => setInviteUrlDraft(e.target.value)}
                            placeholder="Cole aqui o link de convite do canal do WhatsApp"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use o link de convite gerado pelo seu canal oficial (ex: canal &quot;Ricardo
                            Isenções&quot;). Este link será usado para gerar QR Codes de assinatura.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!selectedListaId) return;
                              void atualizarLista
                                .mutateAsync({
                                  id: selectedListaId,
                                  payload: { invite_url: inviteUrlDraft || null },
                                })
                                .catch((err) => console.error(err));
                            }}
                            disabled={atualizarLista.isPending || !selectedListaId}
                          >
                            {atualizarLista.isPending && (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            )}
                            Salvar link do canal
                          </Button>
                        </div>
                        <div className="space-y-2 flex flex-col items-center justify-center">
                          <span className="text-sm font-medium mb-1">QR Code para assinatura</span>
                          {selectedLista?.invite_url ? (
                            <div className="border rounded-md p-2 bg-white">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                                  selectedLista.invite_url,
                                )}`}
                                alt="QR Code do canal"
                                className="w-[220px] h-[220px]"
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center">
                              Informe e salve o link de convite do canal para gerar o QR Code de
                              assinatura.
                            </p>
                          )}
                        </div>
                      </div>

                      <h2 className="text-sm font-semibold pt-2">
                        Contatos vinculados a este canal (para futuras campanhas)
                      </h2>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-sm font-medium">
                            Adicionar contato pelo telefone (somente cadastro existente) *
                          </label>
                          <Input
                            value={telefoneNovoContato}
                            onChange={(e) => setTelefoneNovoContato(e.target.value)}
                            placeholder="Ex: 554499356186"
                            className="mt-1"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!empresaId || !selectedListaId || !telefoneNovoContato.trim()) return;
                            void adicionarContatoLista.mutateAsync({
                              listaId: selectedListaId,
                              empresaId,
                              telefoneRaw: telefoneNovoContato,
                            }).then(() => {
                              setTelefoneNovoContato('');
                            }).catch((err) => {
                              console.error(err);
                              // Erros mais amigáveis serão tratados em melhorias futuras (ex: toasts)
                            });
                          }}
                          disabled={
                            !empresaId ||
                            !telefoneNovoContato.trim() ||
                            adicionarContatoLista.isPending
                          }
                        >
                          {adicionarContatoLista.isPending && (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          )}
                          Adicionar contato
                        </Button>
                      </div>

                      <div className="border rounded-md p-3 max-h-[260px] overflow-y-auto">
                        {contatosLoading ? (
                          <div className="py-4 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando contatos da lista...
                          </div>
                        ) : !contatosLista?.length ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum contato vinculado ainda. Use o campo acima para adicionar, sempre
                            a partir de contatos já existentes no cadastro.
                          </p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {contatosLista.map((c) => (
                              <li
                                key={c.id}
                                className="flex items-center justify-between gap-2 border-b last:border-b-0 py-1"
                              >
                                <span className="truncate">
                                  {c.contato?.nome || c.whatsapp_numero}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {c.whatsapp_numero}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Selecione uma lista à esquerda para visualizar e vincular contatos.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

