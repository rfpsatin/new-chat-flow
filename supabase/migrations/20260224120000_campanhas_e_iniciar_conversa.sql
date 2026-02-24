-- Fase 1: Base para iniciar conversa 1:1 e campanhas
-- 1.1 Ajustes em conversas
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS origem_inicial text DEFAULT 'cliente'
    CHECK (origem_inicial IS NULL OR origem_inicial IN ('cliente', 'agente', 'sistema', 'campanha'));

COMMENT ON COLUMN public.conversas.origem_inicial IS 'Quem iniciou a sessão: cliente (inbound), agente, sistema ou campanha.';

-- campanha_id será adicionado após criar tabela campanhas
-- 1.2 Tabela campanhas
CREATE TABLE IF NOT EXISTS public.campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  tags text[] DEFAULT '{}',
  mensagem_texto text NOT NULL,
  midia_url text,
  link text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'agendada', 'em_execucao', 'concluida', 'pausada', 'erro')),
  agendado_para timestamptz,
  iniciada_em timestamptz,
  finalizada_em timestamptz,
  envios_por_minuto int,
  envios_por_hora int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.campanhas IS 'Campanhas de disparo em massa para contatos (WhatsApp).';

CREATE INDEX IF NOT EXISTS idx_campanhas_empresa_status ON public.campanhas (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_campanhas_agendado ON public.campanhas (agendado_para) WHERE status = 'agendada';

-- 1.3 Tabela campanha_destinatarios
CREATE TABLE IF NOT EXISTS public.campanha_destinatarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  contato_id uuid NOT NULL REFERENCES public.contatos(id) ON DELETE CASCADE,
  whatsapp_numero text NOT NULL,
  status_envio text NOT NULL DEFAULT 'pendente'
    CHECK (status_envio IN ('pendente', 'enviando', 'enviado', 'erro_envio', 'entregue', 'lido')),
  tentativas int NOT NULL DEFAULT 0,
  ultima_tentativa_em timestamptz,
  mensagem_id_whatsapp text,
  conversa_id uuid REFERENCES public.conversas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campanha_id, contato_id)
);

COMMENT ON TABLE public.campanha_destinatarios IS 'Destinatários de cada campanha e status do envio.';

CREATE INDEX IF NOT EXISTS idx_campanha_destinatarios_campanha_status
  ON public.campanha_destinatarios (campanha_id, status_envio);
CREATE INDEX IF NOT EXISTS idx_campanha_destinatarios_contato
  ON public.campanha_destinatarios (contato_id);

-- 1.4 Adicionar campanha_id em conversas (após campanhas existir)
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS campanha_id uuid REFERENCES public.campanhas(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.conversas.campanha_id IS 'Conversa originada por esta campanha (resposta do cliente ao disparo).';

CREATE INDEX IF NOT EXISTS idx_conversas_campanha_id ON public.conversas (campanha_id) WHERE campanha_id IS NOT NULL;

-- RLS
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_destinatarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver campanhas" ON public.campanhas FOR ALL USING (true);
CREATE POLICY "Usuarios podem ver campanha_destinatarios" ON public.campanha_destinatarios FOR ALL USING (true);

-- View para métricas de campanha (opcional, usada no front)
CREATE OR REPLACE VIEW public.vw_campanha_stats AS
SELECT
  c.id AS campanha_id,
  c.empresa_id,
  c.nome,
  c.status,
  c.agendado_para,
  c.iniciada_em,
  c.finalizada_em,
  COUNT(cd.id) AS total_destinatarios,
  COUNT(cd.id) FILTER (WHERE cd.status_envio = 'pendente') AS pendentes,
  COUNT(cd.id) FILTER (WHERE cd.status_envio = 'enviado') AS enviados,
  COUNT(cd.id) FILTER (WHERE cd.status_envio = 'erro_envio') AS erros,
  COUNT(cd.id) FILTER (WHERE cd.status_envio IN ('entregue', 'lido')) AS entregues,
  COUNT(cd.conversa_id) AS conversas_abertas
FROM public.campanhas c
LEFT JOIN public.campanha_destinatarios cd ON cd.campanha_id = c.id
GROUP BY c.id, c.empresa_id, c.nome, c.status, c.agendado_para, c.iniciada_em, c.finalizada_em;

-- Incluir origem_inicial e campanha_id nas views de fila e histórico
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
  c.origem,
  c.channel,
  c.nr_protocolo,
  c.origem_inicial,
  c.campanha_id
FROM public.conversas c
JOIN public.contatos co ON co.id = c.contato_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = ANY (ARRAY['bot'::text, 'esperando_tria'::text, 'fila_humano'::text, 'em_atendimento_humano'::text])
ORDER BY c.last_message_at DESC;

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
  c.nr_protocolo,
  c.origem_inicial,
  c.campanha_id
FROM public.conversas c
LEFT JOIN public.contatos ct ON ct.id = c.contato_id
LEFT JOIN public.motivos_encerramento me ON me.id = c.motivo_encerramento_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = 'encerrado';
