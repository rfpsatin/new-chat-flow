

## Plano: Alterar `buscar-empresa` para buscar por `channel_id`

### O que muda

O parâmetro principal de entrada passa a ser `channel_id` (em vez de `telefone`). A busca é feita diretamente na tabela `empresas` pela coluna `whapi_channel_name`.

### Alteração em `supabase/functions/buscar-empresa/index.ts`

Reescrever a lógica para:

1. Ler `channel_id` da query string
2. Se não fornecido, retornar erro 400
3. Buscar em `empresas` onde `whapi_channel_name = channel_id`
4. Retornar `id`, `razao_social`, `nome_fantasia`

O parâmetro `telefone` será **removido** como entrada, já que o fluxo único deve ser por `channel_id`.

```text
channel_id fornecido?
  ├─ SIM → SELECT id, razao_social, nome_fantasia FROM empresas WHERE whapi_channel_name = channel_id
  └─ NÃO → erro 400
```

### Sem alterações no banco
A coluna `whapi_channel_name` já existe na tabela `empresas`.

