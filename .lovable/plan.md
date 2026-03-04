

## Nova Aba "Campanhas" no Dashboard

### Resumo
Adicionar uma terceira aba "Campanhas" ao lado de "Atendimentos" e "Atendimentos em Aberto" no DashboardFilters. Ao selecionar, exibir cards individuais por campanha usando dados da view `vw_campanha_stats` (já existente), mostrando total de enviados e respostas (conversas abertas).

### Arquivos a criar

1. **`src/components/dashboard/CampanhasDashboard.tsx`** — Componente que recebe `empresaId` e renderiza a lista de campanhas em cards. Usa o hook `useCampanhasStats` existente. Cada card exibe: nome da campanha, status, total de enviados (`enviados`) e total de respostas (`conversas_abertas`). Layout em grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, usando o componente `Card` existente com o mesmo padrão visual dos KPI cards (fonte, espaçamento, cores). Exibe skeleton loading e estado vazio.

### Arquivos a modificar

2. **`src/components/dashboard/DashboardFilters.tsx`** — Ampliar o type do `activeTab` para incluir `'campanhas'`. Adicionar `TabsTrigger` "Campanhas" na `TabsList`. Esconder filtros de período/agente quando `activeTab === 'campanhas'` (campanhas não precisam de filtro de período).

3. **`src/pages/DashboardAtendimentosPage.tsx`** — Ampliar state `activeTab` para `'atendimentos' | 'aberto' | 'campanhas'`. Importar `CampanhasDashboard`. Adicionar bloco condicional `activeTab === 'campanhas'` renderizando `<CampanhasDashboard empresaId={empresaId} />`. Adicionar invalidação de `campanhas-stats` no `handleRefresh`.

### Dados
- `vw_campanha_stats.enviados` = quantidade que receberam a mensagem
- `vw_campanha_stats.conversas_abertas` = quantidade que responderam
- Ambos já existem na view, sem necessidade de migração

