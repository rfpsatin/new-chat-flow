

## Alterar tipo de usuário para Administrador

O usuário **Samara Silva** (`samara.silva@cinesystem.com.br`) está atualmente como `sup` (Supervisor) e precisa ser alterado para `adm` (Administrador).

### Dados encontrados
- **ID:** `2c457794-3a4d-4014-a57b-47c07683de6c`
- **Tipo atual:** `sup` (Supervisor)
- **Tipo desejado:** `adm` (Administrador)

### Ações necessárias

1. **Atualizar `tipo_usuario`** na tabela `usuarios` de `sup` para `adm`
2. **Desativar/remover registro na tabela `atendentes`** — Administradores não possuem registro de atendente (conforme a lógica do sistema). O registro existente de atendente vinculado a este usuário deve ser desativado.

Será executado via migration com os dois UPDATEs necessários.

