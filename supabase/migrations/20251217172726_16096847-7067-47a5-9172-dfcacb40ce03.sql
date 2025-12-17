-- Adicionar colunas de satisfação na tabela conversas
ALTER TABLE public.conversas 
ADD COLUMN nota_satisfacao smallint,
ADD COLUMN pesquisa_enviada_em timestamptz,
ADD COLUMN pesquisa_respondida_em timestamptz;

-- Adicionar constraint de validação para nota (1-5)
ALTER TABLE public.conversas 
ADD CONSTRAINT check_nota_satisfacao CHECK (nota_satisfacao IS NULL OR (nota_satisfacao >= 1 AND nota_satisfacao <= 5));

-- Recriar view vw_historico_conversas para incluir nota_satisfacao
DROP VIEW IF EXISTS public.vw_historico_conversas;

CREATE VIEW public.vw_historico_conversas AS
SELECT 
  c.id as conversa_id,
  c.contato_id,
  c.empresa_id,
  c.canal,
  c.status,
  c.created_at as iniciado_em,
  c.encerrado_em,
  me.descricao as motivo_encerramento,
  c.resumo,
  c.nota_satisfacao,
  ct.nome as contato_nome,
  ct.whatsapp_numero,
  c.agente_responsavel_id,
  u.nome as agente_nome
FROM public.conversas c
LEFT JOIN public.contatos ct ON ct.id = c.contato_id
LEFT JOIN public.motivos_encerramento me ON me.id = c.motivo_encerramento_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = 'encerrado';