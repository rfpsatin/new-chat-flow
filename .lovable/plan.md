

## Problema: Hub não carrega — nenhum usuario tem auth_user_id

### Diagnóstico
Todos os 6 registros na tabela `usuarios` têm `auth_user_id = NULL`. O fluxo de login unificado exige que cada usuario tenha uma conta Auth vinculada via `auth_user_id`. Sem isso:
- Acessar `/` → AppContext não encontra usuario pela sessão → redireciona para `/login`
- Na tela de login, mesmo que existisse uma conta Auth, o sistema não encontraria o usuario correspondente

### Solução
Criar uma edge function administrativa que o super admin pode invocar para **provisionar contas Auth para usuarios existentes** e vincular o `auth_user_id`. Além disso, adicionar um botão na página de gestão de usuários para "Criar acesso" para usuarios sem `auth_user_id`.

### Alterações

#### 1. Edge function `create-user-auth` — já existe
A function já aceita `email` e `password` e retorna `auth_user_id`. Vamos reutilizá-la.

#### 2. `src/hooks/useGestaoUsuarios.ts`
- Adicionar mutation `criarAcessoMutation` que:
  1. Recebe `usuario_id`, `email`, `senha`
  2. Invoca `create-user-auth` com email/senha
  3. Atualiza o registro `usuarios` setando `auth_user_id`

#### 3. `src/pages/admin/UsuariosPage.tsx` (ou componente equivalente)
- Para usuarios sem `auth_user_id`, mostrar botão "Criar acesso" que abre dialog pedindo senha
- Ao submeter, chama a mutation acima

#### 4. Alternativa imediata — provisionar via painel super admin
- Na página de empresas do super admin, ao editar empresa, permitir criar acesso para o admin existente
- Ou: criar um script SQL direto que vincula o super admin existente a um usuario

### Fluxo imediato para desbloquear
O caminho mais rápido é o super admin (que já consegue logar em `/superadmin`) usar o painel de gestão de usuários para criar acesso Auth para os operadores existentes. Precisamos garantir que esse fluxo funcione a partir do painel admin da empresa.

### Arquivos modificados
- `src/hooks/useGestaoUsuarios.ts` — adicionar mutation para criar acesso Auth
- `src/components/UsuarioDialog.tsx` — botão/ação para criar acesso para usuario existente sem `auth_user_id`

