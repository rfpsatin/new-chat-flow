# Análise de Redundância de Consultas ao Banco de Dados

Data: 2026-02-10

## Objetivo

Reduzir o número de queries ao Supabase, reaproveitando dados já disponíveis no cache do React Query ou passando-os como parâmetros, melhorando a performance geral da aplicação.

---

## Item 1 — `UsuariosPage` faz query direta à `empresas` em vez de usar `useEmpresa`

**Arquivos:** `src/pages/admin/UsuariosPage.tsx`

**Problema:** `UsuariosPage` faz uma query manual com queryKey `['empresa-atual-nome', empresaId]` buscando `id, razao_social, nome_fantasia` da tabela `empresas`. O hook `useEmpresa` já faz essa mesma consulta com queryKey `['empresa-admin', empresaId]`, trazendo os mesmos campos e mais.

**Correção:** Substituir a query direta por `useEmpresa(empresaId)` e usar `empresa.razao_social` / `empresa.nome_fantasia` diretamente.

**Impacto:** -1 query, -1 queryKey desnecessário.

**Status:** [ ] Pendente

---

## Item 2 — Tabela `usuarios` consultada com 6 queryKeys diferentes

**Arquivos:** `src/hooks/useUsuarios.ts`, `src/hooks/useGestaoUsuarios.ts`, `src/hooks/useHistorico.ts`, `src/hooks/useDashboardStats.ts`, `src/hooks/useDashboardOpenStats.ts`

**Problema:** São 6 hooks diferentes que consultam `usuarios` filtrados por `empresa_id` + `ativo=true`, cada um com queryKey diferente:

| Hook | queryKey | Filtros extras |
|------|---------|----------------|
| `useUsuarios` | `['usuarios', id]` | nenhum |
| `useOperadores` | `['operadores', id]` | `tipo IN (opr,sup,adm)` |
| `useGestaoUsuarios` | `['gestao-usuarios', id]` | `tipo IN (sup,opr,adm)` |
| `useOperadoresHistorico` | `['operadores-historico', id]` | nenhum (só `id, nome`) |
| `useDashboardStats` | `['dashboard-agentes', ...]` | `tipo IN (opr,sup)` |
| `useDashboardOpenStats` | `['dashboard-open', ...]` | `tipo IN (opr,sup)` |

**Correção:** Criar um hook único `useUsuariosEmpresa(empresaId)` que busca todos os usuários ativos da empresa (`select('*')`). Os consumidores fazem filtro local por `tipo_usuario`.

**Impacto:** -5 queries ao banco (todas servidas pelo cache de 1 única query).

**Status:** [ ] Pendente

---

## Item 3 — `contatos.whatsapp_numero` buscado dentro de cada mutation

**Arquivos:** `src/hooks/useMensagens.ts` (useEnviarMensagem, useEnviarArquivo), `src/hooks/useEncerramento.ts`, `src/components/fila/EncerrarEmLoteDialog.tsx`

**Problema:** Cada envio de mensagem, envio de arquivo e encerramento faz uma query `contatos.select('whatsapp_numero').eq('id', contato_id).single()` dentro da mutation. Se o atendente envia 10 mensagens para o mesmo contato, são 10 queries idênticas. O `ChatPanel` já tem essa informação disponível via `conversaDetalhes.contatos`.

**Correção:** Aceitar `whatsapp_numero` como parâmetro da mutation ao invés de buscá-lo internamente.

**Impacto:** -1 query por mensagem/arquivo enviado e por encerramento.

**Status:** [ ] Pendente

---

## Item 4 — UPDATE + SELECT sequenciais no encerramento de conversa

**Arquivos:** `src/hooks/useEncerramento.ts`

**Problema:** Dentro de `useEncerrarConversa`, primeiro faz um `UPDATE` em `conversas` (pesquisa_enviada_em) e logo depois um `SELECT` na mesma tabela/registro para buscar campos como `origem, channel, n8n_webhook_id`. São 2 roundtrips ao banco para o mesmo registro.

**Correção:** Usar `.update({...}).select('origem, channel, n8n_webhook_id, human_mode, origem_final').single()` — combina as duas operações em 1 roundtrip.

**Impacto:** -1 query por encerramento.

**Status:** [ ] Pendente

---

## Item 5 — Queries sequenciais em `useGestaoUsuarios`

**Arquivos:** `src/hooks/useGestaoUsuarios.ts`

**Problema:** Dentro da `queryFn` de `useGestaoUsuarios`, as queries a `usuarios` e `atendentes` rodam sequencialmente (await uma após a outra). São tabelas independentes que poderiam rodar em paralelo.

**Correção:** Usar `Promise.all([queryUsuarios, queryAtendentes])`.

**Impacto:** Sem redução de queries, mas reduz o tempo de resposta (~2x mais rápido para carregar a tela).

**Status:** [ ] Pendente

---

## Item 6 — Dashboard dispara 12+ queries por renderização

**Arquivos:** `src/hooks/useDashboardStats.ts`, `src/hooks/useDashboardOpenStats.ts`

**Problema:** Uma única chamada a `useDashboardStats` dispara 10-12 queries independentes:
- 3x `conversas` (KPIs atual, anterior, contatos/hora)
- 2x `conversas` (por canal, por motivo)
- 2x `conversas` (agentes atual, anterior)
- 2x `mensagens_historico` (msgs atual, anterior)
- 2x `mensagens_historico` (enviadas/recebidas por agente)
- 2x `usuarios` (agentes atual, anterior)

Muitas consultam a mesma tabela com filtros de período similares.

**Correção (curto prazo):** Consolidar as queries de `conversas` do mesmo período em uma única query com todos os campos necessários (`id, contato_id, created_at, encerrado_em, canal, agente_responsavel_id, motivo_encerramento_id, status`). Processar KPIs, hora, canal, motivo e agentes a partir do mesmo dataset localmente.

**Correção (médio prazo):** Criar uma RPC/view materializada no Supabase que retorne os KPIs consolidados.

**Impacto:** -9 queries por renderização do dashboard (de 12 para ~3).

**Status:** [ ] Pendente

---

## Item 7 — `useAtendimentosAtivos` duplica dados já disponíveis em `useFila`

**Arquivos:** `src/hooks/useFila.ts`

**Problema:** `useAtendimentosAtivos` faz uma query a `vw_fila_atendimento` com `status='em_atendimento_humano'` a cada 5 segundos, buscando apenas `agente_responsavel_id`. Mas `useFila` já traz `select('*')` da mesma view, incluindo `status` e `agente_responsavel_id`, com o mesmo intervalo de 5s. São 2 queries a cada 5 segundos quando 1 bastava.

**Correção:** Eliminar `useAtendimentosAtivos` e derivar a contagem de ativos por agente a partir dos dados retornados por `useFila`.

**Impacto:** -1 query a cada 5 segundos (reduz polling pela metade).

**Status:** [ ] Pendente

---

## Item 8 — `useMensagensHistorico` definida em 2 arquivos

**Arquivos:** `src/hooks/useMensagens.ts`, `src/hooks/useHistorico.ts`

**Problema:** A função `useMensagensHistorico` está definida identicamente em dois arquivos com o mesmo queryKey `['mensagens-historico', conversaId]`. Funciona pela deduplicação do React Query, mas é código duplicado que pode divergir.

**Correção:** Manter apenas uma definição (em `useMensagens.ts`) e importar nos consumidores.

**Impacto:** 0 queries (limpeza de código, previne divergências futuras).

**Status:** [ ] Pendente

---

## Ordem de Prioridade

1. **Item 7** — Fácil, impacto contínuo (polling)
2. **Item 3** — Fácil, impacto por ação do usuário
3. **Item 1** — Fácil, eliminação simples
4. **Item 4** — Fácil, combinar 2 em 1
5. **Item 5** — Fácil, paralelização
6. **Item 8** — Fácil, limpeza de código
7. **Item 2** — Média, refatoração de hooks
8. **Item 6** — Média/Alta, refatoração do dashboard
