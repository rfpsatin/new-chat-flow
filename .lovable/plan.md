

# Plano: Corrigir Lógica de Agendamento e Disparo de Campanhas

## Problemas Identificados

### 1. Data da campanha gerada incorretamente
O campo `dataInicio` é `type="date"` (ex: `"2026-03-15"`). Quando fazemos `new Date("2026-03-15")`, o JavaScript cria **meia-noite UTC** (`2026-03-15T00:00:00Z`). Esse valor é usado como `agendado_para` da campanha. O cron verifica `agendado_para <= now` — como meia-noite UTC já passou, a campanha fica ativa imediatamente, ignorando os horários configurados.

**Correção**: O `agendado_para` da campanha deve ser construído combinando a data de início com a `horaInicioPrimeiroDia`. Exemplo: data `2026-03-15` + hora `08:00` → `agendado_para = 2026-03-15T08:00:00` (horário local convertido para ISO).

### 2. Horários dos destinatários usando timezone ambíguo
Em `campanhaAgendamento.ts`, `new Date(dataInicioIso)` cria a data em UTC, mas `setHours()` opera no fuso local do navegador. Isso gera horários inconsistentes entre o que o usuário vê e o que é salvo. Precisa usar UTC consistentemente ou construir as datas de forma explícita.

### 3. Erros de TypeScript na Edge Function (31 erros `GenericStringError`)
O `createClient` do Supabase no Deno não consegue inferir os tipos das tabelas. A solução é tipar o retorno das queries com `as any` ou usar o cliente sem tipagem genérica.

### 4. UI não atualiza status dos destinatários
`useCampanhaDestinatarios` não tem `refetchInterval`, mostrando dados em cache mesmo após o envio.

### 5. Cron consome recursos desnecessariamente
Rodando a cada 1 minuto. Com delays de 30-120s entre envios, 2 minutos é suficiente.

---

## Alterações Planejadas

### A. `src/pages/CampanhasPage.tsx` — Corrigir construção do `agendado_para`

Na função `handleGerarPreview` (linha ~889) e `handleCriarCampanha` (linha ~946):

Em vez de `new Date(dataInicio).toISOString()` (que gera meia-noite UTC), construir a data combinando `dataInicio` + `horaInicioPrimeiroDia`:

```typescript
// Antes (errado):
const baseDateObj = new Date(dataInicio); // midnight UTC

// Depois (correto):
const baseDateObj = new Date(`${dataInicio}T${horaInicioPrimeiroDia}`); // horário local
```

Isso garante que:
- O `agendado_para` da campanha reflita o horário real de início do primeiro dia
- O cron só ative a campanha quando esse horário chegar

### B. `src/lib/campanhaAgendamento.ts` — Consistência de timezone

Alterar a construção de datas para usar o formato `YYYY-MM-DDThh:mm` (local) em vez de manipular via `setHours()` em uma data UTC. Passar `dataInicioIso` já com o horário correto do primeiro dia embutido, eliminando a ambiguidade.

A lógica de `setHours` nas linhas 150-155 continuará funcionando corretamente porque `dataInicioIso` já virá com o horário local correto, e `new Date()` em formato ISO com timezone produz a data local correta.

### C. `supabase/functions/run-campaigns/index.ts` — Corrigir erros de tipo

Adicionar `as any` após as queries do Supabase para eliminar os 31 erros `GenericStringError`:

```typescript
const { data: campanhas, error: campError } = await supabase
  .from('campanhas')
  .select('...')
  .in('status', ['agendada', 'em_execucao'])
  .lte('agendado_para', now) as any;
```

Aplicar o mesmo padrão em todas as queries que acessam `campanhas` e `campanha_destinatarios`.

### D. `src/hooks/useCampanhas.ts` — Auto-refresh da UI

Adicionar `refetchInterval: 15000` ao `useCampanhaDestinatarios` quando houver um `campanhaId` ativo, para que o detalhe da campanha mostre progresso em tempo real.

### E. Migração SQL — Cron para 2 minutos

```sql
SELECT cron.alter_job(jobid, '*/2 * * * *')
FROM cron.job
WHERE jobname = 'run-campaigns';
```

### F. Deploy da Edge Function

Após corrigir os erros de tipo, fazer deploy de `run-campaigns`.

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---|---|
| `src/pages/CampanhasPage.tsx` | Combinar data + hora do 1º dia para `agendado_para` |
| `src/lib/campanhaAgendamento.ts` | Receber data já com horário correto, manter consistência |
| `supabase/functions/run-campaigns/index.ts` | Adicionar `as any` nas queries para eliminar erros de tipo |
| `src/hooks/useCampanhas.ts` | Adicionar `refetchInterval: 15000` ao hook de destinatários |
| Migração SQL | Alterar cron de 1 para 2 minutos |

