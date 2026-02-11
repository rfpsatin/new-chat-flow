# Analise Consolidada - Atendimento Humano (Planejamento)

Este documento consolida a discussao realizada a partir do ponto em que decidimos **nao implementar codigo imediatamente** e focar em analise de arquitetura/fluxo para identificar a forma mais simples de marcar a passagem para atendimento humano.

## 1) Contexto e objetivo

- Objetivo principal: identificar um jeito confiavel de saber quando o cliente pediu atendimento humano e a conversa deve seguir com tratativa humanizada.
- Restricao inicial: analisar primeiro, sem alteracao de codigo.
- Hipotese inicial discutida: adicionar marcador/flag em dados de conversa.
- Refinamento posterior: talvez a solucao mais simples seja centralizar a mudanca no proprio `status` da conversa via funcao/API.

## 2) O que mapeamos no projeto

### Estrutura de estado da conversa

- Tabela central: `conversas`.
- Campo principal de fluxo: `status`.
- Estados identificados no projeto:
  - `bot`
  - `esperando_tria`
  - `fila_humano`
  - `em_atendimento_humano`
  - `encerrado`

### Tabelas/views relevantes para ativo e historico

- `mensagens_ativas`: mensagens de sessoes ativas.
- `mensagens_historico`: mensagens arquivadas apos encerramento.
- `vw_fila_atendimento`: fila de conversas ativas.
- `vw_historico_conversas`: historico de conversas encerradas.
- `vw_mensagens_consolidado`: visao unificada para relatorios.

### Comportamento atual importante

- No webhook de entrada (`supabase/functions/whapi-webhook/index.ts`), novas conversas estao sendo criadas com `status: 'esperando_tria'`.
- Ou seja, no fluxo atual nem sempre ha passagem real por `bot` na entrada.

## 3) Como o status muda hoje (confirmacao)

Sim, foi confirmado que a mudanca de status e feita no banco com `UPDATE` em `conversas.status`, principalmente via funcoes SQL (RPC).

## 4) Funcoes atuais que atualizam status

Principais funcoes mapeadas:

- `solicitar_atendimento_humano(p_conversa_id)`
  - transicao: `bot` -> `esperando_tria`
- `encaminhar_para_atendente(p_conversa_id, p_agente_id)`
  - transicao: `esperando_tria` -> `fila_humano`
- `assumir_conversa(p_conversa_id, p_agente_id)`
  - transicao: `fila_humano` -> `em_atendimento_humano`
- `atribuir_agente(p_conversa_id, p_agente_id)`
  - transicao: `esperando_tria`/`fila_humano` -> `em_atendimento_humano`
- `encerrar_conversa(p_conversa_id, p_motivo_id, p_usuario_id, p_resumo?)`
  - transicao para `encerrado` + arquivamento de mensagens

Hooks/frontend que chamam essas RPCs:

- `src/hooks/useFila.ts`
  - `encaminhar_para_atendente`
  - `assumir_conversa`
  - `atribuir_agente`
- `src/hooks/useEncerramento.ts`
  - `encerrar_conversa`
- `src/components/dev/hooks/useSimularBot.ts`
  - `solicitar_atendimento_humano` (fluxo de simulacao/dev)

## 5) Alternativas discutidas

### Alternativa A - Flag simples em `conversas`

- Ex.: `atendimento_humanizado` + `humanizado_em`.
- Pro: simples e rapida.
- Contra: pouco contexto de auditoria (quem/por que).

### Alternativa B - Flag + metadados minimos (recomendada no planejamento inicial)

- Ex.: `atendimento_humanizado`, `humanizado_em`, `humanizado_por_usuario_id`, `humanizacao_origem`.
- Pro: ainda simples, com rastreabilidade melhor.
- Contra: aumenta modelagem.

### Alternativa C - Tabela de eventos de conversa

- Ex.: `conversa_eventos` para trilha completa.
- Pro: auditoria robusta.
- Contra: maior complexidade para MVP.

### Direcao simplificada decidida na conversa

- Priorizar a camada ja existente de mudanca de `status` (RPC/API), em vez de criar estrutura mais pesada agora.

## 6) Arquitetura operacional proposta com IA/orquestrador

Fluxo sugerido:

1. Agente de IA detecta pedido de humano no texto.
2. Orquestrador chama uma API deste projeto.
3. API executa a transicao via funcao de banco (camada centralizada).
4. Sistema retorna estado anterior/atual com comportamento idempotente.

Valido destacar:

- Como o webhook ja cria conversa em `esperando_tria`, a chamada deve ser idempotente:
  - se ja estiver em `esperando_tria` ou estados humanos, nao falhar.

## 7) Contrato de API que desenhamos

Endpoint proposto (Edge Function Supabase):

- `POST /functions/v1/solicitar-atendimento-humano`

Payload base:

- `conversa_id` (obrigatorio)
- `empresa_id` (obrigatorio/recomendado para tenancy)
- `request_id` (obrigatorio para rastreio/idempotencia)
- `source` (opcional, ex.: `ai_orchestrator`)
- `trigger` (opcional: `message_id`, `detected_intent`, `confidence`, `excerpt`)

Comportamento esperado:

- `bot` -> atualiza para `esperando_tria` (`updated: true`)
- `esperando_tria` -> sem update (`updated: false`, `already_waiting_triage`)
- `fila_humano` -> sem update (`updated: false`)
- `em_atendimento_humano` -> sem update (`updated: false`)
- `encerrado` -> erro de negocio (`409`) ou no-op conforme regra final

Resposta sugerida:

- `updated`
- `previous_status`
- `current_status`
- `reason`
- `request_id`
- `processed_at`

## 8) Seguranca e validacoes alinhadas

- Autenticacao da chamada do orquestrador (header/chave de sistema).
- Validar que `conversa_id` pertence a `empresa_id`.
- Retornar erros padronizados:
  - `400` payload invalido
  - `401` origem nao autorizada
  - `404` conversa nao encontrada
  - `422` mismatch de empresa
  - `409` conversa encerrada (se politica adotar bloqueio)
  - `500` erro interno

## 9) Conclusoes da discussao

- A linha mais simples e coerente com o projeto e:
  - usar o `status` como mecanismo principal de transicao;
  - expor uma API para o orquestrador acionar essa transicao;
  - manter comportamento idempotente.
- A necessidade de um marcador adicional (flag/evento) pode ficar para uma segunda fase, caso auditoria detalhada vire requisito obrigatorio.

## 10) Observacao de escopo

- Durante esta etapa de analise, o combinado foi nao alterar o codigo da aplicacao para essa funcionalidade.
- O foco ficou em entendimento do estado atual, validacao da abordagem e desenho de contrato operacional.
