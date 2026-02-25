

## Plano: Configurar agendamento automático para `run-campaigns`

### Problema

A edge function `run-campaigns` existe e funciona, mas nada a invoca automaticamente. Sem um cron job, campanhas agendadas nunca são processadas. Além disso, a função não está registrada no `config.toml` com `verify_jwt = false`, o que pode bloquear chamadas do cron.

Há também um problema de timezone no `CampanhaDetailDialog`: o valor do `datetime-local` é enviado "cru" (sem conversão para ISO/UTC), podendo causar disparos em horário errado.

### Etapas

#### 1. Registrar `run-campaigns` no `config.toml`

Adicionar a entrada para que a função aceite chamadas sem JWT (necessário para o cron via `pg_net`):

```toml
[functions.run-campaigns]
verify_jwt = false
```

#### 2. Criar cron job via SQL (pg_cron + pg_net)

Habilitar as extensões `pg_cron` e `pg_net` (se ainda não estiverem) e criar um schedule que chama `run-campaigns` a cada minuto:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'run-campaigns-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hyizldxjiwjeruxqrqbv.supabase.co/functions/v1/run-campaigns',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Isso será executado via ferramenta de insert SQL (não migração), pois contém dados específicos do projeto (URL e anon key).

#### 3. Corrigir timezone no `CampanhaDetailDialog`

No `handleAgendar` do `CampanhaDetailDialog`, converter o valor do `datetime-local` para ISO antes de enviar:

```typescript
// Antes (cru):
await agendar.mutateAsync({ campanhaId, agendado_para: agendadoPara });

// Depois (convertido para UTC):
await agendar.mutateAsync({
  campanhaId,
  agendado_para: new Date(agendadoPara).toISOString(),
});
```

O wizard (`NovaCampanhaWizard`) já faz essa conversão corretamente.

### Resumo das alterações

| Arquivo / Recurso | Alteração |
|---|---|
| `supabase/config.toml` | Adicionar `[functions.run-campaigns] verify_jwt = false` |
| SQL (insert, não migração) | Criar cron job `run-campaigns-every-minute` com pg_cron + pg_net |
| `src/pages/CampanhasPage.tsx` | Converter `agendadoPara` para ISO no `CampanhaDetailDialog` |

### Detalhes técnicos

- As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já estão disponíveis automaticamente em todas as edge functions — não precisam de configuração adicional.
- O cron roda a cada minuto. A função já tem lógica de batch e rate limit internos.
- A conversão de timezone garante que o horário selecionado pelo usuário (horário local do navegador) seja armazenado corretamente em UTC.

