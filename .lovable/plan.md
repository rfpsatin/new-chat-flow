

## Plano: Corrigir build error e garantir deploy

### Problema
Build error em `CampanhasDashboard.tsx`: referências a `campanhas` que deveria ser `campanhasRaw` (linhas 123, 133, 146) — as dependências dos `useMemo` apontam para variável inexistente.

### Correção
Em `src/components/dashboard/CampanhasDashboard.tsx`, trocar `campanhas` por `campanhasRaw` nas dependências dos 3 `useMemo` (linhas 123, 133, 146):
- Linha 123: `}, [campanhas]);` → `}, [campanhasRaw, filteredStats]);`
- Linha 133: `}, [campanhas]);` → `}, [campanhasRaw, filteredStats]);`  
- Linha 146: `}, [campanhas]);` → `}, [campanhasRaw, filteredStats]);`

### ChatPanel.tsx — Já implementado
O diff mostra que as alterações de exibição/download de documentos já foram aplicadas:
- `hasDocument` usa lógica robusta (`media_url` + `media_filename` ou `media_kind`)
- Bloco inteiro é um `<a>` clicável com `download` e `target="_blank"`
- Layout estilo WhatsApp com ícone 📄 e "Baixar documento"

### Deploy
Após corrigir o build error, as edge functions alteradas no último commit serão redeployadas automaticamente.

