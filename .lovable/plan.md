

## Seleção Múltipla de Conversas na Fila de Atendimento

### Resumo

Adicionar modo de seleção múltipla na FilaPanel com botão "..." após os filtros, permitindo encerrar ou mover conversas em lote.

### Arquivos a criar

1. **`src/components/fila/SelecaoMultiplaActions.tsx`** — Barra de ações flutuante (Encerrar / Mover) que aparece no modo seleção, com contagem de selecionados.

2. **`src/components/fila/EncerrarEmLoteDialog.tsx`** — Dialog de 2 etapas:
   - Etapa 1: Confirmação com explicação (sairão do filtro Bot, sessão no histórico, tag bot mantida)
   - Etapa 2: "Enviar avaliação?" com Sim/Não
   - Ao confirmar, itera sobre as conversas selecionadas chamando `encerrar_conversa` (com ou sem envio de pesquisa via whapi-send-message)

3. **`src/components/fila/MoverEmLoteDialog.tsx`** — Dialog de 2 etapas:
   - Etapa 1: Escolher destino (Triagem ou Atendimento Humano)
   - Etapa 2: Se Triagem → confirmação simples (chama `forcar_atendimento_humano` para cada). Se Atendimento Humano → seleção obrigatória de atendente (lista de `atendentes` ativos) + confirmação (chama `encaminhar_para_atendente` ou `atribuir_agente` para cada)

### Arquivos a modificar

4. **`src/components/FiltrosFila.tsx`** — Adicionar botão "..." (MoreVertical icon) após a última tag de filtro. Ao clicar, dropdown com "Selecionar conversas". Recebe props `onToggleSelectionMode` e `isSelectionMode`.

5. **`src/components/ConversaItem.tsx`** — Receber props `selectionMode: boolean`, `isChecked: boolean`, `onToggleCheck: () => void`. Quando `selectionMode=true`, exibir checkbox circular no lado esquerdo do card (antes do avatar). O click no card alterna o check em vez de abrir a conversa.

6. **`src/components/FilaPanel.tsx`** — Gerenciar estado do modo seleção (`selectionMode`, `selectedIds: Set<string>`). Passar props aos componentes filhos. Renderizar `SelecaoMultiplaActions` quando `selectionMode=true`. Ao sair do modo seleção, limpar seleção.

### Lógica de encerramento em lote

- Para cada conversa selecionada, o fluxo será:
  - **Com avaliação**: mesma lógica do `useEncerrarConversa` atual (envia pesquisa via whapi-send-message, depois chama `encerrar_conversa` RPC)
  - **Sem avaliação**: chama apenas `encerrar_conversa` RPC (sem envio de mensagem WhatsApp)
- Criar hook `useEncerrarEmLote` que recebe lista de conversas e flag `enviarAvaliacao`

### Lógica de mover em lote

- **Para Triagem**: chama `forcar_atendimento_humano` RPC para cada conversa (funciona apenas para conversas com status `bot`)
- **Para Atendimento Humano**: chama `encaminhar_para_atendente` (se `esperando_tria`) ou `atribuir_agente` (se `fila_humano`) para cada conversa, com o atendente selecionado

### UX

- Botão "..." discreto, alinhado após os filtros
- Checkboxes circulares animados no lado esquerdo de cada card
- Barra de ações fixa no topo/inferior com botões "Encerrar" e "Mover" desabilitados até seleção
- Botão "Cancelar" para sair do modo seleção
- Dialogs modais com etapas claras e textos explicativos

