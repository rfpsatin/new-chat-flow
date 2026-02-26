

## Opção de Direcionamento: Agente vs Atendente

### Resumo

Adicionar seleção "Quem irá tratar a resposta" (Agente / Atendente) nos diálogos de iniciar conversa e de criação de campanha. A escolha define `origem_final` na conversa, controla o status inicial e impede acionamento do n8n quando `origem_final = 'atendente'`.

### Alterações

#### 1. Frontend — `IniciarConversaDialog` em `src/pages/ContatosPage.tsx`

- Adicionar radio group (Agente / Atendente) com tooltip informativo
- Enviar o valor selecionado como novo campo `origem_final` no `useStartConversation`
- Seleção obrigatória para habilitar botão de envio

#### 2. Frontend — `NovaCampanhaWizard` em `src/pages/CampanhasPage.tsx`

- Adicionar o mesmo radio group no step 2 (mensagem)
- Gravar `modo_resposta` na campanha (campo já existe na tabela `campanhas`)
- O `run-campaigns` usará esse valor ao criar conversas

#### 3. Hook `useStartConversation` — `src/hooks/useStartConversation.ts`

- Adicionar campo `origem_final: 'agente' | 'atendente'` à interface de params
- Enviá-lo no body do fetch

#### 4. Edge Function `start-conversation`

- Aceitar `origem_final` no body
- Gravar `origem_inicial: 'atendente'` e `origem_final` na criação da conversa
- Se `origem_final === 'atendente'` e há `remetente_id`: status = `em_atendimento_humano`, atribuir agente (comportamento atual)
- Se `origem_final === 'agente'`: status = `bot`, sem atribuição de agente

#### 5. Edge Function `run-campaigns`

- Após enviar cada mensagem, criar conversa via `start-conversation` passando `origem_final` baseado no `modo_resposta` da campanha
- Se `modo_resposta === 'atendente'`: conversa vai para `em_atendimento_humano`
- Se `modo_resposta === 'agente'` (ou null): conversa vai para `bot`

#### 6. Edge Function `whapi-webhook` — Checar `origem_final`

- Na lógica de verificação do `check-attendance-mode`, antes de chamar o n8n, consultar `origem_final` da conversa
- Se `origem_final === 'atendente'`: pular chamada ao n8n (conversa fica exclusivamente no atendimento humano)
- Se `origem_final === 'agente'` ou null: comportamento normal (aciona n8n)

#### 7. Função SQL `encerrar_conversa`

- Já reseta `origem_inicial` e `origem_final` para null no encerramento — sem alteração necessária

### Detalhes técnicos

- O campo `origem_final` já existe na tabela `conversas` — nenhuma migração necessária
- O campo `modo_resposta` já existe na tabela `campanhas` — nenhuma migração necessária
- A tag visual (bolinha verde + "WhatsApp") já é o comportamento padrão do `ConversaTags` quando `channel` não é definido — sem alteração necessária

