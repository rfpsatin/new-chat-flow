-- Adicionar colunas de status do Whapi na tabela empresas
ALTER TABLE public.empresas 
  ADD COLUMN IF NOT EXISTS whapi_status text,
  ADD COLUMN IF NOT EXISTS whapi_status_raw text,
  ADD COLUMN IF NOT EXISTS whapi_status_source text,
  ADD COLUMN IF NOT EXISTS whapi_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS whapi_last_error text,
  ADD COLUMN IF NOT EXISTS whapi_last_qr_at timestamptz;

-- Criar tabela para eventos de conexão Whapi
CREATE TABLE IF NOT EXISTS public.whapi_connection_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_type text,
  state text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.whapi_connection_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para whapi_connection_events
CREATE POLICY "Eventos de conexão são visíveis por usuários da empresa" 
  ON public.whapi_connection_events 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u 
      WHERE u.empresa_id = whapi_connection_events.empresa_id 
      AND u.auth_user_id = auth.uid()
    )
  );

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_whapi_connection_events_empresa_id 
  ON public.whapi_connection_events(empresa_id, created_at DESC);