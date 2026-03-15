-- Novos campos em campanhas para controle de janela diária, lotes e intervalos
ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS hora_inicio_dia time,
  ADD COLUMN IF NOT EXISTS hora_fim_dia time,
  ADD COLUMN IF NOT EXISTS limite_diario int,
  ADD COLUMN IF NOT EXISTS variacao_minutos int,
  ADD COLUMN IF NOT EXISTS qtd_lote_1 int,
  ADD COLUMN IF NOT EXISTS qtd_lote_2 int,
  ADD COLUMN IF NOT EXISTS max_lotes int,
  ADD COLUMN IF NOT EXISTS intervalo_min_segundos int,
  ADD COLUMN IF NOT EXISTS intervalo_max_segundos int,
  ADD COLUMN IF NOT EXISTS mensagem_opcoes text[];

COMMENT ON COLUMN public.campanhas.hora_inicio_dia IS 'Hora de início da janela diária de disparo (ex.: 08:00).';
COMMENT ON COLUMN public.campanhas.hora_fim_dia IS 'Hora de término da janela diária de disparo (ex.: 21:00).';
COMMENT ON COLUMN public.campanhas.limite_diario IS 'Máximo de envios por dia (lote diário).';
COMMENT ON COLUMN public.campanhas.variacao_minutos IS 'Oscilação (± minutos) aplicada ao início/fim do dia entre os lotes (dias).';
COMMENT ON COLUMN public.campanhas.qtd_lote_1 IS 'Quantidade de mensagens no primeiro lote (primeiro dia).';
COMMENT ON COLUMN public.campanhas.qtd_lote_2 IS 'Quantidade de mensagens no segundo lote (segundo dia).';
COMMENT ON COLUMN public.campanhas.max_lotes IS 'Número máximo de lotes (dias) em que o envio será distribuído.';
COMMENT ON COLUMN public.campanhas.intervalo_min_segundos IS 'Intervalo mínimo (em segundos) entre envios individuais.';
COMMENT ON COLUMN public.campanhas.intervalo_max_segundos IS 'Intervalo máximo (em segundos) entre envios individuais.';
COMMENT ON COLUMN public.campanhas.mensagem_opcoes IS 'Lista de variações de mensagem de texto para a campanha.';

-- Novos campos em campanha_destinatarios para agendamento e texto por destinatário
ALTER TABLE public.campanha_destinatarios
  ADD COLUMN IF NOT EXISTS agendado_para timestamptz,
  ADD COLUMN IF NOT EXISTS mensagem_texto text;

COMMENT ON COLUMN public.campanha_destinatarios.agendado_para IS 'Data/hora em que este destinatário deve receber a mensagem.';
COMMENT ON COLUMN public.campanha_destinatarios.mensagem_texto IS 'Texto da mensagem atribuído especificamente para este destinatário.';

-- Índice auxiliar para busca por agendamento no worker
CREATE INDEX IF NOT EXISTS idx_campanha_destinatarios_status_agendado
  ON public.campanha_destinatarios (campanha_id, status_envio, agendado_para);

