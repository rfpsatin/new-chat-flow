## Boas práticas de desenvolvimento – MaIA-Hub

Este documento consolida padrões que queremos seguir no projeto, começando por **acesso a banco de dados / Supabase** e evoluindo ao longo do tempo.  
Sempre que for criar ou alterar código, principalmente hooks e Edge Functions, consulte este arquivo.

---

## 1. Princípios gerais de acesso a dados

- **Evitar queries redundantes**
  - **Regra**: antes de criar uma nova query, verificar se já existe um hook ou view que retorna os mesmos dados.
  - **Preferência**: reutilizar hooks existentes (`useEmpresa`, `useFila`, `useDashboardStats`, etc.) em vez de chamar `supabase.from(...)` diretamente em componentes.

- **Consolidar dados em menos roundtrips**
  - Quando vários cards/gráficos da mesma tela usam a **mesma base de dados** (ex.: `conversas` de um período), buscar tudo em **uma query única** e derivar os cálculos em memória.
  - Usar `.update(...).select(...).single()` para combinar `UPDATE + SELECT` quando forem na mesma linha.

- **Passar dados já conhecidos por parâmetro**
  - Se um componente já tem informações como `whatsapp_numero`, `channel`, `origem`, evitar que a mutation faça um `SELECT` redundante para descobrir a mesma coisa.
  - Preferir:
    - `useEnviarMensagem({ whatsapp_numero })`
    - `useEncerrarConversa({ whatsapp_numero })`
    - etc.

- **Hooks como boundary de acesso**
  - Toda interação com tabelas principais deve idealmente passar por **hooks dedicados**, não por `supabase.from(...)` solto em componentes.
  - Isso facilita:
    - cache centralizado (`react-query`)
    - padronização de filtros (`empresa_id`, `ativo=true`, RLS)
    - futuras otimizações (trocar query simples por view/RPC sem tocar em todas as telas).

---

## 2. Boas práticas específicas de queries (já aplicadas)

Esta seção registra otimizações já implementadas, para servirem de modelo.

- **Item 1 – `UsuariosPage` usa `useEmpresa`**
  - **Antes**: query direta em `usuarios/admin/UsuariosPage.tsx` para buscar `empresas`.
  - **Agora**: a tela usa o hook `useEmpresa(empresaId)`, reaproveitando cache e reduzindo query duplicada.

- **Item 2 – Consolidação de queries em `usuarios`**
  - Unificamos o acesso a `usuarios` em torno de hooks reutilizáveis (`useOperadores`, `useGestaoUsuarios`, etc.), evitando múltiplos hooks ad-hoc com filtros iguais.
  - Padrão: **buscar todos os usuários ativos da empresa** e filtrar por `tipo_usuario` localmente quando fizer sentido.

- **Item 3 – `whatsapp_numero` passou a ser parâmetro**
  - **Antes**: `useEnviarMensagem`, `useEnviarArquivo`, `useEncerrarConversa` e `EncerrarEmLoteDialog` faziam `SELECT contatos.whatsapp_numero` internamente.
  - **Agora**: esses hooks recebem `whatsapp_numero` diretamente do chamador (que já possui o dado).
  - **Lição**: não repetir `SELECT` por registro quando a informação já está carregada na conversa/contato.

- **Item 4 – Encerramento com `UPDATE + SELECT` combinados**
  - Em `useEncerrarConversa`, combinamos o `UPDATE` de `conversas` com um `.select(...)` único.
  - **Padrão**: sempre que após um `UPDATE` for necessário buscar campos da mesma linha, usar `update(...).select(...).single()` em vez de dois roundtrips.

- **Item 5 – Paralelização em `useGestaoUsuarios`**
  - As queries em `usuarios` e `atendentes` passaram a rodar com `Promise.all`.
  - **Padrão**: quando duas queries forem independentes, preferir paralelizar em vez de aguardar sequencialmente.

- **Item 6 – Dashboard consolidado em query única de `conversas`**
  - `useDashboardStats` agora:
    - faz **uma query única** em `conversas` para o período atual com:
      - `id, contato_id, created_at, encerrado_em, canal, agente_responsavel_id, motivo_encerramento_id, status, motivos_encerramento(descricao)`
    - derivas em memória:
      - KPIs (atendimentos, clientes únicos, TMA)
      - Contatos por hora
      - Atendimentos por canal
      - Atendimentos por motivo
      - Estatísticas por agente (combinando esta base com `usuarios` e `mensagens_historico`)
  - **Padrão**: telas de analytics (dashboard) devem priorizar **query base única + cálculos locais**.

- **Item 7 – `useAtendimentosAtivos` derivado de `useFila`**
  - `useAtendimentosAtivos` deixou de consultar `vw_fila_atendimento` diretamente.
  - Agora ele reutiliza os dados já trazidos por `useFila(empresaId)` e apenas agrupa por `agente_responsavel_id`.
  - **Padrão**: se já existe um hook que busca `select('*')` de uma view/tabela, derivar contagens e subconjuntos dele.

- **Item 8 – `useMensagensHistorico` centralizado**
  - A definição de `useMensagensHistorico` foi unificada em `src/hooks/useMensagens.ts`.
  - Outros módulos (`useHistorico`, componentes de histórico, etc.) passam a importar essa única definição.
  - **Padrão**: evitar duplicar hooks com mesmo `queryKey` e mesma query; manter **uma fonte de verdade**.

---

## 3. Paginação, carga incremental e histórico

### 3.1. Padrões adotados no projeto

- **Paginação baseada em servidor (offset / range)**
  - **Onde usamos**: `useSessoesAtendente`, `useSessoesContato` em `useHistorico.ts`.
  - **Padrão**:
    - usamos `useInfiniteQuery` do React Query;
    - a query aplica todos os filtros (`empresa_id`, `agente_responsavel_id` / `contato_id`, período) e **depois** define ordenação + `.range(offset, offset+pageSize-1)`;
    - o `getNextPageParam` calcula o próximo offset com base no número de páginas já carregadas.
  - **Quando preferir**:
    - listas onde o usuário navega por “Carregar mais” (botão explícito), sem necessidade de scroll infinito;
    - telas de histórico em que a ordem temporal é importante e não faz sentido carregar “tudo de uma vez”.

- **Paginação por cursor (cursor temporal)**
  - **Onde usamos**: `useMensagensHistoricoInfinite` em `useMensagens.ts`.
  - **Padrão**:
    - carregamos as mensagens mais recentes primeiro (`order('criado_em', { ascending: false })` + `limit`);
    - o cursor é o `criado_em` da última mensagem retornada;
    - a próxima página usa `lt('criado_em', cursor)` para buscar blocos **mais antigos**;
    - no client, reordenamos para `criado_em ASC` antes de renderizar.
  - **Quando preferir**:
    - timelines/mensagens onde o tempo é um bom cursor natural;
    - quando a ordenação é fixa (ex.: sempre por data) e o volume pode crescer muito.

- **Carga incremental “explícita” (Carregar mais)**
  - **Onde usamos**:
    - botão “Carregar mais sessões” no painel de histórico (`MensagensMultiplasPanel`);
    - botão “Carregar mais antigas” em mensagens históricas (`SessaoCard` e dialog de histórico em `ContatosPage`).
  - **Padrão**:
    - o componente **não** dispara nova busca sozinho ao rolar a página;
    - o usuário aciona conscientemente um botão para trazer mais dados;
    - mantemos o estado acumulado (todas as páginas já carregadas) no próprio hook (`useInfiniteQuery`).
  - **Vantagens**:
    - controle de custo (evita múltiplas chamadas em cascata com scroll acelerado);
    - UX previsível em telas sensíveis (histórico de atendimentos, logs etc.).

- **Seleção explícita de colunas (views “leves”)**
  - **Onde usamos**: `useFila` passou de `select('*')` para um `select(...)` apenas com colunas usadas pela UI.
  - **Padrão**:
    - para listas que fazem polling (fila, dashboards), preferir **view leve** ou `select` explícito;
    - se for necessário enriquecer os dados, considerar uma segunda query pontual ou um join view-side.

### 3.2. O que *não* estamos fazendo aqui

- **Não é “lazy loading” no sentido de componentes sob demanda**
  - Lazy loading costuma se referir a:
    - carregamento on-demand de **componentes** ou **módulos** (ex.: `React.lazy`, `dynamic import`), ou
    - carregamento de seções da UI só quando entram no viewport (Intersection Observer, virtualização).
  - O que fizemos é **carga incremental de dados** (data fetching paginado) — às vezes chamado de *lazy data loading* — mas o foco é banco/HTTP, não divisão de bundle.

- **Sem scroll infinito por enquanto**
  - Nosso padrão atual é botão explícito (“Carregar mais …”) para manter:
    - menor complexidade de UI;
    - mais previsibilidade de quantas chamadas serão feitas;
    - histórico utilizável mesmo em telas menores ou com scroll abrupto.
  - Se um dia precisarmos de scroll infinito, podemos reaproveitar **os mesmos hooks `useInfiniteQuery`** com outro componente de UI.

### 3.3. Quando considerar componentes/libraries para isso

- **Ganhos potenciais ao usar libs de data loading/virtualização**
  - **TanStack Query (React Query)**: já é a base que usamos (`useInfiniteQuery`), então o padrão recomendado é:
    - concentrar o acesso em hooks (`useHistorico`, `useMensagens`),
    - usar `fetchNextPage` / `hasNextPage` para paginar.
  - **Virtualização** (ex.: `@tanstack/react-virtual`, `react-virtualized`, `react-window`):
    - faz sentido em listas **muito grandes** (centenas/milhares de linhas em memória);
    - pode ser combinada com `useInfiniteQuery` (infinite scroll + renderização só do que está visível).

- **Componentização interna**
  - Se o padrão “lista + botão Carregar mais” começar a se repetir:
    - podemos criar um componente genérico tipo `InfiniteList` que receba:
      - `items`, `renderItem`,
      - `onLoadMore`, `hasMore`, `isLoadingMore`;
    - e apenas plugamos os hooks (`useInfiniteQuery`) como fonte de dados.
  - **Por enquanto** mantivemos a implementação direta em cada tela (Histórico, Contatos) para priorizar clareza em cima de abstração.

---

## 4. Como usar estas boas práticas no dia a dia

- **Antes de criar uma nova query:**
  - Procurar se já existe um hook em `src/hooks/**` que faz algo parecido.
  - Se existir, reutilizar ou estender o hook atual.
  - Em caso de dúvida, preferir **consultar este documento** e o `docs/REDUNDANCIA_QUERIES.md` antes de adicionar novos acessos ao banco.

- **Ao criar novos hooks:**
  - Pensar se ele pode servir como “boundary” para várias telas (ex.: `useDashboardStats`, `useFila`, `useEmpresa`).
  - Definir `queryKey` estável e documentar o que ele retorna.

- **Ao otimizar performance:**
  - Priorizar:
    - consolidar queries múltiplas em uma única base,
    - remover SELECTs desnecessários dentro de mutations,
    - reutilizar dados presentes em contexto/props/hooks.

Este documento é vivo.  
Sempre que fizermos uma nova melhoria estrutural (como as de cima), devemos **registrar aqui** para servir de guia para futuras implementações.

