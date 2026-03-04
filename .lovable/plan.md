

## Ajustes na Seleção Múltipla da Fila de Atendimento

### 1. Barra de ações para a parte inferior
**`SelecaoMultiplaActions.tsx`** — Alterar de `border-b` (topo) para posicionamento fixo na parte inferior do painel. Usar `border-t` e fonte menor (`text-xs`) para o contador. Trocar layout de `justify-between` para compacto centralizado.

**`FilaPanel.tsx`** — Mover o `<SelecaoMultiplaActions>` de antes dos filtros para depois da lista de conversas (parte inferior do flex container), com posição fixa no fundo.

### 2. Padronização visual dos pop-ups de Encerrar
**`EncerrarEmLoteDialog.tsx`** — Definir altura mínima fixa no `DialogContent` para ambas as etapas terem o mesmo tamanho. Usar classes consistentes de padding/spacing em ambas as etapas.

### 3. Botões centralizados nos pop-ups
**`EncerrarEmLoteDialog.tsx`** — Substituir `DialogFooter` por `div` com `flex justify-center gap-3` em ambas as etapas, centralizando os botões horizontalmente.

### 4. Texto justificado nos pop-ups
**`EncerrarEmLoteDialog.tsx`** — Adicionar `text-justify` ao `DialogDescription` em ambas as etapas.

### 5. Correção CRÍTICA — Bug "Não enviar"
**`EncerrarEmLoteDialog.tsx`** — O bug está na função `executarEncerramento`. Quando `enviarAvaliacao=false`, a função tenta buscar dados da conversa e chamar edge functions que podem falhar silenciosamente ou travar. O problema principal é que se `conversa.conversa_id` for `null/undefined`, o `supabase.rpc` falha e o `catch` incrementa erros mas o `setIsProcessing(false)` pode não ser alcançado se houver erro não capturado. Solução: envolver todo o loop em `try/finally` para garantir que `setIsProcessing(false)` e `handleClose()` sempre executem, independentemente de erros.

### Arquivos a modificar

1. **`src/components/fila/SelecaoMultiplaActions.tsx`** — Reposicionar para bottom, reduzir fonte, layout compacto
2. **`src/components/fila/EncerrarEmLoteDialog.tsx`** — Altura consistente, botões centralizados, texto justificado, fix do bug de loading
3. **`src/components/FilaPanel.tsx`** — Mover `SelecaoMultiplaActions` para o final do container (bottom)

