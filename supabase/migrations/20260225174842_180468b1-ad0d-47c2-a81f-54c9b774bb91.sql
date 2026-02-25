
-- 1. campanhas
CREATE TABLE public.campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  tags text[] DEFAULT '{}',
  mensagem_texto text NOT NULL,
  midia_url text,
  link text,
  status text NOT NULL DEFAULT 'draft',
  agendado_para timestamptz,
  iniciada_em timestamptz,
  finalizada_em timestamptz,
  envios_por_minuto int,
  envios_por_hora int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios podem gerenciar campanhas"
  ON public.campanhas FOR ALL USING (true) WITH CHECK (true);

-- 2. campanha_destinatarios
CREATE TABLE public.campanha_destinatarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  contato_id uuid NOT NULL,
  whatsapp_numero text NOT NULL,
  status_envio text NOT NULL DEFAULT 'pendente',
  tentativas int NOT NULL DEFAULT 0,
  ultima_tentativa_em timestamptz,
  mensagem_id_whatsapp text,
  conversa_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campanha_id, contato_id)
);

ALTER TABLE public.campanha_destinatarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios podem gerenciar destinatarios"
  ON public.campanha_destinatarios FOR ALL USING (true) WITH CHECK (true);

-- 3. view de stats
CREATE OR REPLACE VIEW public.vw_campanha_stats AS
SELECT
  c.id AS campanha_id,
  c.empresa_id,
  c.nome,
  c.status,
  c.agendado_para,
  c.iniciada_em,
  c.finalizada_em,
  COUNT(d.id)::int AS total_destinatarios,
  COUNT(d.id) FILTER (WHERE d.status_envio = 'pendente')::int AS pendentes,
  COUNT(d.id) FILTER (WHERE d.status_envio = 'enviado')::int AS enviados,
  COUNT(d.id) FILTER (WHERE d.status_envio = 'erro_envio')::int AS erros,
  COUNT(d.id) FILTER (WHERE d.status_envio = 'entregue')::int AS entregues,
  COUNT(d.id) FILTER (WHERE d.conversa_id IS NOT NULL)::int AS conversas_abertas
FROM public.campanhas c
LEFT JOIN public.campanha_destinatarios d ON d.campanha_id = c.id
GROUP BY c.id;
