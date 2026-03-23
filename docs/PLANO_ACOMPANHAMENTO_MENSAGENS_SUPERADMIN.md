# Plano: Tela de Acompanhamento de Mensagens (Super Admin)

**Objetivo:** Tela restrita a super admin para visão consolidada, por empresa, de mensagens recebidas, conversas fechadas e conversas em aberto (com estágio da fila). Consulta **somente sob demanda** (botão), com filtro de datas.

---

## 1. Regras de acesso e UX

| Requisito | Proposta |
|-----------|----------|
| Quem acessa | Apenas usuário autenticado como **super admin** (já existe `SuperAdminGuard` e RLS com `is_super_admin(auth.uid())`). |
| Quando carrega dados | **Nunca automático.** Apenas quando o usuário clicar em um botão explícito (ex.: **"Atualizar"** ou **"Consultar"**). |
| Filtro de datas | **Data início** e **Data fim** obrigatórios para os indicadores que dependem de período (mensagens recebidas e conversas fechadas). |
| Visão “em andamento” | Contagens atuais de conversas em aberto, por estágio (bot, triagem, fila, em atendimento). Não dependem do período; são um “snapshot” no momento do clique. |
| Visão “fechadas” | Contagem de conversas encerradas no período (entre data início e data fim). |

---

## 2. Indicadores por empresa (grid)

Para cada **empresa** cadastrada, exibir uma linha com:

| Coluna | Descrição | Fonte de dados |
|--------|-----------|----------------|
| **Empresa** | Nome (ex.: `nome_fantasia` ou `razao_social`) | `empresas` |
| **Mensagens recebidas** | Total de mensagens **entrantes** (`direcao = 'in'`) com `criado_em` entre data início e data fim | `vw_mensagens_consolidado` (ou `mensagens_ativas` + `mensagens_historico`) |
| **Conversas fechadas** | Total de conversas com `status = 'encerrado'` e `encerrado_em` entre data início e data fim | `conversas` |
| **Em aberto (total)** | Total de conversas **não encerradas** no momento da consulta | `conversas` com `status IN ('bot','esperando_tria','fila_humano','em_atendimento_humano')` |
| **Em aberto – Bot** | Subconjunto em aberto com `status = 'bot'` | idem |
| **Em aberto – Triagem** | Subconjunto com `status = 'esperando_tria'` | idem |
| **Em aberto – Fila** | Subconjunto com `status = 'fila_humano'` | idem |
| **Em aberto – Atendimento** | Subconjunto com `status = 'em_atendimento_humano'` | idem |

**Exemplo de interpretação (como pedido):**  
“Nos últimos 7 dias recebemos 900 mensagens, fechamos 800 conversas e temos 100 em aberto, sendo X no bot, Y em triagem, Z na fila e W em atendimento.”  
- **900** = coluna “Mensagens recebidas” (período).  
- **800** = coluna “Conversas fechadas” (período).  
- **100** = coluna “Em aberto (total)”; X, Y, Z, W = colunas Bot, Triagem, Fila, Atendimento.

---

## 3. Fontes de dados e RLS

- **Empresas:** `empresas` — super admin já tem SELECT (RLS com `is_super_admin`).  
- **Mensagens (recebidas no período):**  
  - `vw_mensagens_consolidado` tem `empresa_id`, `direcao`, `criado_em` e usa `security_invoker = true`.  
  - Com RLS, super admin consegue ler as tabelas subjacentes; a view deve retornar dados de todas as empresas.  
  - Contagem: `direcao = 'in'` e `criado_em BETWEEN p_data_inicio AND p_data_fim`, agrupado por `empresa_id`.  
- **Conversas fechadas (período):**  
  - `conversas` com `status = 'encerrado'` e `encerrado_em BETWEEN p_data_inicio AND p_data_fim`, agrupado por `empresa_id`.  
- **Conversas em aberto (snapshot):**  
  - `conversas` com `status IN ('bot','esperando_tria','fila_humano','em_atendimento_humano')`, agrupado por `empresa_id` e `status` (depois pivot no front ou na query).

Nenhuma alteração de RLS é necessária se o super admin já tiver permissão de leitura nessas tabelas/views (conferir políticas atuais para `conversas`, `mensagens_ativas`, `mensagens_historico`).

---

## 4. Opções de implementação no backend

**Opção A – Várias queries no cliente (React)**  
- 1) Listar empresas.  
- 2) Contagem de mensagens recebidas por empresa (período) em `vw_mensagens_consolidado`.  
- 3) Contagem de conversas fechadas por empresa (período) em `conversas`.  
- 4) Contagem de conversas em aberto por empresa e status em `conversas`.  
- Disparar 2–4 apenas quando o usuário clicar em **“Atualizar”**, em paralelo (`Promise.all`) após validar datas.  
- **Prós:** Sem migrations, só uso do client Supabase. **Contras:** Várias idas ao banco; possível limite de linhas se não usar agregação no DB.

**Opção B – Uma RPC no Supabase (recomendado)**  
- Criar função PL/pgSQL, por exemplo:  
  `get_acompanhamento_mensagens(p_data_inicio timestamptz, p_data_fim timestamptz)`  
- Retorno: tabela com uma linha por empresa (`empresa_id`, `empresa_nome`, `mensagens_recebidas`, `conversas_fechadas`, `em_aberto_bot`, `em_aberto_triagem`, `em_aberto_fila`, `em_aberto_atendimento`).  
- Dentro da função:  
  - Checar `is_super_admin(auth.uid())`; se falso, retornar vazio ou erro.  
  - Agregações em cima de `vw_mensagens_consolidado`, `conversas` (fechadas no período e abertas por status).  
- **Prós:** Uma única chamada, lógica centralizada, fácil de otimizar (índices, um único scan). **Contras:** Exige migration e manutenção de SQL.

**Recomendação:** Opção B (RPC) para uma única requisição sob demanda e grid simples no front.

---

## 5. Estrutura da tela (front-end)

- **Rota:** ex.: `/superadmin/acompanhamento` (ou `/superadmin/mensagens`).  
- **Proteção:** Mesmo layout e guard do super admin: `SuperAdminGuard` + `SuperAdminLayout`.  
- **Componentes sugeridos:**  
  - Filtros: **Data início**, **Data fim** (date ou datetime, conforme necessidade).  
  - Botão: **“Atualizar”** / **“Consultar”** — ao clicar, validar datas e disparar a consulta (RPC ou queries).  
  - Grid/tabela: uma linha por empresa com as colunas do item 2.  
  - Estados: vazio (sem período escolhido / “Clique em Atualizar”), carregando, erro, e dados preenchidos.  
- **Menu:** No `SuperAdminLayout`, adicionar item de navegação (ex.: “Acompanhamento” ou “Mensagens”) apontando para essa rota.

---

## 6. Ordem sugerida de implementação

1. **Migration (se Opção B)**  
   - Criar função `get_acompanhamento_mensagens(p_data_inicio, p_data_fim)` com checagem `is_super_admin` e agregações.  
   - Garantir que retorno tenha uma linha por empresa (incluindo empresas com zeros).

2. **Hook no front (ex.: `useAcompanhamentoMensagens`)**  
   - Parâmetros: `dataInicio`, `dataFim`; **não** usar `enabled: true` automático — usar `enabled: false` e refetch manual (ex.: `refetch()` chamado pelo botão).  
   - Ou: não usar `useQuery` com cache automático; usar `useMutation` ou estado + uma função que chama a RPC (ou as queries) apenas no clique.

3. **Página de acompanhamento**  
   - Form de filtro (datas) + botão “Atualizar”.  
   - Ao clicar: validar intervalo (início ≤ fim, opcionalmente máximo de 1 ano, etc.) e chamar o hook / função.  
   - Renderizar tabela com as colunas definidas no item 2.

4. **Navegação**  
   - Em `SuperAdminLayout`, novo item no menu para “Acompanhamento (mensagens)” → rota `/superadmin/acompanhamento`.  
   - Em `App.tsx`, nova rota protegida com `SuperAdminGuard` e `SuperAdminLayout`.

5. **Testes manuais**  
   - Login como super admin, acessar a tela, escolher período (ex.: últimos 7 dias), clicar em Atualizar e conferir se os totais batem com a ideia “900 mensagens, 800 fechadas, 100 em aberto (X, Y, Z, W)”.

---

## 7. Resumo

- **Onde:** Nova página no módulo super admin, rota dedicada.  
- **Quem:** Apenas super admin.  
- **Quando carrega:** Somente ao clicar em “Atualizar”, com data início e fim preenchidas.  
- **O quê:** Grid por empresa com mensagens recebidas (período), conversas fechadas (período) e em aberto (total + bot, triagem, fila, atendimento).  
- **Backend:** Preferência por uma RPC que retorne tudo em uma chamada; alternativa são 3–4 queries no client apenas no clique.

Este plano pode ser usado como checklist para implementação e revisão posterior (ex.: adicionar export CSV ou filtro por empresa).
