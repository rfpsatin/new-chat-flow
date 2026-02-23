

## Diagnóstico

A migração `20260223120000_rename_conversas_source_to_origem.sql` existe no repositório mas **ainda nao foi aplicada no banco de dados**. Confirmei que:

- A coluna na tabela `conversas` ainda se chama `source` (query direta ao banco confirmou)
- O `types.ts` (auto-gerado) já mostra `origem` -- ou seja, está dessincronizado com o banco real
- A edge function `n8n-webhook-cinemkt` já usa `origem` nos inserts/updates -- o que pode estar falhando silenciosamente
- A view `vw_fila_atendimento` ainda expoe `source` (nao `origem`)
- A view `vw_mensagens_consolidado` ja tem uma coluna `origem` (possivelmente de outra refatoracao)

## Plano

### Passo 1: Aplicar a migracao pendente

A migracao `20260223120000_rename_conversas_source_to_origem.sql` precisa ser executada. Ela faz:

1. Renomeia `conversas.source` para `conversas.origem`
2. Recria a view `vw_fila_atendimento` usando `c.origem`

### Passo 2: Verificar se as views dependentes tambem precisam de atualizacao

A view `vw_historico_conversas` nao expoe a coluna `source`/`origem`, entao nao precisa de alteracao. A view `vw_mensagens_consolidado` ja tem `origem`.

### Passo 3: Nao alterar edge functions

As edge functions `n8n-webhook-cinemkt` ja usam `origem` nos inserts (o que esta correto apos a migracao). A edge function `whapi-webhook` nao grava nessa coluna, entao nao precisa de alteracao imediata.

---

## Detalhes tecnicos

### Migracao a ser executada

```sql
ALTER TABLE public.conversas RENAME COLUMN source TO origem;

COMMENT ON COLUMN public.conversas.origem IS 'Origem da mensagem (ex: web-chat, whatsapp)';

DROP VIEW IF EXISTS public.vw_fila_atendimento;

CREATE VIEW public.vw_fila_atendimento AS
SELECT
  c.id AS conversa_id,
  c.empresa_id,
  co.id AS contato_id,
  co.nome AS contato_nome,
  co.whatsapp_numero,
  c.status,
  c.last_message_at,
  c.created_at,
  c.agente_responsavel_id,
  u.nome AS agente_nome,
  c.resumo,
  c.origem,
  c.channel,
  c.nr_protocolo
FROM public.conversas c
JOIN public.contatos co ON co.id = c.contato_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = ANY (ARRAY['bot','esperando_tria','fila_humano','em_atendimento_humano'])
ORDER BY c.last_message_at DESC;
```

### Arquivos afetados

Nenhum arquivo de codigo precisa ser alterado -- o frontend e as edge functions ja usam `origem`. A unica acao necessaria e aplicar a migracao SQL no banco.
