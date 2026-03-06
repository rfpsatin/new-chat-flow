

## Plano: Histórico com filtros manuais (sem carregamento automático)

### Comportamento atual
- Ao abrir `/historico`, a lista de contatos carrega automaticamente todos os dados
- Filtros são aplicados em tempo real (cada digitação/seleção dispara nova query)

### Novo comportamento
1. Ao abrir a tela, **nenhum dado é carregado** — exibe mensagem orientando o usuário a definir filtros
2. Filtros passam a ser **draft** (rascunho) — alterações nos campos NÃO disparam queries
3. Botão **"Consultar"** ao lado de "Limpar filtros" aplica os filtros manualmente
4. Somente após clicar "Consultar" os dados são buscados

### Arquivos alterados

**1. `src/pages/HistoricoPage.tsx`**
- Adicionar estado `appliedFiltros` (filtros efetivamente aplicados) separado de `filtros` (draft)
- Adicionar flag `hasApplied` (inicia `false`) — controla se já houve consulta
- Passar `appliedFiltros` para os hooks de query (`useContatosComHistorico`, `useSessoesAtendente`, `useSessoesContato`)
- Passar `filtros` (draft) para o componente de filtros (UI)
- Criar handler `handleAplicar` que copia `filtros` → `appliedFiltros` e seta `hasApplied = true`
- Passar `onAplicar` para `ContatosMasterPanel`
- Quando `!hasApplied`, exibir mensagem placeholder no painel master em vez dos dados

**2. `src/components/historico/FiltrosHistorico.tsx`**
- Adicionar prop `onAplicar: () => void`
- Adicionar botão **"Consultar"** ao lado do botão "Limpar filtros"
- Botão aparece sempre (não só quando há filtros), para permitir consulta sem filtros também — ou aparece junto com "Limpar"

**3. `src/components/historico/ContatosMasterPanel.tsx`**
- Receber e repassar prop `onAplicar` para `FiltrosHistorico`
- Receber prop `hasApplied` — quando `false`, exibir card placeholder "Defina os filtros e clique em Consultar"

**4. `src/hooks/useHistorico.ts`**
- `useContatosComHistorico`: adicionar parâmetro `enabled` ou flag `hasApplied` para não executar query quando não houve consulta
- Alternativa mais simples: controlar via `enabled` no `HistoricoPage` passando queries com `enabled: hasApplied`

### Fluxo
```text
Abre /historico
  → filtros = draft (vazio), appliedFiltros = null, hasApplied = false
  → Painel master: "Defina os filtros e clique em Consultar"
  → Usuário preenche filtros (não dispara query)
  → Clica "Consultar"
  → appliedFiltros = cópia de filtros, hasApplied = true
  → Queries executam com appliedFiltros
  → Lista de contatos/atendentes aparece
```

