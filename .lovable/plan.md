

## Botão "Forçar atendimento humano" para conversas no status Bot

### O que será feito

Adicionar um botão "Forçar atendimento humano" nas conversas com status `bot` na fila. Ao clicar, a conversa muda para `esperando_tria` e `human_mode` é setado como `true`.

### Alterações

#### 1. Nova função SQL `forcar_atendimento_humano`
- Criar via migration uma função RPC que recebe `p_conversa_id` e faz:
  - `status = 'esperando_tria'`
  - `human_mode = true`
  - `updated_at = now()`
  - Condição: `WHERE status = 'bot'`

#### 2. Novo hook `useForcarAtendimentoHumano` em `src/hooks/useFila.ts`
- Mutation que chama `supabase.rpc('forcar_atendimento_humano', { p_conversa_id })` 
- Invalida queries `fila` e `conversa` no onSuccess

#### 3. Botão no `FilaPanel.tsx`
- Para conversas com `status === 'bot'`, exibir botão "Forçar atendimento humano" (similar ao botão "Assumir" já existente)
- Aparece no hover, posicionado no canto direito
- Visível apenas para `sup` e `adm` (operadores não veem conversas bot)
- Ao clicar: chama a mutation, exibe toast de sucesso/erro

