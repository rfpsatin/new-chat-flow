

## Plano: Migração Completa do Lovable Cloud (Projeto Original → Este Projeto)

### Inventario completo levantado

---

### 1. TABELAS (13 tabelas + 1 auxiliar)

| Tabela | Dados criticos |
|--------|---------------|
| `empresas` | Cadastro das empresas clientes (inclui `whapi_token`, `agente_ia_ativo`, `tipo_atendimento`) |
| `usuarios` | Operadores/admins vinculados a `auth.users` |
| `contatos` | Contatos WhatsApp (com `tag_origem`, `tp_contato`) |
| `conversas` | Sessoes de atendimento (com `nr_protocolo`, `human_mode`, `origem`, `campanha_id`, `nota_satisfacao`) |
| `mensagens_ativas` | Mensagens de conversas abertas (com `media_url`, `whatsapp_message_id`, `reply_to_*`) |
| `mensagens_historico` | Mensagens arquivadas de conversas encerradas |
| `motivos_encerramento` | Motivos configurados por empresa |
| `atendentes` | Atendentes vinculados a usuarios |
| `campanhas` | Campanhas de disparo em massa |
| `campanha_destinatarios` | Destinatarios individuais por campanha (com `agendado_para`, `erro_envio_msg`) |
| `super_admins` | Super administradores do sistema |
| `whapi_connection_events` | Historico de eventos de conexao Whapi |
| `protocolo_contador` | Sequencia diaria para nr_protocolo |

### 2. VIEWS (2)

| View | Descricao |
|------|-----------|
| `vw_fila_atendimento` | Fila de conversas ativas com dados do contato e agente |
| `vw_historico_conversas` | Historico de conversas encerradas com motivo e satisfacao |

### 3. FUNCTIONS/TRIGGERS (RPC)

- `encerrar_conversa()` — encerra e arquiva mensagens
- `atribuir_agente()` — atribui agente a conversa
- `is_super_admin()` — verifica se usuario e super admin
- `gerar_nr_protocolo()` — gera numero de protocolo sequencial diario
- Trigger `trg_gerar_protocolo` na tabela `conversas`

### 4. AUTH USERS (`auth.users`)

- Usuarios operadores vinculados via `usuarios.auth_user_id`
- Super admin: `superadmin@maringaai.com.br`
- **Precisam ser recriados** no novo Cloud (senhas precisam ser redefinidas ou migradas via API admin)

### 5. RLS POLICIES (~20+)

- Politicas de tenant isolation por `empresa_id`
- Politicas de super admin
- Todas definidas nas 46 migrations (serao recriadas automaticamente)

### 6. REALTIME

- `mensagens_ativas` — publication supabase_realtime
- `conversas` — publication supabase_realtime

### 7. SECRETS / ENV VARS (Edge Functions)

| Secret | Usado por |
|--------|-----------|
| `SUPABASE_URL` | Todas (automatico no Cloud) |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas (automatico no Cloud) |
| `SUPABASE_ANON_KEY` | Varias (automatico no Cloud) |
| `WHAPI_WEBHOOK_SECRET` | `conversation-attendance-status`, `n8n-send-message` |
| `N8N_SEND_SECRET` | `n8n-send-message` |
| `LOVABLE_API_KEY` | Automatico |

Os 3 primeiros sao automaticos. **WHAPI_WEBHOOK_SECRET** e **N8N_SEND_SECRET** precisam ser configurados manualmente.

### 8. STORAGE BUCKETS

**Nenhum bucket** encontrado nas migrations. O projeto usa URLs externas (Whapi) para midia.

### 9. LISTAS DE TRANSMISSAO

**Nenhuma tabela** `listas_transmissao` encontrada nas migrations. O tipo existe no TypeScript mas a tabela ainda nao foi criada no banco.

### 10. EDGE FUNCTIONS (22)

Todas ja estao no codigo. Serao deployadas apos habilitar o Cloud.

### 11. INDEXES

~15 indexes criados nas migrations (todos recriados automaticamente).

---

### PLANO DE EXECUCAO

**Fase 1 — Criar Lovable Cloud neste projeto**
- Habilitar Lovable Cloud (regiao: America)
- As 46 migrations recriam automaticamente toda a estrutura (tabelas, views, functions, RLS, indexes, realtime)

**Fase 2 — Exportar dados do Cloud antigo**
- Usar `psql` conectado ao Cloud antigo (project ID: `hyizldxjiwjeruxqrqbv`) para exportar todas as tabelas como CSV
- Tabelas a exportar: `empresas`, `usuarios`, `contatos`, `conversas`, `mensagens_ativas`, `mensagens_historico`, `motivos_encerramento`, `atendentes`, `campanhas`, `campanha_destinatarios`, `super_admins`, `whapi_connection_events`, `protocolo_contador`

**Fase 3 — Importar dados no Cloud novo**
- Importar CSVs na ordem correta (respeitando foreign keys):
  1. `empresas` → 2. `usuarios` → 3. `contatos` → 4. `motivos_encerramento` → 5. `conversas` → 6. `mensagens_ativas` + `mensagens_historico` → 7. `atendentes` → 8. `campanhas` → 9. `campanha_destinatarios` → 10. `super_admins` → 11. `whapi_connection_events` → 12. `protocolo_contador`

**Fase 4 — Migrar auth.users**
- Recriar usuarios no novo auth via edge function `create-user-auth` ou `setup-super-admin`
- Vincular os `auth_user_id` corretos na tabela `usuarios`
- **Nota**: Senhas precisarao ser redefinidas pelos usuarios (nao e possivel exportar hashes de senha entre instancias)

**Fase 5 — Configurar secrets**
- Adicionar `WHAPI_WEBHOOK_SECRET` e `N8N_SEND_SECRET` (se usados)
- Confirmar com voce os valores

**Fase 6 — Deploy das 22 edge functions**

**Fase 7 — Atualizar referencia do project ID**
- A migration `20260309190503` referencia o ID antigo `hyizldxjiwjeruxqrqbv` em URLs hardcoded — precisara ser atualizada para o novo project ID

**Fase 8 — Teste end-to-end**

---

### RISCO PRINCIPAL

A migracao de `auth.users` e a parte mais delicada — os usuarios existentes precisarao **redefinir suas senhas** apos a migracao, pois hashes de senha nao podem ser transferidos entre instancias Supabase via API publica. Uma alternativa e usar o `auth.admin.createUser()` com senha temporaria e forcar reset no primeiro login.

