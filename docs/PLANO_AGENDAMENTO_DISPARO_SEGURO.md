# Plano de implementação: nova estratégia de agendamento e disparo (campanhas em lote)

Documento para análise e aprovação. Objetivo: revisar o fluxo de campanhas em lote com limite diário configurável, janela de horário, agendamento por destinatário, mensagens variadas e aleatoriedade de horários, além de visão de acompanhamento.

---

## 1. Resumo executivo

| Aspecto | Situação atual | Nova estratégia |
|--------|----------------|-----------------|
| **Fonte de contatos** | Só filtros (nome, telefone, tag) | Filtros **+ upload CSV** (telefones → buscar contatos cadastrados) |
| **Limite diário** | Fixo 2000 no código; "lote" = tamanho do bloco | **Lote = limite máximo por dia** (ex.: 300); configurável na tela; sem regra fixa de 2000 |
| **Horário de envio** | Data/hora única por campanha (início do lote) | **Janela diária** (ex.: 8h–21h); cada disparo em um horário **aleatório** dentro da janela do dia |
| **Agendamento** | Uma data/hora por campanha; worker envia todos pendentes do lote em sequência | **Um horário por destinatário** (`agendado_para` em cada registro); worker envia só os que já passaram do horário |
| **Mensagem** | Uma mensagem única para toda a campanha | **Várias opções de mensagem**; atribuição **aleatória** por destinatário |
| **Distribuição por dia** | Lotes fixos (ex.: 300 por lote, vários lotes/dia até 2000) | **1º e 2º dia com quantidade configurável** (ex.: 100, 180); **restante** em N dias com **quantidades aleatórias** por dia (sem padrão linear) |
| **Oscilação entre dias** | Intervalo fixo entre lotes (ex.: 5 min) | **Variação de início/fim** do dia (ex.: ±10 min); próximo dia pode começar 7:50 ou 8:10 |
| **Worker** | Busca campanhas `agendada` com `agendado_para <= now`; envia em batch com delay fixo | Busca destinatários com `agendado_para <= now` e `pendente`; envia **um a um** com **intervalo aleatório** configurável |
| **Visão** | Lista de campanhas e detalhe por campanha | **Visão visual** do andamento: total a disparar, já disparado (sucesso/erro), faltando, linha do tempo por dia/lote |

---

## 2. Escopo da mudança

- **Foco de UI/configuração:** tela **Campanhas em lote** (wizard atual).
- **Carga de contatos:** manter filtros atuais e **adicionar carga por CSV** (coluna de telefone; usar para buscar contatos da empresa).
- **Backend:** modelo de dados (campanhas + destinatários + opções de mensagem), regras de geração de agendamentos, worker `run-campaigns` e, se necessário, cron.
- **Visão de acompanhamento:** nova tela ou painel para acompanhar “o que tinha para disparar”, “o que já foi”, “o que falhou”, “o que falta”.

---

## 3. Modelo de dados (proposto)

### 3.1 Conceito: uma campanha, vários dias, um horário por destinatário

- **Uma campanha** representa um único “mailing” (ex.: 2000 contatos).
- Cada **destinatário** tem:
  - **agendado_para** (timestamptz): data/hora em que aquele contato deve receber a mensagem.
  - **mensagem_texto** (text, opcional): texto efetivo a enviar (uma das opções, atribuída aleatoriamente na criação).
- A **campanha** guarda a configuração da janela e dos lotes diários (ver abaixo).
- O worker não usa mais “uma data por campanha”; usa “para cada destinatário, enviar quando `agendado_para <= now()`”.

### 3.2 Novos campos em `campanhas`

| Campo | Tipo | Descrição |
|-------|------|------------|
| `hora_inicio_dia` | time ou int (0–23) | Início da janela diária (ex.: 08:00). |
| `hora_fim_dia` | time ou int (0–23) | Fim da janela diária (ex.: 21:00). |
| `limite_diario` | int | Máximo de envios por dia (ex.: 300). É o “lote” configurado na tela. |
| `variacao_minutos` | int | Oscilação do início/fim do dia para os dias seguintes (ex.: 10 → próximo dia 7:50 ou 8:10). |
| `qtd_lote_1` | int | Quantidade no 1º dia (ex.: 100). |
| `qtd_lote_2` | int | Quantidade no 2º dia (ex.: 180). |
| `max_lotes` | int | Número máximo de dias/lotes (ex.: 7). O restante (após lote 1 e 2) é distribuído nos dias 3..max_lotes com quantidades aleatórias. |
| `intervalo_min_segundos` | int | Mínimo de segundos entre dois envios (ex.: 30). Usado no worker para randomizar. |
| `intervalo_max_segundos` | int | Máximo de segundos entre dois envios (ex.: 300). |

- **Compatibilidade:** `agendado_para` na campanha pode continuar como “data em que a campanha começa a valer” (primeiro dia de envio); o worker usa os `agendado_para` dos **destinatários** para decidir quando enviar.

### 3.3 Novos campos em `campanha_destinatarios`

| Campo | Tipo | Descrição |
|-------|------|------------|
| `agendado_para` | timestamptz | Data/hora em que este destinatário deve receber a mensagem. |
| `mensagem_texto` | text (nullable) | Texto a enviar para este destinatário (uma das opções da campanha, atribuída na geração). |

- Se `mensagem_texto` for null (campanhas antigas), o worker usa `campanha.mensagem_texto`.

### 3.4 Opções de mensagem (múltiplas por campanha)

**Opção A – tabela nova `campanha_mensagens`**

- `id`, `campanha_id`, `texto` (text), `ordem` (int).
- Na geração dos destinatários, sorteia-se uma linha por destinatário e grava-se em `campanha_destinatarios.mensagem_texto`.

**Opção B – coluna em `campanhas`**

- `mensagem_opcoes` (text[] ou jsonb): lista de textos.
- Na geração, sorteia e grava em `campanha_destinatarios.mensagem_texto`.

Recomendação: **Opção B** (menos tabelas; suficiente para “N opções de texto”). Se no futuro houver mídia/link por opção, migrar para tabela.

### 3.5 Migrations sugeridas (resumo)

1. **Migration 1 – campanhas**  
   - Adicionar: `hora_inicio_dia`, `hora_fim_dia`, `limite_diario`, `variacao_minutos`, `qtd_lote_1`, `qtd_lote_2`, `max_lotes`, `intervalo_min_segundos`, `intervalo_max_segundos`.  
   - Adicionar: `mensagem_opcoes` (text[] ou jsonb), ou manter `mensagem_texto` como fallback e usar `mensagem_opcoes` quando preenchido.

2. **Migration 2 – campanha_destinatarios**  
   - Adicionar: `agendado_para` (timestamptz), `mensagem_texto` (text nullable).

3. **Índices**  
   - `campanha_destinatarios (campanha_id, status_envio, agendado_para)` para o worker buscar “pendente e agendado_para <= now”.

4. **Views**  
   - Ajustar `vw_campanha_stats` se precisar de novos campos; eventual view ou query para “visão de andamento” (por dia, total, enviado, erro, pendente).

---

## 4. Regras de negócio (agendamento)

### 4.1 Entrada (tela Campanhas em lote)

- **Data de início:** primeiro dia em que pode haver envio (ex.: 2025-03-20).
- **Horário início / fim do dia:** ex.: 8h e 21h (13 horas = 780 minutos).
- **Limite máximo por dia (lote):** ex.: 300. **É o único limite considerado**; remover qualquer regra fixa de 2000/dia.
- **Variação (minutos):** ex.: 10. Para cada dia seguinte, início e fim do dia podem oscilar ± esse valor (ex.: dia 2 começa 7:50 ou 8:10).
- **Quantidade 1º lote / 2º lote:** ex.: 100 e 180 (início mais controlado).
- **Número máximo de lotes (dias):** ex.: 7.
- **Intervalo entre envios (segundos):** min e max (ex.: 30 e 300) para o worker usar entre um disparo e outro (aleatório nesse range).
- **Opções de mensagem:** várias caixas de texto (ou uma lista); pelo menos uma obrigatória.

### 4.2 Carga de contatos

- **Filtros:** manter como hoje (nome, telefone, tag) e buscar contatos da empresa.
- **CSV:**
  - Arquivo com coluna de telefone (nome da coluna configurável ou fixo, ex.: “telefone” / “whatsapp” / “numero”).
  - Normalizar número (dígitos apenas, opcionalmente prefixo 55).
  - Para cada número, buscar em `contatos` onde `empresa_id = X` e `whatsapp_numero` compatível (normalizado); incluir na lista de destinatários apenas os encontrados.
  - Suportar 1000–3000+ linhas (processar em chunks; ex.: 500 por vez) e exibir progresso/erros (linhas sem contato encontrado, duplicados, etc.).

### 4.3 Distribuição dos destinatários nos dias (lotes)

- **Total de destinatários:** N (ex.: 2000).
- **Lote 1:** primeiros `qtd_lote_1` (ex.: 100).
- **Lote 2:** próximos `qtd_lote_2` (ex.: 180).
- **Restante:** R = N − qtd_lote_1 − qtd_lote_2 (ex.: 1720).
- **Dias restantes:** D = max_lotes − 2 (ex.: 5).

- **Distribuição do restante R em D dias:** quantidades **aleatórias** por dia, sem padrão linear.
  - Algoritmo sugerido: gerar D−1 números aleatórios no intervalo [1, R−D] e ordenar; as diferenças entre consecutivos (mais os extremos) definem o tamanho de cada dia. Garantir mínimo 1 por dia e que a soma seja R. Assim evita-se “344, 344, 344…” e gera-se algo como 220, 330, 290, 400, 480.

### 4.4 Horário de cada disparo dentro do dia (aleatório, sem padrão)

- Para cada dia, temos uma **janela** [início_dia, fim_dia] (com oscilação já aplicada para esse dia).
- Para cada um dos K destinatários daquele dia, é necessário atribuir um **instante** dentro da janela.
- **Restrição:** não pode haver padrão repetitivo (ex.: sempre a cada 2,6 min). Ou seja, os intervalos entre horários consecutivos devem variar bastante.

**Algoritmo sugerido:**

1. Gerar K números aleatórios uniformes em (0, 1) e **ordenar** (ordem estatística).
2. Mapear cada um para o tempo dentro da janela:  
   `t_i = inicio_dia + (fim_dia - inicio_dia) * u_i`  
   Assim a distribuição ao longo do dia é uniforme, mas a ordem dos horários é aleatória.
3. Opcional: aplicar um “jitter” pequeno (ex.: ±5 s) em cada `t_i` para evitar colisões exatas.

Resultado: alguns disparos próximos (ex.: 5 s), outros distantes (ex.: 10 min), simulando uso humano.

### 4.5 Oscilação do início/fim do dia (por dia)

- **Dia 1:** usa hora_inicio_dia e hora_fim_dia literalmente (ex.: 8h e 21h).
- **Dia 2 em diante:**  
  - `inicio_dia = hora_inicio_dia ± variacao_minutos` (ex.: 8h ± 10 min → 7:50 ou 8:10), sorteado.  
  - `fim_dia = hora_fim_dia ± variacao_minutos` (ex.: 21h ± 10 min).  
- Assim, cada dia tem uma janela ligeiramente deslocada, evitando padrão idêntico entre dias.

### 4.6 Atribuição de mensagem por destinatário

- Para cada destinatário, ao criar o registro em `campanha_destinatarios`, sortear uma das opções de `mensagem_opcoes` (ou `mensagem_texto` único se não houver opções) e gravar em `campanha_destinatarios.mensagem_texto`.

---

## 5. Worker `run-campaigns` (nova lógica)

### 5.1 Remoções

- Remover uso de `envios_por_minuto` / batch fixo como hoje.
- Remover qualquer teto fixo de 2000/dia no código.

### 5.2 Fluxo proposto

1. **Buscar destinatários a enviar agora**
   - Query: `campanha_destinatarios` onde:
     - `status_envio = 'pendente'`
     - `agendado_para IS NOT NULL AND agendado_para <= now()`
     - Campanha com `status = 'agendada'` (ou `em_execucao`).
   - Ordenar por `agendado_para` asc.
   - Limitar a 1 (enviar **um por vez**) ou a um batch pequeno (ex.: 5–10) para reduzir chamadas ao cron, mas dentro do batch ainda processar um a um com delay aleatório.

2. **Para cada destinatário**
   - Fazer “claim” (update para `enviando`, tentativas++, ultima_tentativa_em).
   - Texto a enviar: `destinatario.mensagem_texto ?? campanha.mensagem_texto`.
   - Enviar via Whapi (igual ao atual).
   - Atualizar status para `enviado` ou `erro_envio` e registrar conversa/mensagem como hoje.
   - **Aguardar** um tempo **aleatório** entre `campanha.intervalo_min_segundos` e `campanha.intervalo_max_segundos` (ou valores default se null) antes do próximo envio.

3. **Campanha “concluída”**
   - Quando não houver mais destinatários `pendente` com `agendado_para <= now()` e não houver `enviando`, marcar campanha como `concluída` e preencher `finalizada_em`.

### 5.3 Frequência de execução (cron)

- O worker deve rodar com frequência suficiente para respeitar os horários (ex.: a cada 1–2 min). Quem invoca hoje (Supabase cron, n8n, etc.) deve manter ou ajustar para essa periodicidade.

---

## 6. Tela “Campanhas em lote” (wizard) – nova UX

### 6.1 Step 1 – Configuração e fonte de contatos

- **Bloco “Conteúdo”**
  - Nome base, descrição, tags, link (como hoje).
  - **Mensagens:** múltiplas opções (ex.: 3–5 textareas ou lista adicionável). Pelo menos uma obrigatória. Tooltip: “Uma opção será escolhida aleatoriamente para cada destinatário.”

- **Bloco “Horário e limite”**
  - **Data de início** (primeiro dia de envio).
  - **Horário início do dia** (ex.: 08:00) e **Horário fim do dia** (ex.: 21:00).
  - **Limite máximo por dia (lote):** número (ex.: 300). Label: “Máximo de mensagens enviadas por dia.”
  - **Variação (minutos):** número (ex.: 10). Label: “Oscilação do início/fim do dia nos dias seguintes (± N min).”
  - **Quantidade 1º lote** e **Quantidade 2º lote** (ex.: 100 e 180).
  - **Número máximo de lotes (dias):** (ex.: 7).
  - **Intervalo entre envios:** mínimo e máximo em segundos (ex.: 30 e 300). Tooltip: “Tempo aleatório entre um disparo e outro.”

- **Bloco “Quem trata a resposta”**  
  - Agente / Atendente (como hoje).

- **Bloco “Destinatários”**
  - **Opção A – Filtros:** nome, telefone, tag + botão “Buscar contatos” (comportamento atual).
  - **Opção B – CSV:** upload de arquivo; seleção de coluna de telefone (ou detecção automática); botão “Processar CSV” → busca contatos por telefone, mostra resumo (encontrados, não encontrados, duplicados) e preenche a lista de destinatários.
  - Exibir total de destinatários (deduplicados por telefone) e permitir “Gerar lotes” quando houver pelo menos um.

- Remover da UI qualquer menção a “2000 disparos por dia” ou limite fixo; a única referência é o “Limite máximo por dia (lote)”.

### 6.2 Step 2 – Revisão dos lotes (dias)

- Em vez de “uma linha por lote com data/hora fixa”, mostrar **um bloco por dia** (lote 1, 2, …, até max_lotes):
  - Dia 1: quantidade = qtd_lote_1, janela = início_dia ± 0, fim_dia ± 0.
  - Dia 2: quantidade = qtd_lote_2, janela = início_dia ± variacao, fim_dia ± variacao (exemplo).
  - Dias 3..max_lotes: quantidade = valor aleatório já calculado (prévia), janela com oscilação.
- Exibir totais: “Total a enviar: N em D dias. Média de X/dia.”
- Opcional: permitir editar quantidade por dia (override) antes de confirmar.
- Botão “Gerar campanha” cria **uma única campanha** com todos os destinatários e preenche `agendado_para` e `mensagem_texto` de cada um conforme as regras acima.

### 6.3 Criação no backend (quando o usuário confirma)

- Inserir **uma** campanha com todos os campos novos (hora_inicio_dia, hora_fim_dia, limite_diario, variacao_minutos, qtd_lote_1, qtd_lote_2, max_lotes, intervalo_min/max_segundos, mensagem_opcoes).
- Calcular distribuição por dia (lote 1, lote 2, depois aleatória para os demais).
- Para cada dia, aplicar oscilação na janela; para cada destinatário daquele dia, calcular `agendado_para` (algoritmo aleatório dentro da janela) e sortear mensagem → inserir em `campanha_destinatarios` (contato_id, whatsapp_numero, agendado_para, mensagem_texto, status_envio = 'pendente').
- Definir `campanha.agendado_para` = início do primeiro dia (para compatibilidade e para a campanha “estar ativa” a partir dessa data).
- Status da campanha: `agendada`.

---

## 7. Visão de acompanhamento (“tudo que tinha, o que já foi, o que falta”)

### 7.1 Objetivo

- Ver por campanha (ou por “mailing”):
  - Total programado para disparar.
  - Já passou do horário e foi enviado (sucesso).
  - Já passou do horário e deu erro.
  - Ainda não passou do horário (pendente).
  - Por dia: quantos estavam programados, quantos já foram, quantos falharam, quantos faltam.

### 7.2 Opções de implementação

- **Opção A – Detalhe da campanha (diálogo existente)**  
  - Expandir o diálogo de detalhe da campanha com:
    - Cards ou tabela por “dia” (data): total no dia, enviados, erros, pendentes (com agendado_para no futuro).
    - Lista de destinatários com coluna “Horário previsto”, “Status”, “Mensagem (resumo)”.
  - Gráfico simples (barras ou linhas): por dia, “previsto” vs “enviado” vs “erro” vs “pendente”.

- **Opção B – Página ou aba “Andamento de campanhas”**  
  - Lista de campanhas agendadas/em execução com indicadores visuais (progress bar, cores) e, ao clicar, mesmo detalhe por dia e por destinatário.

Recomendação: começar pela **Opção A** (enriquecer o diálogo de detalhe) e adicionar um resumo visual (totais + por dia). Se necessário, depois evoluir para uma página dedicada.

### 7.3 Dados necessários

- Query por campanha:  
  - Contar por (data(agendado_para), status_envio) para destinatários.  
  - Listar destinatários com agendado_para, status_envio, erro_envio_msg, mensagem_texto (truncado).  
- View ou função SQL pode encapsular “por dia” para facilitar o front.

---

## 8. Compatibilidade e migração

- **Campanhas antigas:** sem `agendado_para` em destinatários e sem novos campos na campanha:
  - Worker: se `campanha_destinatarios.agendado_para` for null, usar comportamento “legado”: campanha com `agendado_para <= now()` e enviar pendentes em batch com delay fixo (como hoje), usando `campanha.mensagem_texto`.
- **Novas campanhas:** sempre com `agendado_para` por destinatário e novos campos preenchidos; worker usa só a nova lógica quando todos os destinatários da campanha tiverem `agendado_para` preenchido (ou quando a campanha tiver `limite_diario` preenchido, como indicador de “nova estratégia”).

---

## 9. Fases de implementação sugeridas

| Fase | Descrição | Entregas |
|------|-----------|----------|
| **1 – Modelo e backend base** | Migrations, tipos, índices | Migrations campanhas + campanha_destinatarios; tipos TS; view/query de suporte. |
| **2 – Geração de agendamentos** | Lógica de distribuição e horários | Função (Edge ou RPC) que recebe lista de contatos + config e gera N destinatários com agendado_para e mensagem_texto; integração no wizard (chamada ao “Gerar campanha”). |
| **3 – Worker run-campaigns** | Nova lógica de disparo | Seleção por agendado_para <= now; um a um com delay aleatório; uso de mensagem_texto do destinatário; remoção de limite 2000 e de batch fixo antigo. |
| **4 – Tela Campanhas em lote** | UI completa | Campos novos (janela, limite diário, 1º/2º lote, max lotes, variação, intervalo min/max); múltiplas mensagens; CSV (upload + match por telefone); step 2 com prévia por dia; criação de uma campanha com todos os destinatários agendados. |
| **5 – Visão de acompanhamento** | Detalhe e resumo visual | Detalhe da campanha: por dia (total, enviado, erro, pendente); lista de destinatários com horário e status; opcional: gráfico por dia. |
| **6 – Ajustes e testes** | Regras e edge cases | Validações (janela fim > início, max_lotes >= 2, etc.); tratamento de CSV grande; testes de carga e de horários. |

Ordem recomendada: 1 → 2 → 3 (para já poder testar disparo com dados manuais), depois 4 → 5 → 6.

---

## 10. Riscos e dependências

- **Cron:** garantir que `run-campaigns` seja invocado com frequência adequada (ex.: a cada 1–2 min); sem isso, os horários por destinatário podem “atrasar”.
- **CSV grande (2–3 mil linhas):** processar em chunks no front ou via Edge Function para não travar o browser; exibir progresso e resumo de erros/ignorados.
- **Timezone:** armazenar e comparar `agendado_para` em UTC; na UI, exibir em timezone da empresa/usuário quando necessário.

---

## 11. Checklist para aprovação

- [ ] Limite diário = valor configurado na tela (lote); nenhuma regra fixa de 2000 no backend.
- [ ] Janela diária (início/fim) e variação entre dias (± minutos) conforme tela.
- [ ] 1º e 2º dia com quantidades configuráveis; restante em N dias com quantidades aleatórias (soma = restante).
- [ ] Um horário por destinatário (`agendado_para`); horários aleatórios dentro do dia, sem padrão repetitivo.
- [ ] Múltiplas opções de mensagem; atribuição aleatória por destinatário.
- [ ] Carga por CSV (telefone → contatos cadastrados); suporte a 1000–3000+ linhas.
- [ ] Worker envia um a um, com intervalo aleatório configurável entre envios.
- [ ] Visão clara: total a disparar, já disparado (ok/erro), pendente (por dia e global).

Se algo do escopo ou das regras precisar ser ajustado (ex.: manter mais de uma campanha por “dia” em vez de uma campanha única com muitos destinatários), isso pode ser refinado na fase de detalhamento técnico a partir deste plano.
