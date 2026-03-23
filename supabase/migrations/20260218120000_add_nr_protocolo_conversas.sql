-- Tabela auxiliar para sequência diária do nr_protocolo (reinicia a cada dia)
CREATE TABLE IF NOT EXISTS public.protocolo_contador (
  dia date PRIMARY KEY,
  proximo int NOT NULL DEFAULT 1
);

COMMENT ON TABLE public.protocolo_contador IS 'Contador diário para geração de nr_protocolo (formato YYYYMMDD-AAAAAAA).';

-- Função que retorna o próximo número de protocolo do dia (thread-safe)
CREATE OR REPLACE FUNCTION public.get_next_nr_protocolo()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  hoje date := CURRENT_DATE;
  seq int;
  prefixo text := to_char(hoje, 'YYYYMMDD');
BEGIN
  INSERT INTO public.protocolo_contador (dia, proximo)
  VALUES (hoje, 1)
  ON CONFLICT (dia) DO UPDATE SET proximo = public.protocolo_contador.proximo + 1
  RETURNING proximo INTO seq;
  RETURN prefixo || '-' || lpad(seq::text, 7, '0');
END;
$$;

COMMENT ON FUNCTION public.get_next_nr_protocolo() IS 'Gera próximo nr_protocolo no formato YYYYMMDD-AAAAAAA (ex: 20260218-0000002). Sequência reinicia a cada dia.';

-- Coluna nr_protocolo em conversas (nullable para registros já existentes)
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS nr_protocolo text;

COMMENT ON COLUMN public.conversas.nr_protocolo IS 'Número de protocolo único por sessão. Formato: YYYYMMDD-AAAAAAA (16 caracteres). Gerado automaticamente; sequência reinicia a cada dia.';

-- Índice único para garantir unicidade e buscas
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversas_nr_protocolo
  ON public.conversas (nr_protocolo)
  WHERE nr_protocolo IS NOT NULL;

-- Trigger: preenche nr_protocolo em novos inserts quando não informado
CREATE OR REPLACE FUNCTION public.set_nr_protocolo_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.nr_protocolo IS NULL OR NEW.nr_protocolo = '' THEN
    NEW.nr_protocolo := public.get_next_nr_protocolo();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_nr_protocolo_on_insert ON public.conversas;

CREATE TRIGGER trg_set_nr_protocolo_on_insert
  BEFORE INSERT ON public.conversas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_nr_protocolo_on_insert();

-- Incluir nr_protocolo na view da fila de atendimento
DROP VIEW IF EXISTS public.vw_fila_atendimento;

CREATE VIEW public.vw_fila_atendimento AS
SELECT
  c.id AS conversa_id,
  c.empresa_id,
  co.id AS contato_id,
  co.nome AS contato_nome,
  co.whatsapp_numero,
  c.status,
  c.last_message_at,
  c.created_at,
  c.agente_responsavel_id,
  u.nome AS agente_nome,
  c.resumo,
  c.source,
  c.channel,
  c.nr_protocolo
FROM public.conversas c
JOIN public.contatos co ON co.id = c.contato_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = ANY (ARRAY['bot'::text, 'esperando_tria'::text, 'fila_humano'::text, 'em_atendimento_humano'::text])
ORDER BY c.last_message_at DESC;

-- Incluir nr_protocolo na view de histórico de conversas
DROP VIEW IF EXISTS public.vw_historico_conversas;

CREATE VIEW public.vw_historico_conversas AS
SELECT
  c.id AS conversa_id,
  c.contato_id,
  c.empresa_id,
  c.canal,
  c.status,
  c.created_at AS iniciado_em,
  c.encerrado_em,
  me.descricao AS motivo_encerramento,
  c.resumo,
  c.nota_satisfacao,
  ct.nome AS contato_nome,
  ct.whatsapp_numero,
  c.agente_responsavel_id,
  u.nome AS agente_nome,
  c.nr_protocolo
FROM public.conversas c
LEFT JOIN public.contatos ct ON ct.id = c.contato_id
LEFT JOIN public.motivos_encerramento me ON me.id = c.motivo_encerramento_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = 'encerrado';
