

## Alterar admin do Cinesystem para sidiclei@cinesystem.com.br

### Situação atual
- Empresa: **Cinesystem Cinemas LTDA** (id: `11111111-...`)
- Admin atual: **Satin Admin** (email: carlos@cinesystem.com, sem `auth_user_id` vinculado)

### O que será feito

1. **Criar usuário de autenticação** via edge function `create-user-auth` (precisa ser chamada com autenticação válida, então vou criar uma edge function temporária `provision-admin` que usa service role key internamente)

2. **Atualizar o registro do admin na tabela `usuarios`**: alterar o email para `sidiclei@cinesystem.com.br`, nome para "Sidiclei", e vincular o `auth_user_id` retornado

3. **Remover a edge function temporária** após uso

### Alternativa mais simples
Criar tudo em uma única edge function dedicada `provision-cinesystem-admin` que:
- Cria o auth user com email `sidiclei@cinesystem.com.br` e senha `#Teste_123`
- Atualiza o registro existente do admin (id `22222222-2222-2222-2222-222222222221`) com o novo email e `auth_user_id`
- Retorna confirmação

### Arquivos
- **Criar**: `supabase/functions/provision-cinesystem-admin/index.ts` (temporário, será removido depois)
- **Sem alterações** em arquivos do frontend

