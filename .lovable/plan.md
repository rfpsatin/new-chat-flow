

## Redeploy de todas as Edge Functions

Vou fazer o redeploy de todas as 21 edge functions do projeto para garantir que o código mais recente (incluindo os headers `apikey` adicionados em `run-campaigns` e `start-conversation`) esteja ativo em produção.

### Funções a redeployar
1. buscar-empresa
2. check-attendance-mode
3. close-service
4. conversation-attendance-status
5. create-user-auth
6. import-contacts
7. n8n-reset-human-mode
8. n8n-send-message
9. n8n-webhook-cinemkt
10. reschedule-campaign-errors
11. run-campaigns
12. setup-super-admin
13. start-conversation
14. whapi-config
15. whapi-connection-webhook
16. whapi-media
17. whapi-qr
18. whapi-reconnect
19. whapi-send-message
20. whapi-status
21. whapi-webhook

### Ação
Deploy paralelo de todas as funções usando a ferramenta de deploy.

