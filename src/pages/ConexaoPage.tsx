import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { AdminGuard } from '@/components/AdminGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWhapiConnection } from '@/hooks/useWhapiConnection';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export default function ConexaoPage() {
  const {
    connectionInfo,
    isLoading,
    refreshStatus,
    requestQr,
    reconnect,
    updateToken,
  } = useWhapiConnection();

  const [tokenInput, setTokenInput] = useState('');
  const [qrImage, setQrImage] = useState<string | null>(null);

  const statusMeta = useMemo(() => {
    const status = connectionInfo?.whapi_status || 'unknown';
    switch (status) {
      case 'connected':
        return { label: 'Conectado', variant: 'default' as const };
      case 'pairing':
        return { label: 'Aguardando QR', variant: 'secondary' as const };
      case 'disconnected':
        return { label: 'Desconectado', variant: 'destructive' as const };
      case 'service_off':
        return { label: 'Serviço parado', variant: 'destructive' as const };
      case 'banned':
        return { label: 'Banido', variant: 'destructive' as const };
      case 'connecting':
        return { label: 'Conectando', variant: 'secondary' as const };
      case 'not_configured':
        return { label: 'Não configurado', variant: 'secondary' as const };
      case 'error':
        return { label: 'Erro', variant: 'destructive' as const };
      default:
        return { label: 'Desconhecido', variant: 'secondary' as const };
    }
  }, [connectionInfo?.whapi_status]);

  const handleSaveToken = () => {
    if (!tokenInput.trim()) return;
    updateToken.mutate(tokenInput.trim());
    setTokenInput('');
  };

  const handleRequestQr = async () => {
    try {
      const result = await requestQr.mutateAsync();
      setQrImage(result?.qr_image || null);
    } catch {
      setQrImage(null);
    }
  };

  return (
    <MainLayout>
      <AdminGuard>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Conexão Whapi</h1>
                <p className="text-muted-foreground">
                  Monitore o status e configure a conexão com o WhatsApp via Whapi.
                </p>
              </div>
              <Button
                onClick={() => refreshStatus.mutate()}
                disabled={refreshStatus.isPending || isLoading}
              >
                Atualizar status
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Status da conexão</CardTitle>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Status bruto</p>
                    <p className="font-medium">{connectionInfo?.whapi_status_raw || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Atualizado em</p>
                    <p className="font-medium">
                      {formatDate(connectionInfo?.whapi_status_updated_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Último erro</p>
                    <p className="font-medium">{connectionInfo?.whapi_last_error || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Último QR</p>
                    <p className="font-medium">{formatDate(connectionInfo?.whapi_last_qr_at)}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => reconnect.mutate()}
                    disabled={reconnect.isPending}
                  >
                    Tentar reconectar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRequestQr}
                    disabled={requestQr.isPending}
                  >
                    Gerar QR
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QR Code de pareamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {qrImage ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={qrImage}
                      alt="QR Code de pareamento"
                      className="w-60 h-60 border border-border rounded-md"
                    />
                    <p className="text-sm text-muted-foreground">
                      Escaneie o QR code com o WhatsApp para reestabelecer a conexão.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Clique em “Gerar QR” para exibir o QR code quando a conexão exigir pareamento.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuração do token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {connectionInfo?.whapi_token
                    ? 'Token configurado. Você pode atualizar se necessário.'
                    : 'Token não configurado. Informe o token do Whapi para iniciar a conexão.'}
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <Input
                    type="password"
                    placeholder="Cole o token do Whapi"
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                  />
                  <Button
                    onClick={handleSaveToken}
                    disabled={updateToken.isPending || !tokenInput.trim()}
                  >
                    Salvar token
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminGuard>
    </MainLayout>
  );
}
