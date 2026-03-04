

## Adicionar Admin na Criação de Empresa

### Resumo
Ao criar uma empresa no painel super admin, adicionar campos opcionais de email e senha para criar automaticamente um usuário administrador (`tipo_usuario = 'adm'`) vinculado à nova empresa.

### Fluxo
1. Super admin preenche dados da empresa + email/senha do admin
2. Empresa é criada no banco
3. Edge function `create-user-auth` cria a conta Auth com email/senha
4. Registro na tabela `usuarios` com `tipo_usuario = 'adm'`, `empresa_id` da nova empresa e `auth_user_id` retornado

### Alterações

#### 1. `src/pages/superadmin/EmpresasPage.tsx`
- Adicionar campos `admin_email` e `admin_senha` ao formulário (visíveis apenas no modo criação)
- Passar esses valores para a mutation de criação

#### 2. `src/hooks/useSuperAdminEmpresas.ts`
- Alterar `createMutation` para:
  1. Inserir empresa e obter o `id` retornado
  2. Se `admin_email` e `admin_senha` foram fornecidos, chamar edge function `create-user-auth` para criar conta Auth
  3. Inserir registro em `usuarios` com `auth_user_id`, `empresa_id`, `nome` (derivado do email), `email`, `tipo_usuario = 'adm'`

#### 3. Nenhuma alteração no banco ou edge functions
- A edge function `create-user-auth` já existe e faz exatamente o necessário
- A tabela `usuarios` já aceita inserts (RLS permite)

### Arquivos modificados
- `src/pages/superadmin/EmpresasPage.tsx`
- `src/hooks/useSuperAdminEmpresas.ts`

