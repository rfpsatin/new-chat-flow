# Plano de Seguranca: Comparativo `ademicon-connect` vs `chat-flow-pro`

## Escopo e fontes analisadas

- Projeto de referencia: `ademicon-connect-main.zip` (extraido para analise em `.tmp_compare/ademicon-connect-main`).
- Projeto alvo: `chat-flow-pro` (este repositorio).
- Arquivos-chave de referencia:
  - `Docs-Edital-Compliance/05 - SEGURANCA-APLICACAO.md`
  - `server/src/auth/guards/jwt-auth.guard.ts`
  - `server/src/auth/guards/roles.guard.ts`
  - `server/src/core/filters/http-exception.filter.ts`
  - `server/src/app.bootstrap.ts`
  - `web/src/lib/api.ts`
  - `web/middleware.ts`
- Arquivos-chave do projeto atual:
  - `supabase/config.toml`
  - `supabase/migrations/20251217134524_e120b7bb-6d4c-4b55-ad6b-04a842a8c932.sql`
  - `src/integrations/supabase/client.ts`
  - `supabase/functions/*`
  - hooks/pages que chamam edge functions.

---

## Resumo executivo

O `ademicon-connect` tem uma postura mais madura em **camada de API** (guardas JWT + roles + filtro de erro padronizado + CORS/Helmet + validacao de entrada por DTO).  
No `chat-flow-pro`, foi iniciado um hardening importante (JWT nas funcoes internas + derivacao de tenant por usuario + segredo em webhooks), mas ainda existem lacunas estruturais em **RLS multitenant** e padronizacao de seguranca de API.

Conclusao: a Fase 1 ja aumenta muito a protecao imediata, mas para nivel "edital/compliance" e necessario completar os blocos de tenant isolation no banco e governanca de API.

---

## Plano baseado no resumo

## Objetivo geral

Consolidar a seguranca do `chat-flow-pro` em tres frentes:  
1) operacao segura da Fase 1, 2) isolamento multitenant no banco (RLS), 3) padronizacao da seguranca nas edge functions.

## Prioridade P0 - consolidar Fase 1 (imediato)

- **Escopo:** garantir que o que ja foi implementado esteja ativo em producao sem quebrar fluxos.
- **Tarefas:**
  1. Configurar secrets no Supabase:
     - `WHAPI_WEBHOOK_SECRET`
     - `WHAPI_CONNECTION_WEBHOOK_SECRET`
     - `N8N_WEBHOOK_SECRET`
  2. Configurar Whapi/n8n para enviar `x-webhook-secret`.
  3. Confirmar deploy das funcoes internas com `verify_jwt=true`.
  4. Rodar smoke tests dos fluxos criticos:
     - iniciar conversa
     - enviar mensagem
     - encerrar conversa
     - reset human mode
  5. Monitorar logs por 24h para identificar 401/403 e ajustar clientes faltantes.
- **Criterio de concluido:**
  - funcoes internas operando com JWT e sem regressao de negocio;
  - webhooks aceitando apenas requests com segredo valido.

## Prioridade P1 - Fase 2 RLS estrito por tenant (maxima apos P0)

- **Escopo:** eliminar risco de acesso cruzado entre empresas.
- **Tarefas:**
  1. Criar migration de politicas RLS por `empresa_id`.
  2. Revogar politicas permissivas legadas (`using (true)` / `for all`).
  3. Aplicar politicas em tabelas criticas:
     - `empresas`
     - `usuarios`
     - `contatos`
     - `conversas`
     - `mensagens_ativas`
     - `mensagens_historico`
     - `motivos_encerramento`
     - `atendentes`
  4. Testar cenarios de abuso cross-tenant (usuario de empresa A tentando acessar dados da B).
- **Criterio de concluido:**
  - nenhuma operacao cross-tenant permitida na camada SQL.

## Prioridade P2 - padronizar auth/autorizacao nas edge functions

- **Escopo:** reduzir erro humano e manter consistencia de seguranca.
- **Tarefas:**
  1. Criar helper unico para auth/tenant/role:
     - `requireAuth()`
     - `resolveTenant()`
     - `requireRole()`
  2. Padronizar validacao de entrada com schema (ex.: Zod).
  3. Padronizar erro (`code`, `message`, `details`) em todas funcoes.
  4. Revisar logs para nao expor dados sensiveis em producao.
- **Criterio de concluido:**
  - todas as funcoes internas seguem o mesmo padrao de seguranca.

## Resultado esperado

- isolamento multitenant efetivo;
- reducao concreta de risco operacional e abuso por API;
- base pronta para compliance/auditoria com trilha de seguranca clara.

---

## Plano de implementacao (execucao pratica)

## Janela 1 - 48 horas (estabilizacao rapida)

- **Objetivo:** manter o sistema funcionando com as novas regras da Fase 1.
- **Tarefas:**
  1. Configurar secrets de webhook no Supabase (`WHAPI_WEBHOOK_SECRET`, `WHAPI_CONNECTION_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET`).
  2. Configurar Whapi/n8n para enviar header `x-webhook-secret`.
  3. Deploy das funcoes alteradas e smoke test de fluxos criticos (iniciar conversa, enviar mensagem, encerrar conversa, reset human mode).
  4. Monitorar logs por 24h para 401/403 e ajustar chamadas faltantes.
- **Saida esperada:** operacao normal sem regressao e sem endpoint interno aberto sem JWT.

## Janela 2 - semana 1 (isolamento de tenant no banco)

- **Objetivo:** impedir acesso cruzado entre empresas na camada de dados.
- **Tarefas:**
  1. Criar migration de RLS estrito por `empresa_id`.
  2. Revogar politicas permissivas antigas (`using (true)` / `for all`).
  3. Criar helper SQL (`current_empresa_id()`) e reaproveitar nas politicas.
  4. Executar testes de abuso (usuario empresa A tentando ler/escrever empresa B).
- **Saida esperada:** qualquer tentativa cross-tenant bloqueada no banco.

## Janela 3 - semana 2 (padronizacao de seguranca de API)

- **Objetivo:** reduzir erro humano e padronizar controles.
- **Tarefas:**
  1. Criar biblioteca compartilhada para edge functions (`requireAuth`, `requireRole`, `resolveTenant`, `forbidden`, `unauthorized`).
  2. Adotar validacao de payload com schema (Zod) em todas funcoes internas.
  3. Padronizar formato de resposta de erro (`code`, `message`, `details`).
  4. Revisar e remover logs sensiveis em producao.
- **Saida esperada:** mesma regra de seguranca em todas funcoes internas.

## Janela 4 - semana 3/4 (governanca e continuidade)

- **Objetivo:** manter seguranca de forma recorrente.
- **Tarefas:**
  1. Checklist de seguranca pre-deploy (secrets, verify_jwt, webhooks, RLS).
  2. Job de auditoria (CI) para detectar funcoes internas com `verify_jwt=false`.
  3. Telemetria/alerta de volume anormal de 401/403 por endpoint.
  4. Rotacao trimestral de segredos + mini pentest interno.
- **Saida esperada:** processo continuo de seguranca, nao apenas acao pontual.

## Criterios de aceite finais

- Nenhuma funcao interna aceita request sem JWT valido.
- Nenhum endpoint interno confia em `empresa_id` vindo do cliente.
- Todas as tabelas multitenant criticas possuem RLS por empresa.
- Webhooks externos rejeitam chamadas sem `x-webhook-secret`.
- Testes de abuso basicos passam (curl anonimo, cross-tenant, role indevida).

---

## Diferencas principais (gap analysis)

## 1) Autenticacao/autorizacao de API

- **Ademicon-connect**
  - Guardas explicitos (`JwtAuthGuard`, `RolesGuard`), com verificacao robusta de token.
  - Mapeamento de role no backend e bloqueio por perfil.
  - Estrategia clara de 401/403.
- **Chat-flow-pro**
  - Antes: varias edge functions internas sem JWT.
  - Agora (Fase 1): funcoes internas principais com `verify_jwt=true` e tenant derivado.
  - Ainda falta padronizacao central para todas as funcoes (auth helper unico, role policy unica).

### Melhoria recomendada
- Criar helper compartilhado de auth/tenant para todas as edge functions internas.
- Definir matriz de permissao por endpoint (adm/sup/opr) e validar de forma uniforme.

---

## 2) Isolamento multitenant no banco (RLS)

- **Ademicon-connect**
  - Backend centralizado protegido por JWT (menos dependencia de RLS no cliente).
- **Chat-flow-pro**
  - Existe RLS habilitado, mas migration base contem politicas permissivas (`using (true)` / `for all`) em tabelas criticas.
  - Isso e o principal risco remanescente.

### Melhoria recomendada
- Substituir politicas permissivas por politicas por `empresa_id` + `auth.uid()`:
  - `contatos`, `conversas`, `mensagens_ativas`, `mensagens_historico`, `usuarios`, `atendentes`, `motivos_encerramento`, `empresas`.
- Adotar helper SQL (`current_empresa_id()`) para simplificar e evitar erro humano.

---

## 3) Webhooks externos

- **Ademicon-connect**
  - Foco maior em API tradicional; webhook security nao e o centro do desenho.
- **Chat-flow-pro**
  - Uso intenso de webhook (Whapi/n8n), logo superficie de ataque maior.
  - Fase 1 adicionou `x-webhook-secret` nas funcoes externas principais.

### Melhoria recomendada
- Padronizar segredo em todos webhooks externos.
- Incluir rotacao de segredo e fallback de troca segura.
- Opcional futuro: assinatura HMAC por payload + timestamp/nonce.

---

## 4) Tratamento de erro e validacao de entrada

- **Ademicon-connect**
  - `ValidationPipe` global, DTOs com class-validator e `HttpExceptionFilter` padronizado.
- **Chat-flow-pro**
  - Edge functions validam manualmente, sem padrao unico de schema.
  - Mensagens e status variam entre endpoints.

### Melhoria recomendada
- Padronizar resposta de erro das edge functions (`code`, `message`, `details`).
- Validar payload com schema (ex.: Zod em Deno) em todas funcoes internas.

---

## 5) CORS, headers e hardening HTTP

- **Ademicon-connect**
  - CORS restrito por lista de origens.
  - Helmet com CSP em producao.
- **Chat-flow-pro**
  - Edge functions estao com `Access-Control-Allow-Origin: *` (necessario em alguns fluxos, mas mais amplo).

### Melhoria recomendada
- Restringir CORS por ambiente quando possivel.
- Em funcoes internas, permitir apenas origem do frontend oficial.

---

## 6) Secrets e higiene de repositorio

- **Ademicon-connect**
  - Possui `.env.example`, mas o zip analisado tambem contem `.env` (risco de exposicao acidental).
- **Chat-flow-pro**
  - Usa `.env` local no frontend; para edge functions depende de secrets do Supabase.

### Melhoria recomendada
- Garantir que nenhum `.env` real esteja versionado/publicado em distribuicoes.
- Criar checklist de deploy: secrets obrigatorios por ambiente.

---

## Plano de acao recomendado (literal)

## Fase A (0-2 dias) - consolidar Fase 1 sem regressao

1. Validar deploy das alteracoes de auth nas funcoes internas:
   - `start-conversation`, `whapi-send-message`, `close-service`, `n8n-reset-human-mode`, `check-attendance-mode`.
2. Configurar secrets de webhook em producao:
   - `WHAPI_WEBHOOK_SECRET`
   - `WHAPI_CONNECTION_WEBHOOK_SECRET`
   - `N8N_WEBHOOK_SECRET`
3. Alinhar Whapi/n8n para enviar `x-webhook-secret`.
4. Rodar smoke tests:
   - iniciar conversa, enviar mensagem, encerrar conversa, reset human mode.
5. Monitorar logs 24h para 401/403 e ajustar chamadas faltantes.

## Criterio de pronto
- Nenhuma funcao interna aceitando request sem JWT valido.
- Webhooks externos respondendo 200 com segredo correto e 401 sem segredo.

---

## Fase B (3-7 dias) - blindagem de tenant no banco (prioridade maxima)

1. Criar migration de RLS estrito por tenant.
2. Revogar politicas antigas permissivas (`using (true)` / `for all`).
3. Criar politicas por tabela com `empresa_id` + `auth.uid()`.
4. Testar cenarios cruzados:
   - usuario A (empresa X) tentando ler/escrever empresa Y.
5. Criar script de auditoria de policies para CI.

## Criterio de pronto
- Qualquer tentativa cross-tenant retorna bloqueio no banco.

---

## Fase C (1-2 semanas) - padronizacao de API security

1. Criar modulo compartilhado para edge functions:
   - `requireAuth()`
   - `requireRole()`
   - `resolveTenant()`
   - `standardError()`
2. Adotar validacao de schema para payloads.
3. Padronizar respostas de erro (401/403/422/500).
4. Remover logs sensiveis em producao.

## Criterio de pronto
- Funcoes com comportamento de seguranca uniforme e previsivel.

---

## Fase D (2-4 semanas) - governance/compliance

1. Checklist formal de seguranca em release.
2. Revisao periodica de secrets e rotacao.
3. Telemetria:
   - metricas de 401/403 por endpoint
   - alertas de abuso por IP/tenant.
4. Pentest leve interno trimestral.

---

## O que pode ser copiado do `ademicon-connect` imediatamente

- Estrutura de **guardas e regras declarativas** (equivalente para edge functions).
- Padrao de **erro padronizado**.
- Postura de **CORS restrito** em producao.
- Pratica de **documentacao de seguranca** por camada.

---

## Ganho esperado por etapa

- **Fase A:** bloqueia abuso mais obvio por `curl`/chamada anonima.
- **Fase B:** elimina risco estrutural de vazamento/modificacao cross-tenant.
- **Fase C:** reduz regressao e inconsistencias de autorizacao.
- **Fase D:** melhora maturidade operacional e auditoria.

