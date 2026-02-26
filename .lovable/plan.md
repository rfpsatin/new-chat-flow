

## Aplicar migração pendente: `origem_final` e lógica associada

### Diagnóstico

A coluna `origem_final` **não existe** na tabela `conversas` no banco de dados. O arquivo de migração `20260226140000_origem_final_e_zerar_ao_encerrar.sql` está no repositório mas não foi executado. As views e a função `encerrar_conversa` também estão desatualizadas.

As edge functions (`whapi-webhook`, `start-conversation`) já referenciam `origem_final` no código, mas o banco não tem a coluna — o que pode causar erros silenciosos nos inserts/updates.

### Alterações

1. **Aplicar migração via ferramenta de banco**: executar o SQL do arquivo de migração para:
   - Adicionar coluna `origem_final` na tabela `conversas`
   - Ajustar CHECK de `origem_inicial` para incluir `'atendente'`
   - Recriar views `vw_fila_atendimento` e `vw_historico_conversas` com `origem_final`
   - Atualizar função `encerrar_conversa` para zerar `origem_inicial` e `origem_final`

Nenhuma alteração de código é necessária — as edge functions já estão corretas.

