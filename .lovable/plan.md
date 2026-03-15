

# Plano: Corrigir Lógica de Agendamento de Campanhas

## Problemas Encontrados

### 1. App travando ao gerar preview — bug em `distribuirTotalAleatorio`
Quando temos poucos contatos (ex: 2) mas `qtdLote1=100` e `qtdLote2=180`, o cálculo resulta em `restDepoisLote2 = 0`. A função `distribuirTotalAleatorio(0, 5)` entra no branch `total <= n` e cria `Array(5).fill(1)` — retornando `[1,1,1,1,1]` quando deveria retornar `[0,0,0,0,0]`. Isso gera `quantPorDia` com soma 7 para apenas 2 contatos. Embora o cursor de contatos impeça um loop infinito, a lógica fica inconsistente e pode causar comportamento inesperado.

### 2. `agendado_para` da campanha ainda grava meia-noite UTC
O banco mostra todas as campanhas recentes com `agendado_para = 2026-03-15 00:00:00+00`. O fix anterior (`new Date(\`${dataInicio}T${horaInicioPrimeiroDia}\`)`) está no código, mas o `toISOString()` converte para UTC. Exemplo: `15:35 BRT` → `18:35 UTC` — isso é correto. **O problema real** é que as campanhas no banco AINDA mostram `00:00:00+00`, o que indica que o fix não foi de fato utilizado na última criação (provavelmente o build anterior ainda estava em cache ou o fix não foi salvo a tempo).

### 3. Horários dos destinatários ficam em dias errados
Em `campanhaAgendamento.ts`, `new Date(dataInicioIso)` com valor `"2026-03-15T15:35"` cria a data em **horário local**. Depois, `setHours()` reaplica as mesmas horas — OK. Mas `agendadoDate.toISOString()` converte para UTC, e o cron compara com `now` em UTC. O resultado é que destinatários agendados para "15:35 BRT" ficam salvos como "18:35 UTC", o que é correto. Porém, os dados reais no banco mostram `2026-03-14 19:38 UTC` — um dia ANTES — o que confirma que o `dataInicioIso` que chegou na função estava errado (provavelmente ainda era a data pura sem hora).

### 4. Edge Function não respeita intervalo entre destinatários
A edge function usa o campo `agendado_para` dos destinatários para calcular o gap, mas se todos chegam com horários já passados, envia tudo em sequência com delay mínimo de 30s.

## Correções Planejadas

### A. `src/lib/campanhaAgendamento.ts` — Fix `distribuirTotalAleatorio`
Adicionar tratamento para `total <= 0`:
```typescript
function distribuirTotalAleatorio(total: number, n: number): number[] {
  if (total <= 0) return Array(n).fill(0);  // ← NOVO
  if (n <= 1) return [total];
  // ... resto igual
}
```

### B. `src/lib/campanhaAgendamento.ts` — Construção de datas sem ambiguidade
Ao invés de usar `new Date(dataInicioIso)` + `setHours()`, construir as datas dos dias subsequentes usando string manipulation para evitar confusão UTC/local:
```typescript
// Extrair apenas a data (YYYY-MM-DD) do dataInicioIso
const baseDateStr = dataInicioIso.substring(0, 10); // "2026-03-15"
// Para cada dia, construir: new Date(`${dataDoDia}T${horaInicio}`)
```

### C. `src/pages/CampanhasPage.tsx` — Garantir `agendado_para` correto
O código atual já tem `new Date(\`${dataInicio}T${horaInicioPrimeiroDia}\`).toISOString()`, que é correto. Vou verificar se não há outro code path que sobrescreve isso.

### D. Deploy da Edge Function
Após as correções, deploy de `run-campaigns`.

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `src/lib/campanhaAgendamento.ts` | Fix `distribuirTotalAleatorio(0, n)`, construção de datas sem ambiguidade timezone |
| `src/pages/CampanhasPage.tsx` | Verificar/garantir construção correta do `agendado_para` |
| Edge Function `run-campaigns` | Redeploy |

