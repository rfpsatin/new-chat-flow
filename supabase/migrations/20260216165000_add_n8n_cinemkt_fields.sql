-- Adicionar campos para suporte ao webhook n8n whatsapp_cinemkt
-- Estes campos são opcionais (nullable) para manter compatibilidade com conversas existentes

ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS human_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS n8n_webhook_id text;

-- Comentários para documentação
COMMENT ON COLUMN public.conversas.source IS 'Origem da mensagem (ex: web-chat). Específico do webhook n8n whatsapp_cinemkt';
COMMENT ON COLUMN public.conversas.channel IS 'Canal da conversa (ex: mkt, comercial). Específico do webhook n8n whatsapp_cinemkt';
COMMENT ON COLUMN public.conversas.human_mode IS 'Indica se a conversa deve seguir para atendimento humano. Específico do webhook n8n whatsapp_cinemkt';
COMMENT ON COLUMN public.conversas.n8n_webhook_id IS 'Identificador do webhook n8n (ex: webchat-1771266325740). Usado para identificar contatos do webhook n8n';

-- Índice para melhorar busca por n8n_webhook_id
CREATE INDEX IF NOT EXISTS idx_conversas_n8n_webhook_id 
  ON public.conversas (n8n_webhook_id) 
  WHERE n8n_webhook_id IS NOT NULL;

