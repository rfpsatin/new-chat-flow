
## Mudanças na Tela de Operadores (FilaPanel + FiltrosFila)

### Problema atual

**1. Layout dos filtros:** Para operadores, os 3 filtros (Todos, Na Fila, Atendimento) aparecem em linha junto com os indicadores discretos de Bot/Triagem, tudo na mesma linha. O pedido é que os filtros fiquem em uma linha e os indicadores de Bot/Triagem fiquem em uma linha separada embaixo.

**2. Lógica do filtro "Todos":** Atualmente, o filtro "Todos" para operadores exibe TODAS as conversas visíveis, incluindo as de `esperando_tria` (triagem). O pedido é que "Todos" mostre apenas as conversas do próprio atendente: `fila_humano` + `em_atendimento_humano` atribuídas a ele.

---

### Solução

#### Arquivo: `src/components/FilaPanel.tsx`

**Mudança na `conversasVisiveis`:**

Atualmente, operadores veem:
- Conversas onde `agente_responsavel_id === currentUser.id` (qualquer status)
- OU conversas com `status === 'esperando_tria'`

Isso faz com que o filtro "Todos" inclua conversas de triagem.

**Nova lógica proposta:**

Separar em dois conjuntos:
- `conversasDoOperador`: apenas conversas com `agente_responsavel_id === currentUser.id` E status `fila_humano` ou `em_atendimento_humano` — estas aparecem nos filtros e na lista do operador
- `conversasTriagem`: conversas com `status === 'esperando_tria'` — existem na fila mas NÃO entram no "Todos" nem nos contadores dos filtros visíveis

**O `filteredConversas` para operadores no filtro "todos"** deve retornar apenas as conversas do operador (fila_humano + em_atendimento_humano dele), não as de triagem.

**Os contadores de statusCounts para operadores:**
- `todos` = `fila_humano` dele + `em_atendimento_humano` dele
- `fila_humano` = conversas `fila_humano` dele
- `em_atendimento_humano` = conversas `em_atendimento_humano` dele

**O `allStatusCounts`** continua com as contagens globais de bot e triagem para exibição discreta.

A visibilidade das conversas na lista ainda inclui triagem (para operadores navegarem até elas quando clicam no indicador, se aplicável), mas o filtro "todos" exclui triagem.

**Mudança na lógica de filtragem:**

Quando `selectedStatus === 'todos'` e `tipoUsuario === 'opr'`, filtrar apenas `fila_humano` e `em_atendimento_humano` do operador.

#### Arquivo: `src/components/FiltrosFila.tsx`

**Mudança no layout:**

Separar os chips de filtro e os indicadores discretos em dois blocos distintos:

```
[Todos] [Na Fila] [Atendimento]   ← linha 1: flex com os 3 chips
Bot: 3   Triagem: 2               ← linha 2: indicadores separados abaixo
```

Remover o `ml-2` inline e colocar os indicadores em um `div` separado abaixo do `div` dos chips, com `flex items-center gap-3 text-xs text-muted-foreground mt-1` (ou similar).

**Mudança no cálculo do `totalCount` para operadores:**

O `totalCount` passado como `count` quando `key === 'todos'` deve ser apenas `fila_humano + em_atendimento_humano` para operadores. Isso será corrigido na origem (`FilaPanel.tsx` passando os `statusCounts` já corretos), então `FiltrosFila` simplesmente usa `statusCounts.fila_humano + statusCounts.em_atendimento_humano` para o total no caso do operador — ou mais simples: o `FilaPanel` já passará o `statusCounts` correto, com `bot` e `esperando_tria` zerados para operadores, e o `totalCount` interno de `FiltrosFila` calculará corretamente.

---

### Resumo das mudanças

**`FilaPanel.tsx`:**
1. `conversasVisiveis` para operadores: manter a lógica atual de inclusão de triagem na lista (para aparecer se filtrarem por triagem via indicador — mas como não há filtro de triagem para opr, pode remover da lista)
   - Na verdade, simplificar: `conversasVisiveis` para opr = conversas com `agente_responsavel_id === currentUser.id` (qualquer status) + `esperando_tria` (para info discreta mas sem incluir no "todos")
   - O filtro "todos" deve excluir `esperando_tria` para operadores
2. `statusCounts` para operadores: calcular apenas com conversas `agente_responsavel_id === currentUser.id` com status `fila_humano`/`em_atendimento_humano`, zerando bot e esperando_tria
3. `filteredConversas`: quando `selectedStatus === 'todos'` e operador, excluir `esperando_tria`

**`FiltrosFila.tsx`:**
1. Mover os indicadores de Bot/Triagem para fora do `div` dos chips, em um bloco separado abaixo
2. O layout fica: busca → chips em linha → indicadores em linha separada

---

### Arquivos a modificar

- `src/components/FiltrosFila.tsx`
- `src/components/FilaPanel.tsx`
