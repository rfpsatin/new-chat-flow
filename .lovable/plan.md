

## Painel Super Admin — Gestão de Empresas

### Resumo

Criar um painel separado acessível via `/superadmin` com login por email/senha (Supabase Auth), restrito ao email `superadmin@maringaai.com.br`. O painel permite criar, editar, ativar/desativar e visualizar empresas.

### Alterações no banco de dados

#### 1. Tabela `super_admins`
Tabela simples que registra quais `auth.users` são super admins:

```sql
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id)
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins podem ver seus próprios registros
CREATE POLICY "Super admins podem ver" ON public.super_admins
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());
```

#### 2. Função `is_super_admin`
```sql
CREATE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE auth_user_id = p_user_id) $$;
```

#### 3. RLS para `empresas` — permitir CRUD para super admins
Adicionar políticas INSERT, UPDATE, DELETE na tabela `empresas` usando `is_super_admin(auth.uid())`.

#### 4. Criar o usuário Auth e registrar como super admin
- Habilitar temporariamente auto-confirm de email
- Criar o usuário via `supabase.auth.signUp` com email `superadmin@maringaai.com.br` e senha `#Teste_123`
- Inserir o registro na tabela `super_admins`

### Alterações no frontend

#### 5. Página de login `/superadmin/login`
- Formulário simples com email e senha
- Usa `supabase.auth.signInWithPassword`
- Redireciona para `/superadmin` após login

#### 6. Contexto `SuperAdminContext`
- Gerencia sessão Auth (onAuthStateChange)
- Verifica se o usuário logado é super admin (consulta tabela `super_admins`)
- Expõe `isSuperAdmin`, `user`, `loading`, `logout`

#### 7. Guard `SuperAdminGuard`
- Protege rotas `/superadmin/*`
- Redireciona para `/superadmin/login` se não autenticado ou não super admin

#### 8. Layout `SuperAdminLayout`
- Layout simples com sidebar contendo apenas "Empresas" e botão "Sair"
- Visual diferenciado do layout principal (sem DevPanel, sem UserSelector)

#### 9. Página `/superadmin/empresas` (e rota default `/superadmin`)
- Tabela listando todas as empresas com colunas: Razão Social, Nome Fantasia, CNPJ, Status (ativo/inativo), Data criação
- Botões: Criar nova empresa, Editar, Ativar/Desativar
- Dialog para criar/editar empresa (razão social, nome fantasia, CNPJ, ativo)
- Exibe o `id` da empresa (código UUID) para referência

#### 10. Hook `useSuperAdminEmpresas`
- Query para listar todas as empresas
- Mutations para criar, editar e toggle ativo

#### 11. Rotas no `App.tsx`
```
/superadmin/login  → SuperAdminLoginPage
/superadmin        → SuperAdminEmpresasPage (protegido)
/superadmin/empresas → SuperAdminEmpresasPage (protegido)
```

### Arquivos novos
- `src/contexts/SuperAdminContext.tsx`
- `src/components/SuperAdminGuard.tsx`
- `src/components/SuperAdminLayout.tsx`
- `src/pages/superadmin/LoginPage.tsx`
- `src/pages/superadmin/EmpresasPage.tsx`
- `src/hooks/useSuperAdminEmpresas.ts`

### Arquivos modificados
- `src/App.tsx` — adicionar rotas `/superadmin/*`

