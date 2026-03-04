

## Diagnóstico e Correção - Criação de Empresas

### Problemas identificados

1. **Botão "Criar" não fica clicável**: O `disabled` do botão depende de `createMutation.isPending || updateMutation.isPending`. Se a mutation falhou numa tentativa anterior e ficou em estado inconsistente, o botão pode travar. Além disso, não há validação mínima dos campos obrigatórios (`razao_social`, `cnpj`) — o botão deveria ser desabilitado apenas quando pendente, mas o usuário pode estar confundindo com falta de feedback visual.

2. **Criação falha silenciosamente**: O `nome_fantasia` é enviado como string vazia `''` em vez de `null`. A coluna aceita `null` mas string vazia pode causar comportamento inesperado. Mais importante: se o insert da empresa funciona mas a edge function `create-user-auth` falha (não deployada, erro interno), o toast de erro aparece mas a empresa pode já ter sido criada parcialmente.

3. **Falta feedback visual**: Não há indicação de loading no botão, nem validação dos campos obrigatórios antes de submeter.

### Alterações

#### 1. `src/hooks/useSuperAdminEmpresas.ts`
- Converter `nome_fantasia` vazio para `null` antes do insert
- Melhorar tratamento de erro da edge function (checar `authData?.error` e resposta HTTP)
- Garantir que a mutation não fique presa em pending

#### 2. `src/pages/superadmin/EmpresasPage.tsx`
- Desabilitar o botão "Criar" apenas quando `isPending` **ou** quando campos obrigatórios estão vazios (`razao_social` e `cnpj`)
- Adicionar texto de loading no botão ("Criando..." / "Salvando...")
- Validar que se `admin_email` for preenchido, `admin_senha` também deve ser (e vice-versa)

### Arquivos modificados
- `src/hooks/useSuperAdminEmpresas.ts`
- `src/pages/superadmin/EmpresasPage.tsx`

