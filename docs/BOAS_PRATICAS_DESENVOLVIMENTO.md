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

## 3. Como usar estas boas práticas no dia a dia

- **Antes de criar uma nova query:**
  - Procurar se já existe um hook em `src/hooks/**` que faz algo parecido.
  - Se existir, reutilizar ou estender o hook atual.

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

